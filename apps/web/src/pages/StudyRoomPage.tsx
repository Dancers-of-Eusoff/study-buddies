import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getRoomDetails } from '../api/roomsApi';
import { startSession, endSession, logInterval, heartbeat } from '../api/sessionsApi';
import { getChatHistory, type ChatMessage } from '../api/chatApi';
import { getMemesResponse, getAllMemes } from '../api/dashboardApi';
import { useTimer } from '../hooks/useTimer';
import styles from "./StudyRoomPage.module.css";
import btn from '../components/Buttons.module.css';
import type { RoomDetails } from '../types';
import type { Session, FocusState } from '../types/session';

const FOCUS_STATES: { state: FocusState; label: string; emoji: string; colorVar: string }[] = [
  { state: 'FOCUSED',    label: 'Focused',    emoji: '🟢', colorVar: 'var(--leaf-deep)' },
  { state: 'UNCERTAIN',  label: 'Uncertain',  emoji: '🟡', colorVar: '#d99a2b' },
  { state: 'DISTRACTED', label: 'Distracted', emoji: '🔴', colorVar: 'var(--coral-deep)' },
  { state: 'NO_FACE',    label: 'No face',    emoji: '👻', colorVar: 'var(--sky-deep)' },
  { state: 'PAUSED',     label: 'Paused',     emoji: '⏸️', colorVar: 'var(--bark)' },
];

const DEFAULT_MEMES = [
  {
    id: 'default-1',
    videoURL: 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512025/gahdyum_a93h6l.webm',
  },
  {
    id: 'default-2',
    videoURL: 'https://res.cloudinary.com/jlixjhrm/video/upload/v1783512025/gahdyum_a93h6l.webm', // Replace with second default video URL
  },
];

// How often we sample the camera and update focus state
const DETECTION_INTERVAL_MS = 3000;

// Given all the samples collected during one minute, returns whichever state
// occurred most often — a fairer summary than whatever state happened to be
// active at the exact moment the minute boundary was crossed.
function getMajorityState(samples: FocusState[]): FocusState {
  const counts = new Map<FocusState, number>();
  for (const s of samples) counts.set(s, (counts.get(s) ?? 0) + 1);

  let majority: FocusState = 'FOCUSED';
  let max = 0;
  for (const [state, count] of counts) {
    if (count > max) { max = count; majority = state; }
  }
  return majority;
}

// ─── Destress button ────────────────────────────────────────────────────────

function DestressBtn() {
  const [count, setCount] = useState(0);
  return (
    <button className={styles.destressBtn} onClick={() => setCount(c => c + 1)}>{count}</button>
  );
}

// ─── Flashbang popup ────────────────────────────────────────────────────────

function Flashbang({
  myFocusState,
  setMyFocusState,
  userMemes,
  allMemes,
  selectedMemeId,
}: {
  myFocusState: FocusState;
  setMyFocusState: Dispatch<SetStateAction<FocusState>>;
  userMemes: { id?: string; videoURL: string }[];
  allMemes: { id?: string; videoURL: string }[];
  selectedMemeId: string | null;
}) {
  const [activeMemeUrl, setActiveMemeUrl] = useState<string>('');

  useEffect(() => {
    if (myFocusState === 'DISTRACTED') {
      let memeUrl = '';

      if (selectedMemeId) {
        const combined = [...userMemes, ...allMemes];
        const selectedMeme = combined.find((m) => m.id === selectedMemeId);
        if (selectedMeme) {
          memeUrl = selectedMeme.videoURL;
        }
      }

      if (!memeUrl) {
        const pool = [...allMemes, ...userMemes, ...DEFAULT_MEMES];
        // Deduplicate by videoURL to avoid overweighting duplicates
        const uniquePool = Array.from(new Set(pool.map((m) => m.videoURL)))
          .map((url) => pool.find((m) => m.videoURL === url)!);

        if (uniquePool.length > 0) {
          const randomIndex = Math.floor(Math.random() * uniquePool.length);
          memeUrl = uniquePool[randomIndex].videoURL;
        }
      }

      setActiveMemeUrl(memeUrl);
    }
  }, [myFocusState, userMemes, allMemes, selectedMemeId]);

  if (myFocusState !== 'DISTRACTED') return null;

  return (
    <div className={styles.popup}>
      <div className={styles.flashbang}>
        <button className={styles.closeButton} onClick={() => setMyFocusState("FOCUSED")}>Close</button>
        <video src={activeMemeUrl} autoPlay className={styles.flashbangVideo} />
      </div>
    </div>
  );
}

