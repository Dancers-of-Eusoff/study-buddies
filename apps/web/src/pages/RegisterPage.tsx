import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import FormField from '../components/FormField';
import { registerUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

function getStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Weak 😬', 'Okay 😐', 'Good 😊', 'Strong 💪'];
const STRENGTH_COLORS = ['', '#f87171', '#fb923c', '#fbbf24', '#4ade80'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const e: typeof errors = {};
    const u = username.trim();
    if (!u) e.username = 'Username is required';
    else if (u.length < 3) e.username = 'Must be at least 3 characters';
    else if (u.length > 20) e.username = 'Must be at most 20 characters';
    else if (!/^[a-zA-Z0-9_-]+$/.test(u)) e.username = 'Only letters, numbers, _ and - allowed';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Must be at least 6 characters';
    if (!confirm) e.confirm = 'Please confirm your password';
    else if (confirm !== password) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await registerUser(username.trim(), password);
      login(res.token, { userId: res.userId, username: res.username });
      setSuccess(true);
      setTimeout(() => navigate('/lobby'), 900);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Registration failed, please try again');
    } finally {
      setLoading(false);
    }
  }

  const strength = getStrength(password);

  return (
    <AuthCard
      emoji="✨"
      title="Join the crew!"
      subtitle="Create your account and start your first study session 🎉"
      switchText="Already a buddy?"
      switchLinkText="Log in instead →"
      switchTo="/login"
    >
      <form onSubmit={handleSubmit} noValidate>

        <FormField
          label="Username" icon="🐼" type="text"
          placeholder="coolstudent99"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: '' })); }}
          error={errors.username}
          autoComplete="username" autoFocus maxLength={20}
        />

        <FormField
          label="Password" icon="🔑" type="password"
          placeholder="min. 6 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
          error={errors.password}
          autoComplete="new-password"
        />

        {password.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '-4px 0 14px' }}>
            <div style={{ flex: 1, display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} style={{
                  flex: 1, height: 4, borderRadius: 999,
                  background: n <= strength ? STRENGTH_COLORS[strength] : '#ddd8ff',
                  transition: 'background 0.3s ease',
                }} />
              ))}
            </div>
            <span style={{
              fontSize: '0.78rem', fontWeight: 700, minWidth: 68,
              textAlign: 'right', color: STRENGTH_COLORS[strength],
            }}>{STRENGTH_LABELS[strength]}</span>
          </div>
        )}

        <FormField
          label="Confirm Password" icon="✅" type="password"
          placeholder="same thing again~"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: '' })); }}
          error={errors.confirm}
          autoComplete="new-password"
        />

        {apiError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fef2f2', border: '1.5px solid #fecaca',
            color: '#dc2626', padding: '11px 14px',
            borderRadius: 20, fontSize: '0.88rem',
            fontWeight: 600, marginBottom: 12,
          }}>
            😓 {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success}
          style={{
            width: '100%', padding: '15px',
            background: success
              ? 'linear-gradient(135deg, #4ade80, #22c55e)'
              : 'linear-gradient(135deg, #8b79e8, #6c5dd3)',
            border: 'none', borderRadius: 20,
            color: 'white', fontFamily: "'Nunito', sans-serif",
            fontSize: '1rem', fontWeight: 800,
            cursor: loading || success ? 'not-allowed' : 'pointer',
            marginTop: 8, opacity: loading || success ? 0.85 : 1,
            boxShadow: '0 6px 20px rgba(108,93,211,0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {success ? '🎉 Account created! Redirecting...' : loading ? 'Creating account...' : '✨ Create my account'}
        </button>

      </form>
    </AuthCard>
  );
}