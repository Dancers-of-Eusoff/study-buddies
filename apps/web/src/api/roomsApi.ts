import type { Room, RoomDetails, CreateRoomRequest, JoinRoomRequest } from '../types';
import apiFetch from './apiFetch';

const API_PATH: string = '/rooms';
const includeCred: RequestInit = { credentials: 'include' }

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text); }
  catch { return { error: text.trim() }; }
}

function friendlyError(raw: string, fallback: string): string {
  if (!raw) return fallback;
  const l = raw.toLowerCase();
  if (l.includes('unexpected') || l.includes('json') || l.includes('execute')) return fallback;
  if (raw.length > 100) return fallback;
  return raw;
}

export async function listPublicRooms(moduleCode?: string): Promise<Room[]> {
  const url = moduleCode ? `${API_PATH}?module=${encodeURIComponent(moduleCode)}` : API_PATH;
  const res = await apiFetch(url, 'GET', includeCred);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to fetch rooms'));
  return (Array.isArray(data) ? data : []) as Room[];
}

export async function createRoom(req: CreateRoomRequest): Promise<RoomDetails> {
  const res = await apiFetch(API_PATH, 'POST', {...includeCred, body: JSON.stringify(req)});
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to create room'));

  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}

export async function joinRoom(req: JoinRoomRequest): Promise<RoomDetails> {
  const res = await apiFetch(`${API_PATH}-join`, 'POST', {...includeCred, body: JSON.stringify(req)});
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to join room'));
  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}

export async function getRoomDetails(roomId: string): Promise<RoomDetails> {
  const res = await apiFetch(`${API_PATH}/${roomId}`, 'GET', includeCred)
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Room not found'));
  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}