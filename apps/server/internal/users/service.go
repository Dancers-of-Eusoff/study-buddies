package users

import (
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

func (s *Service) Register(req RegisterRequest) (User, string, error) {
	req.Username = strings.TrimSpace(req.Username)

	if len(req.Username) < 3 || len(req.Username) > 20 {
		return User{}, "", ErrUsernameLength
	}
	if len(req.Password) < 6 {
		return User{}, "", ErrPasswordLength
	}

	if _, exists := s.repo.FindByUsername(req.Username); exists {
		return User{}, "", ErrUserExists
	}

	// user := &User{
	// 	ID:           fmt.Sprintf("user_%d", time.Now().UnixNano()),
	// 	Username:     req.Username,
	// 	PasswordHash: s.hashPassword(req.Password),
	// 	CreatedAt:    time.Now(),
	// }

	user := CreateUserParams{
		Username: req.Username,
		Password: s.hashPassword(req.Password),
		Email: "testing@tete.com",
	}

	id, err := s.repo.CreateUser(user)
	if err != nil {
		return User{}, "", err
	}

	userToken := &User{
		ID: fmt.Sprintf("%d", id),
		Username:     req.Username,
		PasswordHash: s.hashPassword(req.Password),
		CreatedAt:    time.Now(),
	}

	token, err := s.GenerateToken(userToken)

	return *userToken, token, err
	// if err := s.repo.CreateUser(user); err != nil {
	// 	return User{}, "", err
	// }

	// token, err := s.GenerateToken(user)
	// return *user, token, err
}

// func (s *Service) Login(req LoginRequest) (User, string, error) {
// 	user, exists := s.repo.FindByUsername(req.Username)
// 	if !exists || !s.checkPassword(req.Password, user.PasswordHash) {
// 		return User{}, "", ErrInvalidAuth
// 	}

// 	token, err := s.GenerateToken(user)
// 	return *user, token, err
// }

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

func (s *Service) GenerateToken(user *User) (string, error) {
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
