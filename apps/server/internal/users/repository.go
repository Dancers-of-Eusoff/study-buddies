package users

import (
	"strings"
	"sync"
)

type Repository interface {
	CreateUser(user *User) error
	FindByUsername(username string) (*User, bool)
}

type MemoryRepository struct {
	mu    sync.RWMutex
	users map[string]*User
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		users: make(map[string]*User),
	}
}

func (r *MemoryRepository) CreateUser(user *User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	key := strings.ToLower(user.Username)
	r.users[key] = user
	return nil
}

func (r *MemoryRepository) FindByUsername(username string) (*User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := strings.ToLower(strings.TrimSpace(username))
	user, exists := r.users[key]
	return user, exists
}
