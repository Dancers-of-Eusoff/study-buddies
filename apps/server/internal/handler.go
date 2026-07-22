package internal

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/auth"
)

type contextKey string
const userContextKey contextKey = "user"

type ErrorResponse struct {
	Error string `json:"error"`
}

type Handler struct {
	jwtSecret	[]byte
}

func NewHandler(jwtSecret []byte) *Handler {
	return &Handler{jwtSecret: jwtSecret}
}

func (h *Handler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("accessToken")
		if err != nil {
			h.WriteError(w, http.StatusUnauthorized, ErrMissingToken)
			return
		}
		claims, err := auth.ValidateToken(cookie.Value, h.jwtSecret)
		if err != nil {
			h.WriteError(w, http.StatusUnauthorized, ErrInvalidToken)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func (h *Handler) WriteJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *Handler) WriteError(w http.ResponseWriter, status int, err error) {
	h.WriteJSON(w, status, ErrorResponse{Error: err.Error()})
}

func UserFromContext(ctx context.Context) (*auth.Claims, bool) {
	claims, ok := ctx.Value(userContextKey).(*auth.Claims)
	return claims, ok
}

var (
	ErrMissingToken	= errors.New("Token not found, try logging in again.")
	ErrInvalidToken     = errors.New("invalid or expired token")
)