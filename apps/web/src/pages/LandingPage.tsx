import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import btn from '../components/Buttons.module.css';
import styles from './LandingPage.module.css';

const MOCK_USERS = [
  { name: 'Mia', emoji: '🐱', focused: true, score: 1240 },
  { name: 'Jake', emoji: '🐻', focused: true, score: 980 },
  { name: 'Lily', emoji: '🦊', focused: false, score: 750 },
  { name: 'You', emoji: '🐼', focused: true, score: 620 },
];

const FEATURES = [
  { icon: '📷', title: 'Attention tracking', desc: 'Camera-based focus detection keeps you honest' },
  { icon: '🏆', title: 'Live leaderboard', desc: 'Friendly competition makes studying addictive' },
  { icon: '😤', title: 'Accountability', desc: 'Get memed when you zone out — lovingly' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.blobSky} />
      <div className={styles.blobTan} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoEmoji}>📚</span>
          <span className={styles.logoText}>Study Buddies</span>
        </div>
        <div className={styles.navActions}>
          {user ? (
            <>
              <span className={styles.greeting}>
                Hey, <strong>{user.username}</strong>! 👋
              </span>
              <button onClick={logout} className={btn.ghost}>Log out</button>
              <button onClick={() => navigate('/lobby')} className={btn.primary}>Go to Lobby →</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className={btn.ghost}>Log in</button>
              <button onClick={() => navigate('/register')} className={btn.primary}>Sign up free ✨</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className={styles.hero}>
        <div>
          <div className={styles.badge}>✨ Study smarter, together</div>

          <h1 className={styles.headline}>
            Your cozy<br />
            <span className={styles.headlineAccent}>study space</span><br />
            awaits~
          </h1>

          <p className={styles.heroCopy}>
            Stay focused with friends in real-time rooms. Track your attention,
            climb the leaderboard, and hold each other accountable — cutely.
          </p>

          <div className={styles.heroActions}>
            {user ? (
              <button onClick={() => navigate('/lobby')} className={btn.hero}>🚀 Enter a study room</button>
            ) : (
              <>
                <button onClick={() => navigate('/register')} className={btn.hero}>🌸 Get started for free</button>
                <button onClick={() => navigate('/login')} className={btn.textLink}>Already have an account?</button>
              </>
            )}
          </div>
        </div>

        {/* Mock room card */}
        <div className={styles.cardWrap}>
          <div className={styles.roomCard}>
            <div className={styles.roomCardHeader}>
              <span className={`${styles.dot} ${styles.dotRed}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={styles.roomCardTitle}>study-room-3 ☕</span>
            </div>
            {MOCK_USERS.map((u) => (
              <div key={u.name} className={styles.userRow}>
                <span className={styles.userAvatar}>{u.emoji}</span>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{u.name}</div>
                  <div className={u.focused ? styles.statusFocused : styles.statusDistracted}>
                    {u.focused ? '🟢 focused' : '🔴 distracted'}
                  </div>
                </div>
                <span className={styles.userScore}>{u.score}</span>
              </div>
            ))}
            <div className={styles.timer}>
              <span>⏱</span>
              <span className={styles.timerText}>42:17 remaining</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        Made with 💙 for students everywhere
      </footer>
    </div>
  );
}
