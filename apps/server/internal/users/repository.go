package users

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
)

type Repository interface {
	CreateUser(p *CreateUserParams) (string, error)
	FindByUsername(username string) (*UserDTO, error)
}

type MemoryRepository struct {
	mu    sync.RWMutex
	users map[string]*User
}

// Connect to Postgres: start
type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateUser(p *CreateUserParams) (string, error) {
	var pk string
	query := `INSERT INTO users (username, password)
		VALUES ($1, $2) RETURNING id`

	err := r.db.QueryRow(query, p.Username, p.Password).Scan(&pk)
	if err != nil {
		return "", err
	}
	return pk, nil
}

func (r *UserRepo) FindByUsername(username string) (*UserDTO, error) {
	var u UserDTO
	query := `SELECT id, username FROM users WHERE username = $1`

	err := r.db.QueryRow(query, username).Scan(&u.ID, &u.Username)
	if err != nil {
		if err == sql.ErrNoRows {
			return &UserDTO{}, fmt.Errorf("user not found: %w", err)
		}
		return &UserDTO{}, err
	}
	return &u, nil
}
// Connect to Postgres: end

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
