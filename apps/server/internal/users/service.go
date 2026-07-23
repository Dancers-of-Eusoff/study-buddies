package users

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/helper"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo      Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Register(req RegisterRequest) (UserDTO, string, string, error) {
	req.Username = strings.TrimSpace(req.Username)

	if len(req.Username) < 3 || len(req.Username) > 20 {
		return UserDTO{}, "", "", ErrUsernameLength
	}
	if len(req.Password) < 6 {
		return UserDTO{}, "", "", ErrPasswordLength
	}

	_, err := s.repo.FindByUsername(req.Username)
	switch {
	case err == nil:
		return UserDTO{}, "", "", ErrUserExists
	case errors.Is(err, sql.ErrNoRows):
		hash, err := s.hashPassword(req.Password)
		if err != nil {
			return UserDTO{}, "", "", fmt.Errorf("creating user: %w", err)
		}
		user := &CreateUserParams{
			Username: req.Username,
			Password: hash,
		}

		id, err := s.repo.CreateUser(user)
		if err != nil {
			return UserDTO{}, "", "", err
		}

		userDTO := &UserDTO{
			ID: id,
			Username: req.Username,
		}

		accessToken, err := helper.GenerateRefreshToken(userDTO.ID, userDTO.Username)
		if err != nil {
			return UserDTO{}, "", "", fmt.Errorf("access token: %w", err)
		}
		refreshToken, err := helper.GenerateRefreshToken(userDTO.ID, userDTO.Username)
		if err != nil {
			return UserDTO{}, "", "", fmt.Errorf("refresh token: %w", err)
		}

		return *userDTO, accessToken, refreshToken, err
	default:
		return UserDTO{}, "", "", fmt.Errorf("checking existing user: %w", err)
	}

}

func (s *Service) Login(req LoginRequest) (UserDTO, string, string, error) {
	user, err := s.repo.FindByUsername(req.Username)
	switch {
	case err == nil:
		if !s.checkPassword(req.Password, user.PasswordHash){
			return UserDTO{}, "", "", ErrInvalidAuth
		}
		userDTO := UserDTO{
			ID: user.ID,
			Username: user.Username,
		}
		accessToken, err := helper.GenerateAccessToken(userDTO.ID, userDTO.Username)
		if err != nil {
			return UserDTO{}, "", "", fmt.Errorf("access token: %w", err)
		}
		refreshToken, err := helper.GenerateRefreshToken(userDTO.ID, userDTO.Username)
		if err != nil {
			return UserDTO{}, "", "", fmt.Errorf("refresh token: %w", err)
		}
		return userDTO, accessToken, refreshToken, err
	case errors.Is(err, sql.ErrNoRows):
		return UserDTO{}, "", "", ErrInvalidAuth
	default:
		return UserDTO{}, "", "", fmt.Errorf("unable to login: %w", err)
	}
}

func (s *Service) Refresh(claims *helper.Claims) (string, error) {
	accessToken, err := helper.GenerateAccessToken(claims.ID, claims.Username)
	if err != nil {
		return "", fmt.Errorf("new access token: %w", err)
	}
	return accessToken, nil
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