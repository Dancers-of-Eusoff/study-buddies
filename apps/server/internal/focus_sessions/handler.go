package focus_sessions

import (
	"errors"
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
	mux.HandleFunc("POST /api/sessions/start", helper.RequireAuth(h.handleStart))
}

func (h *Handler) handleStart(w http.ResponseWriter, r *http.Request) {
	var req StartSessionRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	// userID/username come from the verified JWT claims already attached to
	// the request context by RequireAuth — never from the request body.
	claims, ok := helper.UserFromContext(r.Context())
	if !ok {
		helper.WriteError(w, http.StatusUnauthorized, helper.ErrInvalidToken)
		return
	}

	session, err := h.service.StartSession(r.Context(), claims.UserID, claims.Username, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrRoomNotFound):
			helper.WriteError(w, http.StatusNotFound, err)
		case errors.Is(err, ErrRoomEnded):
			helper.WriteError(w, http.StatusGone, err)
		default:
			helper.WriteError(w, http.StatusInternalServerError, err)
		}
		return
	}

	helper.WriteJSON(w, http.StatusCreated, session)
}
