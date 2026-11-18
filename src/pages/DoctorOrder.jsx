import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../icons.jsx';
import { toast } from '../toast.jsx';
import { atLocation } from '../locations.js';

// The order of doctors on one hospital's website pages: a serial number per
// hospital (1 shows first). Doctors without a number follow the numbered
// ones. A doctor at two hospitals has a separate number at each.
// Stored on the doctor as JSON text: {"Kochi":1,"Cherthala":4} — the same
// format the website reads (Frontend/lib/hospital-order.mjs).

const key = (name) => String(name || '').trim().toLowerCase();

export function ordersOf(doc) {
  try {
    const v = JSON.parse(doc?.hospitalOrder || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

export function orderAt(doc, hospital) {
  const entry = Object.entries(ordersOf(doc)).find(([name]) => key(name) === key(hospital));
  const n = entry ? Number(entry[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

// The doctor's order text with this hospital's number set (or removed).
export function withOrderAt(doc, hospital, n) {
  const orders = Object.fromEntries(Object.entries(ordersOf(doc)).filter(([name]) => key(name) !== key(hospital)));
  if (n) orders[hospital] = n;
  return Object.keys(orders).length ? JSON.stringify(orders) : '';
}

const sortRows = (rows) => [...rows].sort((a, b) =>
  (a.n ? Number(a.n) : Infinity) - (b.n ? Number(b.n) : Infinity) || a.pos - b.pos);

export function DoctorOrder({ hospital, docs, onSaved, onClose }) {
  const start = useMemo(() => sortRows(
    docs.filter((d) => atLocation(d, hospital))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id)
      .map((doc, pos) => ({ doc, pos, n: orderAt(doc, hospital) ? String(orderAt(doc, hospital)) : '' })),
  ).map((r, pos) => ({ ...r, pos })), [docs, hospital]);
  const [rows, setRows] = useState(start);
  const [busy, setBusy] = useState(false);

  const setNumber = (id, n) => setRows((rs) => rs.map((r) => (r.doc.id === id ? { ...r, n: n.replace(/\D/g, '').slice(0, 4) } : r)));
  // After typing a number, the list moves into number order.
  const settle = () => setRows((rs) => sortRows(rs).map((r, pos) => ({ ...r, pos })));
  const numberAll = (list) => list.map((r, i) => ({ ...r, pos: i, n: String(i + 1) }));
  const move = (index, by) => setRows((rs) => {
    const to = index + by;
    if (to < 0 || to >= rs.length) return rs;
    const next = [...rs];
    [next[index], next[to]] = [next[to], next[index]];
    return numberAll(next);
  });

  const changed = rows.filter((r) => (orderAt(r.doc, hospital) || null) !== (Number(r.n) || null));

  async function save() {
    setBusy(true);
    const saved = [];
    try {
      for (const r of changed) {
        const hospitalOrder = withOrderAt(r.doc, hospital, Number(r.n) || null);
        saved.push(await api(`/api/doctors/${r.doc.id}`, { method: 'PUT', body: { hospitalOrder } }));
      }
      toast(`Order saved for Kinder ${hospital} — the website shows it within a minute`);
      onSaved(saved);
      onClose();
    } catch (e) {
      if (saved.length) onSaved(saved);
      toast(`Could not save the order: ${e.message}`, 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="card sd-group sd-order">
      <div className="sd-group-head">
        <h2>Order of doctors at Kinder {hospital}</h2>
        <div className="sd-spec-actions">
          <button className="btn btn-small" onClick={() => setRows((rs) => numberAll(rs))} disabled={busy}>Number 1, 2, 3… as listed</button>
          <button className="btn btn-small btn-ghost" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, n: '' })))} disabled={busy}>Clear numbers</button>
        </div>
      </div>
      <p className="muted sd-empty">
        Give each doctor a serial number: <strong>1</strong> shows first on the Kinder {hospital} website, then 2, 3…
        Doctors without a number follow. A doctor at two hospitals has a separate number at each. Use the arrows to move a doctor up or down.
      </p>
      {rows.length === 0 && <p className="muted sd-empty">No doctors at Kinder {hospital} yet.</p>}
      <ol className="sd-order-list">
        {rows.map((r, i) => (
          <li key={r.doc.id} className={`sd-order-row${r.doc.published === false ? ' is-off' : ''}`}>
            <input className="sd-order-num" inputMode="numeric" aria-label={`Serial number for ${r.doc.name}`} placeholder="–"
              value={r.n} onChange={(e) => setNumber(r.doc.id, e.target.value)} onBlur={settle}
              onKeyDown={(e) => { if (e.key === 'Enter') settle(); }} />
            {r.doc.imageUrl ? <img src={r.doc.imageUrl} alt="" /> : <span className="sd-doctor-noimg"><Icon name="doctor" size={16} /></span>}
            <div className="sd-doctor-meta">
              <strong>{r.doc.name}</strong>
              <span className="muted small">{[r.doc.speciality, r.doc.published === false ? 'hidden' : ''].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="sd-order-move">
              <button type="button" className="btn btn-small btn-ghost" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move ${r.doc.name} up`}>↑</button>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1} aria-label={`Move ${r.doc.name} down`}>↓</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="form-actions sd-order-actions">
        <button className="btn btn-primary" onClick={save} disabled={busy || changed.length === 0}>
          {busy ? 'Saving…' : changed.length ? `Save order (${changed.length} change${changed.length === 1 ? '' : 's'})` : 'Save order'}
        </button>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Close</button>
      </div>
    </div>
  );
}
