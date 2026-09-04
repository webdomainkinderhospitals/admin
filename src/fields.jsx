import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { ImagePicker } from './media/components.jsx';
import { locationsOf, joinLocations } from './locations.js';

// Shared cache of locations for the "Hospital" dropdowns.
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
export function clearLocationCache() { locationsCache = null; }

// Where something appears. "" = everywhere; otherwise a comma-separated list
// of hospital names — a doctor can practise at several centres.
export function LocationField({ value, onChange }) {
  const names = useLocationNames();
  const chosen = locationsOf(value);
  const everywhere = chosen.length === 0;
  // Keep names that no longer match a hospital visible so they can be unticked.
  const options = [...names, ...chosen.filter((c) => !names.some((n) => n.toLowerCase() === c.toLowerCase()))];

  function toggleName(name) {
    const has = chosen.some((c) => c.toLowerCase() === name.toLowerCase());
    onChange(joinLocations(has ? chosen.filter((c) => c.toLowerCase() !== name.toLowerCase()) : [...chosen, name]));
  }

  return (
    <div className="where-field" role="group" aria-label="Where it appears">
      <label className={`where-option${everywhere ? ' active' : ''}`}>
        <input type="radio" name={undefined} checked={everywhere} onChange={() => onChange('')} />
        <span>
          <strong>Everywhere</strong>
          <small>Corporate website and every hospital page</small>
        </span>
      </label>
      <label className={`where-option${!everywhere ? ' active' : ''}`}>
        <input type="radio" checked={!everywhere} onChange={() => { if (everywhere && options[0]) onChange(options[0]); }} />
        <span>
          <strong>Selected hospitals</strong>
          <small>Tick one or more — the same doctor can practise at several centres</small>
        </span>
      </label>
      <div className={`where-hospitals${everywhere ? ' is-muted' : ''}`}>
        {options.length === 0 && <span className="muted small">No hospitals yet — add one under Hospitals.</span>}
        {options.map((n) => {
          const on = chosen.some((c) => c.toLowerCase() === n.toLowerCase());
          return (
            <label key={n} className={`where-chip${on ? ' on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggleName(n)} />
              <Icon name={on ? 'check' : 'plus'} size={12} /> Kinder {n}
            </label>
          );
        })}
      </div>
      {!everywhere && chosen.length === 0 && <p className="field-hint slot-warn">Tick at least one hospital, or choose Everywhere.</p>}
    </div>
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

// ---------------------------------------------------------------------------
// One image = one control. Upload from the computer, drop a file, or pick
// something already in the library. No URL pasting — nothing to get wrong.
// ---------------------------------------------------------------------------
export function ImageField({ value, onChange, folder = 'general', size, label = 'photo' }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null); // null | media list

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (JPG, PNG or WebP).'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const media = await api('/api/media', { method: 'POST', formData: fd });
      onChange(media.url);
      return media;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openPicker() {
    setError('');
    try {
      setPicker(await api('/api/media'));
    } catch (e) {
      setError(e.message);
    }
  }

  const folders = picker ? [...new Set([folder, ...picker.map((m) => m.folder)])] : [];

  return (
    <div className={`image-field${busy ? ' is-busy' : ''}`}>
      <div
        className={`image-drop${over ? ' drag-over' : ''}${value ? ' has-image' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
      >
        {value ? (
          <img src={value} alt="" />
        ) : (
          <button type="button" className="image-drop-empty" onClick={() => inputRef.current.click()} disabled={busy}>
            <Icon name="upload" size={22} />
            <strong>Drop a {label} here or click to upload</strong>
            {size && <span>Best size: {size}</span>}
          </button>
        )}
        {busy && <span className="slot-busy"><span className="spinner"></span></span>}
      </div>
      <div className="image-field-side">
        {value && size && <p className="slot-size">Best size: {size}</p>}
        <div className="image-actions">
          <button type="button" className="btn btn-small btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
            <Icon name="upload" size={13} /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload from computer'}
          </button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={openPicker}>
            <Icon name="image" size={13} /> Choose from library
          </button>
          {value && (
            <button type="button" className="btn btn-small btn-ghost btn-danger" disabled={busy} onClick={() => onChange('')}>
              <Icon name="x" size={13} /> Remove
            </button>
          )}
        </div>
        {error && <div className="error-text" role="alert"><Icon name="alert" size={13} /> {error}</div>}
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => { upload(e.target.files[0]); e.target.value = ''; }}
      />
      {picker && (
        <ImagePicker
          title={`Choose a ${label}`}
          media={picker}
          folders={folders}
          folderNames={(f) => FOLDER_NAMES[f] || f}
          initialFolder={picker.some((m) => m.folder === folder) ? folder : ''}
          usage={new Map()}
          onSelect={(m) => { setPicker(null); onChange(m.url); }}
          onUpload={async (file) => { setPicker(null); await upload(file); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

const FOLDER_NAMES = {
  hero: 'Homepage hero', corporate: 'Corporate pages', general: 'General', doctors: 'Doctor photos',
  locations: 'Hospital photos', news: 'News & events', testimonials: 'Patient stories',
  specialities: 'Specialities', procedures: 'Procedures',
};

// On/off switch used for "Show on the website".
export function SwitchField({ value, onChange, onLabel = 'Visible on the website', offLabel = 'Hidden from the website' }) {
  const on = value !== false;
  return (
    <button type="button" role="switch" aria-checked={on} className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb"></span></span>
      <span className="switch-text">{on ? onLabel : offLabel}</span>
    </button>
  );
}

export function Field({ field, value, onChange, folder }) {
  const v = value === undefined || value === null ? (field.default ?? '') : value;
  switch (field.type) {
    case 'textarea':
      return <textarea rows={field.rows || 3} value={v} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={v} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'checkbox':
      return (
        <label className="checkbox">
          <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.checkboxLabel || 'Yes'}</span>
        </label>
      );
    case 'switch':
      return <SwitchField value={v} onChange={onChange} />;
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
      return <ImageField value={v} onChange={onChange} folder={field.folder || folder} size={field.size} label={(field.label || 'photo').toLowerCase()} />;
    case 'location':
      return <LocationField value={v} onChange={onChange} />;
    case 'speciality':
      return <SpecialityField value={v} onChange={onChange} />;
    default:
      return <input type="text" value={v} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}

// One labelled input with its hint. `wide` spans both columns of the grid.
export function FieldRow({ field, value, onChange, folder }) {
  const wide = field.wide || field.type === 'textarea' || field.type === 'image';
  return (
    <div className={`form-row${wide ? ' form-row-wide' : ''}`}>
      <label>
        {field.label}
        {field.required
          ? <span className="req"> *</span>
          : ['text', 'textarea', 'number', 'date', 'image', 'speciality'].includes(field.type) && <span className="optional-tag"> optional</span>}
      </label>
      <Field field={field} value={value} onChange={onChange} folder={folder} />
      {field.hint && <p className="field-hint">{field.hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The one entry form used by every screen. Renders the collection's sections
// as numbered steps, validates required fields, and shows a sticky save bar.
// ---------------------------------------------------------------------------
export function RecordForm({ sections, value, onChange, onSubmit, onCancel, busy, title, subtitle, error, submitLabel = 'Save', folder }) {
  const [problem, setProblem] = useState('');
  const set = (name) => (v) => onChange({ ...value, [name]: v });

  function submit(e) {
    e.preventDefault();
    const missing = sections.flatMap((s) => s.fields).filter((f) => f.required && !String(value[f.name] ?? '').trim());
    if (missing.length) {
      setProblem(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setProblem('');
    onSubmit(e);
  }

  return (
    <form className="card form-card record-form" onSubmit={submit} noValidate>
      <div className="record-form-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted card-hint">{subtitle}</p>}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onCancel} aria-label="Close form"><Icon name="x" size={18} /></button>
      </div>
      {sections.map((s, i) => (
        <fieldset className="form-section" key={s.title}>
          <legend><span className="step-num">{i + 1}</span> {s.title}</legend>
          {s.hint && <p className="muted small form-section-hint">{s.hint}</p>}
          <div className="form-grid">
            {s.fields.map((f) => (
              <FieldRow key={f.name} field={f} value={value[f.name]} onChange={set(f.name)} folder={folder} />
            ))}
          </div>
        </fieldset>
      ))}
      {(problem || error) && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {problem || error}</div>}
      <div className="form-actions record-form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true"></span> : <Icon name="check" size={16} />}
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <span className="muted small form-actions-note">Changes go live on the website within a minute.</span>
      </div>
    </form>
  );
}
