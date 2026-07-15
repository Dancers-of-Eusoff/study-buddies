package dashboards

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("QUERY /api/dashboard/me", h.Me)
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