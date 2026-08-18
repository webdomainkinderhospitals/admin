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

// Shared cache of speciality names for the doctor "Speciality" dropdown.
let specialitiesCache = null;
export function useSpecialityNames() {
  const [names, setNames] = useState(specialitiesCache || []);
  useEffect(() => {
    if (specialitiesCache) return;
    api('/api/specialities/all')
      .catch(() => api('/api/specialities'))
      .then((list) => {
        specialitiesCache = [...new Set(list.map((s) => s.name))];
        setNames(specialitiesCache);
      })
      .catch(() => {});
  }, []);
  return names;
}
export function clearSpecialityCache() { specialitiesCache = null; }

// Doctors pick their speciality from the Specialities list (typing still
// allowed via the datalist, so a one-off speciality never blocks saving).
export function SpecialityField({ value, onChange }) {
  const names = useSpecialityNames();
  return (
    <>
      <input
        type="text"
        list="speciality-options"
        value={value || ''}
        placeholder="Choose or type a speciality…"
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id="speciality-options">
        {names.map((n) => <option key={n} value={n} />)}
      </datalist>
    </>
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
    case 'select': {
      const opts = field.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      return (
        <select value={v ?? opts[0].value} onChange={(e) => onChange(e.target.value)}>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    case 'image':
      return <ImageField value={v} onChange={onChange} folder={folder} />;
    case 'location':
      return <LocationField value={v} onChange={onChange} />;
    case 'speciality':
      return <SpecialityField value={v} onChange={onChange} />;
    default:
      return <input type="text" value={v} onChange={(e) => onChange(e.target.value)} />;
  }
}
