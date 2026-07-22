import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import btn from '../components/Buttons.module.css';
import styles from './DashboardPage.module.css';
import { addMemeToCloud, addMemeToPG, getMyDashboard } from '../api/dashboardApi';
import type { Meme, MemeDTO } from '../types/dashboard';

type Interval = 'daily' | 'weekly' | 'monthly';

// ── Mock profile data ─────────────────────────────────────────────────────────

const MOCK_PROFILE = {
  username: 'kai_studies',
  avatarEmoji: '🐼',
  bio: 'CS2040 survivor. Chronic all-nighter → recovering early bird 🌅',
  joinDate: 'Jan 2026',
  level: 7,
  totalHours: 184,
  streakDays: 12,
  friendsCount: 23,
  leaderboardRank: 4,
  totalSessions: 96,
};

const STAT_ROWS = [
  { icon: '🔥', label: 'Current streak', value: `${MOCK_PROFILE.streakDays} days` },
  { icon: '⏱', label: 'Total study time', value: `${MOCK_PROFILE.totalHours}h` },
  { icon: '📅', label: 'Sessions logged', value: `${MOCK_PROFILE.totalSessions}` },
  { icon: '🏆', label: 'Leaderboard rank', value: `#${MOCK_PROFILE.leaderboardRank}` },
  { icon: '🎯', label: 'Level', value: `${MOCK_PROFILE.level}` },
  { icon: '👥', label: 'Friends', value: `${MOCK_PROFILE.friendsCount}` },
  { icon: '🗓️', label: 'Joined', value: MOCK_PROFILE.joinDate },
];

// ── Date helpers ───────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(0, 0, 0, 0);
  return e;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function getRangeLabel(interval: Interval, date: Date): string {
  if (interval === 'daily') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (interval === 'weekly') {
    const s = startOfWeek(date);
    const e = endOfWeek(date);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Deterministic mock-data generators (swap for real API data later) ────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededInRange(seed: string, min: number, max: number): number {
  return min + (hashString(seed) % (max - min + 1));
}

function getFocusDistractionData(seedKey: string) {
  const focusMin = seededInRange(`${seedKey}-focus`, 90, 340);
  const distractMin = seededInRange(`${seedKey}-distract`, 15, 100);
  return [
    { name: 'Focused', value: focusMin, color: 'var(--leaf)' },
    { name: 'Distracted', value: distractMin, color: 'var(--coral)' },
  ];
}

function getBarData(interval: Interval, anchor: Date) {
  if (interval === 'daily') {
    return ['Morning', 'Afternoon', 'Evening', 'Night'].map((label) => ({
      label,
      hours: round1(seededInRange(`${label}-${anchor.toDateString()}`, 0, 180) / 60),
    }));
  }
  if (interval === 'weekly') {
    const weekKey = startOfWeek(anchor).toDateString();
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({
      label,
      hours: round1(seededInRange(`${label}-${weekKey}`, 0, 300) / 60),
    }));
  }
  const monthKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  return ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'].map((label) => ({
    label,
    hours: round1(seededInRange(`${label}-${monthKey}`, 300, 1400) / 60),
  }));
}

function getGrowthData(interval: Interval, anchor: Date) {
  const points: { label: string; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    let label = '';
    let key = '';
    if (interval === 'daily') {
      d.setDate(d.getDate() - i);
      label = d.toLocaleDateString('en-US', { weekday: 'short' });
      key = d.toDateString();
    } else if (interval === 'weekly') {
      d.setDate(d.getDate() - i * 7);
      const wStart = startOfWeek(d);
      label = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      key = wStart.toDateString();
    } else {
      d.setMonth(d.getMonth() - i);
      label = d.toLocaleDateString('en-US', { month: 'short' });
      key = `${d.getFullYear()}-${d.getMonth()}`;
    }
    points.push({ label, hours: round1(seededInRange(`growth-${key}`, 60, 360) / 60) });
  }
  return points;
}

