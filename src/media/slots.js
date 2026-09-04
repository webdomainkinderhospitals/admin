// Builds the "what goes where" checklist for every website area.
//
// A *slot* is one thing the public website shows that an admin can fill in:
// an image (homepage hero, a hospital's banner, a doctor's photo…) or a piece
// of text (tagline, phone number…). Each slot knows where it lives on the
// website, where it is stored in the API, and whether it is done, still using
// a sample photo, or pending. The Media & Content hub and the Dashboard both
// render from these builders, so "done vs pending" is defined in one place.

export const slugify = (name) =>
  String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const hospitalSlug = (loc) => slugify(loc.slug || loc.name);

// Stock/sample photos that shipped with the design. They render fine but
// should be replaced with the group's own photography.
const SAMPLE_URL = /images\.unsplash\.com|picsum\.photos|placehold\.(co|it)|via\.placeholder/i;

export const isSet = (v) => Boolean(v && String(v).trim());
export const isSample = (v) => isSet(v) && SAMPLE_URL.test(String(v));

export function statusOf(value, required) {
  if (!isSet(value)) return required ? 'pending' : 'optional';
  if (isSample(value)) return 'sample';
  return 'done';
}

export const STATUS_LABEL = {
  done: 'Done',
  sample: 'Sample photo',
  pending: 'Pending',
  optional: 'Optional',
};

// Recommended upload sizes, shown next to each image slot.
export const SIZES = {
  hero: '1920 × 900 px · landscape · JPG',
  banner: '1920 × 800 px · landscape · JPG',
  logo: '400 × 120 px · PNG with transparent background',
  card: '1200 × 800 px · landscape · JPG',
  portrait: '800 × 800 px · square, face centred · JPG',
  cover: '1200 × 675 px · landscape · JPG',
  square: '800 × 800 px · square · JPG',
};

function slot(base) {
  const required = base.required !== false;
  return { ...base, required, status: statusOf(base.value, required) };
}

const setting = (settings, key, extra) =>
  slot({
    id: `setting:${key}`,
    target: { type: 'setting', key },
    value: settings[key],
    ...extra,
  });

const record = (collection, item, key, extra) =>
  slot({
    id: `${collection}:${item.id}:${key}`,
    target: { type: 'record', collection, id: item.id, key },
    value: item[key],
    ...extra,
  });

