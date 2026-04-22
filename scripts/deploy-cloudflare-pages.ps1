param(
  [Parameter(Mandatory = $true)]
  [string]$CloudflareApiToken,

  [Parameter(Mandatory = $true)]
  [string]$CloudflareAccountId,

  [string]$ProjectName = "phulpur24",
  [string]$ApiBaseUrl = "/api",
  [string]$BackendOrigin = "https://api.your-domain.com",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$env:CLOUDFLARE_API_TOKEN = $CloudflareApiToken
$env:CLOUDFLARE_ACCOUNT_ID = $CloudflareAccountId
$env:VITE_API_BASE_URL = $ApiBaseUrl
$env:BACKEND_ORIGIN = $BackendOrigin

npm ci
npm run build
npx wrangler@latest pages deploy dist --project-name $ProjectName --branch $Branch
