package dashboards

import (
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal"
	// "github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/auth"
)

type Handler struct {
	base *internal.Handler
	service *Service
}

func NewHandler(base *internal.Handler, service *Service) *Handler {
	return &Handler{base: base, service: service}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/dashboard/me", h.base.RequireAuth(h.Me))
	mux.HandleFunc("POST /api/dashboard/submit-meme", h.base.RequireAuth(h.AddMeme))
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
