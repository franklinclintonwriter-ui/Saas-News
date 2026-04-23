# Phulpur24 — Go-Live Checklist (phulpur.net)

**Status: everything that can run on Supabase is already live.** The
remaining work is frontend deploy to Cloudflare Pages from your own
terminal.

## Live right now against production Supabase

### Supabase project `Megagine`
- Project ref: `tznssjmavvzrnqmmdmty`
- Region: `ap-northeast-1` (Tokyo)
- Postgres 17.6, Pro plan (Franklin org)
- URL: `https://tznssjmavvzrnqmmdmty.supabase.co`

### Schema + data
- 17 tables migrated, RLS enabled on every one, 6 migrations applied.
- Security advisor: **0 lints**.
- Two admin users created + verified logging in:
  - `alomgir@phulpur.net` / `Admin@123`
  - `info@phulpur.net` / `Admin@123`
  - Both have `app_metadata.role = "ADMIN"`, email confirmed, ES256 JWT valid.
- `SiteSetting` row seeded with Phulpur24 brand + https://www.phulpur.net.
- Content tables (`Post`, `Category`, `Comment`, `NewsletterSubscriber`,
  `ContactMessage`) are empty — clean slate.

### Storage
- 3 public buckets: `article-media` (25 MB), `avatars` (5 MB),
  `site-assets` (10 MB). MIME allowlists + staff-only write policies.

### Public API (Edge Function) — LIVE
Deployed at `https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api`

| Method | Path | Verified |
|---|---|---|
| `GET` | `/health` | ✓ 200 |
| `GET` | `/site` | ✓ 200 (brand payload) |
| `GET` | `/categories` | ✓ 200 |
| `GET` | `/posts?page=&limit=&category=&q=` | ✓ 200 (paginated, full-text filter) |
| `GET` | `/posts/:slug` | ✓ 200 / 404 |
| `GET` | `/pages/:slug` | ✓ 200 / 404 |
| `POST` | `/newsletter` | ✓ 201 (email-validated, dedup-safe) |
| `POST` | `/contact` | ✓ 201 (length-validated) |
| `POST` | `/comments` | ✓ 201 (requires published post + valid email) |

Features: CORS locked to `https://www.phulpur.net`,
`https://admin.phulpur.net`, `127.0.0.1:5174`, `localhost:5174`.
`cache-control: no-store` + `x-request-id` per response. 500 path logs
as structured JSON.

**This replaces the Express Docker API for all public traffic.** You do
not need Fly / Railway / Docker / a VPS to ship the reader site.

## What still needs the Express host (admin CRUD)

The admin CMS routes (post editor, media upload, user management, AI
draft, audit log) still live in `api/src/routes.ts`. Options:

**A. Use admin surface against Supabase directly (recommended now)**
The admin site can hit Supabase PostgREST + Auth directly using
`@supabase/supabase-js` with a logged-in user's JWT. RLS enforces
`is_staff()` / `is_admin()` checks. This is how the Supabase dashboard
itself works. No extra host needed. Requires wiring
`src/app/context/auth-context.tsx` to use `supabase-auth.ts` (already
written; see `docs/PRODUCTION_READINESS.md`).

**B. Keep the Express admin API on a VPS / Fly / Railway**
Only needed if you want custom server-side logic (AI draft generation,
audit-log writes, complex media processing). Dockerfile is ready; run:
```sh
fly launch && fly deploy   # or your PaaS of choice
```
Point `admin.phulpur.net` at the frontend; the admin frontend makes
requests to both the Edge Function (public reads) and the Express
host (admin writes).

## Deploy frontend to Cloudflare Pages

### One-time auth on your machine
```sh
npx wrangler@latest login
```

### Public site → www.phulpur.net
```sh
cd "C:\Users\DFIT\Desktop\Create News SaaS Wireframe"
npm install

# Build with production env
$env:VITE_API_BASE_URL="https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api"
$env:VITE_PUBLIC_SITE_URL="https://www.phulpur.net"
$env:VITE_SUPABASE_URL="https://tznssjmavvzrnqmmdmty.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="sb_publishable_MZugK2WkoPdxs3K4QLPs7w_SPNqLEp3"
$env:VITE_PLAUSIBLE_DOMAIN="www.phulpur.net"
npm run build:public

npx wrangler@latest pages deploy dist --project-name phulpur-magazine --branch main
```

### Admin site → admin.phulpur.net
```sh
$env:VITE_API_BASE_URL="https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api"
$env:VITE_PUBLIC_SITE_URL="https://www.phulpur.net"
$env:VITE_SUPABASE_URL="https://tznssjmavvzrnqmmdmty.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="sb_publishable_MZugK2WkoPdxs3K4QLPs7w_SPNqLEp3"
npm run build:admin

npx wrangler@latest pages deploy dist --project-name phulpur-admin --branch main
```

Then in Cloudflare dashboard → Pages → each project → Custom domains:
- `phulpur-magazine` → `www.phulpur.net` + apex `phulpur.net`
- `phulpur-admin` → `admin.phulpur.net`

### Smoke test
```sh
curl https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api/health
curl https://www.phulpur.net
curl https://admin.phulpur.net/login
```

Sign in at `https://admin.phulpur.net/login` with either admin above.

## Automate via GitHub Actions

Store these in repo → Settings → Secrets:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → template "Edit Cloudflare Pages" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |
| `VITE_API_BASE_URL` | `https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api` |
| `VITE_PUBLIC_SITE_URL` | `https://www.phulpur.net` |
| `VITE_SUPABASE_URL` | `https://tznssjmavvzrnqmmdmty.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_MZugK2WkoPdxs3K4QLPs7w_SPNqLEp3` |
| `VITE_SENTRY_DSN` | (optional) |
| `VITE_PLAUSIBLE_DOMAIN` | `www.phulpur.net` |

Then `git tag v1.0.0 && git push --tags` runs
`.github/workflows/deploy.yml` and both sites deploy.

## Security follow-up (do today)

- **Rotate both admin passwords** at first login. They're in this
  transcript and in this doc.
- **Rotate any Resend API key** that was pasted as a template value
  — treat as compromised.
- Add Resend domain verification (DNS records from Resend dashboard)
  before sending a single newsletter.

## What I could not do from this sandbox

- Fetch `SUPABASE_SERVICE_ROLE_KEY` — Supabase deliberately doesn't
  expose it via MCP (it's the one key that bypasses RLS). You get it
  from the dashboard. **The Edge Function already has it automatically**
  as `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — that's why the
  writes work without you ever pasting it anywhere.
- Fetch the database password — same reason (credentials you hold, not
  automation tooling).
- Run `wrangler pages deploy` — needs interactive auth with your
  Cloudflare account.
- Complete `npm install` inside the sandbox — per-command 45 s cap.

Everything else is live.
