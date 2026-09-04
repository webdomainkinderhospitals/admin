import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { COLLECTIONS } from '../collections.js';
import { RecordForm, clearLocationCache } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';
import { openMediaArea } from './MediaLibrary.jsx';

const SITE_URL = import.meta.env.VITE_SITE_URL || '';

const config = COLLECTIONS.find((c) => c.key === 'locations');

const slugOf = (loc) =>
  loc.slug ||
  String(loc.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Accessible on/off switch: keyboard operable, 44px hit area, visible focus.
function Toggle({ on, busy, label, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' on' : ''}${busy ? ' busy' : ''}`}
      disabled={busy}
      onClick={onChange}
    >
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb"></span></span>
      <span className="switch-text">{on ? 'Visible on website' : 'Hidden from website'}</span>
    </button>
  );
}

export function HospitalsManager({ goTo = () => {} }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} | item
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(null); // id being toggled
  const formRef = useRef();

  async function load() {
    try {
      setItems(await api('/api/locations/all'));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (editing && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing?.id, editing === null]);

  async function toggle(loc) {
    setToggling(loc.id);
    setError('');
    const next = !(loc.published !== false);
    setItems((list) => list.map((l) => (l.id === loc.id ? { ...l, published: next } : l)));
    try {
      await api(`/api/locations/${loc.id}`, { method: 'PUT', body: { published: next } });
      toast(next
        ? `Kinder ${loc.name} is now visible on the website`
        : `Kinder ${loc.name} is now hidden from the website`);
    } catch (e) {
      setItems((list) => list.map((l) => (l.id === loc.id ? { ...l, published: !next } : l)));
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  async function save() {
    setBusy(true);
    setFormError('');
    try {
      const body = { ...editing };
      delete body.id;
      if (editing.id) await api(`/api/locations/${editing.id}`, { method: 'PUT', body });
      else await api('/api/locations', { method: 'POST', body });
      clearLocationCache();
      setEditing(null);
      await load();
      toast('Hospital saved — live within a minute');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(loc) {
    if (!confirm(`Delete Kinder ${loc.name} permanently?\n\nIts page and menu entry disappear from the website. Tip: if you only want to hide it for now, use the visibility switch instead.`)) return;
    try {
      await api(`/api/locations/${loc.id}`, { method: 'DELETE' });
      clearLocationCache();
      await load();
      toast(`Kinder ${loc.name} deleted`);
    } catch (e) {
      setError(e.message);
    }
  }

  const live = (items || []).filter((l) => l.published !== false).length;
  const newHospital = () => setEditing({ published: true, country: 'India', sortOrder: (items || []).length + 1 });

  return (
    <div className="page">
      <div className="hosp-head card">
        <div>
          <h2>Your hospitals</h2>
          <p className="muted">
            {items === null ? 'Loading…' : `${items.length} centre${items.length === 1 ? '' : 's'} · ${live} visible on the website`}
          </p>
          <p className="muted small">
            Each hospital gets its own page and a card on the homepage. Its doctors and specialities are managed under <button className="link-btn" onClick={() => goTo('services-doctors')}>Services &amp; Doctors</button>.
          </p>
        </div>
        <button className="btn btn-primary" onClick={newHospital}>
          <Icon name="plus" size={16} /> Add new hospital
        </button>
      </div>

      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      {editing && (
        <div ref={formRef}>
          <RecordForm
            sections={config.sections}
            value={editing}
            onChange={setEditing}
            onSubmit={save}
            onCancel={() => { setEditing(null); setFormError(''); }}
            busy={busy}
            error={formError}
            folder="locations"
            title={editing.id ? `Edit Kinder ${editing.name}` : 'New hospital'}
            subtitle="Everything about this centre — its card on the homepage, its own page, photos and contact details."
            submitLabel={editing.id ? 'Save changes' : 'Add hospital'}
          />
        </div>
      )}

      {items === null ? (
        <div className="hosp-grid">
          {[0, 1, 2].map((i) => <div className="card hosp-card" key={i}><div className="hosp-card-img skeleton"></div></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <Icon name="building" size={30} />
          <strong>No hospitals yet</strong>
          <p>Add your first centre — it appears on the website within a minute.</p>
          <button className="btn btn-primary" onClick={newHospital}>
            <Icon name="plus" size={16} /> Add new hospital
          </button>
        </div>
      ) : (
        <div className="hosp-grid">
          {items.map((loc) => {
            const on = loc.published !== false;
            const missing = [
              !loc.imageUrl && 'card photo', !loc.tagline && 'tagline', !loc.description && 'about text',
              !loc.address && 'address', !loc.phone && 'phone',
            ].filter(Boolean);
            return (
              <article className={`card hosp-card${on ? '' : ' is-off'}`} key={loc.id}>
                <div
                  className="hosp-card-img"
                  style={loc.heroImageUrl || loc.imageUrl ? { backgroundImage: `url('${loc.heroImageUrl || loc.imageUrl}')` } : undefined}
                >
                  {!on && <span className="hosp-off-badge"><Icon name="eyeOff" size={13} /> Hidden</span>}
                  {loc.international && <span className="hosp-intl-badge">International</span>}
                </div>
                <div className="hosp-card-body">
                  <div className="hosp-card-title">
                    <h3>Kinder {loc.name}</h3>
                    <span className="muted small">{[loc.city, loc.country].filter(Boolean).join(', ')}{loc.since ? ` · ${loc.since}` : ''}</span>
                  </div>
                  {missing.length > 0 ? (
                    <p className="hosp-missing"><Icon name="alert" size={13} /> Still missing: {missing.join(', ')}</p>
                  ) : (
                    <p className="hosp-complete"><Icon name="check" size={13} /> Page details complete</p>
                  )}
                  <Toggle
                    on={on}
                    busy={toggling === loc.id}
                    label={`Toggle Kinder ${loc.name} visibility on the website`}
                    onChange={() => toggle(loc)}
                  />
                  <div className="hosp-card-actions">
                    <button className="btn btn-small" onClick={() => setEditing(loc)}>
                      <Icon name="pencil" size={14} /> Edit details
                    </button>
                    <button className="btn btn-small" onClick={() => { openMediaArea({ section: 'hospitals', hospital: slugOf(loc) }); goTo('media'); }} title="Photos and page checklist for this hospital">
                      <Icon name="image" size={14} /> Photos
                    </button>
                    {SITE_URL && on && (
                      <a className="btn btn-small btn-ghost" href={`${SITE_URL}/hospitals/${slugOf(loc)}`} target="_blank" rel="noopener">
                        <Icon name="external" size={14} /> View page
                      </a>
                    )}
                    <button className="btn btn-small btn-danger" aria-label={`Delete Kinder ${loc.name}`} onClick={() => remove(loc)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
