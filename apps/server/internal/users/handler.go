package users

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal"
)

var isProd bool = os.Getenv("ENV") == "production"

type Handler struct {
	base *internal.Handler
	service *Service
}

func NewHandler(base *internal.Handler, service *Service) *Handler {
	return &Handler{base: base, service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.handleRegister)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/logout", h.base.RequireAuth(h.handleLogout))
	// mux.HandleFunc("/api/auth/me", h.handleMe)
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.base.WriteError(w, http.StatusBadRequest, ErrInvalidJSON)
		return
	}

	user, accessToken, err := h.service.Register(req)
	if err != nil {
		h.base.WriteError(w, http.StatusBadRequest, err)
		return
	}

	accessCookie := http.Cookie{
		Name: "accessToken",
		Value: accessToken,
		MaxAge: 15 * 60,
		HttpOnly: true,
		Secure: isProd,
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)

	h.base.WriteJSON(w, http.StatusCreated, AuthResponse{
		Username: user.Username,
		UserID:   user.ID,
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.base.WriteError(w, http.StatusBadRequest, ErrInvalidJSON)
		return
	}

	user, accessToken, err := h.service.Login(req)
	if err != nil {
		h.base.WriteError(w, http.StatusUnauthorized, err)
		return
	}

	accessCookie := http.Cookie{
		Name: "accessToken",
		Value: accessToken,
		MaxAge: 15 * 60,
		HttpOnly: true,
		Secure: isProd,
		Path: "/",
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)
	// http.SetCookie(w, &refreshCookie)

	h.base.WriteJSON(w, http.StatusOK, AuthResponse{
		Username: user.Username,
		UserID:   user.ID,
	})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	accessCookie := http.Cookie{
		Name: "accessToken",
		Value: "",
		MaxAge: -1,
		HttpOnly: true,
		Secure: isProd,
		Path: "/",
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)
}

// func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodGet {
// 		h.base.WriteError(w, http.StatusMethodNotAllowed, ErrMethodNotAllowed)
// 		return
// 	}

// 	authHeader := r.Header.Get("Authorization")
// 	if !strings.HasPrefix(authHeader, "Bearer ") {
// 		h.base.WriteError(w, http.StatusUnauthorized, ErrMissingHeader)
// 		return
// 	}

// 	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
// 	claims, err := h.service.ValidateToken(tokenStr)
// 	if err != nil {
// 		h.base.WriteError(w, http.StatusUnauthorized, ErrInvalidToken)
// 		return
// 	}

// 	h.base.WriteJSON(w, http.StatusOK, map[string]string{
// 		"userId":   claims.UserID,
// 		"username": claims.Username,
// 	})
// }