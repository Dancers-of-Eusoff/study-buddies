import { useEffect, useState, useRef, CSSProperties, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoomProvider, useRoom } from '../context/RoomContext';
import { getChatHistory, type ChatMessage } from '../api/chatApi';
import styles from './SexierStudyRoomPage.module.css';

function Navbar() {
    const { user } = useAuth();
    const roomDetails = useRoom();

    if (!roomDetails) return <div>Loading...</div>;
    
    const { room } = roomDetails;
    const { name: roomName, moduleCode: roomModuleCode, type: roomType, inviteCode } = room;

    return (
        <nav className={styles.navbar}>
            <div className={styles.navLeft}>
                <button onClick={() => console.log("Leaving room")} className={styles.leaveBtn}>← Leave</button>
                <div className={styles.roomInfo}>
                    <span className={styles.roomName}>{roomName}</span>
                    {roomModuleCode && <span className={styles.roomModuleTag}>{roomModuleCode}</span>}
                    <span className={styles.roomTypeTag}>{roomType}</span>
                </div>
            </div>
            <div className={styles.navRight}>
                {roomType === "PRIVATE" && <button className={styles.inviteBtn}>{inviteCode}</button>}
                <div className={styles.userBadge}>
                    <span>🐼 {user?.username}</span>
                </div>
            </div>
        </nav>
    );
}

function ChatComponent() {
    const { user, token } = useAuth();
    const roomDetails = useRoom();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typedText, setTypedText] = useState("");
    const socketRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const roomId = roomDetails?.room?.id;
    const userId = user?.userId || "anonymous_user";

    // 1. Fetch historical messages on room load
    useEffect(() => {
        if (roomId && token) {
            getChatHistory(token, roomId)
                .then(setMessages)
                .catch((err) => console.error("Error loading chat history:", err));
        }
    }, [roomId, token]);

    // 2. Open live WebSocket network connection stream
    useEffect(() => {
        if (!roomId) return;

        const wsUrl = `ws://localhost:8080/api/ws?userId=${encodeURIComponent(userId)}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "JOIN_ROOM",
                roomId: roomId
            }));
        };

        ws.onmessage = (event) => {
            try {
                const messageFrame = JSON.parse(event.data);
                if (messageFrame.type === "NEW_MESSAGE") {
                    // Handle binary/base64 fallback encoding from some server engines safely
                    const freshMessage: ChatMessage = JSON.parse(
                        messageFrame.payload.startsWith?.('{') 
                            ? messageFrame.payload 
                            : atob(messageFrame.payload)
                    );
                    setMessages((prev) => [...prev, freshMessage]);
                }
            } catch (err) {
                console.error("Error parsing socket packet:", err);
            }
        };

        return () => {
            ws.close();
        };
    }, [roomId, userId]);

    // 3. Auto-scroll panel to latest items
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!typedText.trim() || !socketRef.current) return;

        const outboundPayload = {
            roomId: roomId,
            senderId: userId,
            content: typedText.trim()
        };

        socketRef.current.send(JSON.stringify({
            type: "SEND_MESSAGE",
            roomId: roomId,
            payload: outboundPayload
        }));

        setTypedText("");
    };

    return (
        <div className={styles.chatSection}>
            <div className={styles.chatHeader}>
                <h3>Live Room Chat</h3>
            </div>
            
            {/* THIS IS THE PLACEMENT GRID BOX WHERE MESSAGES ARE RENDERED */}
            <div className={styles.chatMessageWindow}>
                {messages.length === 0 ? (
                    <div className={styles.emptyChatChat}>No messages yet. Start the conversation!</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === userId;
                        return (
                            <div key={msg.id} className={`${styles.chatRow} ${isMe ? styles.chatMe : styles.chatThem}`}>
                                <div className={styles.chatBubble}>
                                    <span className={styles.chatSender}>@{msg.senderId.slice(0, 7)}</span>
                                    <p className={styles.chatText}>{msg.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* CHAT INPUT AREA FIELD ELEMENT BOX */}
            <form onSubmit={handleSendMessage} className={styles.chatInputBlock}>
                <input 
                    type="text"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder="Type a message to study buddies..."
                    className={styles.chatField}
                />
                <button type="submit" className={styles.chatSendBtn}>Send</button>
            </form>
        </div>
    );
}

function Card({ children, style } : { children : ReactNode, style?: CSSProperties}) {
    return (
        <div className={styles.card} style={style}>
            {children}
        </div>
    )
}

export default function SexierStudyRoomPage() {
    return (
        <div className={styles.container}>
            <RoomProvider>
                <div className={styles.blobTopRight} />
                <div className={styles.blobBottomLeft} />
                
                <Navbar />
                
                {/* Master Flex / Grid Partition Panel Workspace */}
                <div className={styles.mainWorkspace}>
                    
                    {/* Left Column Canvas Content area */}
                    <div className={styles.focusStreamSection}>
                        <div className={styles.focusVideo}>
                            <div style={{ color: 'var(--bark)', fontWeight: 600 }}>
                                🎥 Focus Camera & Computer Vision Feed Panel
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column Real-Time Integrated Drawer Chat Component */}
                    <ChatComponent />
                    
                </div>
            </RoomProvider>
        </div>
    );
}