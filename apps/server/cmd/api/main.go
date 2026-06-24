package main

import (
	"encoding/json"
	"database/sql"
	"log"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/chat"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/sessions"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/users"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/websocket"

	_ "github.com/lib/pq"
)

func corsMiddleware(next http.Handler) http.Handler {	
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") == "websocket" {
			next.ServeHTTP(w, r)
			return
		}
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

func NewDB(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

func main() {
	mux := http.NewServeMux()

	// --- WebSocket Infrastructure ---
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// --- Chat Service (wired to WebSocket hub) ---
	chatRepo := chat.NewMemoryRepository()
	chatService := chat.NewService(chatRepo, wsHub)

	// --- Existing Feature Packages ---
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

	// --- WebSocket endpoint ---
	wsHandler := websocket.NewHandler(wsHub)
	mux.HandleFunc("/api/ws", func(w http.ResponseWriter, r *http.Request) {
		// Handle OPTIONS preflight before WebSocket upgrade to avoid hijack errors
		if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.WriteHeader(http.StatusNoContent)
		return
		}
		wsHandler.HandleConnect(w, r, func(event websocket.Event, client *websocket.Client) {
		log.Printf("📨 Event [%s] roomId [%s] from user [%s]", event.Type, event.RoomID, client.UserID)

		switch event.Type {

		case "JOIN_ROOM":
			wsHub.SubscribeToRoom(event.RoomID, client)
			log.Printf("✅ User [%s] joined room [%s]", client.UserID, event.RoomID)

		case "SEND_MESSAGE":
			var payload chat.SendMessagePayload
			if err := json.Unmarshal(event.Payload, &payload); err != nil {
			log.Printf("❌ SEND_MESSAGE parse error: %v", err)
			return
			}
			if _, err := chatService.ProcessSentMessage(payload); err != nil {
			log.Printf("❌ ProcessSentMessage error: %v", err)
			}
		}
		})
	})

	// --- Chat history REST endpoint ---
	mux.HandleFunc("/api/chat/history", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		roomID := r.URL.Query().Get("roomId")
		if roomID == "" {
			http.Error(w, "Missing roomId", http.StatusBadRequest)
			return
		}
		msgs, err := chatService.GetHistory(roomID)
		if err != nil {
			http.Error(w, "Failed to fetch history", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(msgs)
	})
	// DB connection
	// connStr := "postgres://postgres:secret@localhost:5432/postgres?sslmode=disable"
	// db, err := NewDB(connStr)
	// if err != nil {
	// 	log.Fatal(err)
	// }

	// Initialise Repos
	// usersRepo := users.NewUserRepo(db)
	// usersRepo.CreateUser(users.CreateUserParams{Username: "Tan", Password: "6969", Email: "tan@tantan.tan"})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Study Buddies backend is running"))
	})

	log.Println("🚀 Study Buddies backend running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
