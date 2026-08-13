import { useEffect, useRef, useState, useCallback } from 'react';

export type FocusState = 'FOCUSED' | 'UNCERTAIN' | 'DISTRACTED' | 'NO_FACE' | 'PAUSED';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  state: FocusState;
}

export function useFocusSocket(roomId: string = "", userId: string | undefined) {
  const socketRef = useRef<WebSocket | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId || !roomId) return;

    const WS_URL = `${import.meta.env.VITE_WEBSOCKET_URL}?roomId=${encodeURIComponent(roomId)}`;
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));
      setConnected(true);
    };

    ws.onerror = (error) => {
      console.error('Focus WebSocket transport error:', error);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === 'FOCUS_LEADERBOARD') {
          const { users } = frame.payload as { users: LeaderboardEntry[] };
          setLeaderboard(users);
        }
      } catch (err) {
        console.error('Focus WS parse error:', err);
      }
    };

    return () => {
      setConnected(false);
      ws.close();
    };
  }, [roomId, userId]);

  const lastSentState = useRef<FocusState | null>(null);
  const sendFocusState = useCallback((state: FocusState) => {
    if (state === lastSentState.current) return;
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    lastSentState.current = state;
    ws.send(JSON.stringify({
      type: 'FOCUS_STATE',
      roomId,
      payload: { state },
    }));
  }, [roomId]);

  return { leaderboard, connected, sendFocusState };
}