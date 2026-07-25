import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import AuthCard from '../components/AuthCard';
import FormField from '../components/FormField';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import btn from '../components/Buttons.module.css';
import styles from './LoginPage.module.css';

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
      login({ userId: res.userId, username: res.username });
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
          <div className={styles.apiError}>
            😓 {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success}
          className={`${btn.submit} ${success ? btn.submitSuccess : ''}`}
        >
          {success ? '✅ Logged in! Redirecting...' : loading ? 'Logging in...' : '🌸 Log me in'}
        </button>
      </form>
    </AuthCard>
  );
}
