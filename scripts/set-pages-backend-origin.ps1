param(
  [Parameter(Mandatory = $true)]
  [string]$BackendOrigin,

  [string[]]$Projects = @("phulpur-magazine", "phulpur-admin")
)

$ErrorActionPreference = "Stop"

foreach ($project in $Projects) {
  Write-Output "Setting BACKEND_ORIGIN for $project..."
  $BackendOrigin | npx wrangler@latest pages secret put BACKEND_ORIGIN --project-name $project
}
