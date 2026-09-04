import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { STATUS_LABEL, isSet } from './slots.js';

// ---------- Small building blocks ----------

export function StatusPill({ status }) {
  return (
    <span className={`status-pill status-${status}`}>
      {status === 'done' && <Icon name="check" size={11} />}
      {status === 'pending' && <Icon name="alert" size={11} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProgressBar({ progress, compact = false }) {
  const { done, sample, total, pct } = progress;
  const samplePct = total ? Math.round((sample / total) * 100) : 0;
  return (
    <div className={`progress${compact ? ' progress-compact' : ''}`} role="img" aria-label={`${done} of ${total} done`}>
      <div className="progress-track">
        <span className="progress-fill" style={{ width: `${pct}%` }}></span>
        <span className="progress-sample" style={{ width: `${samplePct}%`, left: `${pct}%` }}></span>
      </div>
      {!compact && (
        <span className="progress-text">
          <strong>{done}/{total}</strong> done{sample ? ` · ${sample} sample` : ''}{total - done - sample ? ` · ${total - done - sample} pending` : ''}
        </span>
      )}
    </div>
  );
}

function useDropzone(onFiles) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e) => { e.preventDefault(); setOver(true); },
      onDragLeave: () => setOver(false),
      onDrop: (e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
        if (files.length) onFiles(files);
      },
    },
  };
}

// ---------- Image slot ----------
// One place on the website that shows one image. Upload, pick from the
// library, or drop a file straight on the card.

export function ImageSlotCard({ slot, busy, onUpload, onPick, onClear }) {
  const inputRef = useRef();
  const drop = useDropzone((files) => onUpload(files[0]));
  const has = isSet(slot.value);

  return (
    <div
      className={`slot slot-image status-${slot.status}${slot.compact ? ' slot-compact' : ''}${drop.over ? ' drag-over' : ''}${busy ? ' is-busy' : ''}`}
      {...drop.props}
    >
      <div className="slot-thumb">
        {has ? (
          <a href={slot.value} target="_blank" rel="noopener" title="Open full size">
            <img src={slot.value} alt="" loading="lazy" />
          </a>
        ) : (
          <button type="button" className="slot-thumb-empty" onClick={() => inputRef.current.click()} disabled={busy}>
            <Icon name="upload" size={20} />
            <span>Drop or click to upload</span>
          </button>
        )}
        {busy && <span className="slot-busy"><span className="spinner"></span></span>}
      </div>
      <div className="slot-body">
        <div className="slot-head">
          <div className="slot-title">
            <strong>{slot.label}</strong>
            {slot.draft && <span className="badge badge-draft">Draft</span>}
          </div>
          <StatusPill status={slot.status} />
        </div>
        {slot.where && <p className="slot-where"><Icon name="pin" size={12} /> {slot.where}</p>}
        {slot.size && !slot.compact && <p className="slot-size">Recommended: {slot.size}</p>}
        {slot.hint && !slot.compact && <p className="slot-hint">{slot.hint}</p>}
        {slot.status === 'sample' && (
          <p className="slot-hint slot-warn">This is a stock sample photo from the design. Replace it with your own.</p>
        )}
        <div className="slot-actions">
          <button type="button" className="btn btn-small btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
            <Icon name="upload" size={13} /> {has ? 'Replace' : 'Upload'}
          </button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={onPick}>
            <Icon name="image" size={13} /> From library
          </button>
          {has && (
            <button type="button" className="btn btn-small btn-ghost btn-danger" disabled={busy} onClick={onClear} title="Remove this image from the website">
              <Icon name="x" size={13} /> Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }}
      />
    </div>
  );
}

// ---------- Text slot ----------
// Click to edit in place; Enter (or Save) writes it straight to the site.

export function TextSlotCard({ slot, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slot.value ?? '');
  const ref = useRef();

  useEffect(() => { if (!editing) setDraft(slot.value ?? ''); }, [slot.value, editing]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const multi = slot.kind === 'textarea';
  const has = isSet(slot.value);

  async function commit() {
    if (String(draft) === String(slot.value ?? '')) { setEditing(false); return; }
    await onSave(draft);
    setEditing(false);
  }

  return (
    <div className={`slot slot-text status-${slot.status}${busy ? ' is-busy' : ''}`}>
      <div className="slot-head">
        <div className="slot-title"><strong>{slot.label}</strong></div>
        <StatusPill status={slot.status} />
      </div>
      {slot.where && <p className="slot-where"><Icon name="pin" size={12} /> {slot.where}</p>}
      {editing ? (
        <div className="slot-edit">
          {multi ? (
            <textarea ref={ref} rows={slot.rows || 4} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} />
          ) : (
            <input ref={ref} type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
          )}
          {slot.hint && <p className="slot-hint">{slot.hint}</p>}
          <div className="slot-actions">
            <button type="button" className="btn btn-small btn-primary" disabled={busy} onClick={commit}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-small" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`slot-value${has ? '' : ' is-empty'}${multi ? ' multi' : ''}`} onClick={() => setEditing(true)} title="Click to edit">
          <span>{has ? String(slot.value) : (slot.required ? 'Not filled in yet — click to add' : 'Empty (optional) — click to add')}</span>
          <Icon name="pencil" size={14} />
        </button>
      )}
    </div>
  );
}

