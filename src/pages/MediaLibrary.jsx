import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

const FOLDERS = ['general', 'hero', 'doctors', 'locations', 'specialities', 'news', 'testimonials', 'procedures'];

export function MediaLibrary() {
  const [items, setItems] = useState(null);
  const [folder, setFolder] = useState('');
  const [uploadFolder, setUploadFolder] = useState('general');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(0);
  const inputRef = useRef();

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
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
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

  return (
    <div className="page">
      <div className="page-head">
        <div className="folder-tabs" role="tablist" aria-label="Filter by folder">
          <button className={folder === '' ? 'active' : ''} onClick={() => setFolder('')}>All</button>
          {FOLDERS.map((f) => (
            <button key={f} className={folder === f ? 'active' : ''} onClick={() => setFolder(f)}>{f}</button>
          ))}
        </div>
        <div className="upload-controls">
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            aria-label="Upload into folder"
          >
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
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
              <img src={item.url} alt={item.fileName} loading="lazy" />
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
