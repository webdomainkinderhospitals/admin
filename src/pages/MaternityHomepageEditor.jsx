import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { FieldRow } from '../fields';
import { toast } from '../toast';
import { MATERNITY_SECTIONS, maternityKey, maternitySettings } from '../maternity-settings.mjs';

const FIELDS = [
  { name: 'showOnGroup', label: 'Show on the main homepage', type: 'switch' },
  { name: 'showOnKochi', label: 'Show on the Kochi homepage', type: 'switch' },
  { name: 'eyebrow', label: 'Section label', type: 'text', wide: true },
  { name: 'title', label: 'Homepage heading', type: 'text', wide: true },
  { name: 'description', label: 'Introduction', type: 'textarea', rows: 3, wide: true, hint: 'For Premium Birthing Centre, leave empty to use its published page introduction.' },
  { name: 'imageUrl', label: 'Homepage photograph', type: 'image', folder: 'general', wide: true, hint: 'Leave empty to use the first published programme’s hero photograph. Full-page hero and gallery images are managed below.' },
  { name: 'imageAlt', label: 'Photograph description (accessibility)', type: 'text', wide: true },
  { name: 'highlights', label: 'Service highlights', type: 'textarea', rows: 4, wide: true, hint: 'One highlight per line.' },
  { name: 'buttonLabel', label: 'Explore button text', type: 'text', hint: 'Opens the relevant programme page. Leave empty to hide.' },
  { name: 'contactLabel', label: 'Enquiry button text', type: 'text', hint: 'Leave empty to hide.' },
  { name: 'contactPhone', label: 'Enquiry phone number', type: 'text', hint: 'Leave empty to open the Kochi contact section.' },
];
export default function MaternityHomepageEditor({ section }) {
  const [values, setValues] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api('/api/settings').then((data) => { if (active) setValues(maternitySettings(data, section)); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [section]);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/api/settings', { method: 'PUT', body: Object.fromEntries(Object.entries(values).map(([name, value]) => [maternityKey(section, name), value])) });
      toast('Homepage section saved — published changes appear within a minute');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <form className="card form-card" onSubmit={save}>
    <span className="review-badge">Main &amp; Kochi homepages</span>
    <h2>{MATERNITY_SECTIONS[section].title} — homepage section</h2>
    <p className="muted card-hint">Manage this section independently. Programme cards use each published page’s title, introduction and hero photo. Hidden pages are excluded; the section appears when at least one relevant page is published.</p>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {!values ? <p>Loading homepage content…</p> : <>
      <div className="form-grid">{FIELDS.filter((f) => f.name in values).map((field) => <FieldRow key={field.name} field={field} value={values[field.name]} onChange={(value) => setValues((old) => ({ ...old, [field.name]: value }))} />)}</div>
      <div className="form-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save homepage section'}</button></div>
    </>}
  </form>;
}
