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

// Registry owns every live Room, keyed by roomID, plus the top-level lock
// guarding creation/deletion of Room entries themselves (per-room mutation
// is independently guarded by each Room's own RWMutex).
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

// StartOrGetRoom returns the live Room for roomID, creating and starting its
// ticker goroutine on first call. Called from the POST /api/sessions/start
// handler (not lazily on WS join, per the agreed design — the room's
// existence/expiry is authoritative from the rooms table).
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

// runRoom is the per-room 1s ticker goroutine. Ticks until EndsAt, then
// persists summaries via onEnd and removes the room from the registry.
func (reg *Registry) runRoom(r *Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for now := range ticker.C {
		if now.After(r.EndsAt) {
			break
		}

		entries := r.Tick()
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

// HandleFocusState is wired into the existing WS dispatch switch (alongside
// JOIN_ROOM / SEND_MESSAGE) for the FOCUS_STATE event type. It also handles
// JOIN_ROOM-adjacent registration: a user's UserFocusState is created lazily
// here on their first FOCUS_STATE message if not already present, covering
// reconnects (Join is idempotent).
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

	// Send an immediate snapshot back
	reg.broadcastLeaderboard(room.RoomID, room.Snapshot())
}
