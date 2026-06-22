package websocket

import (
	"encoding/json"
	"sync"
)

type Event struct {
	Type    string          `json:"type"`
	RoomID  string          `json:"roomId,omitempty"`
	Payload json.RawMessage `json:"payload"`
}

type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]map[*Client]bool
	clients    map[string]*Client
	broadcast  chan Event
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		clients:    make(map[string]*Client),
		broadcast:  make(chan Event),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				h.removeFromAllRooms(client)
				close(client.send)
			}
			h.mu.Unlock()

		case event := <-h.broadcast:
			h.mu.RLock()
			if subscribers, ok := h.rooms[event.RoomID]; ok {
				for client := range subscribers {
					select {
					case client.send <- event:
					default:
						close(client.send)
						h.removeFromAllRooms(client)
						delete(h.clients, client.UserID)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) SubscribeToRoom(roomID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[*Client]bool)
	}
	h.rooms[roomID][client] = true
}

func (h *Hub) removeFromAllRooms(client *Client) {
	for roomID, subscribers := range h.rooms {
		delete(subscribers, client)
		if len(subscribers) == 0 {
			delete(h.rooms, roomID)
		}
	}
}

func (h *Hub) BroadcastEvent(event Event) {
	h.broadcast <- event
}
