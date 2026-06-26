import type { Room, RoomDetails, CreateRoomRequest, JoinRoomRequest } from '../types';

const BASE = `${import.meta.env.VITE_BASE_URL}/rooms`;

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

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

export async function listPublicRooms(token: string, moduleCode?: string): Promise<Room[]> {
  const url = moduleCode ? `${BASE}?module=${encodeURIComponent(moduleCode)}` : BASE;
  const res = await fetch(url, { headers: authHeaders(token) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to fetch rooms'));
  return (Array.isArray(data) ? data : []) as Room[];
}

export async function createRoom(token: string, req: CreateRoomRequest): Promise<RoomDetails> {
  const res = await fetch(BASE, {
    method: 'POST', headers: {...authHeaders(token), 'Content-Type':'application/json'}, body: JSON.stringify(req),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to create room'));

  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}

export async function joinRoom(token: string, req: JoinRoomRequest): Promise<RoomDetails> {
  const res = await fetch(`${BASE}-join`, {
    method: 'POST', headers: {...authHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify(req),
  });
  
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to join room'));
  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}

export async function getRoomDetails(token: string, roomId: string): Promise<RoomDetails> {
  const res = await fetch(`${BASE}/${roomId}`,
    { method: 'GET', headers: authHeaders(token) });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Room not found'));
  return { room: (data.room ?? data) as Room, members: (data.members as RoomDetails['members']) ?? [] };
}