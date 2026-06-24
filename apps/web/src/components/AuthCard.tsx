import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import '../pages/theme.css';
import styles from './AuthCard.module.css';

interface AuthCardProps {
  title: string;
  subtitle: string;
  emoji: string;
  children: ReactNode;
  switchText: string;
  switchLinkText: string;
  switchTo: string;
}

export default function AuthCard({
  title, subtitle, emoji, children, switchText, switchLinkText, switchTo,
}: AuthCardProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>

      {/* Blobs */}
      <div className={styles.blobSky} />
      <div className={styles.blobTan} />

      {/* Floating deco */}
      <div className={styles.decoLeft}>📖</div>
      <div className={styles.decoRight}>☕</div>

      {/* Back button */}
      <button onClick={() => navigate('/')} className={styles.backBtn}>
        ← back home
      </button>

      {/* Card */}
      <div className={styles.card}>

        {/* Top row */}
        <div className={styles.topRow}>
          <span className={styles.emoji}>{emoji}</span>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.dotTan}`} />
            <span className={`${styles.dot} ${styles.dotSky}`} />
            <span className={`${styles.dot} ${styles.dotLeaf}`} />
          </div>
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {children}

        <p className={styles.switchRow}>
          {switchText}{' '}
          <button onClick={() => navigate(switchTo)} className={styles.switchLink}>
            {switchLinkText}
          </button>
        </p>
      </div>
    </div>
  );
}