// ─── Camera / object detection ───────────────────────────────────────────────

const LookAtMe = memo(({ onSample, paused }: { onSample: (f: FocusState) => void; paused: boolean }) => {
  const objectDetectorRef = useRef<ObjectDetector>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(paused);

  // Holds the latest detection routine so the pause/resume effect below can
  // trigger an immediate sample on resume, instead of waiting for the next tick.
  const runDetectionRef = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      onSample("PAUSED");
    } else {
      runDetectionRef.current();
    }
  }, [paused, onSample]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let cancelled = false;

    const runDetection = () => {
      if (!objectDetectorRef.current || !videoRef.current || pausedRef.current) return;

      const startTimeMs = performance.now();
      const results = objectDetectorRef.current.detectForVideo(videoRef.current, startTimeMs);
      const categories = results.detections.flatMap((d) => d.categories.map((c) => c.categoryName));
      const personDetected = categories.includes("person");
      const phoneDetected = categories.includes("cell phone");

      if (!personDetected) onSample("NO_FACE");
      else if (phoneDetected) onSample("DISTRACTED");
      else onSample("FOCUSED");
    };
    runDetectionRef.current = runDetection;

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks("/wasm");
      objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/models/efficientdet_lite0.tflite" },
        scoreThreshold: 0.67,
        runningMode: "VIDEO",
        categoryAllowlist: ["cell phone", "person"]
      });
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.error("Failed to access camera:", err);
        return;
      }

      // The effect was already cleaned up (e.g. React's dev-mode double
      // mount/unmount) before permission resolved — release the camera
      // immediately instead of attaching it to a dead component.
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (err) {
        // Expected if the component unmounts/remounts while play() is still
        // pending — not a real failure.
        if ((err as DOMException).name !== "AbortError") console.error(err);
        return;
      }

      if (cancelled) return;
      intervalId = setInterval(runDetection, DETECTION_INTERVAL_MS);
    };

    init();
    startCamera();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onSample]);

  return (
    <div className={styles.focusVideo}>
      <video ref={videoRef} autoPlay playsInline />
    </div>
  );
});

// ─── Chat panel ──────────────────────────────────────────────────────────────

interface ChatPanelProps {
  roomId: string;
  memberNames: Record<string, string>;
}

