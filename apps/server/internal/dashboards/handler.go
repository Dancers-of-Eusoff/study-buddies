package dashboards

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
	return &Handler{base: base, service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("QUERY /api/dashboard/me", h.base.RequireAuth(h.Me))
	mux.HandleFunc("POST /api/dashboard/submit-meme", h.base.RequireAuth(h.AddMeme))
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	var req DashboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
		return
	}

	memes, err := h.service.GetMemes(req.UserID)
	if err != nil {
		http.Error(w, "Unable to get memes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(memes)
}

func (h *Handler) AddMeme(w http.ResponseWriter, r *http.Request) {
	var req SubmittedMemeDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
		return
	}

	createdMeme, err := h.service.AddMeme(&req)
	if err != nil {
		http.Error(w, "Unable to add memes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdMeme)
}
