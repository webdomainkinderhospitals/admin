import { PublishControl } from '../PublishControl.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { RecordForm, clearSpecialityCache, clearLocationCache } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';
import { locationLabel } from '../locations.js';

// Generic list + one entry form for a collection (procedures, news, stories…).
// The form is the shared RecordForm, so every screen looks and behaves alike.
export function CollectionManager({ config, category = '' }) {
  const [items, setItems] = useState(null); // null = loading
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef();

  const singular = config.singular || config.label.toLowerCase();

  async function load() {
    try {
      setItems(await api(`/api/${config.key}/all`));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }
  useEffect(() => {
    setItems(null);
    setQuery('');
    setError('');
    if (window.__kinderQuickAdd) {
      window.__kinderQuickAdd = false;
      setEditing(blank());
    } else {
      setEditing(null);
    }
    load();
  }, [config.key]);

  useEffect(() => {
    if (editing && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing?.id, editing === null]);

  async function save() {
    setBusy(true);
    setFormError('');
    try {
      const body = { ...editing };
      delete body.id;
      if (editing.id) await api(`/api/${config.key}/${editing.id}`, { method: 'PUT', body });
      else await api(`/api/${config.key}`, { method: 'POST', body });
      if (config.key === 'specialities') clearSpecialityCache();
      if (config.key === 'locations') clearLocationCache();
      setEditing(null);
      await load();
      toast(body.published ? `${cap(singular)} saved — published changes appear within a minute` : `${cap(singular)} saved as a draft`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete “${item[config.titleField]}” permanently?\n\nTip: if you only want to take it off the website for now, switch it to Hidden instead.`)) return;
    try {
      await api(`/api/${config.key}/${item.id}`, { method: 'DELETE' });
      await load();
      toast('Deleted');
    } catch (e) {
      setError(e.message);
    }
  }

  function blank() {
    const obj = {};
    for (const f of config.fields) if (f.default !== undefined) obj[f.name] = f.default;
    if (category) obj.category = category;
    return obj;
  }

  const list = (items || []).filter((item) => {
    if (category && item.category !== category) return false;
    if (!query) return true;
    const hay = Object.values(item).join(' ').toLowerCase();
    return hay.includes(query.toLowerCase());
  });
  const hidden = (items || []).filter((i) => i.published === false).length;
  const hasImage = config.fields.some((f) => f.type === 'image');

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <p className="muted">
            {items === null ? 'Loading…' : `${items.length} ${items.length === 1 ? singular : config.label.toLowerCase()}${hidden ? ` · ${hidden} hidden` : ''}`}
          </p>
        </div>
        <div className="page-head-tools">
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder={`Search ${config.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${config.label}`}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>
            <Icon name="plus" size={16} /> Add {singular}
          </button>
        </div>
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
            folder={config.key}
            title={editing.id ? `Edit ${singular}` : `New ${singular}`}
            subtitle={editing.id ? undefined : `Fill in the steps below. Only fields marked * are required — you can add the rest later.`}
            submitLabel={editing.id ? 'Save changes' : `Add ${singular}`}
          />
        </div>
      )}

      <div className="card table-card">
        {items === null ? (
          <div className="table-skeleton">
            {[0, 1, 2].map((i) => (
              <div className="skeleton-row" key={i}>
                <span className="skeleton skeleton-thumb"></span>
                <span className="skeleton skeleton-line"></span>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Icon name={config.icon} size={30} />
            {items.length === 0 ? (
              <>
                <strong>No {config.label.toLowerCase()} yet</strong>
                <p>Add your first {singular} — it appears on the website within a minute.</p>
                <button className="btn btn-primary" onClick={() => setEditing(blank())}>
                  <Icon name="plus" size={16} /> Add {singular}
                </button>
              </>
            ) : (
              <>
                <strong>No matches</strong>
                <p>Nothing matches “{query}”.</p>
              </>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th colSpan={hasImage ? 2 : 1}>{config.label}</th>
                <th>On website</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className={item.published === false ? 'is-hidden' : ''}>
                  {hasImage && (
                    <td className="thumb-cell">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt="" loading="lazy" />
                        : <span className="thumb-empty" title="No photo yet"><Icon name={config.icon} size={18} /></span>}
                    </td>
                  )}
                  <td>
                    <button type="button" className="row-title" onClick={() => setEditing(item)}>{item[config.titleField]}</button>
                    {item.reviewNotes && <div className="review-badge">Review needed</div>}
                    <div className="muted small">
                      {[
                        item.category, item.designation, item.relation,
                        locationLabel(item),
                        item.publishedAt ? String(item.publishedAt).slice(0, 10) : null,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>
                    <PublishControl item={item} config={config}
                      onSaved={(saved) => setItems((rows) => rows.map((r) => r.id === saved.id ? saved : r))}
                      onEdit={() => { setFormError(''); setEditing(item); }} />
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small" onClick={() => setEditing(item)}>
                      <Icon name="pencil" size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      aria-label={`Delete ${item[config.titleField]}`}
                      onClick={() => remove(item)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