const norm = (s) => String(s || '').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Corporate website (kinderhospitals.com)
// ---------------------------------------------------------------------------
export function buildCorporate(data) {
  const { settings = {}, locations = [], doctors = [], news = [], testimonials = [] } = data;
  const live = locations.filter((l) => l.published !== false);

  const groups = [
    {
      title: 'Homepage banner & logo',
      hint: 'The first things every visitor sees.',
      slots: [
        setting(settings, 'heroImageUrl', {
          kind: 'image', label: 'Homepage hero photo', folder: 'hero', size: SIZES.hero,
          where: 'Full-width banner at the top of the homepage',
        }),
        setting(settings, 'heroTitle', {
          kind: 'text', label: 'Hero headline', where: 'Large title on the homepage banner',
          hint: 'Wrap words in <em> … </em> to highlight them in pink.',
        }),
        setting(settings, 'heroSubtitle', {
          kind: 'textarea', label: 'Hero sub-text', where: 'Sentence under the hero headline',
          hint: 'Leave empty to auto-describe the live list of hospitals.', required: false,
        }),
        setting(settings, 'logoUrl', {
          kind: 'image', label: 'Logo', folder: 'corporate', size: SIZES.logo, required: false,
          where: 'Header and footer of the corporate site and every hospital sub-website',
          hint: 'Leave empty to keep the built-in Kinder logo.',
        }),
      ],
    },
    {
      title: 'Contact details & announcement',
      hint: 'Shown in the top bar, header, footer, contact page and chat assistant.',
      slots: [
        setting(settings, 'helplinePhone', { kind: 'text', label: '24/7 helpline number', where: 'Header, footer, contact page' }),
        setting(settings, 'emergencyPhone', { kind: 'text', label: 'Emergency number', where: 'Top bar, footer, contact page' }),
        setting(settings, 'email', { kind: 'text', label: 'Contact email', where: 'Top bar, footer, careers links' }),
        setting(settings, 'tagline', { kind: 'text', label: 'Brand tagline', where: 'Footer, under the logo' }),
        setting(settings, 'announcement', {
          kind: 'text', label: 'Announcement bar', required: false,
          where: 'Strip across the very top of the site', hint: 'Leave empty to hide the bar.',
        }),
      ],
    },
    {
      title: 'Hospital cards on the homepage & menu',
      hint: 'One photo per centre. These are the cards visitors click to reach each sub-website.',
      slots: live.map((l) =>
        record('locations', l, 'imageUrl', {
          kind: 'image', label: `Kinder ${l.name} — card photo`, folder: 'locations', size: SIZES.card,
          where: 'Homepage “Our hospitals” cards and the header menu',
          subject: `Kinder ${l.name}`,
        })
      ),
    },
  ];

  const stats = Array.isArray(settings.stats) ? settings.stats.filter((s) => s && (s.value || s.label)) : [];
  const liveDoctors = doctors.filter((d) => d.published !== false);
  const liveNews = news.filter((n) => n.published !== false);
  const liveTesti = testimonials.filter((t) => t.published !== false);

  // Things that live on other screens but still count towards a finished site.
  const related = [
    {
      key: 'settings', label: 'Homepage statistics', count: stats.length,
      ok: stats.length > 0, note: stats.length ? `${stats.length} numbers shown` : 'No numbers set yet',
      page: 'settings', action: 'Edit in Site Settings',
    },
    {
      key: 'doctors', label: 'Doctor photos', count: liveDoctors.length,
      missing: liveDoctors.filter((d) => !isSet(d.imageUrl)).length,
      page: 'media', area: 'content', folder: 'doctors', action: 'Add photos',
    },
    {
      key: 'news', label: 'News & event covers', count: liveNews.length,
      missing: liveNews.filter((n) => !isSet(n.imageUrl)).length,
      page: 'media', area: 'content', folder: 'news', action: 'Add covers',
    },
    {
      key: 'testimonials', label: 'Patient stories', count: liveTesti.length,
      ok: liveTesti.length > 0, note: liveTesti.length ? `${liveTesti.length} published` : 'None published yet',
      page: 'testimonials', action: 'Manage',
    },
  ];

  return {
    key: 'corporate',
    label: 'Corporate Website',
    title: 'Corporate website — kinderhospitals.com',
    intro: 'Everything that appears on the main group website. Fill each slot below; changes go live within a minute.',
    path: '',
    groups,
    related,
    folders: ['hero', 'corporate', 'locations', 'general'],
    uploadFolder: 'corporate',
  };
}

