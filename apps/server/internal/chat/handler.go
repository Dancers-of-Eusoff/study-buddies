package chat

import (
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
	mux.HandleFunc("GET /api/chat/history", h.base.RequireAuth(h.HandleChatHistory))
}

func (h *Handler) HandleChatHistory(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("roomId")
	if roomID == "" {
		http.Error(w, "Missing roomId", http.StatusBadRequest)
		return
	}
	msgs, err := h.service.GetHistory(roomID)
	if err != nil {
		http.Error(w, "Failed to fetch history", http.StatusInternalServerError)
		return
	}
	internal.WriteJSON(w, http.StatusOK, msgs)
}