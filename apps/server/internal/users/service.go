package users

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Service struct {
	repo      Repository
	jwtSecret []byte
}

func NewService(repo Repository) *Service {
	return &Service{
		repo:      repo,
		jwtSecret: []byte("study-buddies-dev-secret-change-in-prod"),
	}
}

func (s *Service) Register(req RegisterRequest) (UserDTO, string, error) {
	req.Username = strings.TrimSpace(req.Username)

	if len(req.Username) < 3 || len(req.Username) > 20 {
		return UserDTO{}, "", ErrUsernameLength
	}
	if len(req.Password) < 6 {
		return UserDTO{}, "", ErrPasswordLength
	}

	_, err := s.repo.FindByUsername(req.Username)
	switch {
	case err == nil:
		return UserDTO{}, "", ErrUserExists
	case errors.Is(err, sql.ErrNoRows):
		user := &CreateUserParams{
			Username: req.Username,
			Password: s.hashPassword(req.Password),
		}

		id, err := s.repo.CreateUser(user)
		if err != nil {
			return UserDTO{}, "", err
		}

		userDTO := &UserDTO{
			ID: id,
			Username: req.Username,
		}

		token, err := s.GenerateToken(userDTO)

		return *userDTO, token, err
	default:
		return UserDTO{}, "", fmt.Errorf("checking existing user: %w", err)
	}

}

func (s *Service) Login(req LoginRequest) (UserDTO, string, error) {
	user, err := s.repo.FindByUsername(req.Username)
	switch {
	case err == nil:
		token, err := s.GenerateToken(user)
		return *user, token, err
	case errors.Is(err, sql.ErrNoRows):
		return UserDTO{}, "", ErrInvalidAuth
	default:
		return UserDTO{}, "", fmt.Errorf("unable to login: %w", err)
	}

}

func (s *Service) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func (s *Service) GenerateToken(user *UserDTO) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func (s *Service) hashPassword(password string) string {
	salt := "sb_salt_2025_"
	bytes := []byte(salt + password)
	for i := range bytes {
		bytes[i] = bytes[i] ^ 0x5A
	}
	return fmt.Sprintf("%x", bytes)
}

func (s *Service) checkPassword(password, hash string) bool {
	return s.hashPassword(password) == hash
}
