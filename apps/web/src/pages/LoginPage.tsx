import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import FormField from '../components/FormField';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await loginUser(username.trim(), password);
      login(res.token, { userId: res.userId, username: res.username });
      setSuccess(true);
      setTimeout(() => navigate('/lobby'), 800);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      emoji="🌸"
      title="Welcome back!"
      subtitle="Miss you~ log in to resume your study streak 📖"
      switchText="New here?"
      switchLinkText="Create an account →"
      switchTo="/register"
    >
      <form onSubmit={handleSubmit} noValidate>

        <FormField
          label="Username" icon="🐼" type="text"
          placeholder="your-cool-username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: '' })); }}
          error={errors.username}
          autoComplete="username" autoFocus
        />

        <FormField
          label="Password" icon="🔑" type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
          error={errors.password}
          autoComplete="current-password"
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
            fontSize: '1rem', fontWeight: 800, cursor: loading || success ? 'not-allowed' : 'pointer',
            marginTop: 8, opacity: loading || success ? 0.85 : 1,
            boxShadow: '0 6px 20px rgba(108,93,211,0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {success ? '✅ Logged in! Redirecting...' : loading ? 'Logging in...' : '🌸 Log me in'}
        </button>
      </form>
    </AuthCard>
  );
}