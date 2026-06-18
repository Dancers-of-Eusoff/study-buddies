import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { listPublicRooms, createRoom, joinRoom } from '../api/roomsApi';
import type { Room, CreateRoomRequest } from '../types';
import btn from '../components/Buttons.module.css';
import styles from './LobbyPage.module.css';

const DURATION_OPTIONS = [25, 45, 60, 90, 120];
const MODULE_FILTERS = ['', 'CS1010', 'CS2040', 'MA1521', 'ST2334', 'Other'];
type Modal = 'none' | 'create' | 'join-private';

const MODULE_TAG_VARS: Record<string, string> = {
  CS1010: 'var(--sky)',
  CS2040: 'var(--coral)',
  MA1521: 'var(--leaf)',
  ST2334: 'var(--coral-deep)',
  Other: '#E8B84B',
};

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
      navigate(`/rooms/${room.id}`);
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

      navigate(`/rooms/${details.room.id}`);
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
      navigate(`/rooms/${details.room.id}`);
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
    <div className={styles.page}>
      <div className={styles.blobSky} />
      <div className={styles.blobTan} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          <span className={styles.logoEmoji}>📚</span>
          <span className={styles.logoText}>Study Buddies</span>
        </div>
        <div className={styles.navActions}>
          <div className={styles.userChip}>
            <span>🐼</span>
            <span className={styles.userChipName}>{user?.username}</span>
          </div>
          <button onClick={logout} className={btn.ghost}>Log out</button>
        </div>
      </nav>

      {/* Content */}
      <div className={styles.content}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>Study Rooms 🏠</h1>
            <p className={styles.subheading}>Pick a room and get to work, {user?.username}~</p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={() => setModal('join-private')} className={btn.ghost}>🔑 Join private room</button>
            <button onClick={() => setModal('create')} className={btn.primary}>✨ Create room</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterRow}>
          {MODULE_FILTERS.map((m) => (
            <button
              key={m || 'all'}
              onClick={() => setModuleFilter(m)}
              className={moduleFilter === m ? styles.filterTabActive : styles.filterTab}
            >{m || 'All rooms'}</button>
          ))}
          <button onClick={loadRooms} title="Refresh" className={styles.refreshBtn}>
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--bark)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M4.681 3H2V2h3.5l.5.5V6H5V4a5 5 0 1 0 4.53-.761l.302-.954A6 6 0 1 1 4.681 3z"/>
            </svg>
          </button>
        </div>

        {/* Room list */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            Loading rooms...
          </div>
        ) : error ? (
          <div className={styles.errorBox}>😓 {error}</div>
        ) : rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyEmoji}>🌙</span>
            <p className={styles.emptyTitle}>No rooms yet~</p>
            <p className={styles.emptyCopy}>Be the first one to create a study room!</p>
            <button onClick={() => setModal('create')} className={btn.primary}>✨ Create one</button>
          </div>
        ) : (
          <div className={styles.roomGrid}>
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
            <div className={styles.durationRow}>
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setCreateForm((p) => ({ ...p, durationMinutes: d }))}
                  className={createForm.durationMinutes === d ? styles.durationPillActive : styles.durationPill}
                >{d}m</button>
              ))}
            </div>
          </Field>
          <Field label="🔒 Room type">
            <div className={styles.typeRow}>
              {(['PUBLIC', 'PRIVATE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCreateForm((p) => ({ ...p, type: t }))}
                  className={createForm.type === t ? styles.typeBtnActive : styles.typeBtn}
                >{t === 'PUBLIC' ? '🌍 Public' : '🔑 Private'}</button>
              ))}
            </div>
            {createForm.type === 'PRIVATE' && <p className={styles.typeHint}>An invite code will be generated for you to share.</p>}
          </Field>
          {createError && <ErrorBox msg={createError} />}
          <SubmitBtn onClick={handleCreateRoom} loading={createLoading} label="✨ Create room" />
        </ModalWrap>
      )}

      {/* Join private modal */}
      {modal === 'join-private' && (
        <ModalWrap onClose={closeModal}>
          <ModalHeader emoji="🔑" title="Join private room" onClose={closeModal} />
          <p className={styles.modalCopy}>Enter the invite code your friend shared with you.</p>
          <Field label="🔑 Invite code">
            <Input
              placeholder="ABC123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              className={styles.inviteInput}
            />
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
  const tagColorVar = MODULE_TAG_VARS[room.moduleCode] ?? 'var(--sky)';
  return (
    <div className={styles.roomCard}>
      <div className={styles.roomCardTop}>
        <span className={styles.roomCardEmoji}>🏠</span>
        {room.moduleCode && (
          <span className={styles.roomCardTag} style={{ color: tagColorVar, borderColor: tagColorVar }}>{room.moduleCode}</span>
        )}
      </div>
      <h3 className={styles.roomCardName}>{room.name}</h3>
      <div className={styles.roomCardMeta}>
        <span>⏱ {room.durationMinutes}m</span>
        <span>🌍 Public</span>
      </div>
      <button onClick={onJoin} disabled={joining} className={styles.joinBtn}>
        {joining ? 'Joining...' : '→ Join room'}
      </button>
    </div>
  );
}

function ModalWrap({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className={styles.modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} className={styles.modalCard}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ emoji, title, onClose }: { emoji: string; title: string; onClose: () => void }) {
  return (
    <div className={styles.modalHeader}>
      <span className={styles.modalHeaderEmoji}>{emoji}</span>
      <h2 className={styles.modalHeaderTitle}>{title}</h2>
      <button onClick={onClose} className={styles.modalCloseBtn}>✕</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Input({ className: extraClass, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${styles.input} ${extraClass ?? ''}`} />
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className={styles.modalErrorBox}>😓 {msg}</div>;
}

function SubmitBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading} className={btn.submit}>
      {loading ? 'Please wait...' : label}
    </button>
  );
}
