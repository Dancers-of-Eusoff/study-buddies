package focus

import (
	"encoding/json"
	"sort"
	"sync"
	"time"
)

// Holds live focus state for a room
// Created per room and destroyed once EndsAt has passed
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

// Join registers a user in the room if not already present (idempotent —
// safe to call again on reconnect). start_time for their session_summaries
// row is the moment they first join, per the "late joiners get a shorter
// window within the shared room clock" decision.
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

// SetState applies a client-reported state change for a user already in the
// room. No-op if the user hasn't joined (defensive — shouldn't happen if
// Join is always called before state messages are processed).
func (r *Room) SetState(userID string, state FocusState) {
	r.mu.RLock()
	u, ok := r.users[userID]
	r.mu.RUnlock()
	if !ok {
		return
	}
	u.SetState(state)
}

// Tick advances every user's score/duration by one second and returns the
// leaderboard sorted descending by score. Called once per second by the
// Registry's per-room goroutine.
func (r *Room) Tick() []LeaderboardEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, u := range r.users {
		u.Tick(r.cfg)
	}
	return r.sortedLocked()
}

// Snapshot returns the current leaderboard without advancing time — used
// for the initial broadcast right after a user (re)connects, so they don't
// wait up to 1s for the first tick.
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

// Summaries returns the final focus/distraction durations for every user in
// the room, for persistence to session_summaries when the room ends.
func (r *Room) Summaries() []UserFocusState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]UserFocusState, 0, len(r.users))
	for _, u := range r.users {
		out = append(out, *u)
	}
	return out
}

// LeaderboardEntry is the wire shape sent to clients, sorted descending by
// Score. Score is intentionally float64 on the wire — rounding happens on
// the frontend per the agreed design, so mid-ramp fractional gains aren't
// lost to premature rounding.
type LeaderboardEntry struct {
	UserID   string     `json:"userId"`
	Username string     `json:"username"`
	Score    float64    `json:"score"`
	State    FocusState `json:"state"`
}

// LeaderboardPayload is marshalled into Event.Payload for the
// FOCUS_LEADERBOARD broadcast.
type LeaderboardPayload struct {
	Users []LeaderboardEntry `json:"users"`
}

func MarshalLeaderboard(entries []LeaderboardEntry) json.RawMessage {
	b, _ := json.Marshal(LeaderboardPayload{Users: entries})
	return b
}
