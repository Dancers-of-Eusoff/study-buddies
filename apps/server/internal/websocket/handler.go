package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Aligns with your local development configurations
	},
}

type Handler struct {
	Hub *Hub
}

func NewHandler(hub *Hub) *Handler {
	return &Handler{Hub: hub}
}

func (h *Handler) HandleConnect(w http.ResponseWriter, r *http.Request, onMessage func(Event, *Client)) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "Missing userId query parameter", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		Hub:    h.Hub,
		Conn:   conn,
		UserID: userID,
		send:   make(chan Event, 256),
	}

	h.Hub.register <- client

	go client.WritePump()
	go client.ReadPump(onMessage)
}
