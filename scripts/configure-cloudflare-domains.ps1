param(
  [Parameter(Mandatory = $true)]
  [string]$CloudflareApiToken,

  [Parameter(Mandatory = $true)]
  [string]$CloudflareAccountId,

  [string]$PublicProject = "phulpur-magazine",
  [string]$PublicDomain = "phulpur.net",
  [string]$AdminProject = "phulpur-admin",
  [string]$AdminDomain = "admin.phulpur.org"
)

$ErrorActionPreference = "Stop"

$headers = @{
  Authorization = "Bearer $CloudflareApiToken"
  "Content-Type" = "application/json"
}

function Add-PagesDomain {
  param(
    [string]$Project,
    [string]$Domain
  )

  $uri = "https://api.cloudflare.com/client/v4/accounts/$CloudflareAccountId/pages/projects/$Project/domains"
  $body = @{ name = $Domain } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body | Out-Null
    Write-Output "Added $Domain to $Project."
  } catch {
    $message = $_.ErrorDetails.Message
    if ($message -match "already") {
      Write-Output "$Domain is already attached to $Project."
    } else {
      throw
    }
  }
}

Add-PagesDomain -Project $PublicProject -Domain $PublicDomain
Add-PagesDomain -Project $AdminProject -Domain $AdminDomain
