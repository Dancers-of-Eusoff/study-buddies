import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { listPublicRooms, createRoom, joinRoom } from '../api/roomsApi';
import type { Room, CreateRoomRequest } from '../types';

const C = {
  navy: '#2d2b55', mid: '#6b6891', soft: '#9d9bc0',
  lavender100: '#f0eeff', lavender200: '#ddd8ff', lavender300: '#c4bafe',
  lavender400: '#a99af5', lavender500: '#8b79e8', lavender600: '#6c5dd3',
  peach100: '#fff0e8', peach200: '#fdddc8', peach300: '#f9c4a0',
  cream: '#fffbf7', white: '#ffffff',
};
const font = { display: "'Fredoka One', cursive", body: "'Nunito', sans-serif" };

const DURATION_OPTIONS = [25, 45, 60, 90, 120];
const MODULE_FILTERS = ['', 'CS1010', 'CS2040', 'MA1521', 'ST2334', 'Other'];
type Modal = 'none' | 'create' | 'join-private';

export default function LobbyPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [modal, setModal] = useState<Modal>('none');
  const [joining, setJoining] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', type: 'PUBLIC' as 'PUBLIC' | 'PRIVATE', moduleCode: '', durationMinutes: 60 });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [inviteCode, setInviteCode] = useState('');
  const [joinPrivateLoading, setJoinPrivateLoading] = useState(false);
  const [joinPrivateError, setJoinPrivateError] = useState('');

  const loadRooms = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const data = await listPublicRooms(token, moduleFilter || undefined);
      setRooms(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load rooms');
    } finally { setLoading(false); }
  }, [token, moduleFilter]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  async function handleJoinPublic(room: Room) {
    if (!token || !user) return;
    setJoining(room.id);
    try {
      await joinRoom(token, { userId: user.userId, userName: user.username, roomId: room.id });
      navigate(`/room/${room.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
      setJoining(null);
    }
  }

  async function handleCreateRoom() {
    if (!token || !user) return;
    if (!createForm.name.trim()) { setCreateError('Room name is required'); return; }
    setCreateLoading(true); setCreateError('');
    const req: CreateRoomRequest = {
      name: createForm.name.trim(), ownerId: user.userId, ownerName: user.username,
      type: createForm.type, moduleCode: createForm.moduleCode, durationMinutes: createForm.durationMinutes,
    };
    try {
      const details = await createRoom(token, req);
      navigate(`/room/${details.room.id}`);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create room');
      setCreateLoading(false);
    }
  }

  async function handleJoinPrivate() {
    if (!token || !user) return;
    if (!inviteCode.trim()) { setJoinPrivateError('Invite code is required'); return; }
    setJoinPrivateLoading(true); setJoinPrivateError('');
    try {
      const details = await joinRoom(token, { userId: user.userId, userName: user.username, inviteCode: inviteCode.trim().toUpperCase() });
      navigate(`/room/${details.room.id}`);
    } catch (e: unknown) {
      setJoinPrivateError(e instanceof Error ? e.message : 'Invalid invite code');
      setJoinPrivateLoading(false);
    }
  }

  function closeModal() {
    setModal('none');
    setCreateForm({ name: '', type: 'PUBLIC', moduleCode: '', durationMinutes: 60 });
    setCreateError(''); setInviteCode(''); setJoinPrivateError('');
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: font.body, position: 'relative', overflow: 'hidden' }}>
      {/* Blobs */}
      <div style={{ position: 'fixed', width: 500, height: 500, background: `radial-gradient(circle, ${C.lavender200} 0%, transparent 70%)`, top: -180, right: -120, borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 400, height: 400, background: `radial-gradient(circle, ${C.peach200} 0%, transparent 70%)`, bottom: -100, left: -80, borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.lavender200}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: '1.4rem' }}>📚</span>
          <span style={{ fontFamily: font.display, fontSize: '1.3rem', color: C.navy }}>Study Buddies</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.lavender100, border: `1px solid ${C.lavender200}`, padding: '6px 14px', borderRadius: 999 }}>
            <span>🐼</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.navy }}>{user?.username}</span>
          </div>
          <button onClick={logout} style={{ background: 'transparent', border: `2px solid ${C.lavender300}`, color: C.lavender600, padding: '8px 18px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Log out</button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 1100, margin: '0 auto', padding: '36px 40px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: font.display, fontSize: '2rem', color: C.navy, marginBottom: 4 }}>Study Rooms 🏠</h1>
            <p style={{ fontSize: '0.95rem', color: C.mid, fontWeight: 600 }}>Pick a room and get to work, {user?.username}~</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setModal('join-private')} style={{ background: C.white, border: `2px solid ${C.lavender300}`, color: C.lavender600, padding: '10px 22px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>🔑 Join private room</button>
            <button onClick={() => setModal('create')} style={{ background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', color: 'white', padding: '10px 22px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,93,211,0.3)' }}>✨ Create room</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {MODULE_FILTERS.map((m) => (
            <button key={m || 'all'} onClick={() => setModuleFilter(m)} style={{
              background: moduleFilter === m ? C.lavender500 : C.white,
              border: `1.5px solid ${moduleFilter === m ? C.lavender500 : C.lavender200}`,
              color: moduleFilter === m ? 'white' : C.mid,
              padding: '7px 16px', borderRadius: 999, fontFamily: font.body,
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            }}>{m || 'All rooms'}</button>
          ))}
          <button onClick={loadRooms} title="Refresh" style={{ marginLeft: 'auto', background: C.white, border: `1.5px solid ${C.lavender200}`, color: C.lavender500, width: 36, height: 36, borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
        </div>

        {/* Room list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0', color: C.mid, fontWeight: 600 }}>
            <div style={{ width: 40, height: 40, border: `4px solid ${C.lavender200}`, borderTopColor: C.lavender500, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Loading rooms...
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', padding: '14px 20px', borderRadius: 20, fontWeight: 600 }}>😓 {error}</div>
        ) : rooms.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', textAlign: 'center', gap: 10 }}>
            <span style={{ fontSize: '3.5rem' }}>🌙</span>
            <p style={{ fontFamily: font.display, fontSize: '1.4rem', color: C.navy }}>No rooms yet~</p>
            <p style={{ color: C.mid, fontSize: '0.95rem', marginBottom: 12 }}>Be the first one to create a study room!</p>
            <button onClick={() => setModal('create')} style={{ background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', color: 'white', padding: '12px 28px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>✨ Create one</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} joining={joining === room.id} onJoin={() => handleJoinPublic(room)} />
            ))}
          </div>
        )}
      </div>

      {/* Create room modal */}
      {modal === 'create' && (
        <ModalWrap onClose={closeModal}>
          <ModalHeader emoji="🏠" title="Create a room" onClose={closeModal} />
          <Field label="🏷️ Room name">
            <Input placeholder="e.g. CS2040 Finals Grind" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} maxLength={40} />
          </Field>
          <Field label="📚 Module code (optional)">
            <Input placeholder="e.g. CS2040" value={createForm.moduleCode} onChange={(e) => setCreateForm((p) => ({ ...p, moduleCode: e.target.value.toUpperCase() }))} maxLength={10} />
          </Field>
          <Field label="⏱ Duration">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map((d) => (
                <button key={d} onClick={() => setCreateForm((p) => ({ ...p, durationMinutes: d }))} style={{ background: createForm.durationMinutes === d ? C.lavender500 : C.white, border: `2px solid ${createForm.durationMinutes === d ? C.lavender500 : C.lavender200}`, color: createForm.durationMinutes === d ? 'white' : C.mid, padding: '7px 16px', borderRadius: 999, fontFamily: font.body, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>{d}m</button>
              ))}
            </div>
          </Field>
          <Field label="🔒 Room type">
            <div style={{ display: 'flex', gap: 10 }}>
              {(['PUBLIC', 'PRIVATE'] as const).map((t) => (
                <button key={t} onClick={() => setCreateForm((p) => ({ ...p, type: t }))} style={{ flex: 1, background: createForm.type === t ? C.lavender100 : C.white, border: `2px solid ${createForm.type === t ? C.lavender500 : C.lavender200}`, color: createForm.type === t ? C.lavender600 : C.mid, padding: 10, borderRadius: 20, fontFamily: font.body, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>{t === 'PUBLIC' ? '🌍 Public' : '🔑 Private'}</button>
              ))}
            </div>
            {createForm.type === 'PRIVATE' && <p style={{ fontSize: '0.8rem', color: C.mid, fontStyle: 'italic', marginTop: 6 }}>An invite code will be generated for you to share.</p>}
          </Field>
          {createError && <ErrorBox msg={createError} />}
          <SubmitBtn onClick={handleCreateRoom} loading={createLoading} label="✨ Create room" />
        </ModalWrap>
      )}

      {/* Join private modal */}
      {modal === 'join-private' && (
        <ModalWrap onClose={closeModal}>
          <ModalHeader emoji="🔑" title="Join private room" onClose={closeModal} />
          <p style={{ fontSize: '0.9rem', color: C.mid, marginBottom: 20, lineHeight: 1.6 }}>Enter the invite code your friend shared with you.</p>
          <Field label="🔑 Invite code">
            <Input placeholder="ABC123" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} maxLength={6} style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center', textTransform: 'uppercase' }} />
          </Field>
          {joinPrivateError && <ErrorBox msg={joinPrivateError} />}
          <SubmitBtn onClick={handleJoinPrivate} loading={joinPrivateLoading} label="🚀 Join room" />
        </ModalWrap>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoomCard({ room, joining, onJoin }: { room: Room; joining: boolean; onJoin: () => void }) {
  const moduleColors: Record<string, string> = { CS1010: '#a99af5', CS2040: '#f4a87c', MA1521: '#6bcb77', ST2334: '#ff6b6b', Other: '#ffd93d' };
  const tagColor = moduleColors[room.moduleCode] ?? '#c4bafe';
  return (
    <div style={{ background: C.white, borderRadius: 28, border: `1.5px solid ${C.peach200}`, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 4px 24px rgba(108,93,211,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.8rem' }}>🏠</span>
        {room.moduleCode && (
          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: tagColor + '33', color: tagColor, border: `1px solid ${tagColor}66` }}>{room.moduleCode}</span>
        )}
      </div>
      <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: C.navy, lineHeight: 1.3 }}>{room.name}</h3>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: C.mid, fontWeight: 600 }}>
        <span>⏱ {room.durationMinutes}m</span>
        <span>🌍 Public</span>
      </div>
      <button onClick={onJoin} disabled={joining} style={{ marginTop: 'auto', background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', color: 'white', padding: '10px 0', borderRadius: 16, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '0.9rem', cursor: joining ? 'not-allowed' : 'pointer', opacity: joining ? 0.6 : 1 }}>{joining ? 'Joining...' : '→ Join room'}</button>
    </div>
  );
}

function ModalWrap({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(45,43,85,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 40, padding: '32px 36px', width: '100%', maxWidth: 460, boxShadow: '0 16px 60px rgba(45,43,85,0.2)', maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Nunito', sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ emoji, title, onClose }: { emoji: string; title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <span style={{ fontSize: '1.8rem' }}>{emoji}</span>
      <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: C.navy, flex: 1 }}>{title}</h2>
      <button onClick={onClose} style={{ background: C.lavender100, border: 'none', color: C.lavender600, width: 32, height: 32, borderRadius: '50%', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ style: extraStyle, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ padding: '11px 14px', border: `2px solid ${C.lavender200}`, borderRadius: 20, fontFamily: "'Nunito', sans-serif", fontSize: '0.95rem', color: C.navy, background: C.white, outline: 'none', width: '100%', boxSizing: 'border-box', ...extraStyle }} />
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>😓 {msg}</div>;
}

function SubmitBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: 14, background: `linear-gradient(135deg, ${C.lavender500}, ${C.lavender600})`, border: 'none', borderRadius: 20, color: 'white', fontFamily: "'Nunito', sans-serif", fontSize: '1rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(108,93,211,0.3)' }}>{loading ? 'Please wait...' : label}</button>
  );
}