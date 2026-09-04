// Drives every entry form in the portal.
//
// Each collection lists its fields in *sections* so the forms read top-to-
// bottom like a short questionnaire: what it is → what visitors read → photo
// → where it shows → visibility. Every field can carry a `hint` (shown under
// the input) and a `placeholder`. Field types: text, textarea, image, number,
// checkbox, date, select, location, speciality, switch.

const SPEC_ICONS = [
  ['heart-pin', 'Heart with pin'], ['pin-dot', 'Pin'], ['heart', 'Heart'], ['child', 'Child'],
  ['target', 'Target'], ['star', 'Star'], ['thermometer', 'Thermometer'], ['check-circle', 'Tick'],
  ['scalpel', 'Scalpel'], ['hearts', 'Two hearts'], ['mirror', 'Mirror'], ['gland', 'Gland'],
  ['clock', 'Clock'], ['anesthesia', 'Anaesthesia'], ['home', 'Home'], ['orbit', 'Orbit'],
];
const PROC_ICONS = [
  ['ivf', 'IVF'], ['plus-circle', 'Plus'], ['waves', 'Waves'], ['pulse', 'Pulse'],
  ['clipboard', 'Clipboard'], ['shield-check', 'Shield'],
];
const iconOptions = (list) => [
  { value: '', label: 'Automatic (picked for you)' },
  ...list.map(([value, label]) => ({ value, label })),
];

export const SERVICE_GROUPS = [
  'Maternity & Pregnancy',
  'Fertility & Gynaecology',
  "Children's Care",
  'Allied & Wellness',
];

const VISIBILITY = {
  title: 'Visibility',
  fields: [
    { name: 'published', label: 'Show on the website', type: 'switch', default: true,
      hint: 'Switch off to keep it saved but hidden from visitors.' },
  ],
};

const ORDER = { name: 'sortOrder', label: 'Display order', type: 'number', placeholder: '0',
  hint: 'Lower numbers appear first. Leave 0 to keep the order they were added.' };

