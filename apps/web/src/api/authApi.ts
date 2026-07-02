import type { AuthResponse, User } from '../types';

const BASE = `${import.meta.env.VITE_BASE_URL}/api/auth`;

async function safeJson(res: Response): Promise<Record<string, string>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.trim() };
  }
}

function friendlyError(raw: string, fallback: string): string {
  if (!raw) return fallback;
  const l = raw.toLowerCase();
  if (l.includes('unexpected') || l.includes('execute') || l.includes('json')) return fallback;
  if (l.includes('method not allowed')) return fallback;
  if (l.includes('already taken')) return 'That username is already taken 😅';
  if (l.includes('invalid username or password') || l.includes('unauthorized')) return 'Wrong username or password 🔐';
  if (l.includes('username must be between 3 and 20')) return 'Username must be between 3 and 20 characters';
  if (l.includes('at least 6')) return 'Password must be at least 6 characters';
  if (raw.length > 100) return fallback;
  return raw;
}

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(body.error ?? '', 'Registration failed, please try again'));
  return body as unknown as AuthResponse;
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(body.error ?? '', 'Wrong username or password 🔐'));
  return body as unknown as AuthResponse;
}

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(body.error ?? '', 'Session expired, please log in again'));
  return body as unknown as User;
}