package users

import (
	"log"
	"sync"
	"strings"
	"database/sql"
)

type Repository interface {
	CreateUser(user *User) error
	FindByUsername(username string) (*User, bool)
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

func (r *UserRepo) CreateUser(p CreateUserParams) int {
	var pk int
	query := `INSERT INTO users (username, password, email)
		VALUES ($1, $2, $3) RETURNING id`

	err := r.db.QueryRow(query, p.Username, p.Password, p.Email).Scan(&pk)
	if err != nil {
		log.Fatal(err)
	}
	return pk
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
