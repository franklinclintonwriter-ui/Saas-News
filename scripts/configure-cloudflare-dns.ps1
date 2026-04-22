param(
  [Parameter(Mandatory = $true)]
  [string]$CloudflareApiToken,

  [Parameter(Mandatory = $true)]
  [string]$PhulpurNetZoneId,

  [Parameter(Mandatory = $true)]
  [string]$PhulpurOrgZoneId,

  [string]$PublicDomain = "phulpur.net",
  [string]$PublicAlias = "www.phulpur.net",
  [string]$PublicPagesTarget = "phulpur-magazine.pages.dev",
  [string]$AdminDomain = "admin.phulpur.org",
  [string]$AdminPagesTarget = "phulpur-admin.pages.dev",
  [string]$ApiDomain = "api.phulpur.net",
  [string]$ApiTarget = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$headers = @{
  Authorization = "Bearer $CloudflareApiToken"
  "Content-Type" = "application/json"
}

function Set-CnameRecord {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ZoneId,

    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Target
  )

  $lookupUri = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records?name=$([uri]::EscapeDataString($Name))"
  $existing = (Invoke-RestMethod -Method Get -Uri $lookupUri -Headers $headers).result
  $payload = @{
    type = "CNAME"
    name = $Name
    content = $Target
    proxied = $true
    ttl = 1
  } | ConvertTo-Json

  if ($existing.Count -eq 0) {
    Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records" -Headers $headers -Body $payload | Out-Null
    Write-Output "Created CNAME $Name -> $Target."
    return
  }

  $record = $existing | Select-Object -First 1
  if ($record.type -ne "CNAME" -and -not $Force) {
    throw "Existing DNS record for $Name is type $($record.type). Re-run with -Force after confirming it is safe to replace."
  }

  Invoke-RestMethod -Method Patch -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records/$($record.id)" -Headers $headers -Body $payload | Out-Null
  Write-Output "Updated CNAME $Name -> $Target."
}

Set-CnameRecord -ZoneId $PhulpurNetZoneId -Name $PublicDomain -Target $PublicPagesTarget
Set-CnameRecord -ZoneId $PhulpurNetZoneId -Name $PublicAlias -Target $PublicPagesTarget
Set-CnameRecord -ZoneId $PhulpurOrgZoneId -Name $AdminDomain -Target $AdminPagesTarget

if ($ApiTarget.Trim()) {
  Set-CnameRecord -ZoneId $PhulpurNetZoneId -Name $ApiDomain -Target $ApiTarget.Trim()
}
