// this is for repository code
// for now will use golang memory but later change to sql

package rooms

import "sync"

type Repository interface {
	CreateRoom(room Room) error
	FindRoomByID(roomID string) (Room, error)
	FindRoomByInviteCode(inviteCode string) (Room, error)
	AddRoomMember(roomID string, member RoomMember) error
	ListRoomMembers(roomID string) ([]RoomMember, error)
	ListPublicRooms(moduleCode string) ([]Room, error)
}

type MemoryRepository struct {
	mu      sync.RWMutex
	rooms   map[string]Room
	members map[string]map[string]RoomMember
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		rooms:   make(map[string]Room),
		members: make(map[string]map[string]RoomMember),
	}
}

func (r *MemoryRepository) CreateRoom(room Room) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	r.rooms[room.ID] = room
	r.members[room.ID] = make(map[string]RoomMember)

	return nil
}

func (r *MemoryRepository) FindRoomByID(roomID string) (Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	room, err := r.rooms[roomID]
	if !err {
		return Room{}, ErrRoomNotFound
	}

	return room, nil
}

func (r *MemoryRepository) FindRoomByInviteCode(inviteCode string) (Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, room := range r.rooms {
		if room.InviteCode == inviteCode {
			return room, nil
		}
	}

	return Room{}, ErrRoomNotFound
}

func (r *MemoryRepository) AddRoomMember(roomID string, member RoomMember) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, err := r.rooms[roomID]; !err {
		return ErrRoomNotFound
	}

	if _, err := r.members[roomID]; !err {
		r.members[roomID] = make(map[string]RoomMember)
	}

	existing, alreadyJoined := r.members[roomID][member.UserID]
	if alreadyJoined && existing.Role == RoleOwner {
		member.Role = RoleOwner
	}

	r.members[roomID][member.UserID] = member

	return nil
}

func (r *MemoryRepository) ListRoomMembers(roomID string) ([]RoomMember, error) {

	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, err := r.rooms[roomID]; !err {
		return nil, ErrRoomNotFound
	}

	roomMembers := r.members[roomID]

	result := make([]RoomMember, 0, len(roomMembers))
	for _, member := range roomMembers {
		result = append(result, member)
	}

	return result, nil
}

func (r *MemoryRepository) ListPublicRooms(moduleCode string) ([]Room, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := []Room{}

	for _, room := range r.rooms {
		if room.Type != RoomTypePublic {
			continue
		}

		if moduleCode != "" && room.ModuleCode != moduleCode {
			continue
		}

		result = append(result, room)
	}

	return result, nil
}
