import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LobbyPage from './pages/LobbyPage';
import StudyRoomPage from './pages/StudyRoomPage';
import SexierStudyRoomPage from './pages/SexierStudyRoomPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ width: 48, height: 48, border: '4px solid var(--lavender-200)', borderTopColor: 'var(--lavender-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ width: 48, height: 48, border: '4px solid var(--lavender-200)', borderTopColor: 'var(--lavender-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/lobby" element={<RequireAuth><LobbyPage /></RequireAuth>} />
      <Route path="/rooms/:roomId" element={<RequireAuth><StudyRoomPage /></RequireAuth>} />
      <Route path="/sexier-rooms/:roomId" element={<RequireAuth><SexierStudyRoomPage /></RequireAuth>} />
      <Route path="/dashboard/:userId" />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
