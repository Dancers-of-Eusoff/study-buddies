package rooms

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// assign http to function
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/rooms/join", h.handleJoinRoom)
	mux.HandleFunc("/api/rooms/", h.handleRoomByID)
	mux.HandleFunc("/api/rooms", h.handleRooms)
}

// basically, w for output, r for input
func (h *Handler) handleRooms(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.createRoom(w, r)

	case http.MethodGet:
		h.listPublicRooms(w, r)

	default:
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) createRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	response, err := h.service.CreateRoom(req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, response)
}

func (h *Handler) listPublicRooms(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	moduleCode := r.URL.Query().Get("module")

	rooms, err := h.service.ListPublicRooms(moduleCode)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, rooms)
}

func (h *Handler) handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req JoinRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	response, err := h.service.JoinRoom(req)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, response)
	return
}

func (h *Handler) handleRoomByID(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	roomID := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
	if roomID == "" {
		writeJSONError(w, http.StatusBadRequest, "room id is required")
		return
	}

	response, err := h.service.GetRoomDetails(roomID)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, response)
	return
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrRoomNotFound):
		writeJSONError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrInvalidRoomType),
		errors.Is(err, ErrInviteCodeRequired),
		errors.Is(err, ErrRoomIDRequired),
		errors.Is(err, ErrUserIDRequired),
		errors.Is(err, ErrRoomNameRequired):
		writeJSONError(w, http.StatusBadRequest, err.Error())
	default:
		writeJSONError(w, http.StatusInternalServerError, err.Error())
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
