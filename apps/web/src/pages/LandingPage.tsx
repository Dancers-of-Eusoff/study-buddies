import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const C = {
  navy: '#2d2b55',
  mid: '#6b6891',
  soft: '#9d9bc0',
  lavender100: '#f0eeff',
  lavender200: '#ddd8ff',
  lavender300: '#c4bafe',
  lavender500: '#8b79e8',
  lavender600: '#6c5dd3',
  peach100: '#fff0e8',
  peach200: '#fdddc8',
  peach300: '#f9c4a0',
  peach400: '#f4a87c',
  cream: '#fffbf7',
  white: '#ffffff',
};

const font = { display: "'Fredoka One', cursive", body: "'Nunito', sans-serif" };

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh', background: C.cream,
      fontFamily: font.body, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Background blobs */}
      <div style={{
        position: 'fixed', width: 600, height: 600,
        background: `radial-gradient(circle, ${C.lavender200} 0%, transparent 70%)`,
        top: -200, right: -150, borderRadius: '50%',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', width: 500, height: 500,
        background: `radial-gradient(circle, ${C.peach200} 0%, transparent 70%)`,
        bottom: -100, left: -100, borderRadius: '50%',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.8rem' }}>📚</span>
          <span style={{ fontFamily: font.display, fontSize: '1.5rem', color: C.navy }}>Study Buddies</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: '0.9rem', color: C.mid, fontWeight: 600 }}>
                Hey, <strong>{user.username}</strong>! 👋
              </span>
              <button onClick={logout} style={ghostBtn}>Log out</button>
              <button onClick={() => navigate('/lobby')} style={primaryBtn}>Go to Lobby →</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={ghostBtn}>Log in</button>
              <button onClick={() => navigate('/register')} style={primaryBtn}>Sign up free ✨</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        position: 'relative', zIndex: 5, flex: 1,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 48, alignItems: 'center',
        padding: '40px 48px 60px',
        maxWidth: 1200, margin: '0 auto', width: '100%',
      }}>
        {/* Left content */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.lavender100, border: `1.5px solid ${C.lavender300}`,
            color: C.lavender600, padding: '6px 16px',
            borderRadius: 999, fontSize: '0.85rem', fontWeight: 700,
            marginBottom: 24,
          }}>✨ Study smarter, together</div>

          <h1 style={{
            fontFamily: font.display,
            fontSize: 'clamp(2.8rem, 5vw, 4rem)',
            lineHeight: 1.15, color: C.navy, marginBottom: 20,
          }}>
            Your cozy<br />
            <span style={{
              background: `linear-gradient(135deg, ${C.lavender500}, ${C.peach400})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>study space</span><br />
            awaits~
          </h1>

          <p style={{
            fontSize: '1.05rem', color: C.mid, lineHeight: 1.7,
            maxWidth: 440, marginBottom: 36,
          }}>
            Stay focused with friends in real-time rooms. Track your attention,
            climb the leaderboard, and hold each other accountable — cutely.
          </p>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <button onClick={() => navigate('/lobby')} style={heroBtn}>🚀 Enter a study room</button>
            ) : (
              <>
                <button onClick={() => navigate('/register')} style={heroBtn}>🌸 Get started for free</button>
                <button onClick={() => navigate('/login')} style={{
                  background: 'transparent', border: 'none',
                  color: C.mid, fontFamily: font.body,
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}>Already have an account?</button>
              </>
            )}
          </div>
        </div>

        {/* Mock room card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: C.white, borderRadius: 28,
            padding: 24, boxShadow: '0 16px 60px rgba(45,43,85,0.2)',
            border: `1.5px solid ${C.lavender200}`, maxWidth: 380, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b6b', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd93d', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6bcb77', display: 'inline-block' }} />
              <span style={{ marginLeft: 8, fontWeight: 700, fontSize: '0.9rem', color: C.mid }}>study-room-3 ☕</span>
            </div>
            {[
              { name: 'Mia', emoji: '🐱', focused: true, score: 1240 },
              { name: 'Jake', emoji: '🐻', focused: true, score: 980 },
              { name: 'Lily', emoji: '🦊', focused: false, score: 750 },
              { name: 'You', emoji: '🐼', focused: true, score: 620 },
            ].map((u) => (
              <div key={u.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: C.peach100,
                borderRadius: 16, border: `1px solid ${C.peach200}`, marginBottom: 8,
              }}>
                <span style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: C.white,
                  borderRadius: 10, fontSize: '1.4rem', flexShrink: 0,
                }}>{u.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.navy }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: u.focused ? '#22c55e' : '#ef4444' }}>
                    {u.focused ? '🟢 focused' : '🔴 distracted'}
                  </div>
                </div>
                <span style={{ fontFamily: font.display, fontSize: '1rem', color: C.lavender600 }}>{u.score}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 10, background: `linear-gradient(135deg, ${C.lavender100}, ${C.peach100})`,
              borderRadius: 14, border: `1px solid ${C.lavender200}`, marginTop: 4,
            }}>
              <span>⏱</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: C.navy }}>42:17 remaining</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section style={{
        position: 'relative', zIndex: 5,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20, padding: '0 48px 60px',
        maxWidth: 1200, margin: '0 auto', width: '100%',
      }}>
        {[
          { icon: '📷', title: 'Attention tracking', desc: 'Camera-based focus detection keeps you honest' },
          { icon: '🏆', title: 'Live leaderboard', desc: 'Friendly competition makes studying addictive' },
          { icon: '😤', title: 'Accountability', desc: 'Get memed when you zone out — lovingly' },
        ].map((f) => (
          <div key={f.title} style={{
            background: C.white, borderRadius: 28,
            padding: '28px 24px', border: `1.5px solid ${C.peach200}`,
            boxShadow: '0 4px 24px rgba(108,93,211,0.12)', textAlign: 'center',
          }}>
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: 12 }}>{f.icon}</span>
            <h3 style={{ fontFamily: font.display, fontSize: '1.1rem', color: C.navy, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: '0.88rem', color: C.mid, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer style={{
        position: 'relative', zIndex: 5,
        textAlign: 'center', padding: 20,
        fontSize: '0.85rem', color: C.soft, fontWeight: 600,
      }}>
        Made with 💜 for students everywhere
      </footer>
    </div>
  );
}

// Shared button styles
const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: `2px solid #c4bafe`,
  color: '#6c5dd3',
  padding: '10px 22px',
  borderRadius: 999,
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8b79e8, #6c5dd3)',
  border: 'none', color: 'white',
  padding: '10px 22px', borderRadius: 999,
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(108,93,211,0.35)',
};

const heroBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8b79e8, #6c5dd3)',
  border: 'none', color: 'white',
  padding: '16px 32px', borderRadius: 999,
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
  boxShadow: '0 6px 24px rgba(108,93,211,0.4)',
};