package focus

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/Dancers-of-Eusoff/study-buddies/apps/server/internal/websocket"
)

const (
	EventFocusState       = "FOCUS_STATE"       // client -> server
	EventFocusLeaderboard = "FOCUS_LEADERBOARD"  // server -> client
)

// client -> server message shape:
// {"type": "FOCUS_STATE", "roomId": "...", "payload": {"state": "FOCUSED"}}
type FocusStatePayload struct {
	State FocusState `json:"state"`
}

// Called after its final tick. Wired to sessions.SummaryRepository.SaveSummary
type OnRoomEnd func(roomID string, summaries []UserFocusState)

// Registry owns every live Room, keyed by roomID
type Registry struct {
	mu    sync.RWMutex
	rooms map[string]*Room

	hub     *websocket.Hub
	cfg     ScoringConfig
	onEnd   OnRoomEnd
}

func NewRegistry(hub *websocket.Hub, cfg ScoringConfig, onEnd OnRoomEnd) *Registry {
	return &Registry{
		rooms: make(map[string]*Room),
		hub:   hub,
		cfg:   cfg,
		onEnd: onEnd,
	}
}

// Called from POST /api/sessions/start
func (reg *Registry) StartOrGetRoom(roomID string, endsAt time.Time) *Room {
	reg.mu.Lock()
	defer reg.mu.Unlock()

	if r, ok := reg.rooms[roomID]; ok {
		return r
	}

	r := NewRoom(roomID, endsAt, reg.cfg)
	reg.rooms[roomID] = r
	go reg.runRoom(r)
	return r
}

// Starts 1s ticker, till EndsAt,
// then save to summaries via onEnd, finally removes room from reg
func (reg *Registry) runRoom(r *Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for now := range ticker.C {
		if now.After(r.EndsAt) {
			break
		}

		entries := r.Tick()			// telling the room every second passing
		reg.broadcastLeaderboard(r.RoomID, entries)
	}

	summaries := r.Summaries()
	if reg.onEnd != nil {
		reg.onEnd(r.RoomID, summaries)
	}

	reg.mu.Lock()
	delete(reg.rooms, r.RoomID)
	reg.mu.Unlock()
}

func (reg *Registry) broadcastLeaderboard(roomID string, entries []LeaderboardEntry) {
	reg.hub.BroadcastEvent(websocket.Event{
		Type:    EventFocusLeaderboard,
		RoomID:  roomID,
		Payload: MarshalLeaderboard(entries),
	})
}

func (reg *Registry) HandleFocusState(event websocket.Event, client *websocket.Client) {
	reg.mu.RLock()
	room, ok := reg.rooms[event.RoomID]
	reg.mu.RUnlock()
	if !ok {
		log.Printf("FOCUS_STATE for unknown/ended room [%s] from user [%s]", event.RoomID, client.UserID)
		return
	}

	var payload FocusStatePayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		log.Printf("FOCUS_STATE parse error: %v", err)
		return
	}

	room.Join(client.UserID, client.Username)
	room.SetState(client.UserID, payload.State)

	// Send immediate snapshot back
	reg.broadcastLeaderboard(room.RoomID, room.Snapshot())
}
