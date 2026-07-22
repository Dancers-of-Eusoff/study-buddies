package auth

import (
	"errors"
	"fmt"
	// "time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type UserDTO struct {
	ID			string	`json:"id"`
	Username	string	`json:"username"`
}

func ValidateToken(tokenStr string, jwtSecret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return jwtSecret, nil
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

// func GenerateAccessToken(user *UserDTO) (string, error) {
// 	claims := &Claims{
// 		UserID:   user.ID,
// 		Username: user.Username,
// 		RegisteredClaims: jwt.RegisteredClaims{
// 			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
// 			IssuedAt:  jwt.NewNumericDate(time.Now()),
// 			Subject:   user.ID,
// 		},
// 	}
// 	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
// }

// func GenerateRefreshToken(user *UserDTO) (string, error) {
// 	claims := &Claims{
// 		UserID:   user.ID,
// 		Username: user.Username,
// 		RegisteredClaims: jwt.RegisteredClaims{
// 			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
// 			IssuedAt:  jwt.NewNumericDate(time.Now()),
// 			Subject:   user.ID,
// 		},
// 	}
// 	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
// }

var (
	ErrInvalidToken     = errors.New("invalid or expired token")
)