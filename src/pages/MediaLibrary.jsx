import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';
import { useSiteData } from '../media/useSiteData.js';
import {
  buildAreas, buildContent, progressOf, allSlots, usageMap, isSet,
  CONTENT_FOLDERS, hospitalSlug,
} from '../media/slots.js';
import {
  ImageSlotCard, TextSlotCard, RelatedRow, ImagePicker, AssignMenu, ProgressBar, StatusPill,
} from '../media/components.jsx';

// Media & Content hub.
//
// One screen that answers "what is still missing on the website?" and lets
// the admin fix it on the spot. Four areas:
//   • Corporate Website     — kinderhospitals.com (hero, logo, contact, hospital cards)
//   • Hospital Sub-websites — one tab per centre (banner, card photo, text, doctors)
//   • Content Photos        — doctors, news covers, patient stories, hospital cards
//   • All Images            — the raw folder gallery
// Every image or text "slot" shows its status (Done / Sample photo / Pending)
// and can be filled by uploading, dropping a file, or picking from the library.

const SITE_URL = import.meta.env.VITE_SITE_URL || '';

const SECTIONS = [
  { key: 'corporate', label: 'Corporate Website', icon: 'globe' },
  { key: 'hospitals', label: 'Hospital Sub-websites', icon: 'building' },
  { key: 'content', label: 'Content Photos', icon: 'doctor' },
  { key: 'all', label: 'All Images', icon: 'folder' },
];

const FOLDER_NAMES = {
  hero: 'Homepage hero',
  corporate: 'Corporate pages',
  general: 'General',
  doctors: 'Doctor photos',
  locations: 'Hospital photos',
  news: 'News & events',
  testimonials: 'Patient stories',
  specialities: 'Specialities',
  procedures: 'Procedures',
};

// Deep-link helper used by the Dashboard: openMediaArea({ section, hospital, folder }).
export function openMediaArea(intent) { window.__kinderMediaIntent = intent; }

