// A record's `location` field can name one hospital ("Kochi"), several
// ("Kochi, Bengaluru") or none ("" = everywhere). Same format the public
// website reads (Frontend/lib/locations.js).

const norm = (s) => String(s || '').trim().toLowerCase();

export const locationsOf = (item) =>
  String((item && typeof item === 'object' ? item.location : item) || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const joinLocations = (names) => names.map((s) => s.trim()).filter(Boolean).join(', ');

export const atLocation = (item, name) => {
  const n = norm(name);
  return !!n && locationsOf(item).some((l) => norm(l) === n);
};

// "" → everywhere. Otherwise true only for the named hospital(s).
export const inScope = (item, scope) => (scope ? atLocation(item, scope) : norm(item.location) === '');

// Human label: "All centres" or "Kinder Kochi · Kinder Bengaluru"
export const locationLabel = (item, everywhere = 'All centres') => {
  const list = locationsOf(item);
  return list.length ? list.map((n) => `Kinder ${n}`).join(' · ') : everywhere;
};
