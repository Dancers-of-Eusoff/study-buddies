package users

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

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
		hash, err := s.hashPassword(req.Password)
		if err != nil {
			return UserDTO{}, "", fmt.Errorf("creating user: %w", err)
		}
		user := &CreateUserParams{
			Username: req.Username,
			Password: hash,
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
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return *&UserDTO{}, "", err
		}
		userDTO := &UserDTO{
			ID: user.ID,
			Username: user.Username,
		}
		token, err := s.GenerateToken(userDTO)
		return *userDTO, token, err
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

func (s *Service) hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", fmt.Errorf("hashing password: %w", err)
	}
	return string(hash), nil
}

func (s *Service) checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
