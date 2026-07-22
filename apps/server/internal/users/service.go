package users

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	// "github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/auth"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo      Repository
	jwtSecret []byte
}

func NewService(repo Repository) *Service {
	return &Service{
		repo:      repo,
		jwtSecret: []byte(os.Getenv("JWT_SECRET")),
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

		accessToken, err := s.GenerateRefreshToken(userDTO)
		if err != nil {
			return UserDTO{}, "", fmt.Errorf("access token: %w", err)
		}
		// refreshToken, err := s.GenerateRefreshToken(userDTO)
		// if err != nil {
		// 	return UserDTO{}, "", fmt.Errorf("access token: %w", err)
		// }

		return *userDTO, accessToken, err
	default:
		return UserDTO{}, "", fmt.Errorf("checking existing user: %w", err)
	}

}

// func (s *Service) Login(req LoginRequest) (UserDTO, string, error) {
// 	user, err := s.repo.FindByUsername(req.Username)
// 	switch {
// 	case err == nil:
// 		if !s.checkPassword(req.Password, user.PasswordHash){
// 			return UserDTO{}, "", ErrInvalidAuth
// 		}
// 		userDTO := &UserDTO{
// 			ID: user.ID,
// 			Username: user.Username,
// 		}
// 		accessToken, err := s.GenerateAccessToken(userDTO)
// 		if err != nil {
// 			return UserDTO{}, "", fmt.Errorf("access token: %w", err)
// 		}
// 		return UserDTO{}, accessToken, err
// 	case errors.Is(err, sql.ErrNoRows):
// 		return UserDTO{}, "", ErrInvalidAuth
// 	default:
// 		return UserDTO{}, "", fmt.Errorf("unable to login: %w", err)
// 	}
// }

func (s *Service) Login(req LoginRequest) (UserDTO, string, error) {
	user, err := s.repo.FindByUsername(req.Username)
	fmt.Printf("User: %v", user)
	switch {
	case err == nil:
		if !s.checkPassword(req.Password, user.PasswordHash){
			return UserDTO{}, "", ErrInvalidAuth
		}
		userDTO := UserDTO{
			ID: user.ID,
			Username: user.Username,
		}
		accessToken, err := s.GenerateAccessToken(&userDTO)
		if err != nil {
			return UserDTO{}, "", fmt.Errorf("access token: %w", err)
		}
		// refreshToken, err := s.GenerateRefreshToken(userDTO)
		// if err != nil {
		// 	return UserDTO{}, "", fmt.Errorf("access token: %w", err)
		// }
		return userDTO, accessToken, err
	case errors.Is(err, sql.ErrNoRows):
		return UserDTO{}, "", ErrInvalidAuth
	default:
		return UserDTO{}, "", fmt.Errorf("unable to login: %w", err)
	}
}

func (s *Service) GenerateAccessToken(user *UserDTO) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func (s *Service) GenerateRefreshToken(user *UserDTO) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
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