import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { toast } from './toast.jsx';

// Publication is confirmed by the API before the list changes.
export function PublishControl({ item, config, onSaved, onEdit }) {
  const [review, setReview] = useState(false);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const lock = useRef(false);
  const visible = item.published !== false;
  const title = item[config.titleField] || item.name;
  const reviewable = ['pages', 'doctors', 'specialities'].includes(config.key);
  useEffect(() => {
    if (review) dialog.current?.showModal();
  }, [review]);
  function openReview() { setApproved(false); setError(''); setReview(true); }
  function closeReview() { if (!lock.current) setReview(false); }
  async function publish(next, clearNotes = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const body = { published: next, ...(clearNotes ? { reviewNotes: '' } : {}) };
      const saved = await api(`/api/${config.key}/${item.id}`, { method: 'PUT', body });
      onSaved(saved);
      setReview(false);
      toast(next ? `${title} published — changes appear within a minute` : `${title} hidden`);
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  const fields = config.sections.flatMap((s) => s.fields).filter((f) =>
    !['published', 'reviewNotes', 'sourceFiles', 'sourceKey', 'sortOrder'].includes(f.name) && item[f.name]);
  return <div className="publish-control">
    <button type="button" role="switch" aria-checked={visible} disabled={busy}
      aria-label={`Toggle ${title} visibility on the website`}
      className={`switch switch-compact${visible ? ' on' : ''}`}
      onClick={() => !visible && item.reviewNotes?.trim() ? openReview() : publish(!visible)}>
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
      <span className="switch-text">{busy ? 'Saving…' : visible ? 'Visible' : 'Hidden'}</span>
    </button>
    {reviewable && !visible && <button type="button" className="btn btn-small" disabled={busy} onClick={openReview}>Review & publish</button>}
    {error && !review && <p className="error-text" role="alert">{error}</p>}
    {review && <dialog ref={dialog} className="publish-dialog" aria-label={`Review ${title}`}
      onCancel={(e) => { e.preventDefault(); closeReview(); }}>
      <div className="publish-dialog-head"><div><span className="review-badge">Review before publishing</span><h2>{title}</h2></div>
        <button type="button" className="btn" disabled={busy} onClick={closeReview} aria-label="Close review">Close</button></div>
      <div className="publish-dialog-body">
        {item.reviewNotes && <section className="publish-review-notes"><h3>Check these points</h3><p>{item.reviewNotes}</p></section>}
        {fields.map((f) => <section key={f.name}><h3>{f.label}</h3>{f.type === 'image'
          ? <img className="publish-preview-image" src={item[f.name]} alt={title} />
          : <p className="publish-preview-text">{String(item[f.name])}</p>}</section>)}
        {item.sourceFiles && <details><summary>Source documents</summary><p className="publish-preview-text">{item.sourceFiles}</p></details>}
      </div>
      <div className="publish-dialog-foot">
        <label className="checkbox"><input type="checkbox" checked={approved} disabled={busy} onChange={(e) => setApproved(e.target.checked)} />
          <span>I have reviewed the content, confirmed the hospital assignment and resolved the review notes.</span></label>
        <p className="muted small">Approval clears the review notes and makes this record public. Use Edit content if corrections are needed.</p>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="content-actions"><button type="button" className="btn btn-primary" disabled={!approved || busy} onClick={() => publish(true, true)}>{busy ? 'Publishing…' : 'Approve & publish'}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => { setReview(false); onEdit(); }}>Edit content</button>
          <button type="button" className="btn" disabled={busy} onClick={closeReview}>Keep hidden</button></div>
      </div>
    </dialog>}
  </div>;
}
