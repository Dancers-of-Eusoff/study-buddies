package rooms

import (
	"time"
)

type Service struct {
	repo Repository
}

func NewService(repo *MemoryRepository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) CreateRoom(req CreateRoomRequest) (RoomDetailsResponse, error) {
	if req.Name == "" {
		return RoomDetailsResponse{}, ErrRoomNameRequired
	}

	if req.OwnerID == "" {
		return RoomDetailsResponse{}, ErrUserIDRequired
	}

	if req.Type != "PUBLIC" && req.Type != "PRIVATE" {
		return RoomDetailsResponse{}, ErrInvalidRoomType
	}

	roomID, err := GenerateID("room")

	if err != nil {
		return RoomDetailsResponse{}, err
	}

	duration := req.DurationMinutes
	if duration <= 0 {
		duration = 60
	}

	inviteCode := ""
	if req.Type == RoomTypePrivate {
		code, err := GenerateRandomCode(6)
		if err != nil {
			return RoomDetailsResponse{}, err
		}
		inviteCode = code
	}

	room := Room{
		ID:              roomID,
		Name:            req.Name,
		Type:            req.Type,
		ModuleCode:      req.ModuleCode,
		InviteCode:      inviteCode,
		OwnerID:         req.OwnerID,
		DurationMinutes: duration,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.CreateRoom(room); err != nil {
		return RoomDetailsResponse{}, err
	}

	ownerName := req.OwnerName
	if ownerName == "" {
		ownerName = req.OwnerID
	}

	owner := RoomMember{
		UserID:      req.OwnerID,
		DisplayName: ownerName,
		Role:        RoleOwner,
		JoinedAt:    time.Now(),
	}

	if err := s.repo.AddRoomMember(room.ID, owner); err != nil {
		return RoomDetailsResponse{}, err
	}

	members, err := s.repo.ListRoomMembers(room.ID)
	if err != nil {
		return RoomDetailsResponse{}, err
	}

	return RoomDetailsResponse{
		Room:    room,
		Members: members,
	}, nil
}

func (s *Service) JoinRoom(req JoinRoomRequest) (RoomDetailsResponse, error) {
	if req.UserID == "" {
		return RoomDetailsResponse{}, ErrUserIDRequired
	}

	var room Room
	var err error

	if req.InviteCode != "" {
		room, err = s.repo.FindRoomByInviteCode(req.InviteCode)
		if err != nil {
			return RoomDetailsResponse{}, err
		}
	} else if req.RoomID != "" {
		room, err = s.repo.FindRoomByID(req.RoomID)
		if err != nil {
			return RoomDetailsResponse{}, err
		}

		if room.Type == RoomTypePrivate {
			return RoomDetailsResponse{}, ErrInviteCodeRequired
		}
	} else {
		return RoomDetailsResponse{}, ErrRoomIDRequired
	}

	userName := req.UserName
	if userName == "" {
		userName = req.UserID
	}

	member := RoomMember{
		UserID:      req.UserID,
		DisplayName: userName,
		Role:        RoleMember,
		JoinedAt:    time.Now(),
	}

	if err := s.repo.AddRoomMember(room.ID, member); err != nil {
		return RoomDetailsResponse{}, err
	}

	members, err := s.repo.ListRoomMembers(room.ID)
	if err != nil {
		return RoomDetailsResponse{}, err
	}

	return RoomDetailsResponse{
		Room:    room,
		Members: members,
	}, nil
}

func (s *Service) GetRoomDetails(roomID string) (RoomDetailsResponse, error) {
	room, err := s.repo.FindRoomByID(roomID)
	if err != nil {
		return RoomDetailsResponse{}, err
	}

	members, err := s.repo.ListRoomMembers(roomID)
	if err != nil {
		return RoomDetailsResponse{}, err
	}

	return RoomDetailsResponse{
		Room:    room,
		Members: members,
	}, nil
}

func (s *Service) ListPublicRooms(moduleCode string) ([]Room, error) {
	return s.repo.ListPublicRooms(moduleCode)
}
