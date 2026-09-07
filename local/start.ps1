$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:4187'
$previewReady = $false
try { $previewHealth = Invoke-RestMethod -Uri "$previewUrl/health" -TimeoutSec 2; $previewReady = $previewHealth.app -eq 'theology-design-preview' } catch {}
if (-not $previewReady) {
  $previewNode = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $previewNode) {
    $previewNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  }
  if (-not (Test-Path -LiteralPath $previewNode)) { throw 'Node.js not found. Open index.html for the offline design preview.' }
  $previewScript = Join-Path $PSScriptRoot 'server.cjs'
  Start-Process -FilePath $previewNode -ArgumentList ('"' + $previewScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($previewAttempt = 0; $previewAttempt -lt 20; $previewAttempt++) {
    try { $previewHealth = Invoke-RestMethod -Uri "$previewUrl/health" -TimeoutSec 2; if ($previewHealth.app -eq 'theology-design-preview') { $previewReady = $true; break } } catch {}
    Start-Sleep -Milliseconds 250
  }
}
if (-not $previewReady) { throw 'The local preview could not start on port 4187.' }
Start-Process $previewUrl
