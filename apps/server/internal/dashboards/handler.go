package dashboards

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
	mux.HandleFunc("GET /api/dashboard/me", internal.RequireAuth(h.Me))
	mux.HandleFunc("POST /api/dashboard/submit-meme", internal.RequireAuth(h.AddMeme))
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := internal.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unable to get UserContext", http.StatusInternalServerError)
		return
	}

	memes, err := h.service.GetMemes(user.UserID)
	if err != nil {
		http.Error(w, "Unable to get memes", http.StatusInternalServerError)
		return
	}

	internal.WriteJSON(w, http.StatusOK, memes)
}

func (h *Handler) AddMeme(w http.ResponseWriter, r *http.Request) {
	var req SubmittedMemeDTO
	if err := internal.DecodeJSON(w, r, &req); err != nil {
		return
	}

	createdMeme, err := h.service.AddMeme(&req)
	if err != nil {
		http.Error(w, "Unable to add memes", http.StatusInternalServerError)
		return
	}

	internal.WriteJSON(w, http.StatusCreated, createdMeme)
}
