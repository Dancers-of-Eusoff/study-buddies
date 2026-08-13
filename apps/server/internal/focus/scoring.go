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

// Tunable constants for the scoring curves
type ScoringConfig struct {
	// Sigmoid
	// increment(t) = Base + (Max-Base) / (1 + e^(-K*(t-Midpoint)))
	Base      float64
	Max       float64 // plateau
	Midpoint  float64
	Steepness float64 // K

	// Flat linear penalty
	DistractionRate float64
}

// Steep ramp: 10 min; Plateau: 15 minutes
func DefaultScoringConfig() ScoringConfig {
	return ScoringConfig{
		Base:            1.0,
		Max:             8.0,
		Midpoint:        600, // 10 min
		Steepness:       0.015,
		DistractionRate: 1.0,
	}
}

// per-second score gain for a continuous focus
func (cfg ScoringConfig) FocusIncrement(streakSeconds float64) float64 {
	sigmoid := 1.0 / (1.0 + math.Exp(-cfg.Steepness*(streakSeconds-cfg.Midpoint)))
	return cfg.Base + (cfg.Max-cfg.Base)*sigmoid
}

// live state for a single user within a room
type UserFocusState struct {
	UserID   string
	Username string

	// When this user started tracking within the room
	JoinedAt time.Time

	Score float64
	State FocusState

	// Continuous seconds in StateFocused
	// Reset to 0 on DISTRACTED/NO_FACE
	// Steady (without resetting) in UNCERTAIN/PAUSED
	FocusStreakSeconds float64

	FocusDurationSeconds      int
	DistractionDurationSeconds int
}

// Default state: NoFace
func NewUserFocusState(userID, username string) *UserFocusState {
	return &UserFocusState{
		UserID:   userID,
		Username: username,
		State:    StateNoFace,
		JoinedAt: time.Now(),
	}
}

func (u *UserFocusState) SetState(s FocusState) {
	u.State = s
}

// Tick every second
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
		// Score frozen, do nothing
	case StatePaused:
		// Score frozen, do nothing
	}
}
