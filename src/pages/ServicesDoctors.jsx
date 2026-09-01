import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { ImageField, LocationField } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

// One screen to manage the whole care offering:
//   Corporate website tab — the four service groups shown on /services and in
//   the header mega menu, each speciality with its doctors.
//   One tab per hospital — that centre's own specialities and doctors.
// Doctors are linked to a speciality simply by the doctor's "speciality"
// field matching the speciality name (the Add buttons prefill everything).

const GROUPS = [
  'Maternity & Pregnancy',
  'Fertility & Gynaecology',
  "Children's Care",
  'Allied & Wellness',
];

const norm = (s) => String(s || '').trim().toLowerCase();

function DoctorForm({ initial, onSaved, onCancel }) {
  const [doc, setDoc] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setDoc((d) => ({ ...d, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!doc.name?.trim()) { setError('Doctor name is required'); return; }
    setBusy(true); setError('');
    try {
      const body = { ...doc }; delete body.id;
      if (doc.id) await api(`/api/doctors/${doc.id}`, { method: 'PUT', body });
      else await api('/api/doctors', { method: 'POST', body });
      toast('Doctor saved — live within a minute');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form className="sd-doc-form" onSubmit={save}>
      <div className="form-grid">
        <div className="form-row">
          <label>Doctor name <span className="req">*</span></label>
          <input type="text" value={doc.name || ''} onChange={(e) => set('name')(e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <label>Designation / qualifications</label>
          <input type="text" placeholder="e.g. MBBS, MD (OBG) — Senior Consultant" value={doc.designation || ''} onChange={(e) => set('designation')(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Speciality</label>
          <input type="text" value={doc.speciality || ''} onChange={(e) => set('speciality')(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Hospital</label>
          <LocationField value={doc.location} onChange={set('location')} />
        </div>
        <div className="form-row form-row-wide">
          <label>Photo</label>
          <ImageField value={doc.imageUrl} onChange={set('imageUrl')} folder="doctors" />
        </div>
        <div className="form-row form-row-wide">
          <label>Short bio (shown on cards)</label>
          <textarea rows={2} value={doc.bio || ''} onChange={(e) => set('bio')(e.target.value)} />
        </div>
        <div className="form-row form-row-wide">
          <label>Full bio (shown on the doctor's profile page)</label>
          <textarea rows={5} value={doc.fullBio || ''} onChange={(e) => set('fullBio')(e.target.value)} />
        </div>
      </div>
      {error && <div className="error-text" role="alert"><Icon name="alert" size={14} /> {error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary btn-small" disabled={busy}>
          {busy ? 'Saving…' : doc.id ? 'Save doctor' : 'Add doctor'}
        </button>
        <button type="button" className="btn btn-small" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function SpecForm({ initial, onSaved, onCancel }) {
  const [spec, setSpec] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setSpec((s) => ({ ...s, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!spec.name?.trim()) { setError('Speciality name is required'); return; }
    setBusy(true); setError('');
    try {
      const body = { ...spec }; delete body.id;
      if (spec.id) await api(`/api/specialities/${spec.id}`, { method: 'PUT', body });
      else await api('/api/specialities', { method: 'POST', body });
      toast('Speciality saved — live within a minute');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form className="sd-doc-form" onSubmit={save}>
      <div className="form-grid">
        <div className="form-row">
          <label>Speciality name <span className="req">*</span></label>
          <input type="text" value={spec.name || ''} onChange={(e) => set('name')(e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <label>Service group</label>
          <select value={spec.category ?? ''} onChange={(e) => set('category')(e.target.value)}>
            <option value="">— No group (hospital-only) —</option>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Shown at</label>
          <LocationField value={spec.location} onChange={set('location')} />
        </div>
        <div className="form-row form-row-wide">
          <label>Description</label>
          <textarea rows={2} value={spec.description || ''} onChange={(e) => set('description')(e.target.value)} />
        </div>
      </div>
      {error && <div className="error-text" role="alert"><Icon name="alert" size={14} /> {error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary btn-small" disabled={busy}>
          {busy ? 'Saving…' : spec.id ? 'Save speciality' : 'Add speciality'}
        </button>
        <button type="button" className="btn btn-small" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function ServicesDoctors() {
  const [specs, setSpecs] = useState(null);
  const [docs, setDocs] = useState([]);
  const [locs, setLocs] = useState([]);
  const [scope, setScope] = useState(''); // '' = corporate, else hospital name
  const [error, setError] = useState('');
  const [docForm, setDocForm] = useState(null);   // {for: specName|null, doc}
  const [specForm, setSpecForm] = useState(null); // {group, spec}

  async function load() {
    try {
      const [s, d, l] = await Promise.all([
        api('/api/specialities/all'),
        api('/api/doctors/all'),
        api('/api/locations/all'),
      ]);
      setSpecs(s); setDocs(d); setLocs(l);
    } catch (e) { setError(e.message); setSpecs([]); }
  }
  useEffect(() => { load(); }, []);

  const closeForms = () => { setDocForm(null); setSpecForm(null); };
  const saved = () => { closeForms(); load(); };

  async function removeDoctor(doc) {
    if (!confirm(`Remove Dr. ${doc.name}? This cannot be undone.`)) return;
    try { await api(`/api/doctors/${doc.id}`, { method: 'DELETE' }); toast('Doctor removed'); load(); }
    catch (e) { setError(e.message); }
  }
  async function removeSpec(spec) {
    if (!confirm(`Delete speciality "${spec.name}"? Doctors under it are kept.`)) return;
    try { await api(`/api/specialities/${spec.id}`, { method: 'DELETE' }); toast('Speciality deleted'); load(); }
    catch (e) { setError(e.message); }
  }

  const doctorsOf = (spec) =>
    docs.filter((d) => norm(d.speciality) === norm(spec.name) &&
      (scope === '' || norm(d.location) === norm(scope)));

  // Build the grouped view for the active scope.
  const view = useMemo(() => {
    if (!specs) return [];
    const inScope = specs.filter((s) => norm(s.location || '') === norm(scope));
    if (scope === '') {
      const groups = GROUPS.map((g) => ({ title: g, specs: inScope.filter((s) => s.category === g) }));
      const other = inScope.filter((s) => !GROUPS.includes(s.category));
      if (other.length) groups.push({ title: 'Other specialities', noAdd: true, specs: other });
      return groups;
    }
    // Hospital scope: its own specialities, plus virtual rows for specialities
    // its doctors mention that have no record yet — nothing gets hidden.
    const names = new Set(inScope.map((s) => norm(s.name)));
    const virtual = [];
    for (const d of docs) {
      if (norm(d.location) !== norm(scope) || !d.speciality) continue;
      if (names.has(norm(d.speciality))) continue;
      names.add(norm(d.speciality));
      virtual.push({ id: `virtual-${d.speciality}`, name: d.speciality, virtual: true });
    }
    return [{ title: `Specialities at Kinder ${scope}`, specs: [...inScope, ...virtual] }];
  }, [specs, docs, scope]);

  if (specs === null) {
    return <div className="page"><div className="card table-card"><div className="table-skeleton">
      {[0, 1, 2].map((i) => <div className="skeleton-row" key={i}><span className="skeleton skeleton-thumb"></span><span className="skeleton skeleton-line"></span></div>)}
    </div></div></div>;
  }

  return (
    <div className="page">
      <div className="sd-tabs" role="tablist">
        <button role="tab" aria-selected={scope === ''} className={`sd-tab${scope === '' ? ' active' : ''}`} onClick={() => { setScope(''); closeForms(); }}>
          <Icon name="building" size={15} /> Corporate website
        </button>
        {locs.map((l) => (
          <button key={l.id} role="tab" aria-selected={scope === l.name} className={`sd-tab${scope === l.name ? ' active' : ''}`} onClick={() => { setScope(l.name); closeForms(); }}>
            {l.name}
          </button>
        ))}
      </div>
      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}
      <p className="muted sd-hint">
        {scope === ''
          ? 'These groups appear on the corporate Services page and in the header menu. Add a doctor under a speciality and they show on the website with their photo and details.'
          : `Specialities and doctors shown on the Kinder ${scope} hospital page.`}
      </p>

      {view.map((group) => (
        <div className="card sd-group" key={group.title}>
          <div className="sd-group-head">
            <h2>{group.title}</h2>
            {!group.noAdd && (
              <button className="btn btn-small" onClick={() => { closeForms(); setSpecForm({ group: group.title, spec: { name: '', category: scope === '' && GROUPS.includes(group.title) ? group.title : '', location: scope, published: true, sortOrder: 0 } }); }}>
                <Icon name="plus" size={14} /> Add speciality
              </button>
            )}
          </div>

          {specForm && specForm.group === group.title && !specForm.spec.id && (
            <SpecForm initial={specForm.spec} onSaved={saved} onCancel={closeForms} />
          )}

          {group.specs.length === 0 && (
            <p className="muted sd-empty">No specialities in this group yet.</p>
          )}

          {group.specs.map((spec) => {
            const team = doctorsOf(spec);
            return (
              <div className="sd-spec" key={spec.id}>
                <div className="sd-spec-head">
                  <div className="sd-spec-title">
                    <strong>{spec.name}</strong>
                    {spec.virtual && <span className="badge badge-draft" title="Mentioned on a doctor profile — save it as a speciality to edit it">from doctor profile</span>}
                    {spec.published === false && <span className="badge badge-draft">Draft</span>}
                    {scope === '' && spec.location ? <span className="badge">{spec.location}</span> : null}
                    <span className="muted small">{team.length} doctor{team.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="sd-spec-actions">
                    <button className="btn btn-small btn-primary" onClick={() => { closeForms(); setDocForm({ for: spec.name, doc: { name: '', designation: '', speciality: spec.name, location: scope, bio: '', imageUrl: '', published: true, sortOrder: 0 } }); }}>
                      <Icon name="plus" size={13} /> Add doctor
                    </button>
                    {!spec.virtual && (
                      <>
                        <button className="btn btn-small" onClick={() => { closeForms(); setSpecForm({ group: group.title, spec: { ...spec } }); }}>
                          <Icon name="pencil" size={13} /> Edit
                        </button>
                        <button className="btn btn-small btn-danger" aria-label={`Delete ${spec.name}`} onClick={() => removeSpec(spec)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {specForm && specForm.spec.id === spec.id && (
                  <SpecForm initial={specForm.spec} onSaved={saved} onCancel={closeForms} />
                )}
                {docForm && docForm.for === spec.name && !docForm.doc.id && (
                  <DoctorForm initial={docForm.doc} onSaved={saved} onCancel={closeForms} />
                )}

                {team.length > 0 && (
                  <div className="sd-doctors">
                    {team.map((doc) => (
                      <div className="sd-doctor" key={doc.id}>
                        {doc.imageUrl
                          ? <img src={doc.imageUrl} alt="" loading="lazy" />
                          : <span className="sd-doctor-noimg"><Icon name="doctor" size={16} /></span>}
                        <div className="sd-doctor-meta">
                          <strong>{doc.name}</strong>
                          <span className="muted small">{[doc.designation, doc.location].filter(Boolean).join(' · ')}</span>
                        </div>
                        {doc.published === false && <span className="badge badge-draft">Draft</span>}
                        <div className="sd-doctor-actions">
                          <button className="btn btn-small" aria-label={`Edit ${doc.name}`} onClick={() => { closeForms(); setDocForm({ for: spec.name, doc: { ...doc } }); }}>
                            <Icon name="pencil" size={13} />
                          </button>
                          <button className="btn btn-small btn-danger" aria-label={`Remove ${doc.name}`} onClick={() => removeDoctor(doc)}>
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                        {docForm && docForm.doc.id === doc.id && (
                          <div className="sd-doctor-editwrap">
                            <DoctorForm initial={docForm.doc} onSaved={saved} onCancel={closeForms} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
