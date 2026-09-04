import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

// The library is organised into three clearly separated areas:
//   1. Corporate Website  — imagery for kinderhospitals.com itself
//   2. Hospital Sub-websites — one folder per centre (loaded from Locations,
//      so new centres get a folder automatically)
//   3. Content Photos     — photos attached to doctors, news, etc.
// Uploads always go into whichever folder is open, and hero/banner images
// can be applied straight from an image card — no URL copying needed.

const CORPORATE_FOLDERS = [
  { folder: 'hero', name: 'Homepage hero', desc: 'The large banner at the top of the corporate homepage.' },
  { folder: 'corporate', name: 'Corporate pages', desc: 'Images for About, Services and other corporate pages.' },
  { folder: 'general', name: 'General', desc: 'Anything that doesn’t fit elsewhere.' },
];
const CONTENT_FOLDERS = [
  { folder: 'doctors', name: 'Doctor photos', desc: 'Portraits used on doctor cards and profiles.' },
  { folder: 'locations', name: 'Hospital photos', desc: 'Photos used on hospital cards and pages.' },
  { folder: 'specialities', name: 'Specialities', desc: 'Images attached to speciality entries.' },
  { folder: 'news', name: 'News & events', desc: 'Cover images for news and event posts.' },
  { folder: 'testimonials', name: 'Testimonials', desc: 'Patient photos for testimonial cards.' },
  { folder: 'procedures', name: 'Procedures', desc: 'Images attached to procedure entries.' },
];

const SECTIONS = [
  { key: 'corporate', label: 'Corporate Website', icon: 'building' },
  { key: 'hospitals', label: 'Hospital Sub-websites', icon: 'building' },
  { key: 'content', label: 'Content Photos', icon: 'image' },
  { key: 'all', label: 'All Images', icon: 'image' },
];

