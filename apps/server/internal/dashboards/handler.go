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
	mux.HandleFunc("/api/dashboard/me", h.Me)
	mux.HandleFunc("/api/dashboard/submit-meme", h.AddMeme)
	mux.HandleFunc("/api/dashboard/select-meme", h.SelectMeme)
	mux.HandleFunc("/api/dashboard/memes", h.GetAllMemes)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	var req DashboardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		http.Error(w, "Invalid JSON Request Body", http.StatusBadRequest)
		return
	}

	memes, err := h.service.GetMemes(req.UserID)
	if err != nil {
		http.Error(w, "Unable to get memes", http.StatusInternalServerError)
		return
	}

	selectedMemeID, _ := h.service.GetSelectedMemeID(req.UserID)

	memeList := *memes
	if memeList == nil {
		memeList = []MemeDTO{}
	}

	resp := DashboardResponse{
		Memes:          memeList,
		SelectedMemeID: selectedMemeID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) AddMeme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

func (h *Handler) SelectMeme(w http.ResponseWriter, r *http.Request) {
	// Explicitly check for PUT method to support select-meme requests securely
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SelectMemeDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request", http.StatusBadRequest)
		return
	}
	if err := h.service.SelectMeme(&req); err != nil {
		http.Error(w, "Failed to select meme", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) GetAllMemes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	memes, err := h.service.GetAllMemes()
	if err != nil {
		http.Error(w, "Unable to get memes", http.StatusInternalServerError)
		return
	}

	memeList := *memes
	if memeList == nil {
		memeList = []MemeDTO{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(memeList)
}
