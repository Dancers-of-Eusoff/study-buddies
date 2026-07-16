package chat

import "sync"

type Repository interface {
	SaveMessage(msg Message) error
	GetChatHistory(roomID string) ([]Message, error)
}

type MemoryRepository struct {
	mu       sync.RWMutex
	messages map[string][]Message
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		messages: make(map[string][]Message),
	}
}

func (r *MemoryRepository) SaveMessage(msg Message) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.messages[msg.RoomID] = append(r.messages[msg.RoomID], msg)
	return nil
}

func (r *MemoryRepository) GetChatHistory(roomID string) ([]Message, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	msgs, ok := r.messages[roomID]
	if !ok {
		return []Message{}, nil
	}
	return msgs, nil
}
