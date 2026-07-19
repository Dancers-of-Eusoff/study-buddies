package users

import (
	"encoding/json"
	"net/http"
	"strings"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/register", h.handleRegister)
	mux.HandleFunc("/api/auth/login", h.handleLogin)
	mux.HandleFunc("/api/auth/me", h.handleMe)
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, ErrMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, ErrInvalidJSON)
		return
	}

	user, accessToken, err := h.service.Register(req)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, err)
		return
	}

	accessCookie := http.Cookie{
		Name: "accessToken",
		Value: accessToken,
		MaxAge: 15 * 60,
		HttpOnly: true,
		Secure: true,
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)

	h.writeJSON(w, http.StatusCreated, AuthResponse{
		// Token:    token,
		Username: user.Username,
		UserID:   user.ID,
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, ErrMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, ErrInvalidJSON)
		return
	}

	user, accessToken, err := h.service.Login(req)
	if err != nil {
		h.writeError(w, http.StatusUnauthorized, err)
		return
	}

	accessCookie := http.Cookie{
		Name: "accessToken",
		Value: accessToken,
		MaxAge: 15 * 60,
		HttpOnly: true,
		Secure: true,
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)
	// http.SetCookie(w, &refreshCookie)

	h.writeJSON(w, http.StatusOK, AuthResponse{
		// Token:    accessToken,
		Username: user.Username,
		UserID:   user.ID,
	})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, ErrMethodNotAllowed)
		return
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		h.writeError(w, http.StatusUnauthorized, ErrMissingHeader)
		return
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := h.service.ValidateToken(tokenStr)
	if err != nil {
		h.writeError(w, http.StatusUnauthorized, ErrInvalidToken)
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]string{
		"userId":   claims.UserID,
		"username": claims.Username,
	})
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *Handler) writeError(w http.ResponseWriter, status int, err error) {
	h.writeJSON(w, status, ErrorResponse{Error: err.Error()})
}
