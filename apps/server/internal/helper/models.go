package helper

import (
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type Claims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidJSON = errors.New("Invalid JSON Request")
	ErrMissingToken	= errors.New("Token not found, try logging in again.")
	ErrInvalidToken = errors.New("invalid or expired token")
)