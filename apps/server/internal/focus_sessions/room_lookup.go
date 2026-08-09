package focus_sessions

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
)

// roomRepoLookup adapts rooms.Repository (your existing FindRoomByID) to the
// RoomLookup interface this package needs. Deliberately wraps the lower-level
// Repository, not rooms.Service.GetRoomDetails — that also fetches room
// members via ListRoomMembers, which StartSession has no use for.
//
// ASSUMPTION: rooms.Room has a field `ExpiresAt time.Time` matching the
// `expires_at` column. If it's named differently, only the one line below
// (room.ExpiresAt) needs to change.
type roomRepoLookup struct {
	repo rooms.Repository
}
 
func NewRoomLookup(repo rooms.Repository) RoomLookup {
	return &roomRepoLookup{repo: repo}
}
 
func (l *roomRepoLookup) GetExpiresAt(ctx context.Context, roomID string) (time.Time, error) {
	room, err := l.repo.FindRoomByID(roomID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, sql.ErrNoRows // Service.StartSession maps this to ErrRoomNotFound
		}
		return time.Time{}, err
	}
	return time.Now().Add(time.Duration(room.DurationMinutes) * time.Minute), nil
}