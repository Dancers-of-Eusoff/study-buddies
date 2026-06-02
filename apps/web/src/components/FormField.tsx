import { InputHTMLAttributes, useState } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
  error?: string;
}

export default function FormField({ label, icon, error, type, style: _style, ...rest }: FormFieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>

      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.88rem', fontWeight: 700, color: '#2d2b55',
      }}>
        <span>{icon}</span> {label}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          {...rest}
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          style={{
            width: '100%',
            padding: isPassword ? '13px 44px 13px 16px' : '13px 16px',
            border: error ? '2px solid #f87171' : '2px solid #ddd8ff',
            borderRadius: 20,
            fontFamily: "'Nunito', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#2d2b55',
            background: 'white',
            outline: 'none',
            boxSizing: 'border-box',
            boxShadow: error ? '0 0 0 4px rgba(248,113,113,0.12)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = '#a99af5';
              e.target.style.boxShadow = '0 0 0 4px rgba(139,121,232,0.12)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = '#ddd8ff';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((p) => !p)}
            style={{
              position: 'absolute', right: 12,
              background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '1rem',
              opacity: 0.65, padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
          >{showPw ? '🙈' : '👁️'}</button>
        )}
      </div>

      {error && (
        <span style={{
          fontSize: '0.8rem', color: '#ef4444',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
        }}>⚠️ {error}</span>
      )}
    </div>
  );
}