function ChatPanel({ roomId, memberNames }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedText, setTypedText] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.userId ?? '';
  const myUsername = user?.username ?? userId;

  function resolveName(senderId: string): string {
    if (senderId === userId) return myUsername;
    return memberNames[senderId] ?? `user_${senderId.slice(-6)}`;
  }

  useEffect(() => {
    if (!user || !roomId) return;
    getChatHistory(roomId)
      .then(setMessages)
      .catch((err) => console.error('Error loading chat history:', err));
  }, [roomId]);

  useEffect(() => {
    if (!userId) return;
    const WS_URL = `ws://${import.meta.env.VITE_BASE_URL}/api/ws?userId=${encodeURIComponent(userId)}`;
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === 'NEW_MESSAGE') {
          const incoming: ChatMessage = frame.payload as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            if (incoming.senderId === userId) {
              const idx = prev.findIndex(
                (m) => m.id.startsWith('optimistic-') && m.content === incoming.content
              );
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = incoming;
                return updated;
              }
            }
            return [...prev, incoming];
          });
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    return () => ws.close();
  }, [roomId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim() || !socketRef.current) return;

    const content = typedText.trim();

    socketRef.current.send(JSON.stringify({
      type: 'SEND_MESSAGE',
      roomId,
      payload: { roomId, senderId: userId, content },
    }));

    setMessages((prev) => [...prev, {
      id: `optimistic-${crypto.randomUUID()}`,
      roomId: roomId!,
      senderId: userId,
      content,
      timestamp: new Date().toISOString(),
    }]);

    setTypedText('');
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatMessageWindow}>
        {messages.length === 0 ? (
          <p className={styles.chatEmpty}>No messages yet — say hi! 👋</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <div key={msg.id} className={`${styles.chatRow} ${isMe ? styles.chatMe : styles.chatThem}`}>
                <div className={styles.chatBubble}>
                  <span className={styles.chatSender}>
                    {isMe ? '🐼' : '🐱'} {resolveName(msg.senderId)}
                  </span>
                  <p className={styles.chatText}>{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className={styles.chatInputRow}>
        <input
          type="text"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Message your study buddies..."
          className={styles.chatInput}
        />
        <button type="submit" className={styles.chatSendBtn}>Send</button>
      </form>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StudyRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [myFocusState, setMyFocusState] = useState<FocusState>('NO_FACE');
  const [trackingPaused, setTrackingPaused] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [userMemes, setUserMemes] = useState<{ id?: string; videoURL: string }[]>([]);
  const [allMemes, setAllMemes] = useState<{ id?: string; videoURL: string }[]>([]);
  const [selectedMemeId, setSelectedMemeId] = useState<string | null>(null);

  const [liveFocusLog, setLiveFocusLog] = useState<{ minute: number; state: FocusState; value: number }[]>([]);

  // Every 3s camera sample lands here; drained into a majority state each minute.
  const sampleLogRef = useRef<FocusState[]>([]);
  const myFocusStateRef = useRef(myFocusState);
  const handleFocusSample = useCallback((state: FocusState) => {
    setMyFocusState(state);
    myFocusStateRef.current = state;
    sampleLogRef.current.push(state);
  }, []);

  const sessionActive = session !== null && session.isActive;
  const { formatted: elapsed, elapsed: elapsedSecs } = useTimer(sessionActive);

  // Reset the live log whenever a fresh session starts
  useEffect(() => {
    if (session?.id) {
      setLiveFocusLog([]);
      sampleLogRef.current = [];
    }
  }, [session?.id]);

  useEffect(() => {
    if (!sessionActive || !session?.id) return;

    const timer = setInterval(() => {
      const minuteState = sampleLogRef.current.length > 0
        ? getMajorityState(sampleLogRef.current)
        : myFocusStateRef.current;
      sampleLogRef.current = [];

      logInterval({
        sessionId: session.id,
        state: minuteState,
      }).catch((err) => console.error('Failed to log interval:', err));

      setLiveFocusLog((prev) => [...prev, { minute: prev.length + 1, state: minuteState, value: 1 }]);
    }, 60000); // 60 seconds

    return () => clearInterval(timer);
  }, [sessionActive, session?.id]);

  // Tells the server this session is still alive — the backend force-ends
  // sessions whose heartbeat goes silent (crashed tab, dead laptop, dropped
  // network). Independent of focus logging: even a PAUSED/DISTRACTED user
  // still needs to keep the heartbeat going or the sweep wrongly concludes
  // they've left.
  useEffect(() => {
    if (!sessionActive || !session?.id) return;

    const beat = setInterval(() => {
      heartbeat(session.id).catch(() => { /* missed beat is fine, next tick retries */ });
    }, 20000); // 20 seconds — well under the backend's 45s stale timeout

    return () => clearInterval(beat);
  }, [sessionActive, session?.id]);

  // Focused vs distracted minute breakdown for the in-session summary
  const focusStats = useMemo(() => {
    const total = liveFocusLog.length;
    const focused = liveFocusLog.filter((e) => e.state === 'FOCUSED').length;
    const distracted = liveFocusLog.filter((e) => e.state === 'DISTRACTED').length;
    const focusPct = total > 0 ? Math.round((focused / total) * 100) : 0;
    return { focused, distracted, focusPct };
  }, [liveFocusLog]);

  const loadRoom = useCallback(async () => {
    if (!user || !roomId) return;
    try {
      const data = await getRoomDetails(roomId);
      setRoomDetails(data);
    } catch (e: unknown) {
      setRoomError(e instanceof Error ? e.message : 'Failed to load room');
    } finally { setLoadingRoom(false); }
  }, [roomId, user]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Load user personal memes and all database memes
  useEffect(() => {
    const fetchMemes = async () => {
      try {
        if (typeof getAllMemes === 'function') {
          const globalData = await getAllMemes();
          if (Array.isArray(globalData)) {
            // Map global memes if needed 
            setAllMemes(globalData.map((m: any) => ({
              id: m.id || m.ID,
              videoURL: m.videoURL || m.VideoURL,
            })));
          }
        }

        if (user?.userId) {
          const userData = await getMemesResponse();
          if (userData) {
            const rawUserMemes = userData.memes;
            if (Array.isArray(rawUserMemes)) {
              setUserMemes(rawUserMemes.map((m: any) => ({
                id: m.id || m.ID,
                videoURL: m.videoURL || m.VideoURL,
              })));
            }
            
            const selectedId = userData.selectedMemeId;
            if (selectedId) {
              setSelectedMemeId(selectedId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load memes:', err);
      }
    };

    fetchMemes();
  }, [user]);

  async function handleStartSession() {
    if (!user || !roomId) return;
    setSessionLoading(true); setSessionError('');
    try {
      const s = await startSession({ userId: user.userId, roomId });
      setSession(s);
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : 'Failed to start session');
    } finally { setSessionLoading(false); }
  }

  async function handleLeave() {
    setLeaving(true);
    if (session && user) {
      try { await endSession({ sessionId: session.id }); } catch { /* ignore */ }
    }
    navigate('/lobby');
  }

  function copyInviteCode() {
    const code = roomDetails?.room.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalSecs = (roomDetails?.room.durationMinutes ?? 60) * 60;
  const remaining = Math.max(0, totalSecs - elapsedSecs);
  const remainingStr = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const progressPct = sessionActive ? Math.min(100, (elapsedSecs / totalSecs) * 100) : 0;
  const focusInfo = FOCUS_STATES.find((f) => f.state === myFocusState) ?? FOCUS_STATES[0];

  if (loadingRoom) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
      Loading study room...
    </div>
  );

  if (roomError) return (
    <div className={styles.errorPage}>
      <span className={styles.errorEmoji}>😓</span>
      <p className={styles.errorText}>{roomError}</p>
      <button onClick={() => navigate('/lobby')} className={btn.primary}>← Back to lobby</button>
    </div>
  );

  const room = roomDetails!.room;
  const members = roomDetails!.members ?? [];

  const memberNames: Record<string, string> = {};
  for (const m of members) {
    memberNames[m.userId] = m.displayName;
  }

  return (
    <div className={styles.page}>
      <div className={styles.blobSky} />
      <div className={styles.blobTan} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <button onClick={() => setShowLeaveConfirm(true)} className={styles.leaveBtn}>← Leave</button>
          <div className={styles.roomTitleRow}>
            <span className={styles.roomTitle}>{room.name}</span>
            {room.moduleCode && <span className={styles.moduleTag}>{room.moduleCode}</span>}
            <span className={styles.typeTag}>{room.type === 'PRIVATE' ? '🔑 Private' : '🌍 Public'}</span>
          </div>
        </div>
        <div className={styles.navCenter}>
          <span>
            Press me to destress: <DestressBtn />
          </span>
        </div>
        <div className={styles.navRight}>
          <button onClick={() => setShowInviteCode((p) => !p)} className={styles.inviteToggleBtn}>
            🔑 Invite code
          </button>
          <button
            onClick={() => setShowChat((p) => !p)}
            className={`${styles.chatToggleBtn} ${showChat ? styles.chatToggleBtnActive : ''}`}
          >
            💬 Chat {showChat ? '✕' : ''}
          </button>
        </div>
      </nav>

      {/* Invite code toast */}
      {showInviteCode && room.inviteCode && (
        <div className={styles.inviteToast}>
          <span className={styles.inviteToastLabel}>Share this code with friends:</span>
          <span className={styles.inviteCode}>{room.inviteCode}</span>
          <button onClick={copyInviteCode} className={styles.inviteCopyBtn}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
          <button onClick={() => setShowInviteCode(false)} className={styles.inviteCloseBtn}>✕</button>
        </div>
      )}

      {/* Main layout */}
      <div className={styles.mainLayout}>

        {/* Left col */}
        <div className={styles.leftCol}>

          {/* Camera */}
          <div className={styles.cameraCard}>
            <LookAtMe onSample={handleFocusSample} paused={trackingPaused} />
          </div>

          {/* Session card */}
          <div className={styles.sessionCard}>
            {!sessionActive ? (
              <div className={styles.sessionIdle}>
                <span className={styles.sessionIdleEmoji}>🌙</span>
                <p className={styles.sessionIdleTitle}>Ready to focus?</p>
                <p className={styles.sessionIdleCopy}>Start your session to begin tracking your focus time.</p>
                {sessionError && <div className={styles.sessionErrorBox}>😓 {sessionError}</div>}
                <button onClick={handleStartSession} disabled={sessionLoading} className={styles.startSessionBtn}>
                  {sessionLoading ? 'Starting...' : '🚀 Start session'}
                </button>
              </div>
            ) : (
              <div className={styles.sessionActiveWrap}>
                {/* Timer */}
                <div className={styles.timerBlock}>
                  <span className={styles.timerLabel}>Elapsed</span>
                  <span className={styles.timerValue}>{elapsed}</span>
                  <span className={styles.timerLabel}>{remaining > 0 ? `${remainingStr} remaining` : "🎉 Time's up!"}</span>
                </div>
                {/* Progress */}
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
                {/* Focus status — live from the camera */}
                <div>
                  <p className={styles.focusPickerLabel}>Focus status (live from your camera):</p>
                  <div className={styles.focusPickerRow}>
                    <span
                      className={styles.focusChip}
                      style={{ color: focusInfo.colorVar, borderColor: focusInfo.colorVar, fontWeight: 800 }}
                    >{focusInfo.emoji} {focusInfo.label}</span>
                    <button
                      onClick={() => setTrackingPaused((p) => !p)}
                      className={styles.focusChip}
                    >{trackingPaused ? '▶️ Resume tracking' : '⏸️ Pause tracking'}</button>
                  </div>
                </div>
                {/* Focus summary */}
                <div className={styles.statsRow}>
                  {[
                    ['Focused', `${focusStats.focused} min`, 'var(--leaf-deep)'],
                    ['Distracted', `${focusStats.distracted} min`, 'var(--coral-deep)'],
                    ['Focus rate', `${focusStats.focusPct}%`, 'var(--bark)'],
                  ].map(([label, value, color]) => (
                    <div key={label} className={styles.statCard}>
                      <div className={styles.statLabel}>{label}</div>
                      <div className={styles.statValue} style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                {/* Live focus timeline */}
                <div style={{ background: 'var(--paper, #fff)', borderRadius: 12, padding: '12px 8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bark)', marginBottom: 6, paddingLeft: 8 }}>
                    Focus timeline
                  </div>
                  {liveFocusLog.length === 0 ? (
                    <p className={styles.panelEmpty}>Your timeline will appear after the first minute is logged.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={70}>
                      <BarChart data={liveFocusLog} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap={1}>
                        <XAxis
                          dataKey="minute"
                          tick={{ fontSize: 11, fill: 'var(--bark)' }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: 'min', position: 'insideBottomRight', offset: -2, fontSize: 10 }}
                        />
                        <YAxis hide domain={[0, 1]} />
                        <Tooltip
                          formatter={(_value: number, _name: string, item: { payload: { state: FocusState } }) => [
                            FOCUS_STATES.find((f) => f.state === item.payload.state)?.label ?? item.payload.state,
                            'State',
                          ]}
                        />
                        <Bar dataKey="value" radius={[3, 3, 3, 3]}>
                          {liveFocusLog.map((entry, i) => (
                            <Cell key={i} fill={FOCUS_STATES.find((f) => f.state === entry.state)?.colorVar ?? 'var(--bark)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {/* Stats */}
                <div className={styles.statsRow}>
                  {[['Session ID', session.id.slice(-8)], ['Duration', `${room.durationMinutes}m`]].map(([label, value]) => (
                    <div key={label} className={styles.statCard}>
                      <div className={styles.statLabel}>{label}</div>
                      <div className={styles.statValue}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className={styles.rightCol}>

          {/* Chat panel — only mounts when token is ready to guarantee history loads */}
          {showChat && roomId && user && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelHeaderEmoji}>💬</span>
                <h2 className={styles.panelHeaderTitle}>Room Chat</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className={styles.chatClosePanelBtn}
                  aria-label="Close chat"
                >✕</button>
              </div>
              <ChatPanel roomId={roomId} memberNames={memberNames} />
            </div>
          )}

          {/* Members */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelHeaderEmoji}>👥</span>
              <h2 className={styles.panelHeaderTitle}>In this room</h2>
              <span className={styles.panelHeaderBadge}>{members.length}</span>
            </div>
            <div className={styles.panelBody}>
              {members.length === 0 ? (
                <p className={styles.panelEmpty}>No members yet</p>
              ) : members.map((m) => (
                <div key={m.userId} className={m.userId === user?.userId ? styles.memberRowSelf : styles.memberRow}>
                  <span className={styles.memberAvatar}>{m.userId === user?.userId ? '🐼' : '🐱'}</span>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {m.displayName}
                      {m.userId === user?.userId && <span className={styles.memberYou}> (you)</span>}
                    </div>
                    <div className={styles.memberRole}>{m.role === 'OWNER' ? '👑 Owner' : '👤 Member'}</div>
                  </div>
                  <div
                    className={styles.memberStatusDot}
                    style={{ background: m.userId === user?.userId ? focusInfo.colorVar : 'var(--tan-deep)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelHeaderEmoji}>🏆</span>
              <h2 className={styles.panelHeaderTitle}>Leaderboard</h2>
              <span className={styles.panelHeaderNote}>live soon™</span>
            </div>
            <div className={styles.panelBody}>
              {members.length === 0 ? (
                <p className={styles.panelEmpty}>Waiting for members...</p>
              ) : members.map((m, i) => (
                <div key={m.userId} className={m.userId === user?.userId ? styles.leaderRowSelf : styles.leaderRow}>
                  <span className={styles.leaderRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <span className={styles.leaderAvatar}>{m.userId === user?.userId ? '🐼' : '🐱'}</span>
                  <span className={styles.leaderName}>{m.displayName}</span>
                  <span className={styles.leaderPts}>— pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room info */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelHeaderEmoji}>ℹ️</span>
              <h2 className={styles.panelHeaderTitle}>Room info</h2>
            </div>
            <div className={styles.infoBody}>
              {[
                ['Duration', `${room.durationMinutes} minutes`],
                ['Type', room.type === 'PRIVATE' ? '🔑 Private' : '🌍 Public'],
                ...(room.moduleCode ? [['Module', room.moduleCode]] : []),
                ['Room ID', room.id],
              ].map(([label, value]) => (
                <div key={label} className={styles.infoRow}>
                  <span className={styles.infoLabel}>{label}</span>
                  <span className={label === 'Room ID' ? styles.infoValueMono : styles.infoValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <div onClick={() => setShowLeaveConfirm(false)} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.leaveModalCard}>
            <span className={styles.leaveModalEmoji}>😢</span>
            <h2 className={styles.leaveModalTitle}>Leave the room?</h2>
            <p className={styles.leaveModalCopy}>{sessionActive ? 'Your session will be ended and progress saved.' : 'Are you sure you want to leave?'}</p>
            <div className={styles.leaveModalActions}>
              <button onClick={() => setShowLeaveConfirm(false)} className={btn.ghost}>Stay 💪</button>
              <button onClick={handleLeave} disabled={leaving} className={styles.leaveConfirmBtn}>{leaving ? 'Leaving...' : 'Leave room'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Flashbang popup */}
      <Flashbang
        myFocusState={myFocusState}
        setMyFocusState={setMyFocusState}
        userMemes={userMemes}
        allMemes={allMemes}
        selectedMemeId={selectedMemeId}
      />
    </div>
  );
}