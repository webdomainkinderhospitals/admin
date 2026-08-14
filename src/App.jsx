import React, { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { COLLECTIONS } from './collections.js';
import { CollectionManager } from './pages/CollectionManager.jsx';
import { MediaLibrary } from './pages/MediaLibrary.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Icon } from './icons.jsx';
import { ToastHost } from './toast.jsx';

const SITE_URL = import.meta.env.VITE_SITE_URL || '';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      <div className="login-shell">
        <div className="login-brand-panel">
          <div className="login-brand-mark"><Icon name="heart" size={26} /></div>
          <h2>Kinder Hospitals</h2>
          <p className="login-brand-tag">Kindles life</p>
          <p className="login-brand-text">
            One control panel for the entire Kinder Medical Group website — doctors,
            hospitals, packages, news and photos. Every change goes live within a minute.
          </p>
          <ul className="login-points">
            <li><Icon name="check" size={14} /> Edit every section of the website</li>
            <li><Icon name="check" size={14} /> Upload photos to the Media Library</li>
            <li><Icon name="check" size={14} /> Publish or hold content as drafts</li>
          </ul>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h1>Welcome back</h1>
          <p className="login-sub">Sign in to the admin portal</p>
          <div className="form-row">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email" type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} required autoFocus
            />
          </div>
          <div className="form-row">
            <label htmlFor="login-pw">Password</label>
            <div className="pw-wrap">
              <input
                id="login-pw" type={showPw ? 'text' : 'password'} value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)} required
              />
              <button
                type="button" className="pw-toggle"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((v) => !v)}
              >
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </div>
          {error && <div className="error-text" role="alert"><Icon name="alert" size={14} /> {error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true"></span> : null}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="login-foot">Protected area · Authorised staff only</p>
        </form>
      </div>
    </div>
  );
}

function initials(user) {
  const src = user.name || user.email || '?';
  const parts = src.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const byKey = Object.fromEntries(COLLECTIONS.map((c) => [c.key, c]));
const navItem = (key) => ({ key, label: byKey[key].label, icon: byKey[key].icon });

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'media', label: 'Media Library', icon: 'image' },
    ],
  },
  {
    title: 'Corporate Website',
    items: [
      { key: 'settings', label: 'Site Settings', icon: 'settings' },
      navItem('specialities'),
      navItem('procedures'),
      navItem('news'),
      navItem('testimonials'),
    ],
  },
  {
    title: 'Hospitals',
    items: [navItem('locations'), navItem('doctors')],
  },
];

const QUICK_ADDS = [
  { key: 'doctors', label: 'Add doctor', icon: 'doctor', openForm: true },
  { key: 'news', label: 'Post news / event', icon: 'news', openForm: true },
  { key: 'testimonials', label: 'Add testimonial', icon: 'chat', openForm: true },
  { key: 'procedures', label: 'Add procedure', icon: 'activity', openForm: true },
  { key: 'media', label: 'Upload images', icon: 'upload' },
  { key: 'settings', label: 'Edit hero & settings', icon: 'spark' },
];

const TITLES = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))
);

export default function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [quickOpen, setQuickOpen] = useState(false);

  function quickAdd(item) {
    setQuickOpen(false);
    if (item.openForm) window.__kinderQuickAdd = true;
    setPage(item.key);
  }

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

  if (!checked) {
    return (
      <div className="loading">
        <span className="spinner spinner-lg" aria-hidden="true"></span>
      </div>
    );
  }
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><Icon name="heart" size={18} /></span>
          <div>
            <strong>Kinder Hospitals</strong>
            <small>Admin Portal</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.title}>
              <span className="nav-group-title">{group.title}</span>
              {group.items.map((n) => (
                <button
                  key={n.key}
                  className={`nav-item${page === n.key ? ' active' : ''}`}
                  aria-current={page === n.key ? 'page' : undefined}
                  onClick={() => setPage(n.key)}
                >
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => { setToken(''); setUser(null); }}
          >
            <Icon name="logout" size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <h1 className="topbar-title">{TITLES[page] || 'Dashboard'}</h1>
          <div className="topbar-actions">
            <div className="quick-add-wrap">
              <button className="btn btn-primary" onClick={() => setQuickOpen((v) => !v)} aria-expanded={quickOpen}>
                <Icon name="plus" size={16} /> Quick add
              </button>
              {quickOpen && (
                <>
                  <div className="quick-add-backdrop" onClick={() => setQuickOpen(false)}></div>
                  <div className="quick-add-menu" role="menu">
                    {QUICK_ADDS.map((item) => (
                      <button key={item.key + item.label} role="menuitem" onClick={() => quickAdd(item)}>
                        <Icon name={item.icon} size={16} /> {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {SITE_URL && (
              <a className="btn btn-ghost" href={SITE_URL} target="_blank" rel="noopener">
                <Icon name="external" size={16} /> View website
              </a>
            )}
            <div className="user-pill" title={user.email}>
              <span className="avatar">{initials(user)}</span>
              <span className="user-name">{user.name || user.email}</span>
            </div>
          </div>
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard goTo={setPage} />}
          {page === 'settings' && <SettingsPage />}
          {page === 'media' && <MediaLibrary />}
          {COLLECTIONS.map((c) => page === c.key && <CollectionManager key={c.key} config={c} />)}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
