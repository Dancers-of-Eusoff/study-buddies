import { useState, useEffect, useCallback, useRef, memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision"
import { useAuth } from '../context/AuthContext';
import { getRoomDetails } from '../api/roomsApi';
import { startSession, endSession } from '../api/sessionsApi';
import { useTimer } from '../hooks/useTimer';
import styles from "./StudyRoomPage.module.css";
import type { RoomDetails, Session, FocusState } from '../types';

const C = {
  navy: '#2d2b55', mid: '#6b6891', soft: '#9d9bc0',
  lavender100: '#f0eeff', lavender200: '#ddd8ff', lavender300: '#c4bafe',
  lavender400: '#a99af5', lavender500: '#8b79e8', lavender600: '#6c5dd3',
  peach100: '#fff0e8', peach200: '#fdddc8',
  cream: '#fffbf7', white: '#ffffff',
};
const font = { display: "'Fredoka One', cursive", body: "'Nunito', sans-serif" };

const FOCUS_STATES: { state: FocusState; label: string; emoji: string; color: string }[] = [
  { state: 'FOCUSED',    label: 'Focused',    emoji: '🟢', color: '#22c55e' },
  { state: 'UNCERTAIN',  label: 'Uncertain',  emoji: '🟡', color: '#f59e0b' },
  { state: 'DISTRACTED', label: 'Distracted', emoji: '🔴', color: '#ef4444' },
  { state: 'NO_FACE',    label: 'No face',    emoji: '👻', color: '#8b9cf0' },
  { state: 'PAUSED',     label: 'Paused',     emoji: '⏸️', color: '#9d9bc0' },
];

function Flashbang({ myFocusState, setMyFocusState } : { myFocusState: FocusState; setMyFocusState: Dispatch<SetStateAction<FocusState>> }) {
  return myFocusState == 'DISTRACTED' && (
    <div className={ styles.popup }>
      <div className={ styles.flashbang }>
        <button className={ styles.closeButton } onClick={() => setMyFocusState("FOCUSED")}>Close</button>
        <video src="/flashbangs/sgboleh.mp4" autoPlay className={ styles.flashbangVideo } />
      </div>
    </div>
  )
}

const LookAtMe = memo(({ myFocusState, setMyFocusState } : { myFocusState: FocusState, setMyFocusState: (f: FocusState) => void }) => {
  const objectDetectorRef= useRef<ObjectDetector>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
      const init = async () => {
          const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
          );

          objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
              baseOptions: {
                  modelAssetPath: "/models/efficientdet_lite0.tflite"
              },
              scoreThreshold: 0.67,
              runningMode: "VIDEO",
              categoryAllowlist: ["cell phone"]
          })
      }

      const startCamera = async () => {
          const stream = await navigator.mediaDevices.getUserMedia({
              video: true
          });

          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              predictWebcam();
          }
      };

      function predictWebcam() {
          if (objectDetectorRef.current && videoRef.current) {
            const startTimeMs = performance.now();
            const results = objectDetectorRef.current.detectForVideo(videoRef.current, startTimeMs);
            console.log(`Detections result: ${results.detections[0]}\nFocus state: ${myFocusState}`);
            
            if (results.detections.length > 0 && myFocusState !== "DISTRACTED") {
              setMyFocusState("DISTRACTED");
            }
            
            requestAnimationFrame(predictWebcam);
          }
      }
      
      init();
      startCamera();
  }, []);

  return (
      <>
          <div className={styles.focusVideo}>
              <video ref={videoRef} autoPlay playsInline />
          </div>
      </>
  )
});

