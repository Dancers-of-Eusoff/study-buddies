// this file is for variable blueprint

package rooms

import (
	"errors"
	"time"
)

type RoomType string

const (
	RoomTypePublic  RoomType = "PUBLIC"
	RoomTypePrivate RoomType = "PRIVATE"
)

type RoomRole string

const (
	RoleOwner  RoomRole = "OWNER"
	RoleMember RoomRole = "MEMBER"
)

var (
	ErrRoomNotFound               = errors.New("room not found")
	ErrInvalidRoomType            = errors.New("invalid room type")
	ErrInviteCodeRequired         = errors.New("invite code is required for private rooms")
	ErrRoomIDRequired             = errors.New("room id or invite code is required")
	ErrUserIDRequired             = errors.New("user id is required")
	ErrRoomNameRequired           = errors.New("room name is required")
	ErrInviteCodeGenerationFailed = errors.New("failed to generate unique invite code")
)

type Room struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Type            RoomType  `json:"type"`
	ModuleCode      string    `json:"moduleCode,omitempty"`
	InviteCode      string    `json:"inviteCode,omitempty"`
	OwnerID         string    `json:"ownerId"`
	DurationMinutes int       `json:"durationMinutes"`
	CreatedAt       time.Time `json:"createdAt"`
}

type RoomMember struct {
	UserID      string    `json:"userId"`
	DisplayName string    `json:"displayName"`
	Role        RoomRole  `json:"role"`
	JoinedAt    time.Time `json:"joinedAt"`
}

type CreateRoomRequest struct {
	Name            string   `json:"name"`
	Type            RoomType `json:"type"`
	ModuleCode      string   `json:"moduleCode"`
	OwnerID         string   `json:"ownerId"`
	OwnerName       string   `json:"ownerName"`
	DurationMinutes int      `json:"durationMinutes"`
}

type JoinRoomRequest struct {
	UserID     string `json:"userId"`
	UserName   string `json:"userName"`
	RoomID     string `json:"roomId"`
	InviteCode string `json:"inviteCode"`
}

type RoomDetailsResponse struct {
	Room    Room         `json:"room"`
	Members []RoomMember `json:"members"`
}
