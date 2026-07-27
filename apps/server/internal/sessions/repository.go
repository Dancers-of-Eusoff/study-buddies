// this is for repository code
// for now will use golang memory but later change to sql

package sessions

import "sync"

type Repository interface {
	CreateSession(session StudySession) error
	FindSessionByID(id string) (StudySession, error)
	UpdateSession(session StudySession) error
	LogFocusInterval(interval FocusInterval) error
	ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error)
	ListSessionsByUserID(userID string) ([]StudySession, error)
}

type MemoryRepository struct {
	mu        sync.RWMutex
	sessions  map[string]StudySession
	intervals map[string][]FocusInterval
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		sessions:  make(map[string]StudySession),
		intervals: make(map[string][]FocusInterval),
	}
}

func (r *MemoryRepository) CreateSession(session StudySession) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.sessions[session.ID] = session

	r.intervals[session.ID] = make([]FocusInterval, 0)

	return nil
}

func (r *MemoryRepository) FindSessionByID(id string) (StudySession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

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
	r.mu.Lock()
	defer r.mu.Unlock()

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

	return userSessions, nil
}
