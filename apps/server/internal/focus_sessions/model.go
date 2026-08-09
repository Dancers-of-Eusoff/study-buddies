package focus_sessions

import "time"

// StudySession represents one user's live participation in a room's shared
// focus session. Not persisted on its own — session_summaries is written
// once, when the room ends (see focus.OnRoomEnd), from the live in-memory
// focus.UserFocusState, not from this struct. This struct is purely the
// HTTP response shape for POST /api/sessions/start plus the fields the
// summary writer needs at room-end time (UserID, RoomID).
type StudySession struct {
	UserID          string    `json:"userId"`
	RoomID          string    `json:"roomId"`
	StartTime       time.Time `json:"startTime"`
	RoomEndsAt      time.Time `json:"roomEndsAt"`
	DurationMinutes int       `json:"durationMinutes"` // room's remaining minutes at join time, for frontend display
}

type StartSessionRequest struct {
	RoomID string `json:"roomId"`
}
