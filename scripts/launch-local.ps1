$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$port = 3096
$logDirectory = Join-Path $env:LOCALAPPDATA 'StudyWikiWall'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-Wall($candidate) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$candidate/" -TimeoutSec 2 -UseBasicParsing
    return $response.StatusCode -eq 200 -and $response.Content -match '843.*真题墙'
  } catch { return $false }
}

try {
  if (-not (Test-Wall $port)) {
    while (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $port++ }
    $node = 'D:\node\New Folder\node.exe'
    if (-not (Test-Path $node)) { $node = (Get-Command node -ErrorAction Stop).Source }
    $next = Join-Path $project 'node_modules\next\dist\bin\next'
    if (-not (Test-Path $next)) { throw '请先在真题墙项目目录运行 npm install。' }
    $process = Start-Process -FilePath $node -ArgumentList @("`"$next`"", 'dev', '-p', "$port") -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log')
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      Start-Sleep -Milliseconds 500
      if (Test-Wall $port) { break }
      if ($process.HasExited) { throw "本地服务启动失败，退出码 $($process.ExitCode)。" }
    }
    if (-not (Test-Wall $port)) { throw '本地服务未在 30 秒内就绪。' }
  }

  $keyFile = Join-Path $logDirectory 'device-key.dpapi'
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
  $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  if (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList @('--new-window', "`"$url`"") -WindowStyle Normal
  } else {
    Start-Process $url
  }
} catch {
  $message = "真题墙未能启动：$($_.Exception.Message)`n`n日志：$logDirectory\server-error.log"
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($message, '843 真题墙', 'OK', 'Error') | Out-Null
  exit 1
}
