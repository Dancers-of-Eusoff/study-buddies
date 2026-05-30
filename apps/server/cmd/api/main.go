package main

import (
	"log"
	"net/http"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/rooms"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/sessions"
	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/users"
)

func main() {
	roomRepo := rooms.NewMemoryRepository()
	roomService := rooms.NewService(roomRepo)
	roomHandler := rooms.NewHandler(roomService)

	mux := http.NewServeMux()

	sessionRepo := sessions.NewMemoryRepository()
	sessionService := sessions.NewService(sessionRepo)
	sessionHandler := sessions.NewHandler(sessionService)
	sessionHandler.RegisterRoutes(mux)

	userRepo := users.NewMemoryRepository()
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(mux)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("Study Buddies backend is running"))
	})

	roomHandler.RegisterRoutes(mux)

	log.Println("Study Buddies backend running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
