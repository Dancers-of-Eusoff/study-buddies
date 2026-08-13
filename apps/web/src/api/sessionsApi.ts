import type { Session, SessionDetailsResponse, FocusInterval, StartSessionRequest, EndSessionRequest, LogIntervalRequest} from "../types/session";
import apiFetch from './apiFetch';

const PATH: string = '/sessions';
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

export async function startSession(req: StartSessionRequest): Promise<Session> {
  const res = await apiFetch(`${PATH}/start`, 'POST', {...includeCred, body: JSON.stringify(req)})
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to start session'));
  return data as unknown as Session;
}

export async function endSession(req: EndSessionRequest): Promise<Session> {
  const res = await apiFetch(`${PATH}/end`, 'POST', {...includeCred, body: JSON.stringify(req)})
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to end session'));
  return data as unknown as Session;
}

export async function logInterval(req: LogIntervalRequest): Promise<FocusInterval> {
  const res = await apiFetch(`${PATH}/interval`, 'POST', {...includeCred, body: JSON.stringify(req)})
  const data = await safeJson(res);
  if (!res.ok) throw new Error(friendlyError(data.error as string ?? '', 'Failed to log interval'));
  return data as unknown as FocusInterval;
}

export async function getUserSessions(): Promise<SessionDetailsResponse[]> {
  const res = await apiFetch(`${PATH}/user`, 'GET', includeCred);
  if (!res.ok) {
    throw new Error('Failed to fetch user sessions');
  }
  // const sex = res.json()
  // console.log("RES: ", res)
  // console.log("RES json: ", sex)
  return res.json();
}

export async function heartbeat(sessionId: string): Promise<void> {
  await apiFetch(`${PATH}/${sessionId}/heartbeat`, 'POST', includeCred);
}