// ---------------------------------------------------------------------------
// One hospital sub-website (kinderhospitals.com/hospitals/<slug>)
// ---------------------------------------------------------------------------
export function buildHospital(data, loc) {
  const { doctors = [], specialities = [], procedures = [], testimonials = [], news = [] } = data;
  const slug = hospitalSlug(loc);
  const mine = (list) => list.filter((x) => norm(x.location) === norm(loc.name));
  const myDoctors = mine(doctors);

  const groups = [
    {
      title: 'Page images',
      hint: 'The banner tops the sub-website; the card photo represents this centre on the corporate site.',
      slots: [
        record('locations', loc, 'heroImageUrl', {
          kind: 'image', label: 'Page banner', folder: slug, size: SIZES.banner,
          where: `Top of the Kinder ${loc.name} page`, subject: `Kinder ${loc.name}`,
          hint: 'If empty, the card photo is used as the banner.',
        }),
        record('locations', loc, 'imageUrl', {
          kind: 'image', label: 'Card photo', folder: slug, size: SIZES.card,
          where: 'Homepage hospital cards and the header menu', subject: `Kinder ${loc.name}`,
        }),
      ],
    },
    {
      title: 'Page text',
      hint: 'Introduce the centre in your own words.',
      slots: [
        record('locations', loc, 'tagline', { kind: 'text', label: 'Tagline', where: 'One line under the page title' }),
        record('locations', loc, 'description', { kind: 'textarea', label: 'About this centre', where: '“About” paragraph on the page', rows: 5 }),
        record('locations', loc, 'highlights', { kind: 'textarea', label: 'Highlights', where: 'Tick-list next to the About text', hint: 'One highlight per line, e.g. “Level III NICU”.', rows: 5 }),
        record('locations', loc, 'since', { kind: 'text', label: 'Eyebrow tag', where: 'Small tag above the title, e.g. “Since 2011”', required: false }),
      ],
    },
    {
      title: 'Contact & links',
      hint: 'Shown in the contact strip under the banner and on the contact page.',
      slots: [
        record('locations', loc, 'address', { kind: 'textarea', label: 'Address', where: 'Contact strip & contact page', rows: 2 }),
        record('locations', loc, 'phone', { kind: 'text', label: 'Phone', where: 'Call buttons on the page' }),
        record('locations', loc, 'email', { kind: 'text', label: 'Email', where: 'Contact strip', required: false }),
        record('locations', loc, 'mapUrl', { kind: 'text', label: 'Google Maps link', where: '“Directions” link', hint: 'Paste the share link from Google Maps.' }),
        record('locations', loc, 'website', { kind: 'text', label: 'Own website URL', where: '“Official website” link', required: false }),
        record('locations', loc, 'websiteLabel', { kind: 'text', label: 'Website link text', where: 'Text of that link', required: false }),
      ],
    },
    {
      title: `Doctors at Kinder ${loc.name}`,
      hint: myDoctors.length
        ? 'Every doctor listed on this page. A missing photo shows as a blank card on the website.'
        : 'No doctors are assigned to this centre yet.',
      addPage: 'services-doctors',
      addLabel: 'Add or assign doctors',
      slots: myDoctors.map((d) =>
        record('doctors', d, 'imageUrl', {
          kind: 'image', label: d.name, folder: 'doctors', size: SIZES.portrait,
          where: d.designation || 'Doctor card on this page', subject: d.name, compact: true,
          draft: d.published === false,
        })
      ),
    },
  ];

  const count = (list) => list.filter((x) => x.published !== false).length;
  const related = [
    { key: 'specialities', label: 'Specialities', count: count(mine(specialities)), page: 'services-doctors', action: 'Manage', ok: count(mine(specialities)) > 0, note: `${count(mine(specialities))} listed` },
    { key: 'procedures', label: 'Procedures', count: count(mine(procedures)), page: 'procedures', action: 'Manage', ok: true, note: `${count(mine(procedures))} listed`, optional: true },
    { key: 'testimonials', label: 'Patient stories', count: count(mine(testimonials)), page: 'testimonials', action: 'Manage', ok: true, note: `${count(mine(testimonials))} published`, optional: true },
    { key: 'news', label: 'News & events', count: count(mine(news)), page: 'news', action: 'Manage', ok: true, note: `${count(mine(news))} published`, optional: true },
  ];

  return {
    key: `hospital:${slug}`,
    label: `Kinder ${loc.name}`,
    title: `Kinder ${loc.name} sub-website`,
    intro: `Images and text for the Kinder ${loc.name} page. Photos uploaded here are kept in this hospital's own folder.`,
    path: `/hospitals/${slug}`,
    hidden: loc.published === false,
    location: loc,
    groups,
    related,
    folders: [slug],
    uploadFolder: slug,
  };
}