export default function StudyRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [myFocusState, setMyFocusState] = useState<FocusState>('FOCUSED');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const sessionActive = session !== null && session.status === 'ACTIVE';
  const { formatted: elapsed, elapsed: elapsedSecs } = useTimer(sessionActive);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRoom = useCallback(async () => {
    if (!token || !roomId) return;
    try {
      const data = await getRoomDetails(token, roomId);
      setRoomDetails(data);
    } catch (e: unknown) {
      setRoomError(e instanceof Error ? e.message : 'Failed to load room');
    } finally { setLoadingRoom(false); }
  }, [token, roomId]);

  useEffect(() => {
    loadRoom();
    pollRef.current = setInterval(loadRoom, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadRoom]);

  async function handleStartSession() {
    if (!token || !user || !roomId) return;
    setSessionLoading(true); setSessionError('');
    try {
      const s = await startSession(token, { userId: user.userId, roomId: roomId });
      setSession(s);
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : 'Failed to start session');
    } finally { setSessionLoading(false); }
  }

  async function handleLeave() {
    setLeaving(true);
    if (session && token) {
      try { await endSession(token, { sessionId: session.id }); } catch { /* ignore */ }
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: C.cream, fontFamily: font.body, color: C.mid, fontWeight: 600 }}>
      <div style={{ width: 44, height: 44, border: `4px solid ${C.lavender200}`, borderTopColor: C.lavender500, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading study room...
    </div>
  );

  if (roomError) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: C.cream, fontFamily: font.body }}>
      <span style={{ fontSize: '2rem' }}>😓</span>
      <p style={{ color: C.mid, fontWeight: 600 }}>{roomError}</p>
      <button onClick={() => navigate('/lobby')} style={{ background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', color: 'white', padding: '10px 24px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, cursor: 'pointer' }}>← Back to lobby</button>
    </div>
  );

  const room = roomDetails!.room;
  const members = roomDetails!.members ?? [];
  const isOwner = room.ownerId === user?.userId;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: font.body, position: 'relative' }}>
      {/* Blobs */}
      <div style={{ position: 'fixed', width: 500, height: 500, background: `radial-gradient(circle, ${C.lavender200} 0%, transparent 70%)`, top: -180, right: -120, borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 400, height: 400, background: `radial-gradient(circle, ${C.peach200} 0%, transparent 70%)`, bottom: -100, left: -80, borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.lavender200}`, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <button onClick={() => setShowLeaveConfirm(true)} style={{ background: C.white, border: `1.5px solid ${C.lavender200}`, color: C.lavender600, padding: '7px 16px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>← Leave</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: font.display, fontSize: '1.15rem', color: C.navy }}>{room.name}</span>
            {room.moduleCode && <span style={{ background: C.lavender100, border: `1px solid ${C.lavender300}`, color: C.lavender600, padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800 }}>{room.moduleCode}</span>}
            <span style={{ background: C.peach100, border: `1px solid ${C.peach200}`, color: '#ee8a58', padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>{room.type === 'PRIVATE' ? '🔑 Private' : '🌍 Public'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {room.type === 'PRIVATE' && isOwner && (
            <button onClick={() => setShowInviteCode((p) => !p)} style={{ background: C.white, border: `1.5px solid ${C.lavender300}`, color: C.lavender600, padding: '7px 14px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>🔑 Invite code</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.lavender100, border: `1px solid ${C.lavender200}`, padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>
            <span>🐼</span><span>{user?.username}</span>
          </div>
        </div>
      </nav>

      {/* Invite code toast */}
      {showInviteCode && room.inviteCode && (
        <div style={{ position: 'relative', zIndex: 9, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: C.lavender100, borderBottom: `1px solid ${C.lavender200}`, padding: '10px 32px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: C.mid }}>Share this code with friends:</span>
          <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.3em', color: C.lavender600, background: C.white, border: `1.5px solid ${C.lavender300}`, padding: '4px 14px', borderRadius: 12 }}>{room.inviteCode}</span>
          <button onClick={copyInviteCode} style={{ background: C.lavender500, border: 'none', color: 'white', padding: '6px 14px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
          <button onClick={() => setShowInviteCode(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.mid, fontSize: '1rem', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Main layout */}
      <div style={{ position: 'relative', zIndex: 5, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Camera placeholder */}
          {/* <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 10, background: `linear-gradient(135deg, ${C.peach100}, ${C.lavender100})`, minHeight: 280 }}>
              <span style={{ fontSize: '3.5rem' }}>📷</span>
              <p style={{ fontFamily: font.display, fontSize: '1.1rem', color: C.navy }}>Camera preview</p>
              <p style={{ fontSize: '0.85rem', color: C.soft }}>CV coming soon~</p>
            </div>
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '6px 18px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', background: focusInfo.color + '22', border: `1.5px solid ${focusInfo.color}55`, color: focusInfo.color }}>
              {focusInfo.emoji} {focusInfo.label}
            </div>
          </div> */}
          <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden', position: 'relative' }}>
            <LookAtMe myFocusState={myFocusState} setMyFocusState={setMyFocusState} />
          </div>

          {/* Session card */}
          <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden', position: 'relative' }}>
            {!sessionActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '12px 0' }}>
                <span style={{ fontSize: '2.5rem' }}>🌙</span>
                <p style={{ fontFamily: font.display, fontSize: '1.3rem', color: C.navy }}>Ready to focus?</p>
                <p style={{ fontSize: '0.88rem', color: C.mid, lineHeight: 1.5, maxWidth: 340 }}>Start your session to begin tracking your focus time.</p>
                {sessionError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 600 }}>😓 {sessionError}</div>}
                <button onClick={handleStartSession} disabled={sessionLoading} style={{ background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', color: 'white', padding: '14px 40px', borderRadius: 999, fontFamily: font.body, fontSize: '1rem', fontWeight: 800, cursor: sessionLoading ? 'not-allowed' : 'pointer', opacity: sessionLoading ? 0.7 : 1, boxShadow: '0 4px 20px rgba(108,93,211,0.35)', marginTop: 8 }}>
                  {sessionLoading ? 'Starting...' : '🚀 Start session'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Timer */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>Elapsed</span>
                  <span style={{ fontFamily: font.display, fontSize: '3rem', color: C.navy, lineHeight: 1.1, display: 'block', margin: '4px 0' }}>{elapsed}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>{remaining > 0 ? `${remainingStr} remaining` : "🎉 Time's up!"}</span>
                </div>
                {/* Progress */}
                <div style={{ height: 8, background: C.lavender100, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.lavender400}, ${C.lavender600})`, borderRadius: 999, width: `${progressPct}%`, transition: 'width 1s linear' }} />
                </div>
                {/* Focus state picker */}
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: C.mid, marginBottom: 10 }}>Your focus state (manual for now):</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {FOCUS_STATES.map((f) => (
                      <button key={f.state} onClick={() => setMyFocusState(f.state)} style={{ background: myFocusState === f.state ? f.color + '18' : C.white, border: `1.5px solid ${myFocusState === f.state ? f.color : C.lavender200}`, color: myFocusState === f.state ? f.color : C.mid, padding: '6px 12px', borderRadius: 999, fontFamily: font.body, fontWeight: myFocusState === f.state ? 800 : 700, fontSize: '0.8rem', cursor: 'pointer' }}>{f.emoji} {f.label}</button>
                    ))}
                  </div>
                </div>
                {/* Stats */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Session ID', session.id.slice(-8)], ['Duration', `${room.durationMinutes}m`]].map(([label, value]) => (
                    <div key={label} style={{ flex: 1, background: C.peach100, border: `1px solid ${C.peach200}`, borderRadius: 16, padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: C.navy, fontFamily: 'monospace' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Members */}
          <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: `1px solid ${C.lavender100}` }}>
              <span style={{ fontSize: '1.2rem' }}>👥</span>
              <h2 style={{ fontFamily: font.display, fontSize: '1.05rem', color: C.navy, flex: 1 }}>In this room</h2>
              <span style={{ background: C.lavender100, color: C.lavender600, padding: '2px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>{members.length}</span>
            </div>
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.length === 0 ? (
                <p style={{ padding: 16, textAlign: 'center', color: C.soft, fontSize: '0.88rem' }}>No members yet</p>
              ) : members.map((m) => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 16, background: m.userId === user?.userId ? C.lavender100 : 'transparent' }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.userId === user?.userId ? '🐼' : '🐱'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.navy }}>
                      {m.displayName}
                      {m.userId === user?.userId && <span style={{ color: C.lavender500, fontWeight: 600 }}> (you)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.soft }}>{m.role === 'OWNER' ? '👑 Owner' : '👤 Member'}</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.userId === user?.userId ? focusInfo.color : C.lavender300, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: `1px solid ${C.lavender100}` }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span>
              <h2 style={{ fontFamily: font.display, fontSize: '1.05rem', color: C.navy, flex: 1 }}>Leaderboard</h2>
              <span style={{ fontSize: '0.72rem', color: C.soft, fontWeight: 600, fontStyle: 'italic' }}>live soon™</span>
            </div>
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.length === 0 ? (
                <p style={{ padding: 16, textAlign: 'center', color: C.soft, fontSize: '0.88rem' }}>Waiting for members...</p>
              ) : members.map((m, i) => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 16, background: m.userId === user?.userId ? C.lavender100 : 'transparent' }}>
                  <span style={{ fontSize: '1rem', width: 28, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <span style={{ fontSize: '1.2rem' }}>{m.userId === user?.userId ? '🐼' : '🐱'}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem', color: C.navy }}>{m.displayName}</span>
                  <span style={{ fontFamily: font.display, fontSize: '0.9rem', color: C.lavender600 }}>— pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room info */}
          <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, boxShadow: '0 4px 24px rgba(108,93,211,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: `1px solid ${C.lavender100}` }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <h2 style={{ fontFamily: font.display, fontSize: '1.05rem', color: C.navy }}>Room info</h2>
            </div>
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Duration', `${room.durationMinutes} minutes`],
                ['Type', room.type === 'PRIVATE' ? '🔑 Private' : '🌍 Public'],
                ...(room.moduleCode ? [['Module', room.moduleCode]] : []),
                ['Room ID', room.id],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: C.peach100, borderRadius: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: C.soft }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, fontFamily: label === 'Room ID' ? 'monospace' : font.body }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <div onClick={() => setShowLeaveConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(45,43,85,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 40, padding: 36, maxWidth: 380, width: '100%', boxShadow: '0 16px 60px rgba(45,43,85,0.2)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, fontFamily: font.body }}>
            <span style={{ fontSize: '3rem' }}>😢</span>
            <h2 style={{ fontFamily: font.display, fontSize: '1.5rem', color: C.navy }}>Leave the room?</h2>
            <p style={{ fontSize: '0.9rem', color: C.mid, lineHeight: 1.6 }}>{sessionActive ? 'Your session will be ended and progress saved.' : 'Are you sure you want to leave?'}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ background: 'transparent', border: `2px solid ${C.lavender300}`, color: C.lavender600, padding: '10px 22px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, cursor: 'pointer' }}>Stay 💪</button>
              <button onClick={handleLeave} disabled={leaving} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '10px 22px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, cursor: leaving ? 'not-allowed' : 'pointer', opacity: leaving ? 0.6 : 1 }}>{leaving ? 'Leaving...' : 'Leave room'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Flashbang popup */}
      <Flashbang myFocusState={myFocusState} setMyFocusState={setMyFocusState} />
    </div>
  );
}