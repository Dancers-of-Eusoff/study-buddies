package focus

import (
	"math"
	"time"
)

// Frontend's FocusState union
type FocusState string

const (
	StateFocused    FocusState = "FOCUSED"
	StateUncertain  FocusState = "UNCERTAIN"
	StateDistracted FocusState = "DISTRACTED"
	StateNoFace     FocusState = "NO_FACE"
	StatePaused     FocusState = "PAUSED"
)

// ScoringConfig holds every tunable constant for the scoring curves.
// Kept as a struct (rather than package-level consts) so it can be swapped
// per-room later (e.g. difficulty modes) without changing call sites.
type ScoringConfig struct {
	// Sigmoid focus-growth curve: increment(t) = Base + (Max-Base) / (1 + e^(-K*(t-Midpoint)))
	Base      float64 // increment per second at the start of a focus streak
	Max       float64 // plateau increment per second for a long streak
	Midpoint  float64 // streak length (seconds) at the curve's steepest point
	Steepness float64 // K: controls how sharply the curve ramps around Midpoint

	// Flat linear penalty applied every second in DISTRACTED or NO_FACE.
	DistractionRate float64
}

// DefaultScoringConfig gives the shape agreed on: negligible growth early,
// steep ramp around the 10-minute mark, effectively plateaued by 15 minutes.
func DefaultScoringConfig() ScoringConfig {
	return ScoringConfig{
		Base:            1.0,
		Max:             8.0,
		Midpoint:        600, // 10 min
		Steepness:       0.015,
		DistractionRate: 1.0,
	}
}

// FocusIncrement returns the per-second score gain for a continuous focus
// streak of the given length in seconds. Monotonically increasing, bounded
// above by cfg.Max, effectively saturated by ~cfg.Midpoint+300s given the
// default steepness.
func (cfg ScoringConfig) FocusIncrement(streakSeconds float64) float64 {
	sigmoid := 1.0 / (1.0 + math.Exp(-cfg.Steepness*(streakSeconds-cfg.Midpoint)))
	return cfg.Base + (cfg.Max-cfg.Base)*sigmoid
}

// UserFocusState is the live, in-memory state for a single user within a room.
// All fields are only ever mutated by the room's ticker goroutine — no
// concurrent writers — so no per-field locking is needed (the Room-level
// RWMutex protects the map of these, not their contents).
type UserFocusState struct {
	UserID   string
	Username string

	// JoinedAt is when this user started tracking within the room — becomes
	// session_summaries.start_time. Set once, at creation, never mutated.
	JoinedAt time.Time

	Score float64
	State FocusState

	// FocusStreakSeconds counts continuous seconds spent in StateFocused.
	// Reset to 0 on DISTRACTED/NO_FACE. Held steady (not reset) on
	// UNCERTAIN/PAUSED, per the agreed "pause not reset" rule.
	FocusStreakSeconds float64

	// FocusDurationSeconds / DistractionDurationSeconds are the raw
	// integer-second counters persisted to session_summaries at session end.
	FocusDurationSeconds      int
	DistractionDurationSeconds int
}

// NewUserFocusState creates a fresh per-user tracker, starting in NO_FACE
// (camera hasn't classified anything yet) so a first tick before any client
// message can't accidentally be counted as focused.
func NewUserFocusState(userID, username string) *UserFocusState {
	return &UserFocusState{
		UserID:   userID,
		Username: username,
		State:    StateNoFace,
		JoinedAt: time.Now(),
	}
}

// SetState updates the user's live classification. It does NOT itself apply
// any score/time delta — that happens once per second in Tick, driven by
// whatever State currently is. This mirrors the "server-tick, client only
// reports state changes" design.
func (u *UserFocusState) SetState(s FocusState) {
	u.State = s
}

// Tick applies exactly one second's worth of score/streak/duration change
// based on the user's current State. Returns false if the state is PAUSED,
// signalling to the caller that the room-level session clock should also be
// treated as frozen for this tick from this user's perspective (the room as
// a whole still uses a single shared clock — see Room.Tick — but per-user
// PAUSED is surfaced here for correctness/testability).
func (u *UserFocusState) Tick(cfg ScoringConfig) {
	switch u.State {
	case StateFocused:
		u.FocusStreakSeconds++
		u.Score += cfg.FocusIncrement(u.FocusStreakSeconds)
		u.FocusDurationSeconds++

	case StateDistracted, StateNoFace:
		u.FocusStreakSeconds = 0
		u.Score -= cfg.DistractionRate
		if u.Score < 0 {
			u.Score = 0
		}
		u.DistractionDurationSeconds++

	case StateUncertain:
		// Score frozen, streak held (not reset), no duration bucket.

	case StatePaused:
		// Score frozen, streak held, no duration bucket, no session-clock
		// advance — enforced by the Room ticker skipping ticks entirely
		// when the *room* is in a paused state. Per-user PAUSED does not
		// pause the shared room clock (Q13: one shared endTime) — only a
		// room-level pause would, which isn't in scope. A user who pauses
		// just stops accumulating for themselves while the room clock
		// keeps counting down.
	}
}
