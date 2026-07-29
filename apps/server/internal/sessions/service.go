package sessions

import (
	"context"
	"log"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
)

// Each logged interval represents one fixed-length sampling window (the
// frontend logs every 60s), so duration is assumed here rather than read
// off the interval itself.
const intervalDurationSeconds = 60

type Service struct {
	repo        Repository
	summaryRepo SummaryRepository
}

func NewService(repo Repository, summaryRepo SummaryRepository) *Service {
	return &Service{
		repo:        repo,
		summaryRepo: summaryRepo,
	}
}

func (s *Service) StartSession(req StartSessionRequest) (StudySession, error) {
	if req.RoomID == "" {
		return StudySession{}, rooms.ErrRoomIDRequired
	}

	if req.UserID == "" {
		return StudySession{}, rooms.ErrUserIDRequired
	}

	sessionID, err := rooms.GenerateID("session")
	if err != nil {
		return StudySession{}, err
	}

	session := StudySession{
		ID:         sessionID,
		RoomID:     req.RoomID,
		UserID:     req.UserID,
		StartTime:  time.Now(),
		IsActive:   true,
		FinalScore: 0,
	}

	if err := s.repo.CreateSession(session); err != nil {
		return StudySession{}, err
	}

	return session, nil
}

func (s *Service) EndSession(req EndSessionRequest) (StudySession, error) {
	if req.SessionID == "" {
		return StudySession{}, ErrSessionNotFound
	}

	session, err := s.repo.FindSessionByID(req.SessionID)
	if err != nil {
		return StudySession{}, err
	}

	if !session.IsActive {
		return StudySession{}, ErrSessionClosed
	}
	session.IsActive = false
	session.EndTime = time.Now()

	// For future update
	// session.FinalScore = analytics.CalculateScore(intervals)

	if err := s.repo.UpdateSession(session); err != nil {
		return StudySession{}, err
	}

	s.saveSummary(session)

	return session, nil
}

// saveSummary writes the finished session to session_summaries. Failures are
// logged rather than returned — the session itself is already closed by this
// point and shouldn't be left in a stuck state over a summary write.
func (s *Service) saveSummary(session StudySession) {
	if s.summaryRepo == nil {
		return
	}

	intervals, err := s.repo.ListIntervalsBySessionID(session.ID)
	if err != nil {
		log.Printf("failed to list intervals for session %s summary: %v", session.ID, err)
		return
	}

	var focusSeconds, distractionSeconds int
	for _, interval := range intervals {
		switch interval.State {
		case "FOCUSED":
			focusSeconds += intervalDurationSeconds
		case "DISTRACTED":
			distractionSeconds += intervalDurationSeconds
		}
	}

	if err := s.summaryRepo.SaveSummary(session, focusSeconds, distractionSeconds); err != nil {
		log.Printf("failed to save session summary for %s: %v", session.ID, err)
	}
}

func (s *Service) LogInterval(req LogIntervalRequest) (FocusInterval, error) {
	if req.State != "FOCUSED" && req.State != "DISTRACTED" && req.State != "UNCERTAIN" && req.State != "NO_FACE" {
		return FocusInterval{}, ErrInvalidState
	}

	intervalID, err := rooms.GenerateID("interval")
	if err != nil {
		return FocusInterval{}, err
	}

	interval := FocusInterval{
		ID:              intervalID,
		SessionID:       req.SessionID,
		State:           req.State,
		DurationSeconds: req.DurationSeconds,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.LogFocusInterval(interval); err != nil {
		return FocusInterval{}, err
	}

	return interval, nil
}

func (s *Service) GetUserSessions(userID string) ([]SessionDetailsResponse, error) {
	sessions, err := s.repo.ListSessionsByUserID(userID)
	if err != nil {
		return nil, err
	}

	var results []SessionDetailsResponse
	for _, sess := range sessions {
		intervals, _ := s.repo.ListIntervalsBySessionID(sess.ID)
		results = append(results, SessionDetailsResponse{
			Session:   sess,
			Intervals: intervals,
		})
	}

	return results, nil
}

// Heartbeat records that a session's client is still alive.
func (s *Service) Heartbeat(sessionID string) error {
	return s.repo.Heartbeat(sessionID)
}

func (s *Service) SweepStaleSessions(timeout time.Duration) {
	staleIDs, err := s.repo.ListStaleSessionIDs(timeout)
	if err != nil {
		log.Printf("sweep: failed to list stale sessions: %v", err)
		return
	}

	for _, id := range staleIDs {
		if _, err := s.EndSession(EndSessionRequest{SessionID: id}); err != nil {
			log.Printf("sweep: failed to end stale session %s: %v", id, err)
		}
	}
}

func (s *Service) StartSweeper(ctx context.Context, interval, timeout time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.SweepStaleSessions(timeout)
		}
	}
}
