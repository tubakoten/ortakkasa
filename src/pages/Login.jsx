import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth, authErrorMessage } from '../AuthContext';
import Mascot from '../components/Mascot';

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M2 2l20 20" />
  </svg>
);

export default function Login() {
  const { user, login, register } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const invited = next.startsWith('/join/');

  const [mode, setMode] = useState(invited ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null); // 'name' | 'email' | 'password' | null
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  // Kedinin ruh hâli: şifre görünür olunca gözlerini patileriyle kapatır (bakmıyor!),
  // herhangi bir alana yazı yazılırken yazılanı gözleriyle takip eder
  const typed = focused === 'name' ? name : focused === 'password' ? password : email;
  const mood = showPassword ? 'hiding' : focused ? 'watching' : 'idle';
  const look = Math.max(-1, Math.min(1, typed.length / 14 - 1));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !name.trim()) {
      setError('Adını yaz; gruptaki arkadaşların seni bu isimle görecek.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name.trim(), email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div>
        <h1>Kim kime ne kadar borçlu?</h1>
        <p className="lead">
          {invited
            ? 'Bir arkadaşın seni ortak hesabına davet etti. Katılmak için hesap aç ya da giriş yap.'
            : 'Ev arkadaşlarınla, tatil grubunla ortak harcamaları yaz. Kimin kime ne ödeyeceğini en az ödemeyle hesaplayalım.'}
        </p>
      </div>

      <div className="auth-card">
        <Mascot mood={mood} look={look} />
        <form className="sheet" onSubmit={handleSubmit}>
          <div className="switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Giriş yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Hesap aç
            </button>
          </div>

          {mode === 'register' && (
            <label>
              Adın
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                placeholder="Tuba Köten"
                autoComplete="name"
              />
            </label>
          )}
          <label>
            E-posta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              placeholder="ornek@mail.com"
              autoComplete="email"
            />
          </label>
          <label>
            Şifre
            <span className="pw-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="En az 6 karakter"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Bekle…' : mode === 'login' ? 'Giriş yap' : 'Hesap aç'}
          </button>
        </form>
      </div>
    </div>
  );
}
