import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

export function CollectionManager({ config }) {
  const [items, setItems] = useState(null); // null = loading
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const singular = config.label.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase();

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
    setEditing(null);
    setQuery('');
    setError('');
    load();
  }, [config.key]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...editing };
      delete body.id;
      if (editing.id) await api(`/api/${config.key}/${editing.id}`, { method: 'PUT', body });
      else await api(`/api/${config.key}`, { method: 'POST', body });
      setEditing(null);
      await load();
      toast(`${config.label} saved — live within a minute`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item[config.titleField]}"? This cannot be undone.`)) return;
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
    return obj;
  }

  const list = (items || []).filter((item) => {
    if (!query) return true;
    const hay = Object.values(item).join(' ').toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="page">
      <div className="page-head">
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
      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      {editing && (
        <form className="card form-card" onSubmit={save}>
          <h2>{editing.id ? `Edit ${singular}` : `New ${singular}`}</h2>
          <div className="form-grid">
            {config.fields.map((f) => (
              <div
                className={`form-row${f.type === 'textarea' || f.type === 'image' ? ' form-row-wide' : ''}`}
                key={f.name}
              >
                <label>{f.label}{f.required ? <span className="req"> *</span> : ''}</label>
                <Field
                  field={f}
                  value={editing[f.name]}
                  folder={config.key}
                  onChange={(v) => setEditing((prev) => ({ ...prev, [f.name]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" aria-hidden="true"></span> : <Icon name="check" size={16} />}
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
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
                <th colSpan="2">{list.length} {list.length === 1 ? singular : config.label.toLowerCase()}</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td className="thumb-cell">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" loading="lazy" />
                      : <span className="thumb-empty"><Icon name={config.icon} size={18} /></span>}
                  </td>
                  <td>
                    <strong>{item[config.titleField]}</strong>
                    <div className="muted small">
                      {['city', 'designation', 'category', 'relation'].map((k) => item[k]).filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>
                    {item.published === false
                      ? <span className="badge badge-draft">Draft</span>
                      : <span className="badge badge-live">Live</span>}
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
