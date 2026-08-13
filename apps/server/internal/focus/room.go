package focus

import (
	"encoding/json"
	"sort"
	"sync"
	"time"
)

// Holds live focus state for a room
type Room struct {
	mu    sync.RWMutex
	users map[string]*UserFocusState

	RoomID string
	EndsAt time.Time
	cfg    ScoringConfig
}

func NewRoom(roomID string, endsAt time.Time, cfg ScoringConfig) *Room {
	return &Room{
		users:  make(map[string]*UserFocusState),
		RoomID: roomID,
		EndsAt: endsAt,
		cfg:    cfg,
	}
}

// Registers a user in the room if not already present
// Safe to call again on reconnect
func (r *Room) Join(userID, username string) *UserFocusState {
	r.mu.Lock()
	defer r.mu.Unlock()
	if u, ok := r.users[userID]; ok {
		return u
	}
	u := NewUserFocusState(userID, username)
	r.users[userID] = u
	return u
}

func (r *Room) SetState(userID string, state FocusState) {
	r.mu.RLock()
	u, ok := r.users[userID]
	r.mu.RUnlock()
	if !ok {
		return
	}
	u.SetState(state)
}

// Advances every second (called by registry)
func (r *Room) Tick() []LeaderboardEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, u := range r.users {
		u.Tick(r.cfg)
	}
	return r.sortedLocked()
}

func (r *Room) Snapshot() []LeaderboardEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sortedLocked()
}

func (r *Room) sortedLocked() []LeaderboardEntry {
	entries := make([]LeaderboardEntry, 0, len(r.users))
	for _, u := range r.users {
		entries = append(entries, LeaderboardEntry{
			UserID:   u.UserID,
			Username: u.Username,
			Score:    u.Score,
			State:    u.State,
		})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Score > entries[j].Score
	})
	return entries
}

func (r *Room) Summaries() []UserFocusState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]UserFocusState, 0, len(r.users))
	for _, u := range r.users {
		out = append(out, *u)
	}
	return out
}

// Shape sent to clients
type LeaderboardEntry struct {
	UserID   string     `json:"userId"`
	Username string     `json:"username"`
	Score    float64    `json:"score"`
	State    FocusState `json:"state"`
}

type LeaderboardPayload struct {
	Users []LeaderboardEntry `json:"users"`
}

func MarshalLeaderboard(entries []LeaderboardEntry) json.RawMessage {
	b, _ := json.Marshal(LeaderboardPayload{Users: entries})
	return b
}