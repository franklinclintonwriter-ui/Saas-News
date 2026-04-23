# Phulpur24 — Production Deployment Runbook

This document is the authoritative path from a clean repository to a running
production instance. Follow it top-to-bottom the first time. Keep it next to
your incident runbook.

## 0. Architecture

- **Frontend** (`src/`): React + Vite, deployed as static bundles on
  Cloudflare Pages. Two surfaces built from one codebase:
  `dist/public` (reader site) and `dist/admin` (CMS).
- **API** (`api/src/`): Express + Prisma, runs in a container (Dockerfile
  included). Stateless — horizontally scalable.
- **Database + Auth + Object storage**: Supabase (Postgres, Auth, Storage).
- **Transactional + newsletter mail**: Resend.
- **Error tracking**: Sentry (frontend + backend).
- **Product analytics**: Plausible (public surface only — admin is
  intentionally not tracked).

## 1. Provision Supabase

1. Create a Supabase organisation if you don't have one.
2. Create a project named `phulpur24-prod` in the region closest to your
   readership.
3. From **Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` **(server only)**
   - `JWT Secret` → `SUPABASE_JWT_SECRET`
4. From **Project Settings → Database**, copy the Transaction pooler
   connection string (port 6543) → `DATABASE_URL`, and the direct
   connection (port 5432) → `DIRECT_URL`.
5. Create storage buckets: `article-media` (public), `avatars` (public),
   `site-assets` (public).

## 2. Prepare secrets

Generate three distinct 48+ character secrets:

```sh
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 48   # INTEGRATION_SECRET_KEY
```

Copy `.env.production.example` to `.env.production` and fill every required
variable. Load these into your secrets manager (Doppler, 1Password, GitHub
Actions secrets, Cloudflare Pages env bindings, etc.). **Never** commit the
populated file.

## 3. Provision Resend

1. Create a Resend project.
2. Verify your sending domain (add DKIM / SPF / DMARC records at your DNS
   provider).
3. Create an API key scoped to `Send emails`. Store as `RESEND_API_KEY`.
4. Decide your from addresses (`RESEND_FROM`, `RESEND_NEWSLETTER_FROM`) —
   they must be on the verified domain.

## 4. Provision Sentry & Plausible

- **Sentry**: create a React project and a Node project. Capture each DSN.
  Set `VITE_SENTRY_DSN` (browser) and `SENTRY_DSN` (API).
- **Plausible**: add your domain at plausible.io (or self-host). Set
  `VITE_PLAUSIBLE_DOMAIN`. The admin surface never loads the script.

## 5. Database migration

From a machine that can reach Supabase:

```sh
npm ci
npx prisma migrate deploy          # applies migrations in prisma/migrations
npx prisma generate                # generates Prisma client
```

Do **not** run `prisma db push` in production — it skips the migration
history and can drift.

## 6. Bootstrap the first admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` **just for the seed**, then:

```sh
npm run prisma:seed
```

The seed refuses to run without those vars and creates exactly one user.
After confirming login, clear both vars from your environment so re-deploys
don't re-upsert the same row.

## 7. Deploy the API (Docker)

```sh
docker build -t phulpur24-api:$(git rev-parse --short HEAD) .
docker run --env-file .env.production -p 4102:4102 phulpur24-api:…
```

Point a reverse proxy (Cloudflare, Caddy, Traefik) at the container. TLS
terminates at the proxy.

Health check: `GET https://api.your-domain.com/api/health` → `200 {"ok":true}`.

## 8. Deploy the frontend (Cloudflare Pages)

Two separate Pages projects — one per surface — both built from this repo.

### Public site
- Build command: `npm ci && npm run build:public`
- Output directory: `dist/public`
- Environment: `VITE_API_BASE_URL`, `VITE_PUBLIC_SITE_URL`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`,
  `VITE_PLAUSIBLE_DOMAIN`.

### Admin
- Build command: `npm ci && npm run build:admin`
- Output directory: `dist/admin`
- Environment: same list as public **except** no `VITE_PLAUSIBLE_DOMAIN`
  (admin is not tracked).

Attach custom domains: `www.your-domain.com` and `admin.your-domain.com`.

## 9. Smoke test

Run through by hand:

1. Public homepage loads, header + footer render, no Sentry errors.
2. Click a category → list loads with correct empty state copy when no
   posts exist.
3. Search returns expected results.
4. `GET /sitemap.xml` and `GET /robots.txt` respond.
5. Login at `admin.your-domain.com/login` with bootstrap admin.
6. Create a category → tag → draft post → publish → verify on public site.
7. Submit the contact form → message appears in `/admin/contact`.
8. Subscribe via newsletter form → row appears in `/admin/newsletter`.
9. Send a test newsletter to the bootstrap admin only.
10. Trigger `throw new Error('sentry-smoke')` from a dev-only route →
    verify the event in Sentry.

## 10. Rollback

- **API**: redeploy the previous image tag. Stateless.
- **Frontend**: Cloudflare Pages → revert deployment → one click.
- **Schema**: every migration has a down step. `npx prisma migrate resolve
  --rolled-back <NAME>` then redeploy the previous API image that matches
  that schema. Schema rollbacks are blast-radius-heavy — prefer forward
  fixes in a new migration.

## 11. Secret rotation

- JWT secrets: rotate quarterly. Supports dual-verify: deploy new secret,
  wait for all refresh tokens to expire (`REFRESH_TOKEN_DAYS`), remove old
  secret.
- Supabase service-role: rotate in Supabase dashboard, redeploy API with
  new value.
- Resend / Sentry / Plausible API keys: rotate on staff turnover.

## 12. What is not yet wired (tracked in task list)

- Supabase Auth migration (backend still uses Prisma+bcrypt JWT) — see
  tasks #11, #12, #14.
- Supabase Storage migration (backend still uses S3/R2 SDK) — task #13.
- Resend integration — task #15.
- Sentry + Plausible — tasks #16, #17.
- CI/CD, tests, a11y, RLS — tasks #19–26.

Work through the task list in ID order where possible.
