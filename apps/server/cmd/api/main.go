package main

import (
	"log"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/sessions"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/users"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/websocket"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// --- WebSocket Infrastructure Block Initialization ---
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// --- Existing Feature Package Initializations ---
	roomRepo := rooms.NewMemoryRepository()
	roomService := rooms.NewService(roomRepo)
	roomHandler := rooms.NewHandler(roomService)
	roomHandler.RegisterRoutes(mux)

	sessionRepo := sessions.NewMemoryRepository()
	sessionService := sessions.NewService(sessionRepo)
	sessionHandler := sessions.NewHandler(sessionService)
	sessionHandler.RegisterRoutes(mux)

	userRepo := users.NewMemoryRepository()
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(mux)

	// --- Pure Infrastructure Testing Endpoint ---
	wsHandler := websocket.NewHandler(wsHub)
	mux.HandleFunc("/api/ws", func(w http.ResponseWriter, r *http.Request) {
		wsHandler.HandleConnect(w, r, func(event websocket.Event, client *websocket.Client) {
			switch event.Type {
			case "JOIN_TEST_ROOM":
				wsHub.SubscribeToRoom(event.RoomID, client)
				log.Printf("User [%s] subscribed to testing room context [%s]", client.UserID, event.RoomID)

			case "TEST_ECHO":
				log.Printf("Received structural echo test packet for room [%s]", event.RoomID)
				wsHub.BroadcastEvent(event)
			}
		})
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Study Buddies backend is running"))
	})

	log.Println("🚀 Study Buddies backend running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