// ---------- Related content row ----------
// Things that count towards a finished page but are managed on another screen.

export function RelatedRow({ item, goTo }) {
  const missing = item.missing || 0;
  const ok = item.ok !== undefined ? item.ok : missing === 0 && item.count > 0;
  const status = item.optional ? (ok ? 'done' : 'optional') : ok ? 'done' : 'pending';
  const note = item.note || (item.count === 0
    ? 'Nothing added yet'
    : missing ? `${item.count} total · ${missing} without a photo` : `${item.count} total · all have photos`);
  return (
    <div className={`related-row status-${status}`}>
      <StatusPill status={status} />
      <div className="related-meta">
        <strong>{item.label}</strong>
        <span className="muted small">{note}</span>
      </div>
      <button type="button" className="btn btn-small" onClick={() => goTo(item.page, item)}>
        {item.action} <Icon name="arrow" size={13} />
      </button>
    </div>
  );
}

// ---------- Library picker (modal) ----------

export function ImagePicker({ title, media, folders, folderNames, initialFolder, usage, onSelect, onUpload, onClose }) {
  const [folder, setFolder] = useState(initialFolder || '');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return media.filter((m) =>
      (!folder || m.folder === folder) &&
      (!needle || m.fileName.toLowerCase().includes(needle) || (usage.get(m.url) || []).join(' ').toLowerCase().includes(needle))
    );
  }, [media, folder, q, usage]);

  const chips = [{ folder: '', name: 'All folders' }, ...folders.map((f) => ({ folder: f, name: folderNames(f) }))];

  async function upload(files) {
    setBusy(true);
    try { await onUpload(files[0]); } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p className="muted small">Click any image to use it. Newest first.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="picker-toolbar">
          <div className="folder-tabs">
            {chips.map((c) => (
              <button key={c.folder} type="button" className={folder === c.folder ? 'active' : ''} onClick={() => setFolder(c.folder)}>{c.name}</button>
            ))}
          </div>
          <div className="picker-tools">
            <div className="search-box">
              <Icon name="search" size={15} />
              <input type="search" placeholder="Search file name or use…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
              <Icon name="upload" size={15} /> {busy ? 'Uploading…' : 'Upload new'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && upload([...e.target.files])} />
          </div>
        </div>
        <div className="picker-grid">
          {list.length === 0 && (
            <div className="empty-state">
              <Icon name="image" size={28} />
              <strong>No images here yet</strong>
              <p>Upload one with the button above — it will be selected automatically.</p>
            </div>
          )}
          {list.map((m) => {
            const used = usage.get(m.url) || [];
            return (
              <button type="button" key={m.id} className="picker-item" onClick={() => onSelect(m)} title={m.fileName}>
                <img src={m.url} alt="" loading="lazy" />
                <span className="picker-meta">
                  <span className="muted small">{folderNames(m.folder)} · {(m.sizeBytes / 1024).toFixed(0)} KB</span>
                  {used.length > 0 && <span className="picker-used"><Icon name="check" size={10} /> {used[0]}{used.length > 1 ? ` +${used.length - 1}` : ''}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- "Use for…" menu on gallery cards ----------

export function AssignMenu({ options, onPick, onClose }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = options.filter((o) => !needle || o.label.toLowerCase().includes(needle) || (o.group || '').toLowerCase().includes(needle));
  const groups = [];
  for (const o of list) {
    let g = groups.find((x) => x.title === (o.group || ''));
    if (!g) { g = { title: o.group || '', items: [] }; groups.push(g); }
    g.items.push(o);
  }
  return (
    <>
      <div className="quick-add-backdrop" onClick={onClose}></div>
      <div className="assign-menu" role="menu">
        {options.length > 7 && (
          <div className="search-box assign-search">
            <Icon name="search" size={14} />
            <input type="search" autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        <div className="assign-list">
          {groups.map((g) => (
            <div key={g.title}>
              {g.title && <span className="assign-group">{g.title}</span>}
              {g.items.map((o) => (
                <button type="button" role="menuitem" key={o.id} onClick={() => onPick(o)} disabled={o.current}>
                  <span>{o.label}</span>
                  {o.current && <span className="muted small">current</span>}
                </button>
              ))}
            </div>
          ))}
          {list.length === 0 && <p className="muted small assign-empty">No matches</p>}
        </div>
      </div>
    </>
  );
}
