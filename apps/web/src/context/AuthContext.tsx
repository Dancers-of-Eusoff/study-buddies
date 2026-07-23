import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
// import { fetchMe } from '../api/authApi';
import apiFetch from '../api/apiFetch';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;  
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // const stored = localStorage.getItem(TOKEN_KEY);
    // if (!stored) { setIsLoading(false); return; }
    // fetchMe(stored)
    //   .then((u) => { setToken(stored); setUser(u); })
    //   .catch(() => localStorage.removeItem(TOKEN_KEY))
    //   .finally(() => setIsLoading(false));
    setUser({userId: "bcrypt", username: "bcrypt"})
    setIsLoading(false)
  }, []);

  function login(newUser: User) {
    setUser(newUser);
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', 'POST', { credentials: 'include' })
    } catch (err) {
      console.error(err)
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
