package websocket

import (
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/helper"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Handler struct {
	Hub *Hub
}

func NewHandler(hub *Hub) *Handler {
	return &Handler{Hub: hub}
}

func (h *Handler) HandleConnect(w http.ResponseWriter, r *http.Request, onMessage func(Event, *Client)) {
	ctx := r.Context()
	user, ok := helper.UserFromContext(ctx)
	if !ok {
		return 
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		Hub:    h.Hub,
		Conn:   conn,
		UserID: user.UserID,
		Username: user.Username,
		send:   make(chan Event, 256),
	}

	h.Hub.register <- client

	go client.WritePump()
	go client.ReadPump(onMessage)
}