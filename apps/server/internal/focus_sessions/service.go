package focus_sessions

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/focus"
)

var (
	ErrRoomNotFound = errors.New("room not found")
	ErrRoomEnded    = errors.New("room has already ended")
)

// RoomLookup is the minimal read access this service needs from your rooms
// table. If you already have a RoomRepository elsewhere (likely, since
// create-room exists), just implement this interface on it rather than
// creating a new one — I don't have that file, so I'm defining only what's
// needed here.
type RoomLookup interface {
	GetExpiresAt(ctx context.Context, roomID string) (time.Time, error) // sql.ErrNoRows -> ErrRoomNotFound
}

type Service struct {
	rooms    RoomLookup
	registry *focus.Registry
}

func NewService(rooms RoomLookup, registry *focus.Registry) *Service {
	return &Service{rooms: rooms, registry: registry}
}

// StartSession is called from POST /api/sessions/start. It:
//  1. looks up the room's shared expires_at (Q13: one clock for everyone),
//  2. rejects if the room doesn't exist or has already ended,
//  3. starts (or fetches, if another user already started it) the room's
//     focus.Registry ticker,
//  4. registers this user in the room immediately — so they appear on the
//     leaderboard right away, before their first FOCUS_STATE WS message
//     arrives from the camera.
func (s *Service) StartSession(ctx context.Context, userID, username string, req StartSessionRequest) (*StudySession, error) {
	expiresAt, err := s.rooms.GetExpiresAt(ctx, req.RoomID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRoomNotFound
		}
		return nil, err
	}

	now := time.Now()
	if !now.Before(expiresAt) {
		return nil, ErrRoomEnded
	}

	room := s.registry.StartOrGetRoom(req.RoomID, expiresAt)
	userState := room.Join(userID, username)

	return &StudySession{
		UserID:          userID,
		RoomID:          req.RoomID,
		StartTime:       userState.JoinedAt,
		RoomEndsAt:      expiresAt,
		DurationMinutes: int(expiresAt.Sub(now).Round(time.Minute).Minutes()),
	}, nil
}
