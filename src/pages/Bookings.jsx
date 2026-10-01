import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';

// Every request the website sends — doctor appointment requests from the
// booking page, call-back requests from the header's "Contact a hospital"
// menu, and messages from the contact page — in one inbox the team works
// through: call the patient, set the status, keep a note.

export const TYPE_LABELS = {
  appointment: 'Doctor appointment',
  callback: 'Call-back request',
  enquiry: 'Enquiry',
  feedback: 'Feedback',
};
const STATUS = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'closed', label: 'Closed' },
];

const digits = (phone) => String(phone || '').replace(/\D/g, '');
const waNumber = (phone) => {
  const d = digits(phone);
  return d.length === 10 ? `91${d}` : d;
};

function when(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const rel = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : null;
  const abs = d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return { rel: rel || abs, abs };
}

function toCsv(items) {
  const cols = ['createdAt', 'type', 'status', 'hospital', 'doctor', 'speciality', 'preferredDate', 'preferredTime',
    'name', 'phone', 'email', 'patientType', 'subject', 'message', 'notes', 'source'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...items.map((it) => cols.map((c) => esc(c === 'type' ? TYPE_LABELS[it.type] || it.type : it[c])).join(','))].join('\n');
}

function RequestRow({ item, onChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);
  const t = when(item.createdAt);

  const save = async (patch) => {
    setSaving(true);
    try {
      const updated = await api(`/api/enquiries/${item.id}`, { method: 'PATCH', body: patch });
      onChange(updated);
      if (patch.notes !== undefined) toast('Note saved');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const what = item.type === 'appointment'
    ? [item.doctor, item.speciality].filter(Boolean).join(' · ')
    : item.subject || TYPE_LABELS[item.type];
  const slot = [item.preferredDate, item.preferredTime].filter(Boolean).join(' · ');

  return (
    <article className={`bq-row bq-${item.status}${open ? ' is-open' : ''}`}>
      <div className="bq-main">
        <div className="bq-when" title={t.abs}>
          <span className={`bq-type bq-type-${item.type}`}>{TYPE_LABELS[item.type] || item.type}</span>
          <small>{t.rel}</small>
        </div>
        <div className="bq-who">
          <strong>{item.name}</strong>
          <a href={`tel:${digits(item.phone)}`} className="bq-phone">{item.phone}</a>
          {item.email && <a href={`mailto:${item.email}`} className="bq-email">{item.email}</a>}
        </div>
        <div className="bq-what">
          <strong>{what}</strong>
          {slot && <span className="bq-slot"><Icon name="calendar" size={13} /> {slot}</span>}
          {item.hospital && <span className="bq-hosp"><Icon name="pin" size={13} /> {item.hospital}</span>}
          {item.patientType && <small>{item.patientType}</small>}
        </div>
        <div className="bq-status">
          <select
            value={item.status}
            onChange={(e) => save({ status: e.target.value })}
            disabled={saving}
            aria-label={`Status of ${item.name}'s request`}
          >
            {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="bq-actions">
          <a className="btn btn-small btn-primary" href={`tel:${digits(item.phone)}`}><Icon name="phone" size={14} /> Call</a>
          <a className="btn btn-small btn-ghost" href={`https://wa.me/${waNumber(item.phone)}`} target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Hide' : 'Details'}{item.notes ? ' •' : ''}
          </button>
        </div>
      </div>
      {open && (
        <div className="bq-detail">
          {item.message && (
            <div className="bq-message">
              <span className="section-label">Message from the patient</span>
              <p>{item.message}</p>
            </div>
          )}
          <label className="bq-notes">
            <span className="section-label">Team notes (not shown to the patient)</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Called at 10:15 — confirmed Fri 11:00 with Dr. Manoj" />
          </label>
          <div className="bq-detail-foot">
            <button type="button" className="btn btn-primary btn-small" disabled={saving || notes === (item.notes || '')}
              onClick={() => save({ notes })}>Save note</button>
            {item.source && <small className="muted">Sent from {item.source}</small>}
            <small className="muted">Received {t.abs}</small>
            <button type="button" className="btn btn-danger btn-small bq-delete" onClick={() => onDelete(item)}>
              <Icon name="trash" size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function Bookings({ onCount }) {
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('new');
  const [type, setType] = useState('');
  const [hospital, setHospital] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (q.trim()) params.set('q', q.trim());
      const data = await api(`/api/enquiries?${params}`);
      setItems(data.items);
      setCounts(data.counts || {});
      onCount?.(data.counts?.new || 0);
      setError('');
    } catch (e) {
      setError(e.message);
      setItems([]);
    }
  }, [status, type, q, onCount]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  // New requests appear without a reload.
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const hospitals = useMemo(() => [...new Set((items || []).map((i) => i.hospital).filter(Boolean))].sort(), [items]);
  const shown = useMemo(() => (items || []).filter((i) => !hospital || i.hospital === hospital), [items, hospital]);

  const replace = (updated) => {
    setItems((list) => list.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    load();
  };
  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.name}'s request? This cannot be undone.`)) return;
    try {
      await api(`/api/enquiries/${item.id}`, { method: 'DELETE' });
      toast('Request deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const exportCsv = () => {
    const blob = new Blob([toCsv(shown)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kinder-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="page bq-page">
      <div className="page-head">
        <div className="page-head-text">
          <p className="muted">
            Doctor appointment requests from the booking page, call-back requests from the website header and
            messages from the contact page. Call the patient, then set the status so the team knows where each one stands.
          </p>
        </div>
        <div className="page-head-tools">
          <button type="button" className="btn btn-ghost" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
        </div>
      </div>

      <div className="bq-tabs" role="tablist" aria-label="Filter by status">
        {STATUS.map((s) => (
          <button key={s.key} role="tab" aria-selected={status === s.key}
            className={`bq-tab bq-tab-${s.key}${status === s.key ? ' is-on' : ''}`} onClick={() => setStatus(s.key)}>
            <span className="bq-tab-num">{counts[s.key] ?? 0}</span>
            <span>{s.label}</span>
          </button>
        ))}
        <button role="tab" aria-selected={status === ''} className={`bq-tab${status === '' ? ' is-on' : ''}`} onClick={() => setStatus('')}>
          <span className="bq-tab-num">{total}</span><span>All</span>
        </button>
      </div>

      <div className="bq-filters">
        <label className="search-box">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, doctor…" aria-label="Search requests" />
        </label>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type of request">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={hospital} onChange={(e) => setHospital(e.target.value)} aria-label="Hospital">
          <option value="">All hospitals</option>
          {hospitals.map((h) => <option key={h}>{h}</option>)}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {items === null ? (
        <div className="card table-skeleton"><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div>
      ) : shown.length === 0 ? (
        <div className="card empty-state">
          <Icon name="check" size={28} />
          <strong>{status === 'new' ? 'No new requests — all caught up.' : 'Nothing here yet.'}</strong>
          <span>Requests from the website appear here as soon as they are sent.</span>
        </div>
      ) : (
        <div className="bq-list">
          {shown.map((item) => <RequestRow key={item.id} item={item} onChange={replace} onDelete={remove} />)}
        </div>
      )}
    </div>
  );
}
