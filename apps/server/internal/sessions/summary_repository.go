package sessions

import (
	"context"
	"database/sql"
)

// SummaryRepository persists finished sessions to session_summaries for
// historical/dashboard use, independent of the live session store above.
type SummaryRepository interface {
	SaveSummary(session StudySession, focusSeconds, distractionSeconds int) error
}

type PostgresSummaryRepository struct {
	db *sql.DB
}

func NewPostgresSummaryRepository(db *sql.DB) *PostgresSummaryRepository {
	return &PostgresSummaryRepository{db: db}
}

func (r *PostgresSummaryRepository) SaveSummary(session StudySession, focusSeconds, distractionSeconds int) error {
	const query = `
		INSERT INTO session_summaries
			(user_id, room_id, focus_duration_seconds, distraction_duration_seconds, start_time, end_time)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.ExecContext(
		context.Background(), query,
		session.UserID, nil, focusSeconds, distractionSeconds, session.StartTime, session.EndTime,
	)
	return err
}
