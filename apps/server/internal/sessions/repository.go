package sessions

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/redis/go-redis/v9"
)

type Repository interface {
	CreateSession(session StudySession) error
	FindSessionByID(id string) (StudySession, error)
	UpdateSession(session StudySession) error
	LogFocusInterval(interval FocusInterval) error
	ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error)
	ListSessionsByUserID(userID string) ([]StudySession, error)
}

type RedisRepository struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisRepository(client *redis.Client) *RedisRepository {
	return &RedisRepository{
		client: client,
		ctx:    context.Background(),
	}
}

func sessionKey(id string) string {
	return "session:" + id
}

func intervalsKey(sessionID string) string {
	return "session:intervals:" + sessionID
}

func userSessionsKey(userID string) string {
	return "user:sessions:" + userID
}

func (r *RedisRepository) CreateSession(session StudySession) error {
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}

	pipe := r.client.TxPipeline()
	pipe.Set(r.ctx, sessionKey(session.ID), data, 0)
	pipe.SAdd(r.ctx, userSessionsKey(session.UserID), session.ID)
	_, err = pipe.Exec(r.ctx)
	return err
}

func (r *RedisRepository) FindSessionByID(id string) (StudySession, error) {
	data, err := r.client.Get(r.ctx, sessionKey(id)).Bytes()
	if errors.Is(err, redis.Nil) {
		return StudySession{}, ErrSessionNotFound
	}
	if err != nil {
		return StudySession{}, err
	}

	var session StudySession
	if err := json.Unmarshal(data, &session); err != nil {
		return StudySession{}, err
	}
	return session, nil
}

func (r *RedisRepository) UpdateSession(session StudySession) error {
	exists, err := r.client.Exists(r.ctx, sessionKey(session.ID)).Result()
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrSessionNotFound
	}

	data, err := json.Marshal(session)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, sessionKey(session.ID), data, 0).Err()
}

func (r *RedisRepository) LogFocusInterval(interval FocusInterval) error {
	exists, err := r.client.Exists(r.ctx, sessionKey(interval.SessionID)).Result()
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrSessionNotFound
	}

	data, err := json.Marshal(interval)
	if err != nil {
		return err
	}

	return r.client.RPush(r.ctx, intervalsKey(interval.SessionID), data).Err()
}

func (r *RedisRepository) ListIntervalsBySessionID(sessionID string) ([]FocusInterval, error) {
	exists, err := r.client.Exists(r.ctx, sessionKey(sessionID)).Result()
	if err != nil {
		return nil, err
	}
	if exists == 0 {
		return []FocusInterval{}, ErrSessionNotFound
	}

	raw, err := r.client.LRange(r.ctx, intervalsKey(sessionID), 0, -1).Result()
	if err != nil {
		return nil, err
	}

	intervals := make([]FocusInterval, 0, len(raw))
	for _, item := range raw {
		var interval FocusInterval
		if err := json.Unmarshal([]byte(item), &interval); err != nil {
			return nil, err
		}
		intervals = append(intervals, interval)
	}
	return intervals, nil
}

func (r *RedisRepository) ListSessionsByUserID(userID string) ([]StudySession, error) {
	ids, err := r.client.SMembers(r.ctx, userSessionsKey(userID)).Result()
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return []StudySession{}, nil
	}

	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = sessionKey(id)
	}

	results, err := r.client.MGet(r.ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	var userSessions []StudySession
	for _, res := range results {
		if res == nil {
			continue // session expired/deleted but ID still in the set
		}
		var session StudySession
		if err := json.Unmarshal([]byte(res.(string)), &session); err != nil {
			return nil, err
		}
		userSessions = append(userSessions, session)
	}
	return userSessions, nil
}
