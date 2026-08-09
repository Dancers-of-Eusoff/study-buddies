package websocket

import (
	"log"
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
	log.Println("Handle connect start")
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "Missing userId query parameter", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	log.Printf("Context: %+v", ctx)
	user, ok := helper.UserFromContext(ctx)
	log.Printf("User: %+v", user)
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

var allowedOrigins = map[string]bool{
	"http://localhost:5173":                true,
	"https://study-buddies-red.vercel.app": true, // vercel production
}

// func (h *Handler) HandleWebsocket(w http.ResponseWriter, r *http.Request) {
// 	// Handle OPTIONS preflight before WebSocket upgrade to avoid hijack errors
// 	origin := r.Header.Get("Origin")
// 	if allowedOrigins[origin] {
// 		log.Printf("WS request origin: %v", origin)
// 		w.Header().Set("Access-Control-Allow-Origin", origin)
// 	}
// 	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
// 	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
// 	w.Header().Set("Access-Control-Allow-Credentials", "true")
// 	if r.Method == http.MethodOptions {
// 		w.WriteHeader(http.StatusNoContent)
// 		return
// 	}
// 	h.HandleConnect(w, r, func(event Event, client *Client) {
// 		log.Printf("📨 Event [%s] roomId [%s] from user [%s]", event.Type, event.RoomID, client.UserID)
		
// 		switch event.Type {
			
// 		case "JOIN_ROOM":
// 			h.Hub.SubscribeToRoom(event.RoomID, client)
// 			log.Printf("✅ User [%s] joined room [%s]", client.UserID, event.RoomID)

// 		case "SEND_MESSAGE":
// 			var payload chat.SendMessagePayload
// 			if err := json.Unmarshal(event.Payload, &payload); err != nil {
// 				log.Printf("❌ SEND_MESSAGE parse error: %v", err)
// 				return
// 			}
// 			if _, err := chatService.ProcessSentMessage(payload); err != nil {
// 				log.Printf("❌ ProcessSentMessage error: %v", err)
// 			}
// 		}
// 	})
// }