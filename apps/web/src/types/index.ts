// Auth
export interface User {
  userId: string;
  username: string;
}

export interface AuthResponse {
  username: string;
  userId: string;
}

// Rooms
export type RoomType = 'PUBLIC' | 'PRIVATE';
export type MemberRole = 'OWNER' | 'MEMBER';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  moduleCode: string;
  inviteCode: string;       
  ownerId: string;
  durationMinutes: number;
  createdAt: string;
}

export interface RoomMember {
  userId: string;
  displayName: string;
  role: MemberRole;
  joinedAt: string;
}

export interface RoomDetails {
  room: Room;
  members: RoomMember[];    
}

export interface CreateRoomRequest {
  name: string;
  ownerId: string;
  ownerName: string;
  type: RoomType;
  moduleCode: string;
  durationMinutes: number;
}

export interface JoinRoomRequest {
  userId: string;
  userName: string;
  roomId?: string;
  inviteCode?: string;
}