export const COLLECTIONS = [
  {
    key: 'specialities',
    label: 'Specialities',
    singular: 'speciality',
    icon: 'stethoscope',
    titleField: 'name',
    sections: [
      {
        title: 'About the speciality',
        fields: [
          { name: 'name', label: 'Speciality name', type: 'text', required: true, placeholder: 'e.g. Neonatology' },
          { name: 'description', label: 'One-line description', type: 'textarea', rows: 2, wide: true,
            placeholder: 'What this department does, in one or two sentences.',
            hint: 'Shown when a visitor hovers over the speciality card.' },
          { name: 'icon', label: 'Card icon', type: 'select', options: iconOptions(SPEC_ICONS) },
        ],
      },
      {
        title: 'Where it appears',
        fields: [
          { name: 'category', label: 'Corporate services group', type: 'select', default: '',
            options: [{ value: '', label: 'Not on the corporate Services page (hospital-only)' }, ...SERVICE_GROUPS],
            hint: 'Puts it under that heading on the corporate Services page and header menu.' },
          { name: 'location', label: 'Where it appears', type: 'location', wide: true },
          ORDER,
        ],
      },
      VISIBILITY,
    ],
  },
  {
    key: 'locations',
    label: 'Hospitals',
    singular: 'hospital',
    icon: 'building',
    titleField: 'name',
    sections: [
      {
        title: 'Name & page address',
        fields: [
          { name: 'name', label: 'Hospital name', type: 'text', required: true, placeholder: 'e.g. Kochi',
            hint: 'Shown with the “Kinder” prefix, e.g. “Kinder Kochi”.' },
          { name: 'slug', label: 'Page address', type: 'text', placeholder: 'kochi',
            hint: 'Becomes yoursite.com/hospitals/kochi. Lower-case letters and dashes only; leave empty to use the name.' },
          { name: 'since', label: 'Small tag above the title', type: 'text', placeholder: 'e.g. Since 2018' },
          { name: 'international', label: 'International centre', type: 'checkbox', default: false, checkboxLabel: 'Yes — outside India',
            hint: 'Adds an “International” badge to its card.' },
        ],
      },
      {
        title: 'What visitors read on its page',
        fields: [
          { name: 'tagline', label: 'Tagline', type: 'text', wide: true, placeholder: 'One short sentence under the hospital name' },
          { name: 'description', label: 'About this hospital', type: 'textarea', rows: 5, wide: true,
            placeholder: 'A paragraph introducing the centre — beds, specialities, what makes it special.' },
          { name: 'highlights', label: 'Highlights', type: 'textarea', rows: 5, wide: true,
            placeholder: 'Level III NICU\n125 beds · 25 specialities\n24/7 emergency & pharmacy',
            hint: 'One highlight per line. They appear as a tick-list beside the About text.' },
        ],
      },
      {
        title: 'Photos',
        hint: 'Add the card photo first — it is what visitors see on the homepage. The banner is optional: if empty, the card photo is used at the top of the page too.',
        fields: [
          { name: 'imageUrl', label: 'Card photo', type: 'image', folder: 'locations', wide: true,
            size: '1200 × 800 px · landscape', hint: 'On the homepage hospital cards and the header menu.' },
          { name: 'heroImageUrl', label: 'Page banner (optional)', type: 'image', folder: 'locations', wide: true,
            size: '1920 × 800 px · wide landscape', hint: 'Full-width photo at the top of this hospital’s own page.' },
        ],
      },
      {
        title: 'Contact & links',
        fields: [
          { name: 'city', label: 'City', type: 'text', placeholder: 'Kochi' },
          { name: 'country', label: 'Country', type: 'text', placeholder: 'India' },
          { name: 'address', label: 'Address', type: 'textarea', rows: 2, wide: true, placeholder: 'Street, area, city, PIN' },
          { name: 'phone', label: 'Phone', type: 'text', placeholder: '+91 484 405 4000' },
          { name: 'email', label: 'Email', type: 'text', placeholder: 'contactus@kinderhospital.in' },
          { name: 'mapUrl', label: 'Google Maps link', type: 'text', placeholder: 'https://maps.app.goo.gl/…',
            hint: 'Open the hospital in Google Maps, tap Share and paste the link here.' },
          { name: 'website', label: 'Own website (optional)', type: 'text', placeholder: 'https://www.kinderkochi.com' },
          { name: 'websiteLabel', label: 'Website link text', type: 'text', placeholder: 'Visit kinderkochi.com →',
            hint: 'Only used if an own website is set.' },
          ORDER,
        ],
      },
      VISIBILITY,
    ],
  },
  {
    key: 'doctors',
    label: 'Doctors',
    singular: 'doctor',
    icon: 'doctor',
    titleField: 'name',
    sections: [
      {
        title: 'Doctor',
        fields: [
          { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Dr. Sreeja Rani V R' },
          { name: 'designation', label: 'Qualifications & role', type: 'text', placeholder: 'MBBS, MD (OBG) — Senior Consultant' },
          { name: 'speciality', label: 'Speciality', type: 'speciality',
            hint: 'Pick from the list so the doctor appears under that speciality.' },
          { name: 'location', label: 'Where this doctor appears', type: 'location', wide: true,
            hint: 'Listed on every ticked hospital’s page, plus the corporate Services and Doctors pages.' },
        ],
      },
      {
        title: 'Profile text',
        fields: [
          { name: 'bio', label: 'Short bio', type: 'textarea', rows: 2, wide: true,
            placeholder: 'One or two sentences shown on the doctor card.' },
          { name: 'fullBio', label: 'Full profile', type: 'textarea', rows: 8, wide: true,
            placeholder: 'Experience, areas of interest, memberships… shown on the doctor’s own page.' },
        ],
      },
      {
        title: 'Photo',
        fields: [
          { name: 'imageUrl', label: 'Portrait photo', type: 'image', folder: 'doctors', wide: true,
            size: '800 × 800 px · square, face centred' },
        ],
      },
      { title: 'Order & visibility', fields: [ORDER, ...VISIBILITY.fields] },
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    singular: 'testimonial',
    icon: 'chat',
    titleField: 'patientName',
    sections: [
      {
        title: 'The story',
        fields: [
          { name: 'patientName', label: 'Patient / family name', type: 'text', required: true, placeholder: 'Anjali & Rahul' },
          { name: 'relation', label: 'Who they are', type: 'text', placeholder: 'Parents of twins, Kochi' },
          { name: 'quote', label: 'Their words', type: 'textarea', rows: 4, required: true, wide: true,
            placeholder: 'What they said about their experience, in their own words.' },
          { name: 'rating', label: 'Star rating (1–5)', type: 'number', default: 5 },
        ],
      },
      {
        title: 'Photo (optional)',
        fields: [
          { name: 'imageUrl', label: 'Photo', type: 'image', folder: 'testimonials', wide: true,
            size: '800 × 800 px · square', hint: 'Cards look fine without a photo.' },
        ],
      },
      {
        title: 'Where it appears',
        fields: [{ name: 'location', label: 'Where it appears', type: 'location', wide: true }],
      },
      VISIBILITY,
    ],
  },
  {
    key: 'news',
    label: 'News & Events',
    singular: 'post',
    icon: 'news',
    titleField: 'title',
    sections: [
      {
        title: 'Post',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true, wide: true, placeholder: 'Free paediatric health camp — 12 September' },
          { name: 'category', label: 'Type', type: 'select', options: ['News', 'Event', 'Camp'] },
          { name: 'publishedAt', label: 'Date', type: 'date', hint: 'Newest first on the website.' },
          { name: 'excerpt', label: 'Short summary', type: 'textarea', rows: 2, wide: true,
            placeholder: 'One or two sentences shown on the news card.' },
          { name: 'body', label: 'Full article', type: 'textarea', rows: 8, wide: true },
          { name: 'author', label: 'Author', type: 'text', placeholder: 'Dr. Sreeja Rani V R' },
        ],
      },
      {
        title: 'Cover photo',
        fields: [
          { name: 'imageUrl', label: 'Cover photo', type: 'image', folder: 'news', wide: true,
            size: '1200 × 675 px · landscape', hint: 'Posts without a cover show as text-only cards.' },
        ],
      },
      {
        title: 'Where it appears',
        fields: [{ name: 'location', label: 'Where it appears', type: 'location', wide: true }],
      },
      VISIBILITY,
    ],
  },
  {
    key: 'procedures',
    label: 'Procedures',
    singular: 'procedure',
    icon: 'activity',
    titleField: 'name',
    sections: [
      {
        title: 'About the procedure',
        fields: [
          { name: 'name', label: 'Procedure name', type: 'text', required: true, placeholder: 'e.g. Laparoscopic surgery' },
          { name: 'icon', label: 'Card icon', type: 'select', options: iconOptions(PROC_ICONS) },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, wide: true,
            placeholder: 'What the procedure is and who it helps, in plain language.' },
        ],
      },
      {
        title: 'Where it appears',
        fields: [
          { name: 'location', label: 'Where it appears', type: 'location', wide: true },
          ORDER,
        ],
      },
      VISIBILITY,
    ],
  },
];

