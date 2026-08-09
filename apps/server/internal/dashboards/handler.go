package dashboards

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
	mux.HandleFunc("GET /api/dashboard/me", helper.RequireAuth(h.Me))
	mux.HandleFunc("POST /api/dashboard/submit-meme", helper.RequireAuth(h.AddMeme))
	mux.HandleFunc("POST /api/dashboard/select-meme", helper.RequireAuth(h.SelectMeme))
	mux.HandleFunc("GET /api/dashboard/memes", helper.RequireAuth(h.GetAllMemes))
	mux.HandleFunc("GET /api/dashboard/selected-memes", helper.RequireAuth(h.GetSelectedMemes))
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	var req DashboardRequest
	user, ok := helper.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unable to get UserContext", http.StatusInternalServerError)
		return
	}

	memes, err := h.service.GetMemes(user.UserID)
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

	helper.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) AddMeme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SubmittedMemeDTO
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	createdMeme, err := h.service.AddMeme(&req)
	if err != nil {
		http.Error(w, "Unable to add memes", http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusCreated, createdMeme)
}

func (h *Handler) SelectMeme(w http.ResponseWriter, r *http.Request) {
	var req SelectMemeDTO
	if err := helper.DecodeJSON(w, r, &req); err != nil {
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
	user, ok := helper.UserFromContext(r.Context())
	if ok == false {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	memes, err := h.service.GetMemes(user.UserID)
	if err != nil {
		http.Error(w, "Unable to get private memes", http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusOK, memes)
}

func (h *Handler) GetSelectedMemes(w http.ResponseWriter, r *http.Request) {
	user, ok := helper.UserFromContext(r.Context())
	if ok == false {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Println(user.UserID)

	memes, err := h.service.GetSelectedMemeID(user.UserID)
	if err != nil {
		http.Error(w, "Unable to get private memes", http.StatusInternalServerError)
		return
	}

	helper.WriteJSON(w, http.StatusOK, memes)
}
