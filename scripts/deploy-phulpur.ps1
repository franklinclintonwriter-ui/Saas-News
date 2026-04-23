# Phulpur24 — one-shot deploy (Windows PowerShell)
# Run from project root:  .\scripts\deploy-phulpur.ps1
# Prereq:  npx wrangler login  (once, interactive)

$ErrorActionPreference = "Stop"

# ---- Common VITE_* env (applied to both builds) --------------------------
$env:VITE_API_BASE_URL       = "https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/public-api"
$env:VITE_PUBLIC_SITE_URL    = "https://www.phulpur.org"
$env:VITE_SUPABASE_URL       = "https://tznssjmavvzrnqmmdmty.supabase.co"
$env:VITE_SUPABASE_ANON_KEY  = "sb_publishable_MZugK2WkoPdxs3K4QLPs7w_SPNqLEp3"
$env:VITE_PLAUSIBLE_DOMAIN   = "www.phulpur.org"

Write-Host "`n=== 1/4 npm install (deps) ==="
npm install --no-audit --no-fund

Write-Host "`n=== 2/4 Build public surface ==="
Remove-Item -Path dist -Recurse -Force -ErrorAction SilentlyContinue
$env:VITE_APP_SURFACE = "public"
npx vite build
Copy-Item -Path "public\_redirects", "public\_headers" -Destination "dist\" -Force -ErrorAction SilentlyContinue

Write-Host "`n=== 3/4 Deploy public → phulpur-magazine (www.phulpur.org) ==="
npx wrangler@latest pages deploy dist --project-name phulpur-magazine --branch main

Write-Host "`n=== 4/4 Build + deploy admin surface ==="
Remove-Item -Path dist -Recurse -Force -ErrorAction SilentlyContinue
$env:VITE_APP_SURFACE = "admin"
# Admin points at admin-api (requires Supabase JWT)
$env:VITE_ADMIN_API_BASE_URL = "https://tznssjmavvzrnqmmdmty.supabase.co/functions/v1/admin-api"
npx vite build
Copy-Item -Path "public\_redirects", "public\_headers" -Destination "dist\" -Force -ErrorAction SilentlyContinue

npx wrangler@latest pages deploy dist --project-name phulpur-admin --branch main

Write-Host "`n=== Done. Verify: ==="
Write-Host "  https://www.phulpur.org"
Write-Host "  https://admin.phulpur.org/login   (use alomgir@phulpur.net / Admin@123)"
Write-Host "`nIf you still see 503, clear browser cache for phulpur.org and try in incognito."
