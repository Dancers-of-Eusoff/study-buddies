package sessions

import (
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/sessions/start", internal.RequireAuth(h.handleStart))
	mux.HandleFunc("POST /api/sessions/end", internal.RequireAuth(h.handleEnd))
	mux.HandleFunc("POST /api/sessions/interval", internal.RequireAuth(h.handleLogInterval))
}

func (h *Handler) handleStart(w http.ResponseWriter, r *http.Request) {
	var req StartSessionRequest
	if err := internal.DecodeJSON(w, r, &req); err != nil {
		return
	}

	session, err := h.service.StartSession(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	internal.WriteJSON(w, http.StatusCreated, session)
}

func (h *Handler) handleEnd(w http.ResponseWriter, r *http.Request) {
	var req EndSessionRequest
	if err := internal.DecodeJSON(w, r, &req); err != nil {
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

	internal.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) handleLogInterval(w http.ResponseWriter, r *http.Request) {
	var req LogIntervalRequest
	if err := internal.DecodeJSON(w, r, &req); err != nil {
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

	internal.WriteJSON(w, http.StatusOK, interval)
}
