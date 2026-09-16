import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { COLLECTIONS, PAGE_CATEGORIES } from '../collections';
import { CollectionManager } from './CollectionManager';
import { clearSpecialityCache } from '../fields';

export function WebsiteContent({ goTo }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [revision, setRevision] = useState(0);
  async function load() {
    try { setPreview(await api('/api/website-import')); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  async function importDrafts() {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/website-import', { method: 'POST', body: {} });
      setMessage(`${result.created} drafts added. ${result.preserved} existing records preserved.`);
      clearSpecialityCache(); setRevision((n) => n + 1); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const pending = preview?.items.filter((r) => r.action === 'create').length || 0;
  return <div className="page content-library">
    <section className="card content-intro">
      <div className="content-intro-copy">
        <span className="review-badge">Website content collection</span>
        <h2>Hospital content workspace</h2>
        <p>Manage hospital information, facilities, packages and patient services. Click Review & publish beside any hidden page to read its content, confirm the review points and publish. Use Edit content for corrections.</p>
      </div>
      <div className="content-actions">
        <button className="btn btn-primary" onClick={importDrafts} disabled={busy || !preview || !pending}>
          {busy ? 'Importing…' : `Import ${pending} new drafts`}
        </button>
        <button className="btn" onClick={() => goTo('services-doctors')}>Manage doctors & specialities</button>
      </div>
    </section>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {message && <p className="card content-notice" role="status">{message}</p>}
    {preview && <>
      <div className="content-counts">
        {[['doctors', 'Doctor profiles'], ['specialities', 'Specialities'], ['pages', 'Content pages']].map(([key, label]) =>
          <div className="card" key={key}><strong>{preview.items.filter((r) => r.collection === key).length}</strong><span>{label}</span></div>)}
      </div>
      <details className="card content-source-review">
        <summary>Source review and import details</summary>
        <p>Imports add hidden drafts and preserve existing records. Review notes must be resolved before publication. Doctors and specialities are edited in Services & Doctors.</p>
        {preview.unavailable.map((item) => <p className="content-notice" key={item.source}><strong>{item.source}</strong><br />{item.reason}</p>)}
        <div className="content-import-table"><table className="table"><thead><tr><th>Content</th><th>Destination</th><th>Import action</th><th>Review</th></tr></thead>
          <tbody>{preview.items.map((item, i) => <tr key={i}><td>{item.title}<details><summary>View supplied text</summary><p className="source-reference">{item.proposedText}</p></details><div className="muted small">{item.location || 'Group / confirm scope'}</div></td><td>{item.collection}</td><td>{item.action === 'create' ? 'New draft' : 'Preserve existing'}</td><td>{item.notes || 'Standard editorial review'}</td></tr>)}</tbody>
        </table></div>
      </details>
    </>}
    <div className="content-section-filter"><label htmlFor="content-category">Content section</label>
      <select id="content-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All sections</option>{PAGE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
    </div>
    <CollectionManager key={revision} config={COLLECTIONS.find((c) => c.key === 'pages')} category={category} />
  </div>;
}
