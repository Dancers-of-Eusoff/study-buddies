package sessions

import (
	"context"
	"database/sql"
	"log"
)

// SummaryRepository persists finished sessions to session_summaries for
// historical/dashboard use, independent of the live session store above.
type SummaryRepository interface {
	SaveSummary(session StudySession, focusSeconds, distractionSeconds int) error
	ListSessionsByUserID(userID string) ([]StudySession, error)
	ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error)
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

func (r *PostgresSummaryRepository) ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error) {
	return []FocusInterval{}, nil
}

func (r *PostgresSummaryRepository) ListSessionsByUserID(userID string) ([]StudySession, error) {
	var userSessions []StudySession
	const query = `
		SELECT * FROM session_summaries
		WHERE user_id = $1
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return []StudySession{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var userSession StudySession
		if err := rows.Scan(
			&userSession.ID,
			&userSession.UserID,
			&userSession.RoomID,
			&userSession.FinalScore,
			&userSession.FinalRank,
			&userSession.StartTime,
			&userSession.EndTime,
		); err != nil {
			return []StudySession{}, err
		}
		userSessions = append(userSessions, userSession)
	}
	log.Printf("userSessions sRepo: %+v", userSessions)
	return userSessions, nil
}