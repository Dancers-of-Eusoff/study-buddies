package sessions

import (
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
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
	// intervals, _ := s.repo.ListIntervalsBySessionID(session.ID)
	// session.FinalScore = analytics.CalculateScore(intervals)

	if err := s.repo.UpdateSession(session); err != nil {
		return StudySession{}, err
	}

	return session, nil
}

func (s *Service) LogInterval(req LogIntervalRequest) (FocusInterval, error) {
	// can adjust according to CV
	if req.State != "FOCUSED" && req.State != "DISTRACTED" && req.State != "UNCERTAIN" && req.State != "NO_FACE" {
		return FocusInterval{}, ErrInvalidState
	}

	intervalID, err := rooms.GenerateID("interval")
	if err != nil {
		return FocusInterval{}, err
	}

	// 3. Assembly: Build the FocusInterval struct
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
