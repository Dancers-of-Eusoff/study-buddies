package users

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // Stripped out during JSON transmission
	CreatedAt    time.Time `json:"createdAt"`
}

// RegisterRequest parses registration form details.
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	UserID   string `json:"userId"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type Claims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type CreateUserParams struct {
	Username string
	Email string
	Password string
}

type QueryUserDTO struct {
	ID            int       `json:"id" db:"id"`
	Username      string    `json:"username" db:"username"`
	Email         string    `json:"email" db:"email"`
	ProfilePicURL string    `json:"profile_pic_url" db:"profile_pic_url"`
	Bio           string    `json:"bio" db:"bio"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

var (
	ErrUserExists       = errors.New("username already taken")
	ErrInvalidAuth      = errors.New("invalid username or password")
	ErrUsernameLength   = errors.New("username must be between 3 and 20 characters")
	ErrPasswordLength   = errors.New("password must be at least 6 characters")
	ErrMissingHeader    = errors.New("missing or invalid authorization header")
	ErrInvalidToken     = errors.New("invalid or expired token")
	ErrMethodNotAllowed = errors.New("method not allowed")
	ErrInvalidJSON      = errors.New("invalid request body")
)
