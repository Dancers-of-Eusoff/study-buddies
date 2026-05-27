package sessions

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/sessions/start", h.handleStart)
	mux.HandleFunc("/api/sessions/end", h.handleEnd)
	mux.HandleFunc("/api/sessions/interval", h.handleLogInterval)
}

func (h *Handler) handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(session)
}

func (h *Handler) handleEnd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(session)
}

func (h *Handler) handleLogInterval(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(interval)
}
