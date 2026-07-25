package rooms

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
	mux.HandleFunc("POST /api/rooms-join", helper.RequireAuth(h.handleJoinRoom))
	mux.HandleFunc("GET /api/rooms/{roomID}", helper.RequireAuth(h.handleRoomByID))
	mux.HandleFunc("GET /api/rooms", helper.RequireAuth(h.listPublicRooms))
	mux.HandleFunc("POST /api/rooms", helper.RequireAuth(h.createRoom))
}

func (h *Handler) createRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateRoomRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	response, err := h.service.CreateRoom(req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	helper.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handler) listPublicRooms(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	moduleCode := r.URL.Query().Get("module")

	rooms, err := h.service.ListPublicRooms(moduleCode)
	if err != nil {
		helper.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	helper.WriteJSON(w, http.StatusOK, rooms)
}

func (h *Handler) handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req JoinRoomRequest
	if err := helper.DecodeJSON(w, r, &req); err != nil {
		return
	}

	response, err := h.service.JoinRoom(req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	helper.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) handleRoomByID(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	roomID := r.PathValue("roomID")
	if roomID == "" {
		helper.WriteError(w, http.StatusBadRequest, errors.New("room id is required"))
		return
	}

	response, err := h.service.GetRoomDetails(roomID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	helper.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrRoomNotFound):
		helper.WriteError(w, http.StatusNotFound, err)
	case errors.Is(err, ErrInvalidRoomType),
		errors.Is(err, ErrInviteCodeRequired),
		errors.Is(err, ErrRoomIDRequired),
		errors.Is(err, ErrUserIDRequired),
		errors.Is(err, ErrRoomNameRequired):
		helper.WriteError(w, http.StatusBadRequest, err)
	default:
		helper.WriteError(w, http.StatusInternalServerError, err)
	}
}