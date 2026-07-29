package sessions

import (
	"fmt"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/helper"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/sessions/start", helper.RequireAuth(h.handleStart))
	mux.HandleFunc("POST /api/sessions/end", helper.RequireAuth(h.handleEnd))
	mux.HandleFunc("POST /api/sessions/interval", helper.RequireAuth(h.handleLogInterval))
	mux.HandleFunc("POST /api/sessions/{id}/heartbeat", helper.RequireAuth(h.handleHeartbeat))
	mux.HandleFunc("/api/sessions/user", helper.RequireAuth(h.handleGetUserSessions))
}

func (h *Handler) handleStart(w http.ResponseWriter, r *http.Request) {
	var req StartSessionRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	session, err := h.service.StartSession(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusCreated, session)
}

func (h *Handler) handleEnd(w http.ResponseWriter, r *http.Request) {
	var req EndSessionRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	session, err := h.service.EndSession(req)
	if err != nil {
		if err == ErrSessionNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if err == ErrSessionClosed {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) handleLogInterval(w http.ResponseWriter, r *http.Request) {
	var req LogIntervalRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	interval, err := h.service.LogInterval(req)
	if err != nil {
		if err == ErrSessionNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if err == ErrInvalidState {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusOK, interval)
}

func (h *Handler) handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	if sessionID == "" {
		http.Error(w, "session id is required", http.StatusBadRequest)
		return
	}

	err := h.service.Heartbeat(sessionID)
	if err != nil && err != ErrSessionClosed {
		if err == ErrSessionNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) handleGetUserSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, ok := helper.UserFromContext(r.Context())
	fmt.Println(ok)

	if ok == false {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	details, err := h.service.GetUserSessions(user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if details == nil {
		details = []SessionDetailsResponse{}
	}

	helper.WriteJSON(w, http.StatusOK, details)
}
