import apiFetch from "./apiFetch";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

const PATH = '/chat'

export async function getChatHistory(roomId: string): Promise<ChatMessage[]> {
  const res = await apiFetch(`${PATH}/history?roomId=${encodeURIComponent(roomId)}`, 'GET')
  if (!res.ok) throw new Error('Failed to fetch chat history');
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as ChatMessage[];
}