package rooms

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
)

type Repository interface {
	CreateRoom(room Room) (Room, error)
	FindRoomByID(roomID string) (Room, error)
	FindRoomByInviteCode(inviteCode string) (Room, error)
	AddRoomMember(roomID string, member RoomMember) error
	ListRoomMembers(roomID string) ([]RoomMember, error)
	ListPublicRooms(moduleCode string) ([]Room, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// CreateRoom lets Postgres generate the room's UUID (rooms.id DEFAULT
// uuidv7()) rather than pre-assigning one in Go, and returns the room with
// its generated ID and created_at populated.
func (r *PostgresRepository) CreateRoom(room Room) (Room, error) {
	isPublic := room.Type == RoomTypePublic
	expiresAt := time.Now().Add(time.Duration(room.DurationMinutes) * time.Minute)

	const query = `
		INSERT INTO rooms (title, host_id, is_public, module_code, invite_code, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	err := r.db.QueryRowContext(
		context.Background(), query,
		room.Name, room.OwnerID, isPublic, nullIfEmpty(room.ModuleCode), nullIfEmpty(room.InviteCode), expiresAt,
	).Scan(&room.ID, &room.CreatedAt)
	if err != nil {
		return Room{}, err
	}

	room.DurationMinutes = int(expiresAt.Sub(room.CreatedAt).Minutes())
	return room, nil
}

func (r *PostgresRepository) FindRoomByID(roomID string) (Room, error) {
	const query = `
		SELECT id, title, is_public, module_code, invite_code, host_id, created_at, expires_at
		FROM rooms
		WHERE id = $1
	`
	return scanRoom(r.db.QueryRowContext(context.Background(), query, roomID))
}

func (r *PostgresRepository) FindRoomByInviteCode(inviteCode string) (Room, error) {
	const query = `
		SELECT id, title, is_public, module_code, invite_code, host_id, created_at, expires_at
		FROM rooms
		WHERE invite_code = $1
	`
	return scanRoom(r.db.QueryRowContext(context.Background(), query, inviteCode))
}

func (r *PostgresRepository) AddRoomMember(roomID string, member RoomMember) error {
	// Ownership isn't stored here — it's derived from rooms.host_id (see
	// ListRoomMembers) — so a host "rejoining" is just a harmless no-op.
	const query = `
		INSERT INTO room_participants (user_id, room_id, joined_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, room_id) DO NOTHING
	`

	_, err := r.db.ExecContext(context.Background(), query, member.UserID, roomID, member.JoinedAt)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code.Name() == "foreign_key_violation" {
			return ErrRoomNotFound
		}
		return err
	}

	return nil
}

func (r *PostgresRepository) ListRoomMembers(roomID string) ([]RoomMember, error) {
	var hostID string
	err := r.db.QueryRowContext(context.Background(), `SELECT host_id FROM rooms WHERE id = $1`, roomID).Scan(&hostID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRoomNotFound
	}
	if err != nil {
		return nil, err
	}

	const query = `
		SELECT rp.user_id, u.username, rp.joined_at
		FROM room_participants rp
		JOIN users u ON u.id = rp.user_id
		WHERE rp.room_id = $1
	`
	rows, err := r.db.QueryContext(context.Background(), query, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]RoomMember, 0)
	for rows.Next() {
		var m RoomMember
		if err := rows.Scan(&m.UserID, &m.DisplayName, &m.JoinedAt); err != nil {
			return nil, err
		}
		m.Role = RoleMember
		if m.UserID == hostID {
			m.Role = RoleOwner
		}
		result = append(result, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *PostgresRepository) ListPublicRooms(moduleCode string) ([]Room, error) {
	query := `
		SELECT id, title, is_public, module_code, invite_code, host_id, created_at, expires_at
		FROM rooms
		WHERE is_public = true
	`
	args := []any{}
	if moduleCode != "" {
		query += ` AND module_code = $1`
		args = append(args, moduleCode)
	}

	rows, err := r.db.QueryContext(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []Room{}
	for rows.Next() {
		room, err := scanRoomRow(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, room)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// rowScanner covers both *sql.Row and *sql.Rows, which share a Scan method
// but no common interface in the standard library.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanRoom(row rowScanner) (Room, error) {
	room, err := scanRoomRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Room{}, ErrRoomNotFound
	}
	return room, err
}

func scanRoomRow(row rowScanner) (Room, error) {
	var room Room
	var isPublic bool
	var moduleCode, inviteCode sql.NullString
	var expiresAt time.Time

	err := row.Scan(&room.ID, &room.Name, &isPublic, &moduleCode, &inviteCode, &room.OwnerID, &room.CreatedAt, &expiresAt)
	if err != nil {
		return Room{}, err
	}

	room.Type = RoomTypePrivate
	if isPublic {
		room.Type = RoomTypePublic
	}
	room.ModuleCode = moduleCode.String
	room.InviteCode = inviteCode.String
	room.DurationMinutes = int(expiresAt.Sub(room.CreatedAt).Minutes())

	return room, nil
}

func nullIfEmpty(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}
