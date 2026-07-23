package users

import (
	"net/http"
	"os"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/helper"
)

var isProd bool = os.Getenv("ENV") == "production"

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.handleRegister)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/logout", helper.RequireAuth(h.handleLogout))
	// mux.HandleFunc("/api/auth/me", h.handleMe)
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	user, accessToken, err := h.service.Register(req)
	if err != nil {
		helper.WriteError(w, http.StatusBadRequest, err)
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

	helper.WriteJSON(w, http.StatusCreated, AuthResponse{
		Username: user.Username,
		UserID:   user.ID,
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	user, accessToken, err := h.service.Login(req)
	if err != nil {
		helper.WriteError(w, http.StatusUnauthorized, err)
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

	helper.WriteJSON(w, http.StatusOK, AuthResponse{
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
// 		helper.WriteError(w, http.StatusMethodNotAllowed, ErrMethodNotAllowed)
// 		return
// 	}

// 	authHeader := r.Header.Get("Authorization")
// 	if !strings.HasPrefix(authHeader, "Bearer ") {
// 		helper.WriteError(w, http.StatusUnauthorized, ErrMissingHeader)
// 		return
// 	}

// 	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
// 	claims, err := h.service.ValidateToken(tokenStr)
// 	if err != nil {
// 		helper.WriteError(w, http.StatusUnauthorized, ErrInvalidToken)
// 		return
// 	}

// 	helper.WriteJSON(w, http.StatusOK, map[string]string{
// 		"userId":   claims.UserID,
// 		"username": claims.Username,
// 	})
// }