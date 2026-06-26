import type { Session, FocusInterval, StartSessionRequest, EndSessionRequest, LogIntervalRequest } from '../types';

const BASE = `${import.meta.env.VITE_BASE_URL}/api/sessions`;

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

export async function startSession(token: string, req: StartSessionRequest): Promise<Session> {
  const res = await fetch(`${BASE}/start`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(req),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to start session'));
  return data as unknown as Session;
}

export async function endSession(token: string, req: EndSessionRequest): Promise<Session> {
  const res = await fetch(`${BASE}/end`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(req),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to end session'));
  return data as unknown as Session;
}

export async function logInterval(token: string, req: LogIntervalRequest): Promise<FocusInterval> {
  const res = await fetch(`${BASE}/interval`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(req),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to log interval'));
  return data as unknown as FocusInterval;
}