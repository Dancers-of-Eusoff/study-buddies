package focus_sessions

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/focus"
)

// SummaryRepository persists finished sessions to session_summaries once a
// room ends. One row per user who participated.
type SummaryRepository interface {
	SaveSummary(ctx context.Context, userID, roomID string, focusSeconds, distractionSeconds int, startTime, endTime time.Time) error
}

type PostgresSummaryRepository struct {
	db *sql.DB
}

func NewPostgresSummaryRepository(db *sql.DB) *PostgresSummaryRepository {
	return &PostgresSummaryRepository{db: db}
}

func (r *PostgresSummaryRepository) SaveSummary(ctx context.Context, userID, roomID string, focusSeconds, distractionSeconds int, startTime, endTime time.Time) error {
	const query = `
		INSERT INTO session_summaries
			(user_id, room_id, focus_duration_seconds, distraction_duration_seconds, start_time, end_time)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, userID, roomID, focusSeconds, distractionSeconds, startTime, endTime)
	return err
}

// NewOnRoomEnd adapts SummaryRepository into the focus.OnRoomEnd callback
// signature expected by focus.NewRegistry. Wire it at startup:
//
//	summaryRepo := sessions.NewPostgresSummaryRepository(db)
//	registry := focus.NewRegistry(hub, focus.DefaultScoringConfig(), sessions.NewOnRoomEnd(summaryRepo))
func NewOnRoomEnd(repo SummaryRepository) focus.OnRoomEnd {
	return func(roomID string, summaries []focus.UserFocusState) {
		endTime := time.Now()
		for _, u := range summaries {
			err := repo.SaveSummary(
				context.Background(), // room has already ended; no request-scoped ctx available here
				u.UserID, roomID,
				u.FocusDurationSeconds, u.DistractionDurationSeconds,
				u.JoinedAt, endTime,
			)
			if err != nil {
				log.Printf("❌ SaveSummary failed for user [%s] room [%s]: %v", u.UserID, roomID, err)
			}
		}
	}
}
