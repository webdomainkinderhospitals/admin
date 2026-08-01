import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { COLLECTIONS } from '../collections.js';

export function Dashboard({ goTo }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    (async () => {
      const next = {};
      for (const c of COLLECTIONS) {
        try {
          next[c.key] = (await api(`/api/${c.key}/all`)).length;
        } catch {
          next[c.key] = '—';
        }
        setCounts({ ...next });
      }
    })();
  }, []);

  return (
    <div>
      <div className="page-head"><h1>🏠 Dashboard</h1></div>
      <p className="muted">
        Welcome to the Kinder Hospitals admin portal. Everything you change here goes live on the
        website within about a minute. Use <strong>Site Settings</strong> for the hero, phones and
        logo, the <strong>Media Library</strong> for images, and the sections below for content.
      </p>
      <div className="stat-grid">
        {COLLECTIONS.map((c) => (
          <button key={c.key} className="stat-card" onClick={() => goTo(c.key)}>
            <span className="stat-icon">{c.icon}</span>
            <span className="stat-num">{counts[c.key] ?? '…'}</span>
            <span className="stat-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
