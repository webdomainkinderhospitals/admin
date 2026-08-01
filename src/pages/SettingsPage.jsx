import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SETTING_FIELDS } from '../collections.js';
import { Field } from '../fields.jsx';

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
    try {
      await api('/api/settings', { method: 'PUT', body: { ...settings, stats } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <div className="loading">{error || 'Loading…'}</div>;

  return (
    <div>
      <div className="page-head"><h1>⚙️ Site Settings</h1></div>
      {error && <div className="error-banner">{error}</div>}
      <form className="card form-card" onSubmit={save}>
        {SETTING_FIELDS.map((f) => (
          <div className="form-row" key={f.name}>
            <label>{f.label}</label>
            <Field field={f} value={settings[f.name]} folder="hero"
              onChange={(v) => setSettings((prev) => ({ ...prev, [f.name]: v }))} />
          </div>
        ))}

        <div className="form-row">
          <label>Homepage stats</label>
          {stats.map((s, i) => (
            <div className="stat-row" key={i}>
              <input placeholder="Value (e.g. 13,000+)" value={s.value || ''}
                onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <input placeholder="Label (e.g. Births since 2011)" value={s.label || ''}
                onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <button type="button" className="btn btn-small btn-danger"
                onClick={() => setStats(stats.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-small" onClick={() => setStats([...stats, { value: '', label: '' }])}>
            + Add stat
          </button>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          {saved && <span className="saved-tick">✓ Saved — live on the site within a minute</span>}
        </div>
      </form>
    </div>
  );
}
