import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { COLLECTIONS, SERVICE_GROUPS } from '../collections.js';
import { RecordForm, clearSpecialityCache } from '../fields.jsx';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

// The one screen for the care offering — every speciality and every doctor.
//   Corporate website tab — the four service groups shown on /services and in
//   the header mega menu, each speciality with its doctors.
//   One tab per hospital — that centre's own specialities and doctors.
// A doctor belongs to a speciality simply by the doctor's "speciality" field
// matching the speciality name; the Add buttons prefill everything.

const GROUPS = SERVICE_GROUPS;
const docConfig = COLLECTIONS.find((c) => c.key === 'doctors');
const specConfig = COLLECTIONS.find((c) => c.key === 'specialities');

const norm = (s) => String(s || '').trim().toLowerCase();

function Visibility({ item, label, onToggle }) {
  const on = item.published !== false;
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={`Toggle ${label} visibility on the website`}
      className={`switch switch-compact${on ? ' on' : ''}`} onClick={onToggle}
    >
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb"></span></span>
      <span className="switch-text">{on ? 'Visible' : 'Hidden'}</span>
    </button>
  );
}

export function ServicesDoctors() {
  const [specs, setSpecs] = useState(null);
  const [docs, setDocs] = useState([]);
  const [locs, setLocs] = useState([]);
  const [scope, setScope] = useState(''); // '' = corporate, else hospital name
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { kind:'doctor'|'spec', anchor, value }
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const formRef = useRef();

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
  useEffect(() => {
    load();
    if (window.__kinderQuickAdd) {
      window.__kinderQuickAdd = false;
      openDoctorForm(null, '');
    }
  }, []);
  useEffect(() => {
    if (form && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [form?.anchor, form?.kind]);

  const close = () => { setForm(null); setFormError(''); };

  function openDoctorForm(doc, specName, anchor) {
    setForm({
      kind: 'doctor',
      anchor: anchor ?? (doc ? `doc-${doc.id}` : 'top'),
      value: doc ? { ...doc } : { name: '', designation: '', speciality: specName || '', location: scope, bio: '', fullBio: '', imageUrl: '', published: true, sortOrder: 0 },
    });
  }
  function openSpecForm(spec, group, anchor) {
    setForm({
      kind: 'spec',
      anchor: anchor ?? (spec ? `spec-${spec.id}` : `group-${group}`),
      value: spec ? { ...spec } : { name: '', category: scope === '' && GROUPS.includes(group) ? group : '', location: scope, description: '', icon: '', published: true, sortOrder: 0 },
    });
  }

  async function save() {
    const { kind, value } = form;
    const col = kind === 'doctor' ? 'doctors' : 'specialities';
    setBusy(true); setFormError('');
    try {
      const body = { ...value }; delete body.id;
      if (value.id) await api(`/api/${col}/${value.id}`, { method: 'PUT', body });
      else await api(`/api/${col}`, { method: 'POST', body });
      if (kind === 'spec') clearSpecialityCache();
      toast(`${kind === 'doctor' ? 'Doctor' : 'Speciality'} saved — live within a minute`);
      close();
      load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  async function toggle(col, item, label) {
    const next = !(item.published !== false);
    const setList = col === 'doctors' ? setDocs : setSpecs;
    setList((list) => list.map((x) => (x.id === item.id ? { ...x, published: next } : x)));
    try {
      await api(`/api/${col}/${item.id}`, { method: 'PUT', body: { published: next } });
      toast(next ? `${label} is now visible on the website` : `${label} is now hidden from the website`);
    } catch (e) {
      setList((list) => list.map((x) => (x.id === item.id ? { ...x, published: !next } : x)));
      setError(e.message);
    }
  }

  async function removeDoctor(doc) {
    if (!confirm(`Remove ${doc.name} permanently?\n\nTip: switch them to Hidden if they are only away for a while.`)) return;
    try { await api(`/api/doctors/${doc.id}`, { method: 'DELETE' }); toast('Doctor removed'); load(); }
    catch (e) { setError(e.message); }
  }
  async function removeSpec(spec) {
    if (!confirm(`Delete speciality “${spec.name}”? Doctors under it are kept.`)) return;
    try { await api(`/api/specialities/${spec.id}`, { method: 'DELETE' }); clearSpecialityCache(); toast('Speciality deleted'); load(); }
    catch (e) { setError(e.message); }
  }

  const q = norm(query);
  const matches = (...vals) => !q || vals.some((v) => norm(v).includes(q));

  const doctorsOf = (spec) =>
    docs.filter((d) => norm(d.speciality) === norm(spec.name) &&
      (scope === '' || norm(d.location) === norm(scope)));

  // Build the grouped view for the active scope.
  const view = useMemo(() => {
    if (!specs) return [];
    const inScope = specs.filter((s) => norm(s.location || '') === norm(scope));
    let groups;
    if (scope === '') {
      groups = GROUPS.map((g) => ({ title: g, specs: inScope.filter((s) => s.category === g) }));
      const other = inScope.filter((s) => !GROUPS.includes(s.category));
      if (other.length) groups.push({ title: 'Other specialities', noAdd: true, specs: other });
    } else {
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
      groups = [{ title: `Specialities at Kinder ${scope}`, specs: [...inScope, ...virtual] }];
    }
    if (!q) return groups;
    // Search: keep a speciality if its name matches or any of its doctors match.
    return groups
      .map((g) => ({
        ...g,
        specs: g.specs.filter((s) => matches(s.name) || doctorsOf(s).some((d) => matches(d.name, d.designation))),
      }))
      .filter((g) => g.specs.length > 0);
  }, [specs, docs, scope, q]);

  // Corporate view only: doctors whose speciality matches no record anywhere,
  // so they would otherwise never show up in this tree.
  const orphans = useMemo(() => {
    if (!specs || scope !== '') return [];
    const names = new Set(specs.map((s) => norm(s.name)));
    return docs.filter((d) => !names.has(norm(d.speciality)) && matches(d.name, d.designation, d.speciality));
  }, [specs, docs, scope, q]);

  // While searching, also surface matching doctors that live under another tab
  // so a search never comes back empty just because of the selected hospital.
  const elsewhere = useMemo(() => {
    if (!q) return [];
    const shown = new Set(view.flatMap((g) => g.specs.flatMap((sp) => doctorsOf(sp).map((d) => d.id))));
    orphans.forEach((d) => shown.add(d.id));
    return docs.filter((d) => !shown.has(d.id) && matches(d.name, d.designation, d.speciality));
  }, [q, view, orphans, docs]);

  if (specs === null) {
    return <div className="page"><div className="card table-card"><div className="table-skeleton">
      {[0, 1, 2].map((i) => <div className="skeleton-row" key={i}><span className="skeleton skeleton-thumb"></span><span className="skeleton skeleton-line"></span></div>)}
    </div></div></div>;
  }

  const scopeDocs = docs.filter((d) => scope === '' || norm(d.location) === norm(scope));
  const noPhoto = scopeDocs.filter((d) => !d.imageUrl).length;

  const renderForm = (anchor) => form && form.anchor === anchor && (
    <div ref={formRef} className="sd-form-wrap">
      <RecordForm
        sections={form.kind === 'doctor' ? docConfig.sections : specConfig.sections}
        value={form.value}
        onChange={(v) => setForm((f) => ({ ...f, value: v }))}
        onSubmit={save}
        onCancel={close}
        busy={busy}
        error={formError}
        folder={form.kind === 'doctor' ? 'doctors' : 'specialities'}
        title={form.kind === 'doctor'
          ? (form.value.id ? `Edit ${form.value.name}` : 'New doctor')
          : (form.value.id ? `Edit ${form.value.name}` : 'New speciality')}
        subtitle={form.kind === 'doctor' && !form.value.id
          ? 'Only the name is required. Add the photo and bio now or come back later — the doctor appears on the website within a minute.'
          : undefined}
        submitLabel={form.value.id ? 'Save changes' : form.kind === 'doctor' ? 'Add doctor' : 'Add speciality'}
      />
    </div>
  );

  return (
    <div className="page">
      <div className="sd-tabs" role="tablist">
        <button role="tab" aria-selected={scope === ''} className={`sd-tab${scope === '' ? ' active' : ''}`} onClick={() => { setScope(''); close(); }}>
          <Icon name="globe" size={15} /> Corporate website
        </button>
        {locs.map((l) => (
          <button key={l.id} role="tab" aria-selected={scope === l.name} className={`sd-tab${scope === l.name ? ' active' : ''}`} onClick={() => { setScope(l.name); close(); }}>
            <Icon name="building" size={14} /> {l.name}
          </button>
        ))}
      </div>
      {error && <div className="error-banner" role="alert"><Icon name="alert" size={16} /> {error}</div>}

      <div className="card sd-head">
        <div>
          <h2>{scope === '' ? 'Services on the corporate website' : `Care at Kinder ${scope}`}</h2>
          <p className="muted">
            {scope === ''
              ? 'These four groups appear on the corporate Services page and in the header menu. Add a speciality under a group, then add its doctors.'
              : `Specialities and doctors listed on the Kinder ${scope} page. Add a speciality, then add its doctors under it.`}
          </p>
          <p className="muted small">
            {scopeDocs.length} doctor{scopeDocs.length === 1 ? '' : 's'}{noPhoto ? ` · ${noPhoto} without a photo` : ''}
          </p>
        </div>
        <div className="sd-head-tools">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input type="search" placeholder="Search doctors or specialities…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search doctors or specialities" />
          </div>
          <button className="btn btn-primary" onClick={() => { close(); openDoctorForm(null, '', 'top'); }}>
            <Icon name="plus" size={15} /> Add doctor
          </button>
        </div>
      </div>

      {renderForm('top')}

      {view.length === 0 && q && elsewhere.length === 0 && (
        <div className="card empty-state"><Icon name="search" size={28} /><strong>No matches</strong><p>Nothing matches “{query}”.</p></div>
      )}

      {elsewhere.length > 0 && (
        <div className="card sd-group sd-elsewhere">
          <div className="sd-group-head"><h2>Matches under other tabs</h2></div>
          <p className="muted sd-empty">These doctors match “{query}” but are listed under a different hospital. Click their hospital tab or edit them here.</p>
          <div className="sd-doctors">
            {elsewhere.map((doc) => (
              <div className="sd-doctor" key={doc.id}>
                {doc.imageUrl ? <img src={doc.imageUrl} alt="" /> : <span className="sd-doctor-noimg"><Icon name="doctor" size={16} /></span>}
                <div className="sd-doctor-meta">
                  <strong>{doc.name}</strong>
                  <span className="muted small">{[doc.designation, doc.speciality, doc.location ? `Kinder ${doc.location}` : 'All centres'].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="sd-doctor-foot">
                  <div className="sd-doctor-actions">
                    {doc.location && <button className="btn btn-small btn-ghost" onClick={() => { setScope(doc.location); close(); }}>Open Kinder {doc.location} <Icon name="arrow" size={12} /></button>}
                    <button className="btn btn-small" onClick={() => { close(); openDoctorForm(doc, doc.speciality); }}><Icon name="pencil" size={13} /> Edit</button>
                  </div>
                </div>
                {renderForm(`doc-${doc.id}`)}
              </div>
            ))}
          </div>
        </div>
      )}

      {view.map((group) => (
        <div className="card sd-group" key={group.title}>
          <div className="sd-group-head">
            <h2>{group.title}</h2>
            {!group.noAdd && (
              <button className="btn btn-small" onClick={() => { close(); openSpecForm(null, group.title); }}>
                <Icon name="plus" size={14} /> Add speciality
              </button>
            )}
          </div>

          {renderForm(`group-${group.title}`)}

          {group.specs.length === 0 && (
            <p className="muted sd-empty">No specialities in this group yet — click “Add speciality” to create the first one.</p>
          )}

          {group.specs.map((spec) => {
            const team = doctorsOf(spec).filter((d) => !q || matches(spec.name) || matches(d.name, d.designation));
            return (
              <div className="sd-spec" key={spec.id}>
                <div className="sd-spec-head">
                  <div className="sd-spec-title">
                    <strong>{spec.name}</strong>
                    {spec.virtual && <span className="badge badge-draft" title="Typed on a doctor profile — save it as a speciality to describe it">not saved yet</span>}
                    {!spec.virtual && <Visibility item={spec} label={spec.name} onToggle={() => toggle('specialities', spec, spec.name)} />}
                    <span className="muted small">{team.length} doctor{team.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="sd-spec-actions">
                    <button className="btn btn-small btn-primary" onClick={() => { close(); openDoctorForm(null, spec.name, `spec-new-${spec.id}`); }}>
                      <Icon name="plus" size={13} /> Add doctor
                    </button>
                    {spec.virtual ? (
                      <button className="btn btn-small" onClick={() => { close(); openSpecForm({ name: spec.name, category: '', location: scope, description: '', icon: '', published: true, sortOrder: 0 }, group.title, `spec-${spec.id}`); }}>
                        <Icon name="check" size={13} /> Save as speciality
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-small" onClick={() => { close(); openSpecForm(spec, group.title); }}>
                          <Icon name="pencil" size={13} /> Edit
                        </button>
                        <button className="btn btn-small btn-danger" aria-label={`Delete ${spec.name}`} onClick={() => removeSpec(spec)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {renderForm(`spec-${spec.id}`)}
                {renderForm(`spec-new-${spec.id}`)}

                {team.length > 0 && (
                  <div className="sd-doctors">
                    {team.map((doc) => (
                      <div className={`sd-doctor${doc.published === false ? ' is-off' : ''}`} key={doc.id}>
                        {doc.imageUrl
                          ? <img src={doc.imageUrl} alt="" loading="lazy" />
                          : <span className="sd-doctor-noimg" title="No photo yet"><Icon name="doctor" size={16} /></span>}
                        <div className="sd-doctor-meta">
                          <strong>{doc.name}</strong>
                          <span className="muted small">{[doc.designation, doc.location ? `Kinder ${doc.location}` : 'All centres'].filter(Boolean).join(' · ')}</span>
                          {!doc.imageUrl && <span className="sd-nophoto"><Icon name="alert" size={11} /> No photo</span>}
                        </div>
                        <div className="sd-doctor-foot">
                          <Visibility item={doc} label={doc.name} onToggle={() => toggle('doctors', doc, doc.name)} />
                          <div className="sd-doctor-actions">
                            <button className="btn btn-small" aria-label={`Edit ${doc.name}`} onClick={() => { close(); openDoctorForm(doc, spec.name); }}>
                              <Icon name="pencil" size={13} /> Edit
                            </button>
                            <button className="btn btn-small btn-danger" aria-label={`Remove ${doc.name}`} onClick={() => removeDoctor(doc)}>
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </div>
                        {renderForm(`doc-${doc.id}`)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {scope === '' && orphans.length > 0 && (
        <div className="card sd-group">
          <div className="sd-group-head">
            <h2>Doctors without a speciality</h2>
          </div>
          <p className="muted sd-empty">These doctors are not linked to any speciality yet, so they only appear on the “All doctors” page. Edit each one and pick a speciality.</p>
          <div className="sd-doctors">
            {orphans.map((doc) => (
              <div className="sd-doctor" key={doc.id}>
                {doc.imageUrl ? <img src={doc.imageUrl} alt="" /> : <span className="sd-doctor-noimg"><Icon name="doctor" size={16} /></span>}
                <div className="sd-doctor-meta">
                  <strong>{doc.name}</strong>
                  <span className="muted small">{[doc.designation, doc.speciality, doc.location ? `Kinder ${doc.location}` : 'All centres'].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="sd-doctor-foot">
                  <div className="sd-doctor-actions">
                    <button className="btn btn-small" onClick={() => { close(); openDoctorForm(doc, doc.speciality); }}><Icon name="pencil" size={13} /> Edit</button>
                  </div>
                </div>
                {renderForm(`doc-${doc.id}`)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
