param(
  [string[]]$Required = @(
    "NODE_ENV",
    "DATABASE_URL",
    "API_PUBLIC_URL",
    "CORS_ORIGIN",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "INTEGRATION_SECRET_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "R2_BUCKET",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY"
  )
)

$ErrorActionPreference = "Stop"
$missing = @()

foreach ($name in $Required) {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    $missing += $name
  }
}

if ($missing.Count) {
  Write-Error ("Missing required deployment environment variables: " + ($missing -join ", "))
}

Write-Output "Deployment environment looks ready."
