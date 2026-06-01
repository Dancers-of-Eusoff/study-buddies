import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #fff0e8 0%, #f0eeff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
      fontFamily: "'Nunito', sans-serif",
    }}>

      {/* Blobs */}
      <div style={{
        position: 'fixed', width: 500, height: 500,
        background: 'radial-gradient(circle, #ddd8ff 0%, transparent 70%)',
        top: -150, right: -100, borderRadius: '50%',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', width: 400, height: 400,
        background: 'radial-gradient(circle, #fdddc8 0%, transparent 70%)',
        bottom: -80, left: -80, borderRadius: '50%',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Floating deco */}
      <div style={{
        position: 'fixed', bottom: '15%', left: '5%',
        fontSize: '2.5rem', opacity: 0.35, pointerEvents: 'none', zIndex: 1,
      }}>📖</div>
      <div style={{
        position: 'fixed', top: '20%', right: '6%',
        fontSize: '2rem', opacity: 0.35, pointerEvents: 'none', zIndex: 1,
      }}>☕</div>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 24, left: 28,
          background: 'white', border: '1.5px solid #ddd8ff',
          color: '#6b6891', padding: '8px 18px',
          borderRadius: 999, fontFamily: "'Nunito', sans-serif",
          fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          zIndex: 20, boxShadow: '0 2px 12px rgba(108,93,211,0.1)',
        }}
      >← back home</button>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.95)',
        borderRadius: 40,
        padding: '40px 44px 36px',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 16px 60px rgba(45,43,85,0.18)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: '2.8rem' }}>{emoji}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f9c4a0', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#c4bafe', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f4a87c', display: 'inline-block' }} />
          </div>
        </div>

        <h1 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '2.2rem', color: '#2d2b55',
          marginBottom: 6, lineHeight: 1.2,
        }}>{title}</h1>

        <p style={{
          fontSize: '0.95rem', color: '#6b6891',
          marginBottom: 28, lineHeight: 1.5,
        }}>{subtitle}</p>

        {children}

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: '#6b6891', marginTop: 20, fontWeight: 600 }}>
          {switchText}{' '}
          <button
            onClick={() => navigate(switchTo)}
            style={{
              background: 'none', border: 'none',
              color: '#6c5dd3', fontFamily: "'Nunito', sans-serif",
              fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >{switchLinkText}</button>
        </p>
      </div>
    </div>
  );
}