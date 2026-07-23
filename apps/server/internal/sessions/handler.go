package sessions

import (
	"encoding/json"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal"
)

type Handler struct {
	base *internal.Handler
	service *Service
}

func NewHandler(base *internal.Handler, service *Service) *Handler {
	return &Handler{
		base: base,
		service: service,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/sessions/start", h.base.RequireAuth(h.handleStart))
	mux.HandleFunc("POST /api/sessions/end", h.base.RequireAuth(h.handleEnd))
	mux.HandleFunc("POST /api/sessions/interval", h.base.RequireAuth(h.handleLogInterval))
}

func (h *Handler) handleStart(w http.ResponseWriter, r *http.Request) {
	var req StartSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
		return
	}

	session, err := h.service.StartSession(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.base.WriteJSON(w, http.StatusCreated, session)
}

func (h *Handler) handleEnd(w http.ResponseWriter, r *http.Request) {
	var req EndSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
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

	h.base.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) handleLogInterval(w http.ResponseWriter, r *http.Request) {
	var req LogIntervalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
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

	h.base.WriteJSON(w, http.StatusOK, interval)
}
