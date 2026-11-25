import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import JoinGroup from './pages/JoinGroup';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center muted">Yükleniyor…</div>;
  if (!user) {
    // Giriş sonrası kullanıcıyı geldiği sayfaya (ör. davet linki) geri gönder
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        OrtakKasa<span className="brand-dot" />
      </Link>
      {user && (
        <div className="topbar-right">
          <span className="muted">{user.displayName}</span>
          <button className="link-btn" onClick={logout}>Çıkış yap</button>
        </div>
      )}
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/group/:groupId" element={<RequireAuth><GroupPage /></RequireAuth>} />
          <Route path="/join/:groupId" element={<RequireAuth><JoinGroup /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
