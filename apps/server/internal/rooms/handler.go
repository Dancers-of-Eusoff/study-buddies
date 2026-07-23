package rooms

import (
	"encoding/json"
	"errors"
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

// assign http to function
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/rooms-join", h.base.RequireAuth(h.handleJoinRoom))
	mux.HandleFunc("GET /api/rooms/{roomID}", h.base.RequireAuth(h.handleRoomByID))
	mux.HandleFunc("GET /api/rooms", h.base.RequireAuth(h.listPublicRooms))
	mux.HandleFunc("POST /api/rooms", h.base.RequireAuth(h.createRoom))
}

func (h *Handler) createRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.base.WriteError(w, http.StatusBadRequest, errors.New("invalid JSON body"))
		return
	}

	response, err := h.service.CreateRoom(req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	h.base.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handler) listPublicRooms(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	moduleCode := r.URL.Query().Get("module")

	rooms, err := h.service.ListPublicRooms(moduleCode)
	if err != nil {
		h.base.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	h.base.WriteJSON(w, http.StatusOK, rooms)
}

func (h *Handler) handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// if r.Method != http.MethodPost {
	// 	writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	// 	return
	// }

	var req JoinRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.base.WriteError(w, http.StatusBadRequest, errors.New("invalid JSON body"))
		return
	}

	response, err := h.service.JoinRoom(req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	h.base.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) handleRoomByID(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// if r.Method != http.MethodGet {
	// 	writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	// 	return
	// }

	roomID := r.PathValue("roomID")
	if roomID == "" {
		h.base.WriteError(w, http.StatusBadRequest, errors.New("room id is required"))
		return
	}

	response, err := h.service.GetRoomDetails(roomID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	h.base.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrRoomNotFound):
		h.base.WriteError(w, http.StatusNotFound, err)
	case errors.Is(err, ErrInvalidRoomType),
		errors.Is(err, ErrInviteCodeRequired),
		errors.Is(err, ErrRoomIDRequired),
		errors.Is(err, ErrUserIDRequired),
		errors.Is(err, ErrRoomNameRequired):
		h.base.WriteError(w, http.StatusBadRequest, err)
	default:
		h.base.WriteError(w, http.StatusInternalServerError, err)
	}
}

// func writeJSON(w http.ResponseWriter, status int, value any) {
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(status)
// 	_ = json.NewEncoder(w).Encode(value)
// }

// func writeJSONError(w http.ResponseWriter, status int, message string) {
// 	writeJSON(w, status, map[string]string{"error": message})
// }
