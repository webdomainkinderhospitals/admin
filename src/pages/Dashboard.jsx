import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { COLLECTIONS } from '../collections.js';
import { Icon } from '../icons.jsx';
import { useSiteData } from '../media/useSiteData.js';
import { buildAreas, progressOf, hospitalSlug } from '../media/slots.js';
import { ProgressBar, StatusPill } from '../media/components.jsx';
import { openMediaArea } from './MediaLibrary.jsx';

// "Is the website complete?" — one row per website, straight from the same
// slot definitions the Media & Content hub uses.
function ReadinessCard({ goTo }) {
  const { data } = useSiteData();
  if (!data) {
    return <div className="card readiness-card"><span className="skeleton skeleton-line"></span></div>;
  }
  const areas = buildAreas(data);
  const rows = [
    { label: 'Corporate website', sub: 'kinderhospitals.com', area: areas.corporate, intent: { section: 'corporate' } },
    ...areas.hospitals.map((h) => ({
      label: h.label, sub: h.hidden ? 'Hidden from website' : `/hospitals/${hospitalSlug(h.location)}`, area: h,
      intent: { section: 'hospitals', hospital: hospitalSlug(h.location) },
    })),
  ];
  const totals = rows.reduce((t, r) => {
    const p = progressOf(r.area);
    return { done: t.done + p.done, total: t.total + p.total, todo: t.todo + p.pending + p.sample };
  }, { done: 0, total: 0, todo: 0 });

  return (
    <div className="card readiness-card">
      <div className="readiness-head">
        <div>
          <h3>Website readiness</h3>
          <p className="muted small">
            {totals.todo === 0
              ? 'Every image and text slot is filled with your own content.'
              : `${totals.todo} image or text slot${totals.todo === 1 ? '' : 's'} still to fill across your websites.`}
          </p>
        </div>
        <button className="btn btn-primary btn-small" onClick={() => { openMediaArea({ section: 'corporate' }); goTo('media'); }}>
          <Icon name="image" size={14} /> Open Media Library
        </button>
      </div>
      <div className="readiness-rows">
        {rows.map((r) => {
          const p = progressOf(r.area);
          const todo = p.pending + p.sample;
          return (
            <div className="readiness-row" key={r.label}>
              <div>
                <strong>{r.label}</strong>
                <span className="muted small">{r.sub}</span>
              </div>
              <ProgressBar progress={p} />
              <button className="btn btn-small" onClick={() => { openMediaArea(r.intent); goTo('media'); }}>
                {todo ? <>Fill {todo} item{todo === 1 ? '' : 's'} <Icon name="arrow" size={13} /></> : <StatusPill status="done" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

      <h3 className="section-label">Website readiness</h3>
      <ReadinessCard goTo={goTo} />

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
          <div><strong>Upload photos</strong><span>Fill banners, logos &amp; doctor photos</span></div>
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