const slugify = (name) =>
  String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function MediaLibrary() {
  const [items, setItems] = useState(null);
  const [section, setSection] = useState('corporate');
  const [folder, setFolder] = useState('hero');
  const [locations, setLocations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    api('/api/locations/all')
      .catch(() => api('/api/locations'))
      .then(setLocations)
      .catch(() => {});
    api('/api/settings').then(setSettings).catch(() => {});
  }, []);

  const hospitalFolders = useMemo(
    () => locations.map((l) => ({
      folder: slugify(l.slug || l.name),
      name: `Kinder ${l.name}`,
      desc: `Images for the ${l.name} sub-website. Use “Set as page banner” to change the banner at the top of its page.`,
      location: l,
    })),
    [locations]
  );

  const folderLists = {
    corporate: CORPORATE_FOLDERS,
    hospitals: hospitalFolders,
    content: CONTENT_FOLDERS,
    all: [],
  };

  const activeFolders = folderLists[section];
  const activeMeta =
    CORPORATE_FOLDERS.find((f) => f.folder === folder) ||
    CONTENT_FOLDERS.find((f) => f.folder === folder) ||
    hospitalFolders.find((f) => f.folder === folder) ||
    null;

  // Friendly name for any folder value (used on cards in "All Images").
  function folderLabel(f) {
    const m =
      CORPORATE_FOLDERS.find((x) => x.folder === f) ||
      CONTENT_FOLDERS.find((x) => x.folder === f) ||
      hospitalFolders.find((x) => x.folder === f);
    return m ? m.name : f;
  }

  function openSection(key) {
    setSection(key);
    const first = folderLists[key][0];
    setFolder(key === 'all' ? '' : first ? first.folder : '');
  }

  async function load(f = folder) {
    try {
      setItems(await api(`/api/media${f ? `?folder=${f}` : ''}`));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }
  useEffect(() => { setItems(null); load(); }, [folder]);

  // Uploads always land in the folder that is open ("general" from All Images).
  const uploadFolder = folder || 'general';
  const uploadLabel = folder ? (activeMeta ? activeMeta.name : folder) : 'General';

  async function upload(files) {
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', uploadFolder);
        await api('/api/media', { method: 'POST', formData: fd });
      }
      await load();
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded to ${uploadLabel}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm('Delete this image? Pages using it will show a broken image.')) return;
    try {
      await api(`/api/media/${item.id}`, { method: 'DELETE' });
      await load();
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

  // ----- One-click hero / banner assignment -------------------------------

  // Which hospital (if any) an image belongs to, by its folder.
  const hospitalForItem = (item) => hospitalFolders.find((h) => h.folder === item.folder);

  const isHomepageHero = (item) => settings && settings.heroImageUrl === item.url;
  const isPageBanner = (item) => {
    const h = hospitalForItem(item);
    return h && h.location.heroImageUrl === item.url;
  };

  async function setAsHomepageHero(item) {
    setApplying(item.id);
    setError('');
    try {
      const current = settings || (await api('/api/settings'));
      const next = { ...current, heroImageUrl: item.url };
      await api('/api/settings', { method: 'PUT', body: next });
      setSettings(next);
      toast('Homepage hero updated — live within a minute');
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(0);
    }
  }

  async function setAsPageBanner(item) {
    const h = hospitalForItem(item);
    if (!h) return;
    setApplying(item.id);
    setError('');
    try {
      const body = { ...h.location, heroImageUrl: item.url };
      delete body.id;
      await api(`/api/locations/${h.location.id}`, { method: 'PUT', body });
      setLocations((list) =>
        list.map((l) => (l.id === h.location.id ? { ...l, heroImageUrl: item.url } : l))
      );
      toast(`${h.name} page banner updated — live within a minute`);
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(0);
    }
  }

  return (
    <div className="page">
      {/* Area switcher — corporate site, sub-websites, content, everything */}
      <div className="media-sections" role="tablist" aria-label="Media areas">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={section === s.key}
            className={section === s.key ? 'active' : ''}
            onClick={() => openSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeFolders.length > 0 && (
        <div className="folder-tabs media-folder-tabs">
          {activeFolders.map((f) => (
            <button
              key={f.folder}
              className={folder === f.folder ? 'active' : ''}
              onClick={() => setFolder(f.folder)}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {activeMeta && (
        <div className="folder-hint">
          <Icon name="image" size={15} />
          <span>{activeMeta.desc}</span>
        </div>
      )}

      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
          if (files.length) upload(files);
        }}
      >
        <span className="dropzone-text">
          <Icon name="upload" size={18} />
          Drag &amp; drop images here — they go into <strong>{uploadLabel}</strong>
        </span>
        <button className="btn btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
          {busy ? <span className="spinner" aria-hidden="true"></span> : <Icon name="upload" size={16} />}
          {busy ? 'Uploading…' : 'Choose images'}
        </button>
        <input
          ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => e.target.files.length && upload([...e.target.files])}
        />
      </div>

      {items === null ? (
        <div className="media-grid">
          {[0, 1, 2, 3].map((i) => <span key={i} className="skeleton skeleton-media"></span>)}
        </div>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <Icon name="image" size={30} />
          <strong>No images in {folder ? uploadLabel : 'the library'} yet</strong>
          <p>
            {section === 'hospitals'
              ? 'Upload photos of this hospital here, then set one as its page banner.'
              : section === 'corporate' && folder === 'hero'
                ? 'Upload homepage banner photos here, then click “Set as homepage hero” on the one you want.'
                : 'Upload photos here, then use them anywhere on the website.'}
          </p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((item) => {
            const hosp = hospitalForItem(item);
            const heroNow = isHomepageHero(item);
            const bannerNow = isPageBanner(item);
            return (
              <div className="media-card" key={item.id}>
                <a href={item.url} target="_blank" rel="noopener" title="Open full size">
                  <img src={item.url} alt={item.fileName} loading="lazy" />
                  {(heroNow || bannerNow) && (
                    <span className="media-badge">
                      <Icon name="check" size={12} />
                      {heroNow ? 'Current homepage hero' : 'Current page banner'}
                    </span>
                  )}
                </a>
                <div className="media-meta">
                  <span className="muted small">{folderLabel(item.folder)} · {(item.sizeBytes / 1024).toFixed(0)} KB</span>
                  <div className="media-actions">
                    {hosp ? (
                      <button
                        className="btn btn-small btn-apply"
                        disabled={applying === item.id || bannerNow}
                        onClick={() => setAsPageBanner(item)}
                        title={`Use this as the banner on the ${hosp.name} sub-website`}
                      >
                        {applying === item.id ? 'Saving…' : bannerNow ? 'Page banner ✓' : 'Set as page banner'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-small btn-apply"
                        disabled={applying === item.id || heroNow}
                        onClick={() => setAsHomepageHero(item)}
                        title="Use this as the big banner on the corporate homepage"
                      >
                        {applying === item.id ? 'Saving…' : heroNow ? 'Homepage hero ✓' : 'Set as homepage hero'}
                      </button>
                    )}
                    <button className="btn btn-small" onClick={() => copyUrl(item)}>
                      <Icon name={copied === item.id ? 'check' : 'copy'} size={14} />
                      {copied === item.id ? 'Copied' : 'Copy URL'}
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      aria-label={`Delete ${item.fileName}`}
                      onClick={() => remove(item)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
