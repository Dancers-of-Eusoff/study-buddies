package repositories

import (
	"database/sql"
	"log"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/models"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateUser(p models.CreateUserParams) int {
	var pk int
	query := `INSERT INTO users (username, password, email)
		VALUES ($1, $2, $3) RETURNING id`

	err := r.db.QueryRow(query, p.Username, p.Password, p.Email).Scan(&pk)
	if err != nil {
		log.Fatal(err)
	}
	return pk
}