export function MediaLibrary({ goTo = () => {} }) {
  const { data, errors, reload, patch } = useSiteData();
  const [section, setSection] = useState('corporate');
  const [hospital, setHospital] = useState('');         // slug
  const [contentFolder, setContentFolder] = useState('doctors');
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [picker, setPicker] = useState(null);           // slot awaiting a library pick
  const [assignFor, setAssignFor] = useState(null);     // media id with "Use for…" open
  const [galleryFolder, setGalleryFolder] = useState('');
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(0);
  const [error, setError] = useState('');
  const uploadRef = useRef();

  // Arrive on a specific area when another screen sent us here.
  useEffect(() => {
    const intent = window.__kinderMediaIntent;
    if (!intent) return;
    window.__kinderMediaIntent = null;
    if (intent.section) setSection(intent.section);
    if (intent.hospital) setHospital(intent.hospital);
    if (intent.folder) setContentFolder(intent.folder);
  }, []);

  const areas = useMemo(() => (data ? buildAreas(data) : null), [data]);
  const usage = useMemo(() => (data ? usageMap(data) : new Map()), [data]);
  const media = data?.media || [];

  const folderName = (f) => {
    if (FOLDER_NAMES[f]) return FOLDER_NAMES[f];
    const loc = (data?.locations || []).find((l) => hospitalSlug(l) === f);
    return loc ? `Kinder ${loc.name}` : f;
  };

  // Which area is on screen?
  const activeHospital = areas?.hospitals.find((h) => hospitalSlug(h.location) === hospital) || areas?.hospitals[0];
  const area = !areas ? null
    : section === 'corporate' ? areas.corporate
    : section === 'hospitals' ? activeHospital
    : section === 'content' ? buildContent(data, contentFolder)
    : null;

  useEffect(() => { setGalleryFolder(''); setQuery(''); setAssignFor(null); }, [section, hospital, contentFolder]);

  // ---------- Saving ----------

  async function saveValue(slot, value) {
    setBusyId(slot.id);
    setError('');
    try {
      if (slot.target.type === 'setting') {
        await api('/api/settings', { method: 'PUT', body: { [slot.target.key]: value } });
        patch('settings', (s) => ({ ...s, [slot.target.key]: value }));
      } else {
        const { collection, id, key } = slot.target;
        await api(`/api/${collection}/${id}`, { method: 'PUT', body: { [key]: value } });
        patch(collection, (list) => list.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
      }
      toast(isSet(value) ? `${slot.label} updated — live within a minute` : `${slot.label} removed from the website`);
    } catch (e) {
      setError(e.message);
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function uploadFile(file, folder) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder || 'general');
    const item = await api('/api/media', { method: 'POST', formData: fd });
    patch('media', (list) => [item, ...list]);
    return item;
  }

  async function uploadToSlot(slot, file) {
    setBusyId(slot.id);
    setError('');
    try {
      const item = await uploadFile(file, slot.folder);
      await saveValue(slot, item.url);
    } catch (e) {
      setError(e.message);
      setBusyId(null);
    }
  }

  async function uploadToGallery(files) {
    const folder = galleryFolder || area?.uploadFolder || 'general';
    setUploading(true);
    setError('');
    try {
      for (const f of files) await uploadFile(f, folder);
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded to ${folderName(folder)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeMedia(item) {
    const used = usage.get(item.url) || [];
    const msg = used.length
      ? `This image is currently used as: ${used.join(', ')}.\n\nDeleting it will leave those spots blank. Delete anyway?`
      : 'Delete this image permanently?';
    if (!confirm(msg)) return;
    try {
      await api(`/api/media/${item.id}`, { method: 'DELETE' });
      patch('media', (list) => list.filter((m) => m.id !== item.id));
      toast('Image deleted');
    } catch (e) {
      setError(e.message);
    }
  }

  function copyUrl(item) {
    navigator.clipboard.writeText(item.url);
    setCopied(item.id);
    setTimeout(() => setCopied(0), 1500);
  }

  // Navigation from "related" rows: stay here for media targets, else switch page.
  function go(page, item) {
    if (page === 'media') {
      if (item?.area) setSection(item.area);
      if (item?.folder) setContentFolder(item.folder);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    goTo(page);
  }

  // ---------- "Use for…" options for a gallery card ----------
  function assignOptions(item) {
    if (!areas) return [];
    const from = (a, prefix) => allSlots(a)
      .filter((s) => s.kind === 'image')
      .map((s) => ({ id: s.id, slot: s, label: s.label, group: prefix ?? a.label, current: s.value === item.url }));
    if (section === 'all') {
      return [
        ...from(areas.corporate),
        ...areas.hospitals.flatMap((h) => from(h)),
        ...CONTENT_FOLDERS.flatMap((c) => from(buildContent(data, c.folder), c.name)),
      ].filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
    }
    return area ? from(area, '') : [];
  }

  // ---------- Loading / error ----------
  if (!data || !areas) {
    return (
      <div className="page">
        <div className="media-sections">{SECTIONS.map((s) => <button key={s.key} disabled>{s.label}</button>)}</div>
        <div className="card"><span className="skeleton skeleton-line"></span></div>
        <div className="slot-grid">{[0, 1, 2, 3].map((i) => <span key={i} className="skeleton skeleton-media"></span>)}</div>
      </div>
    );
  }

  const pendingCount = (a) => { const p = progressOf(a); return p.pending + p.sample; };
  const sectionPending = {
    corporate: pendingCount(areas.corporate),
    hospitals: areas.hospitals.reduce((n, h) => n + pendingCount(h), 0),
    content: CONTENT_FOLDERS.reduce((n, c) => n + pendingCount(buildContent(data, c.folder)), 0),
  };

  // Gallery list for the active area / folder / search.
  const galleryFolders = section === 'all'
    ? [...new Set(media.map((m) => m.folder))].sort()
    : area.folders;
  const gallery = media.filter((m) =>
    (galleryFolder ? m.folder === galleryFolder : section === 'all' || area.folders.includes(m.folder)) &&
    (!query || m.fileName.toLowerCase().includes(query.toLowerCase()) ||
      (usage.get(m.url) || []).join(' ').toLowerCase().includes(query.toLowerCase()))
  );
  const uploadTarget = folderName(galleryFolder || area?.uploadFolder || 'general');

  const progress = area ? progressOf(area) : null;
  const visibleGroups = area
    ? area.groups.map((g) => ({
        ...g,
        slots: onlyTodo ? g.slots.filter((s) => s.status === 'pending' || s.status === 'sample') : g.slots,
      }))
    : [];
  const nothingTodo = onlyTodo && visibleGroups.every((g) => g.slots.length === 0);

  return (
    <div className="page media-page">
      {/* Readiness at a glance — one card per website */}
      <div className="readiness-strip" aria-label="Website readiness">
        <ReadyCard
          label="Corporate website" sub="kinderhospitals.com" area={areas.corporate}
          active={section === 'corporate'} onClick={() => setSection('corporate')}
        />
        {areas.hospitals.map((h) => (
          <ReadyCard
            key={h.key} label={h.label} sub={h.hidden ? 'Hidden from website' : `/hospitals/${hospitalSlug(h.location)}`} area={h}
            active={section === 'hospitals' && activeHospital?.key === h.key}
            onClick={() => { setSection('hospitals'); setHospital(hospitalSlug(h.location)); }}
          />
        ))}
      </div>

      {/* Area switcher */}
      <div className="media-sections" role="tablist" aria-label="Media areas">
        {SECTIONS.map((s) => (
          <button key={s.key} role="tab" aria-selected={section === s.key} className={section === s.key ? 'active' : ''} onClick={() => setSection(s.key)}>
            <Icon name={s.icon} size={15} /> {s.label}
            {sectionPending[s.key] > 0 && <span className="tab-count" title="Items pending">{sectionPending[s.key]}</span>}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-small media-refresh" onClick={() => reload()} title="Reload from the server">
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {section === 'hospitals' && (
        <div className="folder-tabs media-folder-tabs">
          {areas.hospitals.map((h) => {
            const p = progressOf(h);
            return (
              <button key={h.key} className={activeHospital?.key === h.key ? 'active' : ''} onClick={() => setHospital(hospitalSlug(h.location))}>
                {h.label}
                <span className={`chip-count${p.pending + p.sample ? '' : ' ok'}`}>{p.pending + p.sample ? `${p.pending + p.sample} to do` : '✓'}</span>
              </button>
            );
          })}
          {areas.hospitals.length === 0 && <span className="muted small">No hospitals yet — add one under Hospitals.</span>}
        </div>
      )}
      {section === 'content' && (
        <div className="folder-tabs media-folder-tabs">
          {CONTENT_FOLDERS.map((c) => {
            const p = progressOf(buildContent(data, c.folder));
            return (
              <button key={c.folder} className={contentFolder === c.folder ? 'active' : ''} onClick={() => setContentFolder(c.folder)}>
                {c.name}
                <span className={`chip-count${p.pending + p.sample ? '' : ' ok'}`}>{p.pending + p.sample ? `${p.pending + p.sample} missing` : '✓'}</span>
              </button>
            );
          })}
        </div>
      )}

      {(error || errors.length > 0) && (
        <div className="error-banner" role="alert">
          <Icon name="alert" size={16} /> {error || `Some data could not be loaded (${errors.join('; ')})`}
        </div>
      )}

      {/* ----- Checklist for the active area ----- */}
      {area && (
        <>
          <div className="card area-head">
            <div className="area-head-main">
              <h2>{area.title}</h2>
              <p className="muted">{area.intro}</p>
              <ProgressBar progress={progress} />
            </div>
            <div className="area-head-side">
              <div className="area-stats">
                <span className="status-pill status-done"><Icon name="check" size={11} /> {progress.done} done</span>
                {progress.sample > 0 && <span className="status-pill status-sample">{progress.sample} sample</span>}
                {progress.pending > 0 && <span className="status-pill status-pending"><Icon name="alert" size={11} /> {progress.pending} pending</span>}
              </div>
              <label className="toggle-line">
                <input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} />
                <span>Show only what’s left to do</span>
              </label>
              {SITE_URL && area.path !== undefined && (
                <a className="btn btn-small btn-ghost" href={`${SITE_URL}${area.path}`} target="_blank" rel="noopener">
                  <Icon name="external" size={14} /> View this page
                </a>
              )}
              {section === 'hospitals' && (
                <button type="button" className="btn btn-small btn-ghost" onClick={() => goTo('hospitals')}>
                  <Icon name="pencil" size={14} /> Full hospital form
                </button>
              )}
            </div>
          </div>

          {nothingTodo && (
            <div className="card empty-state done-state">
              <Icon name="check" size={30} />
              <strong>Everything here is done</strong>
              <p>Every required image and text for this area is filled in with your own content.</p>
            </div>
          )}

          {visibleGroups.map((g) => (
            (g.slots.length > 0 || (!onlyTodo && g.addPage)) && (
              <section className="slot-group" key={g.title}>
                <div className="slot-group-head">
                  <div>
                    <h3>{g.title}</h3>
                    {g.hint && <p className="muted small">{g.hint}</p>}
                  </div>
                  {g.addPage && (
                    <button type="button" className="btn btn-small" onClick={() => goTo(g.addPage)}>
                      <Icon name="plus" size={13} /> {g.addLabel}
                    </button>
                  )}
                </div>
                {g.slots.length === 0 && !onlyTodo && (
                  <p className="muted small slot-group-empty">Nothing here yet.</p>
                )}
                <div className={`slot-grid${g.slots.some((s) => s.compact) ? ' slot-grid-compact' : ''}`}>
                  {g.slots.map((s) =>
                    s.kind === 'image' ? (
                      <ImageSlotCard
                        key={s.id} slot={s} busy={busyId === s.id}
                        onUpload={(file) => uploadToSlot(s, file)}
                        onPick={() => setPicker(s)}
                        onClear={() => confirm(`Remove this image from “${s.label}”? The file stays in the library.`) && saveValue(s, '')}
                      />
                    ) : (
                      <TextSlotCard key={s.id} slot={s} busy={busyId === s.id} onSave={(v) => saveValue(s, v)} />
                    )
                  )}
                </div>
              </section>
            )
          ))}

          {area.related.length > 0 && !onlyTodo && (
            <section className="card related-card">
              <h3>Also on this website</h3>
              <p className="muted small">Managed on other screens, but they decide whether the page looks complete.</p>
              <div className="related-list">
                {area.related.map((r) => <RelatedRow key={r.key} item={r} goTo={go} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* ----- Gallery ----- */}
      <section className="card gallery-card">
        <div className="gallery-head">
          <div>
            <h3>{section === 'all' ? 'All uploaded images' : `Image folder${area.folders.length > 1 ? 's' : ''} for this area`}</h3>
            <p className="muted small">
              Use any image here for a spot on the website with “Use for…”. Green tags show where an image is already used.
            </p>
          </div>
          <div className="gallery-tools">
            <div className="search-box">
              <Icon name="search" size={15} />
              <input type="search" placeholder="Search images…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search images" />
            </div>
          </div>
        </div>

        {galleryFolders.length > 1 && (
          <div className="folder-tabs gallery-folders">
            <button className={galleryFolder === '' ? 'active' : ''} onClick={() => setGalleryFolder('')}>All</button>
            {galleryFolders.map((f) => (
              <button key={f} className={galleryFolder === f ? 'active' : ''} onClick={() => setGalleryFolder(f)}>
                {folderName(f)} <span className="chip-count">{media.filter((m) => m.folder === f).length}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
            if (files.length) uploadToGallery(files);
          }}
        >
          <span className="dropzone-text">
            <Icon name="upload" size={18} />
            Drag &amp; drop images here — they go into <strong>{uploadTarget}</strong>
          </span>
          <button className="btn btn-primary" disabled={uploading} onClick={() => uploadRef.current.click()}>
            {uploading ? <span className="spinner" aria-hidden="true"></span> : <Icon name="upload" size={16} />}
            {uploading ? 'Uploading…' : 'Choose images'}
          </button>
          <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files.length) uploadToGallery([...e.target.files]); e.target.value = ''; }} />
        </div>

        {gallery.length === 0 ? (
          <div className="empty-state">
            <Icon name="image" size={30} />
            <strong>{query ? 'No images match your search' : `No images in ${uploadTarget} yet`}</strong>
            <p>{query ? 'Try a different word.' : 'Upload photos above, or fill a slot directly — uploads made from a slot land here too.'}</p>
          </div>
        ) : (
          <div className="media-grid">
            {gallery.map((item) => {
              const used = usage.get(item.url) || [];
              return (
                <div className="media-card" key={item.id}>
                  <a href={item.url} target="_blank" rel="noopener" title="Open full size">
                    <img src={item.url} alt={item.fileName} loading="lazy" />
                    {used.length > 0 && (
                      <span className="media-badge" title={used.join(', ')}>
                        <Icon name="check" size={12} /> {used[0]}{used.length > 1 ? ` +${used.length - 1}` : ''}
                      </span>
                    )}
                  </a>
                  <div className="media-meta">
                    <span className="muted small">{folderName(item.folder)} · {(item.sizeBytes / 1024).toFixed(0)} KB</span>
                    <div className="media-actions">
                      <div className="assign-wrap">
                        <button className="btn btn-small btn-apply" onClick={() => setAssignFor(assignFor === item.id ? null : item.id)} aria-expanded={assignFor === item.id}>
                          <Icon name="spark" size={13} /> Use for…
                        </button>
                        {assignFor === item.id && (
                          <AssignMenu
                            options={assignOptions(item)}
                            onClose={() => setAssignFor(null)}
                            onPick={(o) => { setAssignFor(null); saveValue(o.slot, item.url); }}
                          />
                        )}
                      </div>
                      <button className="btn btn-small" onClick={() => copyUrl(item)} title="Copy image link">
                        <Icon name={copied === item.id ? 'check' : 'copy'} size={14} />
                        {copied === item.id ? 'Copied' : 'Copy URL'}
                      </button>
                      <button className="btn btn-small btn-danger" aria-label={`Delete ${item.fileName}`} onClick={() => removeMedia(item)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {picker && (
        <ImagePicker
          title={`Choose an image for: ${picker.label}`}
          media={media}
          folders={[...new Set([picker.folder, ...(area?.folders || []), ...[...new Set(media.map((m) => m.folder))]])].filter(Boolean)}
          folderNames={folderName}
          initialFolder={media.some((m) => m.folder === picker.folder) ? picker.folder : ''}
          usage={usage}
          onSelect={(m) => { const s = picker; setPicker(null); saveValue(s, m.url); }}
          onUpload={async (file) => { const s = picker; const m = await uploadFile(file, s.folder); setPicker(null); await saveValue(s, m.url); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function ReadyCard({ label, sub, area, active, onClick }) {
  const p = progressOf(area);
  const todo = p.pending + p.sample;
  return (
    <button type="button" className={`ready-card${active ? ' active' : ''}${todo === 0 ? ' complete' : ''}`} onClick={onClick}>
      <span className="ready-top">
        <strong>{label}</strong>
        <span className="ready-pct">{p.pct}%</span>
      </span>
      <span className="ready-sub muted small">{sub}</span>
      <ProgressBar progress={p} compact />
      <span className="ready-foot">
        {todo === 0 ? <StatusPill status="done" /> : <span className="ready-todo">{todo} item{todo === 1 ? '' : 's'} to do</span>}
      </span>
    </button>
  );
}
