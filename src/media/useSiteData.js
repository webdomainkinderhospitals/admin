import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// One loader for everything the Media & Content hub needs. Each request is
// independent, so a single failing endpoint never blanks the whole page.
const SOURCES = {
  settings: '/api/settings',
  locations: '/api/locations/all',
  doctors: '/api/doctors/all',
  news: '/api/news/all',
  testimonials: '/api/testimonials/all',
  specialities: '/api/specialities/all',
  procedures: '/api/procedures/all',
  media: '/api/media',
};

const EMPTY = {
  settings: {},
  locations: [],
  doctors: [],
  news: [],
  testimonials: [],
  specialities: [],
  procedures: [],
  media: [],
};

export function useSiteData() {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);

  const reload = useCallback(async (keys = Object.keys(SOURCES)) => {
    const results = await Promise.all(
      keys.map((k) => api(SOURCES[k]).then((v) => [k, v, null]).catch((e) => [k, null, e]))
    );
    setData((prev) => {
      const next = { ...(prev || EMPTY) };
      for (const [k, v] of results) if (v !== null) next[k] = v;
      return next;
    });
    setErrors(results.filter(([, , e]) => e).map(([k, , e]) => `${k}: ${e.message}`));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Optimistic local patches so the UI reflects a save instantly.
  const patch = useCallback((key, updater) => {
    setData((prev) => (prev ? { ...prev, [key]: updater(prev[key]) } : prev));
  }, []);

  return { data, errors, reload, patch };
}
