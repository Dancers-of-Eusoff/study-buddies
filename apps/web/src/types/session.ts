export type FocusState = 'FOCUSED' | 'UNCERTAIN' | 'DISTRACTED' | 'NO_FACE' | 'PAUSED';

export interface Session {
  id: string;
  roomId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  finalScore?: number;
}

export interface FocusInterval {
  id: string;
  sessionId: string;
  state: FocusState;
  durationSeconds: number;
  createdAt: string;
}

export interface SessionDetailsResponse {
  session: Session;
  intervals: FocusInterval[];
}

export interface StartSessionRequest {
  userId: string;
  roomId: string;
}

export interface EndSessionRequest {
  sessionId: string;
}

export interface LogIntervalRequest {
  sessionId: string;
  state: FocusState;
  durationSeconds?: number;
}