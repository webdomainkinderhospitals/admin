# Kinder Hospitals — Admin Portal

Control panel for the Kinder Hospitals website. Upload images, edit every section
(specialities, locations, doctors, testimonials, news & events, procedures), and
change site-wide settings (hero, phones, logo, stats). Changes appear on the live
site within about a minute.

**Stack:** React 18 · Vite · deployed on Vercel

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
