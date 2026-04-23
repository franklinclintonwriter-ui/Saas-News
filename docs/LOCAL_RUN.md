# Run the stack locally against Supabase

Precise step-by-step to bring the API + Vite frontend up on your machine,
connected to the `Megagine` Supabase project (`tznssjmavvzrnqmmdmty`).
Expected total time: 3–5 minutes.

## Prerequisites

- Node 22+ (you have 22.22.0 — confirmed).
- A terminal with outbound HTTPS to `*.supabase.co` and `*.npmjs.org`.

## 1. Install the new deps (one-time)

From the project root:

```sh
npm install
```

This pulls the four new runtime deps and the test harness that were
added to `package.json`:

- `@supabase/supabase-js@^2.48.0`
- `@sentry/node@^8.50.0` and `@sentry/react@^8.50.0`
- `resend@^4.0.1`
- `vitest` + `@testing-library/*` + `@playwright/test` (dev)

Allow 1–2 minutes on first install.

## 2. Get two secrets from Supabase

Open the dashboard at
<https://supabase.com/dashboard/project/tznssjmavvzrnqmmdmty>:

- **Settings → Database → Connection string → URI** → copy the password
  (shown as `[YOUR-PASSWORD]` in the template).
- **Settings → API → Project API keys → `service_role`** → click
  *Reveal* → copy the JWT.

You do **not** need `SUPABASE_JWT_SECRET` — your project is on ES256
asymmetric signing. The API fetches public keys from the JWKS URL
(already wired).

## 3. Create `.env`

Copy the template and fill in the two values above:

```sh
cp .env.local.template .env
$EDITOR .env
# Replace <FILL_IN_DB_PASSWORD> in DATABASE_URL and DIRECT_URL
# Replace <FILL_IN_SERVICE_ROLE_KEY> in SUPABASE_SERVICE_ROLE_KEY
```

## 4. Generate the Prisma client against Postgres

The schema was migrated from MySQL to Postgres in this pass. Regenerate
the client so it matches:

```sh
npx prisma generate
```

(Tables already exist in Supabase — I applied them via MCP. No
`prisma migrate deploy` needed.)

## 5. Bootstrap a first user

Option A — via the legacy bcrypt seed (fast, local-only):

```sh
npm run prisma:seed
```

Uses `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env`.

Option B — via Supabase Auth (recommended — this is the path prod will
use). In the Supabase dashboard → Authentication → Users → *Add user*:

- Set email + password.
- After the row is created, open it and edit `raw_app_meta_data` to add
  `"role": "ADMIN"`:
  ```json
  { "role": "ADMIN" }
  ```

## 6. Start the API

```sh
npm run api:dev
```

You should see structured JSON logs, e.g.

```json
{"ts":"...","level":"info","event":"server.listening","port":4102}
```

Health check:

```sh
curl http://127.0.0.1:4102/api/public/health
# → {"ok":true}
```

If the API fails at boot with `CORS_ORIGIN must be set …` — you're in
`NODE_ENV=production`. `.env.local.template` sets `development` so this
won't happen if you followed step 3.

## 7. Start the Vite dev server (in another terminal)

```sh
npm run dev
```

Vite will serve the public surface at <http://127.0.0.1:5174>. Combined
admin routes are on the same dev build — navigate to `/admin` to reach
them.

## 8. Verify the round-trip

From the admin surface:

1. Sign in with the user you created in step 5.
2. Create a Category. Verify it persists (refresh the page).
3. Create a Post → Publish.
4. Open `/` (public) in another tab — the post should appear.
5. Upload an image in Media Library — check that the URL starts with
   `https://tznssjmavvzrnqmmdmty.supabase.co/storage/v1/...` (i.e. the
   storage adapter is using Supabase, not the R2/inline fallback).

## 9. Run tests

```sh
npm run typecheck    # frontend + api tsc
npm test             # vitest (unit + security-headers + mailer + JWT)
npm run test:e2e     # playwright (needs the stack running)
```

## Troubleshooting

**"Invalid JWT signature" on every admin request**
The API couldn't reach the JWKS URL. Check: `curl $SUPABASE_JWKS_URL` from
the API host; if that's blocked, set `SUPABASE_URL` correctly and ensure
outbound HTTPS is allowed.

**"Supabase Storage upload failed (403)"**
Either `SUPABASE_SERVICE_ROLE_KEY` is wrong, or the three buckets aren't
public. I created them as public via MCP; if you rotated keys after
creation, re-check the key.

**Prisma: "Cannot reach database"**
The DB password in `DATABASE_URL` is wrong or URL-encoding-sensitive
characters (`@`, `#`, `%`, `/`, `:`, `?`) weren't encoded. Use
`encodeURIComponent` style encoding for any special characters in the
password.

**API boots but Supabase auth JWTs still rejected**
The JWKS public key cache is 10 minutes. If you rotated keys during a
running session, restart the API (or we can expose an admin endpoint to
call `clearJwksCache()`).

**`prisma:seed` complains about the schema**
The seed file was written for the admin-only flow. It uses the Prisma
client which now targets Postgres. Make sure `DATABASE_URL` is the
Supabase pooler string (port 6543), not MySQL.
