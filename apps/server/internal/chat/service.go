package chat

import (
	"encoding/json"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/websocket"
)

type Service struct {
	repo Repository
	hub  *websocket.Hub
}

func NewService(repo Repository, hub *websocket.Hub) *Service {
	return &Service{
		repo: repo,
		hub:  hub,
	}
}

func (s *Service) ProcessSentMessage(payload SendMessagePayload) (Message, error) {
	if payload.Content == "" {
		return Message{}, ErrMessageInvalid
	}

	msgID, err := rooms.GenerateID("msg")
	if err != nil {
		return Message{}, err
	}

	msg := Message{
		ID:        msgID,
		RoomID:    payload.RoomID,
		SenderID:  payload.SenderID,
		Content:   payload.Content,
		Timestamp: time.Now(),
	}

	if err := s.repo.SaveMessage(msg); err != nil {
		return Message{}, err
	}

	payloadBytes, err := json.Marshal(msg)
	if err != nil {
		return Message{}, err
	}

	s.hub.BroadcastEvent(websocket.Event{
		Type:    "NEW_MESSAGE",
		RoomID:  msg.RoomID,
		Payload: payloadBytes,
	})

	return msg, nil
}

// GetHistory returns all messages for a given room
func (s *Service) GetHistory(roomID string) ([]Message, error) {
	return s.repo.GetChatHistory(roomID)
}
