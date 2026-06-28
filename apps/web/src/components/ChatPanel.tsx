import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, type ChatMessage } from '../api/chatApi';
import styles from './ChatPanel.module.css';

interface Props {
  roomId: string;
}

export default function ChatPanel({ roomId }: Props) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedText, setTypedText] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.userId ?? 'anonymous_user';

  // Load history
  useEffect(() => {
    if (token) {
      getChatHistory(token, roomId)
        .then(setMessages)
        .catch(console.error);
    }
  }, [roomId, token]);

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/api/ws?userId=${encodeURIComponent(userId)}`);
    socketRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === 'NEW_MESSAGE') {
          const msg: ChatMessage = JSON.parse(
            frame.payload.startsWith?.('{') ? frame.payload : atob(frame.payload)
          );
          setMessages((prev) => [...prev, msg]);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    return () => ws.close();
  }, [roomId, userId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'SEND_MESSAGE',
      roomId,
      payload: { roomId, senderId: userId, content: typedText.trim() },
    }));
    setTypedText('');
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.messageWindow}>
        {messages.length === 0
          ? <p className={styles.empty}>No messages yet — say hi! 👋</p>
          : messages.map((msg) => {
              const isMe = msg.senderId === userId;
              return (
                <div key={msg.id} className={`${styles.row} ${isMe ? styles.me : styles.them}`}>
                  <div className={styles.bubble}>
                    <span className={styles.sender}>@{msg.senderId.slice(0, 7)}</span>
                    <p className={styles.text}>{msg.content}</p>
                  </div>
                </div>
              );
            })
        }
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className={styles.inputRow}>
        <input
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Message your study buddies..."
          className={styles.input}
        />
        <button type="submit" className={styles.sendBtn}>Send</button>
      </form>
    </div>
  );
}