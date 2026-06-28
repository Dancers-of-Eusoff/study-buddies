package chat

import (
	"errors"
	"time"
)

var (
	ErrMessageInvalid = errors.New("message content cannot be empty")
)

type Message struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	SenderID  string    `json:"senderId"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// SendMessagePayload matches the JSON schema nested inside your websocket.Event.Payload
type SendMessagePayload struct {
	RoomID   string `json:"roomId"`
	SenderID string `json:"senderId"`
	Content  string `json:"content"`
}