// ---------------------------------------------------------------------------
// Content photos — people and posts that appear across both site types
// ---------------------------------------------------------------------------
export function buildContent(data, folder = 'doctors') {
  const { doctors = [], news = [], testimonials = [], locations = [] } = data;
  const byFolder = {
    doctors: {
      title: 'Doctor photos',
      hint: 'Portraits shown on doctor cards, profile pages and every hospital page. Square photos with the face centred look best.',
      size: SIZES.portrait,
      items: doctors,
      label: (d) => d.name,
      sub: (d) => [d.designation, d.location ? `Kinder ${d.location}` : 'All centres'].filter(Boolean).join(' · '),
      collection: 'doctors', required: true, addPage: 'services-doctors', addLabel: 'Add doctor',
    },
    news: {
      title: 'News & event covers',
      hint: 'Cover image on news cards. Posts without a cover show as text-only cards.',
      size: SIZES.cover,
      items: news,
      label: (n) => n.title,
      sub: (n) => [n.category, n.location ? `Kinder ${n.location}` : 'All centres'].filter(Boolean).join(' · '),
      collection: 'news', required: true, addPage: 'news', addLabel: 'Post news / event',
    },
    testimonials: {
      title: 'Patient story photos',
      hint: 'Optional photo on testimonial cards. Cards look fine without one.',
      size: SIZES.square,
      items: testimonials,
      label: (t) => t.patientName,
      sub: (t) => [t.relation, t.location ? `Kinder ${t.location}` : 'All centres'].filter(Boolean).join(' · '),
      collection: 'testimonials', required: false, addPage: 'testimonials', addLabel: 'Add testimonial',
    },
    locations: {
      title: 'Hospital card photos',
      hint: 'The photo on each hospital card (homepage & menu). Banners are set inside each sub-website tab.',
      size: SIZES.card,
      items: locations,
      label: (l) => `Kinder ${l.name}`,
      sub: (l) => [l.city, l.country].filter(Boolean).join(', '),
      collection: 'locations', required: true, addPage: 'hospitals', addLabel: 'Add hospital',
    },
  };
  const cfg = byFolder[folder] || byFolder.doctors;
  return {
    key: `content:${folder}`,
    label: cfg.title,
    title: cfg.title,
    intro: cfg.hint,
    groups: [
      {
        title: cfg.title,
        hint: `${cfg.items.length} record${cfg.items.length === 1 ? '' : 's'} · recommended ${cfg.size}`,
        addPage: cfg.addPage,
        addLabel: cfg.addLabel,
        slots: cfg.items.map((item) =>
          record(cfg.collection, item, 'imageUrl', {
            kind: 'image', label: cfg.label(item), where: cfg.sub(item), folder, size: cfg.size,
            subject: cfg.label(item), compact: true, required: cfg.required, draft: item.published === false,
          })
        ),
      },
    ],
    related: [],
    folders: [folder],
    uploadFolder: folder,
  };
}

export const CONTENT_FOLDERS = [
  { folder: 'doctors', name: 'Doctor photos' },
  { folder: 'news', name: 'News & event covers' },
  { folder: 'testimonials', name: 'Patient story photos' },
  { folder: 'locations', name: 'Hospital card photos' },
];

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------
export function allSlots(area) {
  return area.groups.flatMap((g) => g.slots);
}

export function progressOf(area) {
  const slots = allSlots(area).filter((s) => s.required);
  const done = slots.filter((s) => s.status === 'done').length;
  const sample = slots.filter((s) => s.status === 'sample').length;
  const pending = slots.filter((s) => s.status === 'pending').length;
  const total = slots.length;
  return { done, sample, pending, total, pct: total ? Math.round((done / total) * 100) : 100 };
}

// Every area, in display order — used by the hub tabs and the dashboard.
export function buildAreas(data) {
  const corporate = buildCorporate(data);
  const hospitals = (data.locations || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id)
    .map((l) => buildHospital(data, l));
  return { corporate, hospitals };
}

// Where is a given image URL used right now? → list of human labels.
export function usageMap(data) {
  const map = new Map();
  const add = (url, label) => {
    if (!isSet(url)) return;
    const list = map.get(url) || [];
    list.push(label);
    map.set(url, list);
  };
  const s = data.settings || {};
  add(s.heroImageUrl, 'Homepage hero');
  add(s.logoUrl, 'Site logo');
  for (const l of data.locations || []) {
    add(l.heroImageUrl, `Kinder ${l.name} banner`);
    add(l.imageUrl, `Kinder ${l.name} card`);
  }
  for (const d of data.doctors || []) add(d.imageUrl, d.name);
  for (const n of data.news || []) add(n.imageUrl, `News: ${n.title}`);
  for (const t of data.testimonials || []) add(t.imageUrl, `Story: ${t.patientName}`);
  for (const sp of data.specialities || []) add(sp.imageUrl, `Speciality: ${sp.name}`);
  for (const p of data.procedures || []) add(p.imageUrl, `Procedure: ${p.name}`);
  return map;
}