// Flat field list per collection (used by tables, blank records, etc.).
for (const c of COLLECTIONS) c.fields = c.sections.flatMap((s) => s.fields);

export const SETTING_FIELDS = [
  { name: 'siteName', label: 'Site name', type: 'text', placeholder: 'Kinder Hospitals' },
  { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Kindness at the heart of every tiny heartbeat.', hint: 'Shown in the footer under the logo.' },
  { name: 'helplinePhone', label: '24/7 helpline number', type: 'text', placeholder: '+91 80 2888 8880' },
  { name: 'emergencyPhone', label: 'Emergency number', type: 'text', placeholder: '+91 8618 999 833' },
  { name: 'email', label: 'Contact email', type: 'text', placeholder: 'contactus@kinderhospital.in' },
  { name: 'announcement', label: 'Announcement text', type: 'text', wide: true, placeholder: 'e.g. Free vaccination camp this Sunday at Kinder Kochi', hint: 'Leave empty to hide the bar.' },
  { name: 'heroTitle', label: 'Headline', type: 'text', wide: true, placeholder: 'Kindness at the heart of <em>every tiny heartbeat</em>', hint: 'Wrap words in <em> … </em> to highlight them in pink.' },
  { name: 'heroSubtitle', label: 'Sub-text', type: 'textarea', rows: 3, wide: true, hint: 'Leave empty and the website writes one from your live list of hospitals.' },
  { name: 'heroImageUrl', label: 'Hero photo', type: 'image', folder: 'hero', wide: true, size: '1920 × 900 px · wide landscape' },
  { name: 'logoUrl', label: 'Logo', type: 'image', folder: 'corporate', wide: true, size: '400 × 120 px · PNG with transparent background', hint: 'Leave empty to keep the built-in Kinder logo.' },
];
