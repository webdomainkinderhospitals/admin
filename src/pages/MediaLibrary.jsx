import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const FOLDERS = ['general', 'hero', 'doctors', 'locations', 'specialities', 'news', 'testimonials', 'procedures'];

export function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [folder, setFolder] = useState('');
  const [uploadFolder, setUploadFolder] = useState('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(0);
  const inputRef = useRef();

  async function load(f = folder) {
    try {
      setItems(await api(`/api/media${f ? `?folder=${f}` : ''}`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, [folder]);

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
    <div>
      <div className="page-head">
        <h1>🖼️ Media Library</h1>
        <div className="upload-controls">
          <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button className="btn btn-primary" disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? 'Uploading…' : '⬆ Upload images'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => e.target.files.length && upload([...e.target.files])} />
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="folder-tabs">
        <button className={folder === '' ? 'active' : ''} onClick={() => setFolder('')}>All</button>
        {FOLDERS.map((f) => (
          <button key={f} className={folder === f ? 'active' : ''} onClick={() => setFolder(f)}>{f}</button>
        ))}
      </div>

      <div className="media-grid">
        {items.map((item) => (
          <div className="media-card" key={item.id}>
            <img src={item.url} alt={item.fileName} loading="lazy" />
            <div className="media-meta">
              <span className="muted small">{item.folder} · {(item.sizeBytes / 1024).toFixed(0)} KB</span>
              <div className="media-actions">
                <button className="btn btn-small" onClick={() => copyUrl(item)}>
                  {copied === item.id ? '✓ Copied' : 'Copy URL'}
                </button>
                <button className="btn btn-small btn-danger" onClick={() => remove(item)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="muted">No images yet — upload some!</p>}
      </div>
    </div>
  );
}
