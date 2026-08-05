import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Shared cache of location names for the "Location" dropdowns.
let locationsCache = null;
function useLocationNames() {
  const [names, setNames] = useState(locationsCache || []);
  useEffect(() => {
    if (locationsCache) return;
    api('/api/locations/all')
      .catch(() => api('/api/locations'))
      .then((list) => {
        locationsCache = list.map((l) => l.name);
        setNames(locationsCache);
      })
      .catch(() => {});
  }, []);
  return names;
}

// "" = shown for all centres; a name = only that hospital's page.
export function LocationField({ value, onChange }) {
  const names = useLocationNames();
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">All centres (entire website)</option>
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
      {value && !names.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

// Uploads an image to /api/media and stores the returned URL.
export function ImageField({ value, onChange, folder = 'general' }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file) {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const media = await api('/api/media', { method: 'POST', formData: fd });
      onChange(media.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-field">
      {value ? (
        <div className="image-preview">
          <img src={value} alt="" />
          <button type="button" className="btn btn-small btn-danger" onClick={() => onChange('')}>Remove</button>
        </div>
      ) : (
        <div className="image-empty">No image</div>
      )}
      <div className="image-actions">
        <button type="button" className="btn btn-small" disabled={busy} onClick={() => inputRef.current.click()}>
          {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </button>
        <input
          type="text"
          placeholder="…or paste an image URL"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && <div className="error-text">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
      />
    </div>
  );
}

export function Field({ field, value, onChange, folder }) {
  const v = value === undefined || value === null ? (field.default ?? '') : value;
  switch (field.type) {
    case 'textarea':
      return <textarea rows={field.rows || 3} value={v} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={v} onChange={(e) => onChange(e.target.value)} />;
    case 'checkbox':
      return (
        <label className="checkbox">
          <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(e.target.checked)} />
          <span>Yes</span>
        </label>
      );
    case 'date': {
      const d = v ? String(v).slice(0, 10) : '';
      return <input type="date" value={d} onChange={(e) => onChange(e.target.value)} />;
    }
    case 'select':
      return (
        <select value={v || field.options[0]} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'image':
      return <ImageField value={v} onChange={onChange} folder={folder} />;
    case 'location':
      return <LocationField value={v} onChange={onChange} />;
    default:
      return <input type="text" value={v} onChange={(e) => onChange(e.target.value)} />;
  }
}
