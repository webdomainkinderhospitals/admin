import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

// Media is organised into three groups: corporate-site imagery, content-type
// folders, and one folder per hospital. Hospital folders load from the real
// Locations list, so new centres get a folder automatically.
const CORPORATE_FOLDERS = ['corporate', 'hero', 'general'];
const CONTENT_FOLDERS = ['doctors', 'locations', 'specialities', 'news', 'testimonials', 'procedures'];

const slugify = (name) =>
  String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function MediaLibrary() {
  const [items, setItems] = useState(null);
  const [folder, setFolder] = useState('');
  const [uploadFolder, setUploadFolder] = useState('corporate');
  const [hospitalFolders, setHospitalFolders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    api('/api/locations/all')
      .catch(() => api('/api/locations'))
      .then((list) => setHospitalFolders(list.map((l) => ({ folder: slugify(l.slug || l.name), name: l.name }))))
      .catch(() => {});
  }, []);

  async function load(f = folder) {
    try {
      setItems(await api(`/api/media${f ? `?folder=${f}` : ''}`));
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }
  useEffect(() => { setItems(null); load(); }, [folder]);

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
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded to “${uploadFolder}”`);
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

  const groups = [
    { title: 'Corporate website', folders: CORPORATE_FOLDERS.map((f) => ({ folder: f, name: f })) },
    { title: 'Website content', folders: CONTENT_FOLDERS.map((f) => ({ folder: f, name: f })) },
    ...(hospitalFolders.length
      ? [{ title: 'Hospitals', folders: hospitalFolders.map((h) => ({ folder: h.folder, name: h.name })) }]
      : []),
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="media-filter">
          <button className={`folder-pill${folder === '' ? ' active' : ''}`} onClick={() => setFolder('')}>
            All images
          </button>
        </div>
        <div className="upload-controls">
          <label className="upload-dest">
            <span>Upload to</span>
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} aria-label="Upload destination">
              <optgroup label="Corporate website">
                {CORPORATE_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              <optgroup label="Website content">
                {CONTENT_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              {hospitalFolders.length > 0 && (
                <optgroup label="Hospitals">
                  {hospitalFolders.map((h) => <option key={h.folder} value={h.folder}>Kinder {h.name}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? <span className="spinner" aria-hidden="true"></span> : <Icon name="upload" size={16} />}
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={inputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => e.target.files.length && upload([...e.target.files])}
          />
        </div>
      </div>
      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      <div className="folder-groups">
        {groups.map((group) => (
          <div className="folder-group" key={group.title}>
            <span className="folder-group-title">{group.title}</span>
            <div className="folder-tabs">
              {group.folders.map((f) => (
                <button
                  key={f.folder}
                  className={folder === f.folder ? 'active' : ''}
                  onClick={() => setFolder(f.folder)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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
        <Icon name="upload" size={18} />
        Drag &amp; drop images here to upload into <strong>{uploadFolder}</strong>
      </div>

      {items === null ? (
        <div className="media-grid">
          {[0, 1, 2, 3].map((i) => <span key={i} className="skeleton skeleton-media"></span>)}
        </div>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <Icon name="image" size={30} />
          <strong>No images {folder ? `in “${folder}”` : 'yet'}</strong>
          <p>Upload photos here, then use them anywhere on the website.</p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <div className="media-card" key={item.id}>
              <a href={item.url} target="_blank" rel="noopener" title="Open full size">
                <img src={item.url} alt={item.fileName} loading="lazy" />
              </a>
              <div className="media-meta">
                <span className="muted small">{item.folder} · {(item.sizeBytes / 1024).toFixed(0)} KB</span>
                <div className="media-actions">
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
          ))}
        </div>
      )}
    </div>
  );
}
