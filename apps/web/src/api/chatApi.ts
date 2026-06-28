export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

const BASE = 'http://localhost:8080/api/chat/history';

export async function getChatHistory(token: string, roomId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch chat history');
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as ChatMessage[];
}