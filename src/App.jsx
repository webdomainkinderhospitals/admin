import React, { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { COLLECTIONS } from './collections.js';
import { CollectionManager } from './pages/CollectionManager.jsx';
import { MediaLibrary } from './pages/MediaLibrary.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">🏥</div>
        <h1>Kinder Hospitals</h1>
        <p className="login-sub">Admin Portal</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    const logout = () => setUser(null);
    window.addEventListener('kinder-logout', logout);
    if (getToken()) {
      api('/api/auth/me')
        .then((d) => setUser(d.user))
        .catch(() => {})
        .finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
    return () => window.removeEventListener('kinder-logout', logout);
  }, []);

  if (!checked) return <div className="loading">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'settings', label: 'Site Settings', icon: '⚙️' },
    { key: 'media', label: 'Media Library', icon: '🖼️' },
    ...COLLECTIONS.map((c) => ({ key: c.key, label: c.label, icon: c.icon })),
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">K</span>
          <div>
            <strong>Kinder Hospitals</strong>
            <small>Admin Portal</small>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <button key={n.key} className={page === n.key ? 'active' : ''} onClick={() => setPage(n.key)}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">{user.name || user.email}</div>
          <button className="btn btn-small" onClick={() => { setToken(''); setUser(null); }}>Log out</button>
        </div>
      </aside>
      <main className="content">
        {page === 'dashboard' && <Dashboard goTo={setPage} />}
        {page === 'settings' && <SettingsPage />}
        {page === 'media' && <MediaLibrary />}
        {COLLECTIONS.map((c) => page === c.key && <CollectionManager key={c.key} config={c} />)}
      </main>
    </div>
  );
}
