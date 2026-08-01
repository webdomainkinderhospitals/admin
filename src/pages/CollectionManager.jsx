import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field } from '../fields.jsx';

export function CollectionManager({ config }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setItems(await api(`/api/${config.key}/all`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, [config.key]);

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
    } catch (e) {
      setError(e.message);
    }
  }

  function blank() {
    const obj = {};
    for (const f of config.fields) if (f.default !== undefined) obj[f.name] = f.default;
    return obj;
  }

  return (
    <div>
      <div className="page-head">
        <h1>{config.icon} {config.label}</h1>
        <button className="btn btn-primary" onClick={() => setEditing(blank())}>+ Add new</button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {editing && (
        <form className="card form-card" onSubmit={save}>
          <h2>{editing.id ? `Edit ${config.label.replace(/s$/, '').toLowerCase()}` : `New ${config.label.replace(/s$/, '').toLowerCase()}`}</h2>
          {config.fields.map((f) => (
            <div className="form-row" key={f.name}>
              <label>{f.label}{f.required ? ' *' : ''}</label>
              <Field
                field={f}
                value={editing[f.name]}
                folder={config.key}
                onChange={(v) => setEditing((prev) => ({ ...prev, [f.name]: v }))}
              />
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        {items.length === 0 && <p className="muted">Nothing here yet — click “Add new”.</p>}
        <table className="table">
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="thumb-cell">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="thumb-empty">{config.icon}</span>}
                </td>
                <td>
                  <strong>{item[config.titleField]}</strong>
                  <div className="muted small">
                    {['city', 'designation', 'category', 'relation'].map((k) => item[k]).filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td>
                  {item.published === false && <span className="badge badge-draft">Draft</span>}
                  {item.published !== false && <span className="badge badge-live">Live</span>}
                </td>
                <td className="actions-cell">
                  <button className="btn btn-small" onClick={() => setEditing(item)}>Edit</button>
                  <button className="btn btn-small btn-danger" onClick={() => remove(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
