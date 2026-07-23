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
	mux.HandleFunc("GET /api/auth/me", helper.RequireAuth(h.handleMe))
	mux.HandleFunc("POST /api/auth/refresh", h.handleRefresh)
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	user, accessToken, refreshToken, err := h.service.Register(req)
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
	refreshCookie := http.Cookie{
		Name: "refreshToken",
		Value: refreshToken,
		MaxAge: 60 * 60 * 24 * 7,
		HttpOnly: true,
		Secure: isProd,
		Path: "/api/auth/refresh",
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)
	http.SetCookie(w, &refreshCookie)
	helper.WriteJSON(w, http.StatusCreated, AuthResponse{
		UserID:   user.ID,
		Username: user.Username,
	})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	user, accessToken, refreshToken, err := h.service.Login(req)
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
	refreshCookie := http.Cookie{
		Name: "refreshToken",
		Value: refreshToken,
		MaxAge: 60 * 60 * 24 * 7,
		HttpOnly: true,
		Secure: isProd,
		Path: "/api/auth/refresh",
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(w, &accessCookie)
	http.SetCookie(w, &refreshCookie)
	helper.WriteJSON(w, http.StatusOK, AuthResponse{
		UserID:   user.ID,
		Username: user.Username,
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

func (h *Handler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refreshToken")
	if err != nil {
		helper.WriteError(w, http.StatusUnauthorized, helper.ErrMissingToken)
		return
	}

	claims, err := helper.ValidateToken(cookie.Value)
	if err != nil {
		helper.WriteError(w, http.StatusUnauthorized, ErrInvalidToken)
		return
	}

	accessToken, err := h.service.Refresh(claims)
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
	helper.WriteJSON(w, http.StatusOK, AuthResponse{
		UserID:   claims.UserID,
		Username: claims.Username,
	})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	user, ok := helper.UserFromContext(r.Context())
	if !ok {
		helper.WriteError(w, http.StatusUnauthorized, ErrInvalidToken)
		return
	}

	helper.WriteJSON(w, http.StatusOK, AuthResponse{
		UserID:   user.UserID,
		Username: user.Username,
	})
}