package sessions

import (
	"log"
	"sync"
	"time"
)

type Repository interface {
	CreateSession(session StudySession) error
	FindSessionByID(id string) (StudySession, error)
	UpdateSession(session StudySession) error
	LogFocusInterval(interval FocusInterval) error
	ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error)
	ListSessionsByUserID(userID string) ([]StudySession, error)

	Heartbeat(sessionID string) error
	ListStaleSessionIDs(timeout time.Duration) ([]string, error)
}

type MemoryRepository struct {
	mu         sync.RWMutex
	sessions   map[string]StudySession
	intervals  map[string][]FocusInterval
	heartbeats map[string]time.Time
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		sessions:   make(map[string]StudySession),
		intervals:  make(map[string][]FocusInterval),
		heartbeats: make(map[string]time.Time),
	}
}

func (r *MemoryRepository) CreateSession(session StudySession) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.sessions[session.ID] = session
	r.intervals[session.ID] = make([]FocusInterval, 0)
	r.heartbeats[session.ID] = time.Now()

	return nil
}

func (r *MemoryRepository) FindSessionByID(id string) (StudySession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, ok := r.sessions[id]
	if !ok {
		return StudySession{}, ErrSessionNotFound
	}

	return session, nil
}

func (r *MemoryRepository) UpdateSession(session StudySession) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, ok := r.sessions[session.ID]
	if !ok {
		return ErrSessionNotFound
	}

	r.sessions[session.ID] = session

	if !session.IsActive {
		delete(r.heartbeats, session.ID)
	}

	return nil
}

func (r *MemoryRepository) LogFocusInterval(interval FocusInterval) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, ok := r.sessions[interval.SessionID]
	if !ok {
		return ErrSessionNotFound
	}

	r.intervals[interval.SessionID] = append(r.intervals[interval.SessionID], interval)

	return nil
}

func (r *MemoryRepository) ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	interval, ok := r.intervals[sessionID]
	if !ok {
		return []FocusInterval{}, ErrSessionNotFound
	}

	return interval, nil
}

func (r *MemoryRepository) ListSessionsByUserID(userID string) ([]StudySession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var userSessions []StudySession
	for _, session := range r.sessions {
		if session.UserID == userID {
			userSessions = append(userSessions, session)
		}
	}

	log.Printf("USERID: %v", userID)
	log.Printf("User ses repo: %+v", userSessions)

	return userSessions, nil
}

func (r *MemoryRepository) Heartbeat(sessionID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	session, ok := r.sessions[sessionID]
	if !ok {
		return ErrSessionNotFound
	}
	if !session.IsActive {
		return ErrSessionClosed
	}

	r.heartbeats[sessionID] = time.Now()
	return nil
}

func (r *MemoryRepository) ListStaleSessionIDs(timeout time.Duration) ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var stale []string
	now := time.Now()
	for id, session := range r.sessions {
		if !session.IsActive {
			continue
		}
		lastSeen, ok := r.heartbeats[id]
		if !ok || now.Sub(lastSeen) > timeout {
			stale = append(stale, id)
		}
	}

	return stale, nil
}
