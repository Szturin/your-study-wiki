$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$port = 3096

function Test-Wall($candidate) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$candidate/" -TimeoutSec 2 -UseBasicParsing
    return $response.StatusCode -eq 200 -and $response.Content -match '843.*真题墙'
  } catch { return $false }
}

if (-not (Test-Wall $port)) {
  while (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $port++ }
  $next = Join-Path $project 'node_modules\next\dist\bin\next'
  if (-not (Test-Path $next)) { throw '请先在真题墙项目目录运行 npm install。' }
  Start-Process -FilePath $node -ArgumentList @($next, 'dev', '-p', "$port") -WorkingDirectory $project -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-Wall $port) { break }
  }
  if (-not (Test-Wall $port)) { throw '本地真题墙启动失败，请检查项目日志。' }
}

$keyFile = Join-Path $env:LOCALAPPDATA 'StudyWikiWall\device-key.dpapi'
$url = "http://localhost:$port/"
if (Test-Path $keyFile) {
  $secureKey = Get-Content -LiteralPath $keyFile -Raw | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $url += '#local-key=' + [Uri]::EscapeDataString($plainKey)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}
Start-Process $url