function getVideoThumbnail(videoUrl: string): string {
  if (!videoUrl) return "";

  return videoUrl
    .replace("/video/upload/", "/video/upload/so_5/")
    .replace(/\.[^./]+$/, ".jpg");
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Interval>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [memes, setMemes] = useState<Meme[]>([]);
  const [selectedMeme, setSelectedMeme] = useState<Meme>()
  const [addMemeOpen, setAddMemeOpen] = useState(false);
  const [memeCaption, setMemeCaption] = useState('');
  const [memeImagePreview, setMemeImagePreview] = useState<string | null>(null);
  // Upload meme
  const [memeObjectUrl, setMemeObjectUrl] = useState<string>();
  const [uploadedMeme, setUploadedMeme] = useState<File | undefined>();
  const [isAddingMeme, setIsAddingMeme] = useState<boolean>(false);

  const rangeLabel = useMemo(() => getRangeLabel(activeTab, selectedDate), [activeTab, selectedDate]);

  const seedKey = useMemo(() => {
    if (activeTab === 'daily') return selectedDate.toDateString();
    if (activeTab === 'weekly') return startOfWeek(selectedDate).toDateString();
    return `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;
  }, [activeTab, selectedDate]);

  const pieData = useMemo(() => getFocusDistractionData(seedKey), [seedKey]);
  const barData = useMemo(() => getBarData(activeTab, selectedDate), [activeTab, selectedDate]);
  const growthData = useMemo(() => getGrowthData(activeTab, selectedDate), [activeTab, selectedDate]);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate), [selectedDate]);

  function handleMonthClick(value: Date) {
    setSelectedDate(value);
  }

  function tileClassName({ date, view }: { date: Date; view: string }): string | undefined {
    if (activeTab === 'weekly' && view === 'month' && date >= weekStart && date <= weekEnd) {
      return 'tileInWeek';
    }
    return undefined;
  }

  function closeAddMeme() {
    setAddMemeOpen(false);
    setMemeCaption('');
    setMemeImagePreview(null);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return ;
    setUploadedMeme(file);
    const url = URL.createObjectURL(file);
    setMemeObjectUrl(url);
    setMemeImagePreview(url);
  }

  async function handleAddMeme() {
    if (!uploadedMeme) return ;
    if (!memeObjectUrl) return ;
    if (!user) return ;

    setIsAddingMeme(true)     // start loading
    const videoURL = await addMemeToCloud(uploadedMeme);
    const thumbnailURL = getVideoThumbnail(videoURL);
    const submitedMeme: MemeDTO = {
      title: memeCaption,
      videoURL: videoURL,
      thumbnailURL: thumbnailURL,
      uploaderID: user.userId
    };
    const newMeme = await addMemeToPG(submitedMeme);

    setMemes([...memes, newMeme]);
    URL.revokeObjectURL(memeObjectUrl);
    setIsAddingMeme(false)    // finish loading
    closeAddMeme();
  }

  useEffect(() => {
    const initDashboard = async () => {
      const data = await getMyDashboard();
      setMemes(data.memes);
    }

    initDashboard();
  }, [])

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
          <button onClick={() => navigate('/lobby')} className={btn.ghost}>← Back to lobby</button>
          <button onClick={logout} className={btn.ghost}>Log out</button>
        </div>
      </nav>

      <div className={styles.layout}>
        {/* ── Left sidebar: profile ───────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarRing}>
            <span className={styles.avatarEmoji}>{MOCK_PROFILE.avatarEmoji}</span>
          </div>
          <div className={styles.username}>{user?.username ?? MOCK_PROFILE.username}</div>
          <p className={styles.bio}>{MOCK_PROFILE.bio}</p>
          <button className={`${btn.ghost} ${styles.editProfileBtn}`}>✏️ Edit profile</button>

          <div className={styles.statsList}>
            {STAT_ROWS.map((s) => (
              <div key={s.label} className={styles.statRow}>
                <span className={styles.statIcon}>{s.icon}</span>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className={styles.main}>
          {/* Session summary */}
          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>📊 Session summary</h2>
              <div className={styles.tabRow}>
                {(['daily', 'weekly', 'monthly'] as Interval[]).map((i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={activeTab === i ? styles.tabActive : styles.tab}
                  >
                    {i.charAt(0).toUpperCase() + i.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.summaryBody}>
              {/* Calendar */}
              <div className={styles.calendarCol}>
                <div className={styles.rangeLabel}>{rangeLabel}</div>
                <div className={styles.calendarWrap}>
                  {activeTab === 'monthly' ? (
                    <Calendar
                      value={selectedDate}
                      view="year"
                      minDetail="year"
                      maxDetail="year"
                      onClickMonth={handleMonthClick}
                    />
                  ) : (
                    <Calendar
                      value={selectedDate}
                      minDetail="month"
                      maxDetail="month"
                      onChange={(value) => { if (value instanceof Date) setSelectedDate(value); }}
                      tileClassName={tileClassName}
                    />
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className={styles.chartsGrid}>
                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>Focus vs distraction</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} min`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.legendRow}>
                    <span><span className={styles.legendDot} style={{ background: 'var(--leaf)' }} />Focused</span>
                    <span><span className={styles.legendDot} style={{ background: 'var(--coral)' }} />Distracted</span>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>Study hours breakdown</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: -0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--tan-deep)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--bark)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--bark)' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip formatter={(value) => `${value} hr`} />
                      <Bar dataKey="hours" fill="var(--sky)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={`${styles.chartBox} ${styles.chartCardFull}`}>
                  <div className={styles.chartTitle}>Study hours growth ({activeTab})</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--tan-deep)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--bark)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--bark)' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip formatter={(value) => `${value} h`} />
                      <Line type="monotone" dataKey="hours" stroke="var(--coral-deep)" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Memes collection */}
          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>😂 Memes collection</h2>
              <button onClick={() => setAddMemeOpen(true)} className={`${btn.primary} ${styles.addMemeBtn}`}>
                ➕ Add meme
              </button>
            </div>

            <div className={styles.memeGrid}>
              <button className={styles.addMemeCard} onClick={() => setAddMemeOpen(true)}>
                <span className={styles.addMemePlus}>+</span>
                Add a meme
              </button>
              {memes?.map((m) => (
                <div onClick={() => setSelectedMeme(m)} key={m.id} className={styles.memeCard}>
                  <div className={styles.memeVisual}>
                    {m.thumbnailURL ? (
                      <img src={m.thumbnailURL} alt={m.title} className={styles.memeImg} />
                    ) : (
                      <span className={styles.memeEmojiBig}>{m.title}</span>
                    )}
                  </div>
                  <div className={styles.memeCaption}>{m.title}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Add meme modal (frontend-only; wire up to backend upload later) */}
      {addMemeOpen && (
        <div onClick={closeAddMeme} className={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <span className={styles.modalHeaderEmoji}>😂</span>
              <h2 className={styles.modalHeaderTitle}>Add a meme</h2>
              <button onClick={closeAddMeme} className={styles.modalCloseBtn}>✕</button>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>🖼️ Upload image</label>
              <label className={styles.fileInputBtn}>
                📁 Choose a file...
                <input type="file" accept="video/*" onChange={handleImageChange} hidden />
              </label>
              {memeImagePreview && (
                <div className={styles.imagePreviewWrap}>
                  <video src={memeImagePreview} className={styles.imagePreview} controls preload="metadata" />
                  <button onClick={() => setMemeImagePreview(null)} className={btn.ghost}>Remove</button>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>📝 Title</label>
              <textarea
                className={styles.textarea}
                placeholder="What would you name your meme..."
                value={memeCaption}
                onChange={(e) => setMemeCaption(e.target.value)}
                maxLength={120}
              />
            </div>

            {isAddingMeme
              ? (<button onClick={handleAddMeme} className={btn.submit} disabled>✨ Adding meme</button>)
              : (<button onClick={handleAddMeme} className={btn.submit}>✨ Add to collection</button>)
            }
          </div>
        </div>
      )}

      {selectedMeme && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <span className={styles.modalHeaderTitle}>{selectedMeme.title}</span>
                <button className={styles.modalCloseBtn} onClick={() => setSelectedMeme(undefined)}>✕</button>
              </div>
              <video src={selectedMeme.videoURL} autoPlay />
            </div>
        </div>
        )
      }
    </div>
  );
}