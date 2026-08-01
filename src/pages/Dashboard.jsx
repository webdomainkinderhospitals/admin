import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { COLLECTIONS } from '../collections.js';
import { Icon } from '../icons.jsx';

export function Dashboard({ goTo }) {
  const [data, setData] = useState({}); // key -> { count, drafts } | 'error'

  useEffect(() => {
    (async () => {
      const next = {};
      for (const c of COLLECTIONS) {
        try {
          const items = await api(`/api/${c.key}/all`);
          next[c.key] = {
            count: items.length,
            drafts: items.filter((i) => i.published === false).length,
          };
        } catch {
          next[c.key] = 'error';
        }
        setData({ ...next });
      }
    })();
  }, []);

  const loaded = Object.keys(data).length === COLLECTIONS.length;
  const totalDrafts = loaded
    ? COLLECTIONS.reduce((n, c) => n + (data[c.key]?.drafts || 0), 0)
    : 0;

  return (
    <div className="page">
      <div className="welcome-card">
        <div>
          <h2>Welcome back 👋</h2>
          <p>
            Everything you change here goes live on the website within about a minute.
            Start with <button className="link-btn" onClick={() => goTo('settings')}>Site Settings</button> for
            the hero, phone numbers and logo, or the{' '}
            <button className="link-btn" onClick={() => goTo('media')}>Media Library</button> to upload photos.
          </p>
        </div>
        {loaded && totalDrafts > 0 && (
          <div className="draft-note">
            <Icon name="alert" size={16} />
            {totalDrafts} item{totalDrafts > 1 ? 's' : ''} saved as draft — not visible on the site
          </div>
        )}
      </div>

      <h3 className="section-label">Website content</h3>
      <div className="stat-grid">
        {COLLECTIONS.map((c) => {
          const d = data[c.key];
          return (
            <button key={c.key} className="stat-card" onClick={() => goTo(c.key)}>
              <span className="stat-icon"><Icon name={c.icon} size={20} /></span>
              {d === undefined ? (
                <span className="skeleton skeleton-num" aria-hidden="true"></span>
              ) : (
                <span className="stat-num">{d === 'error' ? '—' : d.count}</span>
              )}
              <span className="stat-label">{c.label}</span>
              {d && d !== 'error' && d.drafts > 0 && (
                <span className="stat-sub">{d.drafts} draft{d.drafts > 1 ? 's' : ''}</span>
              )}
              <span className="stat-go"><Icon name="pencil" size={14} /> Manage</span>
            </button>
          );
        })}
      </div>

      <h3 className="section-label">Quick actions</h3>
      <div className="quick-grid">
        <button className="quick-card" onClick={() => goTo('media')}>
          <Icon name="upload" size={18} />
          <div><strong>Upload photos</strong><span>Add images to the Media Library</span></div>
        </button>
        <button className="quick-card" onClick={() => goTo('settings')}>
          <Icon name="spark" size={18} />
          <div><strong>Edit homepage hero</strong><span>Title, subtitle &amp; hero image</span></div>
        </button>
        <button className="quick-card" onClick={() => goTo('doctors')}>
          <Icon name="doctor" size={18} />
          <div><strong>Add a doctor</strong><span>Profile, photo &amp; speciality</span></div>
        </button>
        <button className="quick-card" onClick={() => goTo('news')}>
          <Icon name="news" size={18} />
          <div><strong>Post news or an event</strong><span>Announcements, camps &amp; press</span></div>
        </button>
      </div>
    </div>
  );
}
