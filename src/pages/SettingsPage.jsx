import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SETTING_FIELDS } from '../collections.js';
import { Field } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

const SECTIONS = [
  {
    title: 'Brand & contact',
    hint: 'Shown in the header, top bar and footer of the website.',
    fields: ['siteName', 'tagline', 'helplinePhone', 'emergencyPhone', 'email', 'logoUrl'],
  },
  {
    title: 'Announcement bar',
    hint: 'A message strip across the top of the site. Leave empty to hide it.',
    fields: ['announcement'],
  },
  {
    title: 'Homepage hero',
    hint: 'The big banner visitors see first.',
    fields: ['heroTitle', 'heroSubtitle', 'heroImageUrl'],
  },
];

function ChangePasswordCard() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { setError('New passwords do not match'); return; }
    setBusy(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      setCurrent(''); setNew(''); setConfirm('');
      toast('Password changed — use it next time you sign in');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>Change admin password</h2>
      <p className="muted card-hint">Updates the password for your admin account. Minimum 8 characters.</p>
      <div className="form-grid">
        <div className="form-row">
          <label>Current password</label>
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>New password</label>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Confirm new password</label>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>
      {error && <div className="error-text" role="alert"><Icon name="alert" size={14} /> {error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/settings')
      .then((s) => {
        setSettings(s);
        setStats(Array.isArray(s.stats) ? s.stats : []);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/settings', { method: 'PUT', body: { ...settings, stats } });
      toast('Settings saved — live on the site within a minute');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="page">
        {error
          ? <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>
          : <div className="card"><span className="skeleton skeleton-line"></span></div>}
      </div>
    );
  }

  const byName = Object.fromEntries(SETTING_FIELDS.map((f) => [f.name, f]));

  return (
    <div className="page">
      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}
      <form onSubmit={save}>
        {SECTIONS.map((section) => (
          <div className="card form-card" key={section.title}>
            <h2>{section.title}</h2>
            <p className="muted card-hint">{section.hint}</p>
            <div className="form-grid">
              {section.fields.map((name) => {
                const f = byName[name];
                if (!f) return null;
                return (
                  <div
                    className={`form-row${f.type === 'textarea' || f.type === 'image' ? ' form-row-wide' : ''}`}
                    key={f.name}
                  >
                    <label>{f.label}</label>
                    <Field
                      field={f} value={settings[f.name]} folder="hero"
                      onChange={(v) => setSettings((prev) => ({ ...prev, [f.name]: v }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="card form-card">
          <h2>Homepage statistics</h2>
          <p className="muted card-hint">The animated numbers on the homepage (e.g. 13,000+ births).</p>
          {stats.map((s, i) => (
            <div className="stat-row" key={i}>
              <input
                placeholder="Value (e.g. 13,000+)" value={s.value || ''}
                onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              <input
                placeholder="Label (e.g. Births since 2011)" value={s.label || ''}
                onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <button
                type="button" className="btn btn-small btn-danger" aria-label="Remove stat"
                onClick={() => setStats(stats.filter((_, j) => j !== i))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-small" onClick={() => setStats([...stats, { value: '', label: '' }])}>
            <Icon name="plus" size={14} /> Add stat
          </button>
        </div>

        <div className="save-bar">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true"></span> : <Icon name="check" size={16} />}
            {busy ? 'Saving…' : 'Save all settings'}
          </button>
        </div>
      </form>

      <ChangePasswordCard />
    </div>
  );
}
