package sessions

import (
	"errors"
	"time"
)

var (
	ErrSessionNotFound      = errors.New("study session not found")
	ErrSessionAlreadyActive = errors.New("user already has an active session in this room")
	ErrSessionClosed        = errors.New("cannot update or modify a closed study session")
	ErrInvalidState         = errors.New("invalid focus state provided")
	// Add other validation errors here (e.g., missing Room ID or User ID)
)

type StudySession struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	UserID    string    `json:"userId"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime,omitempty"`
	IsActive  bool      `json:"isActive"`

	FinalScore int `json:"finalScore"`
	FinalRank  int `json:"finalRank,omitempty"`
}

type FocusInterval struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionId"`

	State           string    `json:"state"`
	DurationSeconds int       `json:"durationSeconds"`
	CreatedAt       time.Time `json:"createdAt"`
}

type StartSessionRequest struct {
	RoomID string `json:"roomId"`
	UserID string `json:"userId"`
}

type EndSessionRequest struct {
	SessionID string `json:"sessionId"`
}

type LogIntervalRequest struct {
	SessionID       string `json:"sessionId"`
	State           string `json:"state"`
	DurationSeconds int    `json:"durationSeconds"`
}

type SessionDetailsResponse struct {
	Session   StudySession    `json:"session"`
	Intervals []FocusInterval `json:"intervals"`
}
