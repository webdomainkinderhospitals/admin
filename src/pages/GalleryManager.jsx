import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, API, getToken } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';
import { RecordForm, SwitchField } from '../fields.jsx';

// The website's Gallery: photos, videos and YouTube films. Items marked
// "Show on the home page" appear in the home page's "Moments at Kinder", the
// featured video playing large; every published item is on the Gallery page.
//
// Photos and videos upload straight from the computer (several at once), with
// a progress bar. A video's cover image is taken from the video itself and
// can be changed. Longer films (over 30 MB) are added as a YouTube link.

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_MAX = 30 * 1024 * 1024;
const IMAGE_MAX = 10 * 1024 * 1024;

export function youtubeId(url = '') {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : '';
}
const thumbOf = (item) => {
  if (item.kind === 'youtube') return item.posterUrl || (youtubeId(item.mediaUrl) ? `https://img.youtube.com/vi/${youtubeId(item.mediaUrl)}/hqdefault.jpg` : '');
  if (item.kind === 'video') return item.posterUrl;
  return item.mediaUrl;
};
const titleFromFile = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^(vid|img|video|image)\s*\d+.*$/i, '') || 'Untitled';

// Upload with progress (fetch cannot report it).
function uploadWithProgress(file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/media`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch (e) { /* not JSON */ }
      if (xhr.status === 401) { window.dispatchEvent(new Event('kinder-logout')); reject(new Error('Session expired — please log in again')); return; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed — check the connection and try again'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    xhr.send(fd);
  });
}

// A cover image for a video, taken from the video one second in.
function coverFromVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const done = (blob) => { URL.revokeObjectURL(url); resolve(blob); };
    video.onerror = () => done(null);
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2); };
    video.onseeked = () => {
      const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob), 'image/jpeg', 0.85);
    };
    setTimeout(() => done(null), 15000);
  });
}

const SECTIONS = (item) => [
  {
    title: 'What it shows',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Water Birthing at Kinder Hospitals Kochi' },
      { name: 'caption', label: 'Caption', type: 'textarea', placeholder: 'One or two lines visitors read under it.' },
      ...(item.kind === 'youtube'
        ? [{ name: 'mediaUrl', label: 'YouTube link', type: 'text', required: true, placeholder: 'https://www.youtube.com/watch?v=…' }]
        : []),
      ...(item.kind !== 'image'
        ? [{ name: 'posterUrl', label: 'Cover image', type: 'image', folder: 'gallery', size: '1280 × 720 px · landscape',
          hint: item.kind === 'youtube' ? 'Optional — YouTube’s own cover is used when empty.' : 'Shown before the video plays.' }]
        : []),
    ],
  },
  {
    title: 'Where it shows',
    fields: [
      { name: 'location', label: 'Hospital', type: 'location', hint: 'Leave empty for the whole group.' },
      { name: 'showOnHome', label: 'Show on the home page', type: 'checkbox', checkboxLabel: 'Include in “Moments at Kinder” on the home page' },
      ...(item.kind !== 'image'
        ? [{ name: 'featured', label: 'Featured video', type: 'checkbox', checkboxLabel: 'Play this large on the home page (only one video is featured)' }]
        : []),
      { name: 'sortOrder', label: 'Display order', type: 'number', placeholder: '0', hint: 'Lower numbers appear first.' },
    ],
  },
  {
    title: 'Visibility',
    fields: [{ name: 'published', label: 'Show on the website', type: 'switch' }],
  },
];

const KIND = { image: 'Photo', video: 'Video', youtube: 'YouTube' };

export function GalleryManager() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [uploads, setUploads] = useState([]); // [{ name, progress, error }]
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [youtube, setYoutube] = useState(null);
  const fileRef = useRef();

  const load = () => api('/api/gallery/all').then(setItems).catch((e) => { toast(e.message, 'error'); setItems([]); });
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (items || []).filter((it) =>
    filter === 'all' || (filter === 'photos' ? it.kind === 'image' : it.kind !== 'image')), [items, filter]);
  const counts = useMemo(() => ({
    all: (items || []).length,
    photos: (items || []).filter((it) => it.kind === 'image').length,
    videos: (items || []).filter((it) => it.kind !== 'image').length,
  }), [items]);

  async function addFiles(files) {
    const list = [...files];
    const rows = list.map((f) => ({ name: f.name, progress: 0, error: '' }));
    setUploads((u) => [...u, ...rows]);
    const set = (i, patch) => setUploads((u) => u.map((r) => (r === rows[i] ? (rows[i] = { ...r, ...patch }) : r)));
    let added = 0;
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const isVideo = VIDEO_TYPES.includes(file.type);
      try {
        if (!isVideo && !file.type.startsWith('image/')) throw new Error('Only photos and MP4, WebM or MOV videos can be added.');
        if (isVideo && file.size > VIDEO_MAX) throw new Error('Larger than 30 MB — compress it, or add it as a YouTube link.');
        if (!isVideo && file.size > IMAGE_MAX) throw new Error('Photos can be up to 10 MB.');
        let posterUrl = '';
        if (isVideo) {
          const cover = await coverFromVideo(file);
          if (cover) posterUrl = (await uploadWithProgress(new File([cover], `${file.name}-cover.jpg`, { type: 'image/jpeg' }), 'gallery', () => {})).url;
        }
        const media = await uploadWithProgress(file, 'gallery', (p) => set(i, { progress: p }));
        await api('/api/gallery', {
          method: 'POST',
          body: {
            title: titleFromFile(file.name), caption: '', kind: isVideo ? 'video' : 'image',
            mediaUrl: media.url, posterUrl, location: '', showOnHome: true, featured: false, sortOrder: 0, published: true,
          },
        });
        set(i, { progress: 1, done: true });
        added++;
      } catch (e) {
        set(i, { error: e.message });
      }
    }
    if (added) {
      toast(`${added} item${added === 1 ? '' : 's'} added to the Gallery — give ${added === 1 ? 'it a title' : 'them titles'} with Edit`);
      await load();
    }
    setTimeout(() => setUploads((u) => u.filter((r) => !r.done)), 2500);
  }

  async function save(e) {
    e?.preventDefault?.();
    setBusy(true);
    setFormError('');
    try {
      const body = { ...editing, sortOrder: Number(editing.sortOrder) || 0 };
      if (body.kind === 'youtube' && !youtubeId(body.mediaUrl)) throw new Error('That does not look like a YouTube link.');
      const saved = await api(`/api/gallery/${editing.id}`, { method: 'PUT', body });
      // Only one featured video: switch the others off.
      if (saved.featured) {
        await Promise.all((items || []).filter((it) => it.featured && it.id !== saved.id)
          .map((it) => api(`/api/gallery/${it.id}`, { method: 'PUT', body: { featured: false } })));
      }
      toast('Saved');
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addYoutube(e) {
    e.preventDefault();
    const id = youtubeId(youtube.url);
    if (!id) { toast('That does not look like a YouTube link.', 'error'); return; }
    setBusy(true);
    try {
      await api('/api/gallery', {
        method: 'POST',
        body: { title: youtube.title || 'Video', caption: '', kind: 'youtube', mediaUrl: `https://www.youtube.com/watch?v=${id}`,
          posterUrl: '', location: '', showOnHome: true, featured: false, sortOrder: 0, published: true },
      });
      toast('YouTube video added');
      setYoutube(null);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove “${item.title}” from the Gallery? The file stays in the Media Library.`)) return;
    try {
      await api(`/api/gallery/${item.id}`, { method: 'DELETE' });
      toast('Removed from the Gallery');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function toggle(item, field) {
    try {
      await api(`/api/gallery/${item.id}`, { method: 'PUT', body: { [field]: !item[field] } });
      await load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  if (editing) {
    return (
      <div className="page">
        <RecordForm
          title={`Edit ${KIND[editing.kind].toLowerCase()}`}
          subtitle="Changes appear on the website within a minute."
          sections={SECTIONS(editing)}
          value={editing}
          onChange={setEditing}
          onSubmit={save}
          onCancel={() => { setEditing(null); setFormError(''); }}
          busy={busy}
          error={formError}
          folder="gallery"
        />
      </div>
    );
  }

  return (
    <div className="page gallery-page">
      <div className="page-head">
        <div>
          <p className="muted gallery-intro">
            Photos and videos for the website’s <strong>Gallery</strong> page. Items marked <em>Home page</em> also appear in
            “Moments at Kinder” on the home page, with the <strong>featured</strong> video playing large.
          </p>
        </div>
        <div className="gallery-actions">
          <button className="btn" onClick={() => setYoutube({ url: '', title: '' })}>
            <Icon name="external" size={15} /> Add YouTube link
          </button>
          <button className="btn btn-primary" onClick={() => fileRef.current.click()}>
            <Icon name="upload" size={15} /> Upload photos or videos
          </button>
          <input ref={fileRef} type="file" hidden multiple accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={(e) => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      </div>

      <div
        className="gallery-drop"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
      >
        <Icon name="upload" size={18} />
        <span>Drop photos or videos here · photos up to 10 MB, videos (MP4, WebM, MOV) up to 30 MB</span>
      </div>

      {uploads.length > 0 && (
        <div className="card gallery-uploads">
          {uploads.map((u, i) => (
            <div className="gallery-upload" key={u.name + i}>
              <span className="gallery-upload-name">{u.name}</span>
              {u.error
                ? <span className="error-text"><Icon name="alert" size={13} /> {u.error}</span>
                : <span className="gallery-bar"><span style={{ width: `${Math.round(u.progress * 100)}%` }} /></span>}
              {!u.error && <span className="gallery-pct">{u.done ? 'Added' : `${Math.round(u.progress * 100)}%`}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="gallery-filters" role="tablist">
        {[['all', 'All'], ['photos', 'Photos'], ['videos', 'Videos']].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={filter === key} className={`gallery-filter${filter === key ? ' is-on' : ''}`} onClick={() => setFilter(key)}>
            {label} <span className="chip-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="loading"><span className="spinner" aria-hidden="true"></span></div>
      ) : shown.length === 0 ? (
        <div className="card empty-state">
          <Icon name="image" size={34} className="icon" />
          <strong>Nothing here yet</strong>
          <p>Upload photos or videos, or add a YouTube link. They appear on the website’s Gallery page.</p>
          <button className="btn btn-primary" onClick={() => fileRef.current.click()}><Icon name="upload" size={15} /> Upload photos or videos</button>
        </div>
      ) : (
        <div className="gallery-grid">
          {shown.map((item) => (
            <article className={`gallery-card${item.published ? '' : ' is-hidden'}`} key={item.id}>
              <div className="gallery-thumb">
                {thumbOf(item)
                  ? <img src={thumbOf(item)} alt="" loading="lazy" />
                  : item.kind === 'video'
                    ? <video src={`${item.mediaUrl}#t=1`} muted playsInline preload="metadata" aria-hidden="true" />
                    : <span className="gallery-noimg"><Icon name="image" size={26} /></span>}
                {item.kind !== 'image' && <span className="gallery-play" aria-hidden="true">▶</span>}
                <span className={`gallery-kind gallery-kind-${item.kind}`}>{KIND[item.kind]}</span>
                {item.featured && <span className="gallery-featured">★ Featured</span>}
              </div>
              <div className="gallery-body">
                <strong title={item.title}>{item.title}</strong>
                <small>{item.location ? `Kinder ${item.location}` : 'Whole group'}</small>
                <div className="gallery-flags">
                  <button className={`gallery-flag${item.showOnHome ? ' is-on' : ''}`} onClick={() => toggle(item, 'showOnHome')} title="Show in “Moments at Kinder” on the home page">
                    <Icon name="dashboard" size={12} /> Home page
                  </button>
                  <SwitchField value={item.published} onChange={() => toggle(item, 'published')} onLabel="Live" offLabel="Hidden" />
                </div>
                <div className="gallery-card-actions">
                  <button className="btn btn-small" onClick={() => setEditing({ ...item })}><Icon name="pencil" size={13} /> Edit</button>
                  <a className="btn btn-small btn-ghost" href={item.mediaUrl} target="_blank" rel="noopener"><Icon name="eye" size={13} /> Open</a>
                  <button className="btn btn-small btn-ghost btn-danger" onClick={() => remove(item)} aria-label={`Remove ${item.title}`}><Icon name="trash" size={13} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {youtube && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add a YouTube video" onClick={(e) => e.target === e.currentTarget && setYoutube(null)}>
          <form className="modal gallery-yt" onSubmit={addYoutube}>
            <div className="modal-head">
              <h2>Add a YouTube video</h2>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setYoutube(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
            <div className="gallery-yt-body">
              <div className="form-row">
                <label>YouTube link <span className="req">*</span></label>
                <input autoFocus value={youtube.url} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => setYoutube({ ...youtube, url: e.target.value })} />
                {youtube.url && youtubeId(youtube.url) && (
                  <img className="gallery-yt-preview" src={`https://img.youtube.com/vi/${youtubeId(youtube.url)}/hqdefault.jpg`} alt="" />
                )}
              </div>
              <div className="form-row">
                <label>Title</label>
                <input value={youtube.title} placeholder="Kinder Water Birthing Suite" onChange={(e) => setYoutube({ ...youtube, title: e.target.value })} />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" disabled={busy || !youtubeId(youtube.url)}>{busy ? 'Adding…' : 'Add to Gallery'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setYoutube(null)}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
