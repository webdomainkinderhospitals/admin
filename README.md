# Kinder Hospitals — Admin Portal

Control panel for the Kinder Hospitals website. Upload images, edit every section
(specialities, locations, doctors, testimonials, news & events, procedures), and
change site-wide settings (hero, phones, logo, stats). Changes appear on the live
site within about a minute.

**Stack:** React 18 · Vite · deployed on Vercel

## Media Library (images & content hub)

The Media Library is the one screen that shows what is still missing on the
website and lets you fix it in place:

- **Readiness strip** — one card per website (corporate + each hospital
  sub-website) with a progress bar and “N items to do”. The same numbers appear
  on the Dashboard.
- **Corporate Website** — homepage hero, logo, hero text, contact numbers,
  announcement bar and the photo on every hospital card.
- **Hospital Sub-websites** — one tab per centre: page banner, card photo,
  tagline, about text, highlights, contact links and the photo of every doctor
  at that centre. Uploads land in that hospital’s own folder.
- **Content Photos** — doctor portraits, news covers, patient-story photos and
  hospital card photos as a checklist.
- **All Images** — the raw folder gallery.

Every slot is marked **Done**, **Sample photo** (still using a stock image from
the original design), **Pending** or **Optional**. Fill a slot by clicking
*Upload*, dropping a file on it, or choosing *From library*; text slots are
edited inline. Any gallery image has a *Use for…* menu that assigns it to a
slot, and green tags show where an image is already used. Tick “Show only
what’s left to do” to hide finished items.

Slot definitions live in `src/media/slots.js` — add a slot there and it appears
in the checklist, the progress numbers and the *Use for…* menus automatically.

## Run locally

```bash
npm install
cp .env.example .env    # set VITE_API_URL to your backend URL
npm run dev             # http://localhost:5173
```

Log in with the admin email/password you seeded in the backend.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com) → **Add New → Project** → import `webdomainkinderhospitals/admin`.
3. Framework preset: **Vite** (auto-detected).
4. Environment variable: `VITE_API_URL = https://<your-cloud-run-url>` (or `https://api.yourdomain.com`).
5. Deploy. Optionally add the custom domain `admin.yourdomain.com` (protect it with Cloudflare Access).

## Security notes

- The portal itself is public HTML — all data access requires the JWT issued by the backend at login.
- Recommended: put `admin.yourdomain.com` behind **Cloudflare Access** so only your team can even open the page.
- Change the seeded admin password immediately (Settings API `POST /api/auth/change-password`, or re-seed).
