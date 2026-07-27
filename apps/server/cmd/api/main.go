package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/chat"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/dashboards"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/sessions"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/users"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/websocket"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	_ "github.com/lib/pq"
)

var allowedOrigins = map[string]bool{
	"http://localhost:5173":                true,
	"https://study-buddies-red.vercel.app": true, // vercel production
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") == "websocket" {
			next.ServeHTTP(w, r)
			return
		}
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, QUERY")
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

func NewRedisClient(addr, password string) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
	})
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return client, nil
}

func main() {
	// DB connection
	if err := godotenv.Load(".env.local"); err != nil {
		log.Println("no .env.local file found") // non-fatal, prod uses real env vars
	}

	connStr := os.Getenv("DATABASE_URL")
	db, err := NewDB(connStr)
	if err != nil {
		log.Fatal(err)
	}

	redisClient, err := NewRedisClient(os.Getenv("REDIS_ADDR"), os.Getenv("REDIS_PASSWORD"))
	if err != nil {
		log.Fatal(err)
	}
	defer redisClient.Close()

	mux := http.NewServeMux()

	// --- WebSocket Infrastructure ---
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// --- Existing Feature Packages ---
	// --- Chat Service (wired to WebSocket hub) ---
	chatRepo := chat.NewMemoryRepository()
	chatService := chat.NewService(chatRepo, wsHub)
	chatHandler := chat.NewHandler(chatService)
	chatHandler.RegisterRoutes(mux)

	// Not Connected to DB
	roomRepo := rooms.NewMemoryRepository()
	roomService := rooms.NewService(roomRepo)
	roomHandler := rooms.NewHandler(roomService)
	roomHandler.RegisterRoutes(mux)

	// Connected to Redis
	sessionRepo := sessions.NewRedisRepository(redisClient)
	sessionService := sessions.NewService(sessionRepo)
	sessionHandler := sessions.NewHandler(sessionService)
	sessionHandler.RegisterRoutes(mux)

	// Connected to DB
	dashboardRepo := dashboards.NewDashboardRepo(db)
	dashboardService := dashboards.NewService(dashboardRepo)
	dashboardHandler := dashboards.NewHandler(dashboardService)
	dashboardHandler.RegisterRoutes(mux)

	userRepo := users.NewUserRepo(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(mux)

	// --- WebSocket endpoint ---
	wsHandler := websocket.NewHandler(wsHub)
	mux.HandleFunc("/api/ws", func(w http.ResponseWriter, r *http.Request) {
		// Handle OPTIONS preflight before WebSocket upgrade to avoid hijack errors
		if r.Method == http.MethodOptions {
			origin := r.Header.Get("Origin")
			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
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

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Study Buddies backend is running"))
	})

	log.Println("🚀 Study Buddies backend running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
