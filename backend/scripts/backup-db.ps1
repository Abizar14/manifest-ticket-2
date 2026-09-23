# AFVS - Backup DB MySQL + folder uploads (foto wajah). Windows/Laragon.
# Pemakaian: powershell -ExecutionPolicy Bypass -File backup-db.ps1
# Jadwalkan via Task Scheduler (harian). mysqldump dari Laragon:
#   mis. C:\laragon\bin\mysql\mysql-8.x\bin\mysqldump.exe
param(
  [string]$MysqldumpExe = "mysqldump",                     # set path Laragon bila tak di PATH
  [string]$BackupRoot   = "C:\backups\afvs",
  [int]$KeepDays        = 14
)
$ErrorActionPreference = "Stop"
$BackendDir = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $BackendDir ".env"
if (-not (Test-Path $EnvFile)) { throw "$EnvFile tidak ada" }

# Baca & parse DATABASE_URL = mysql://user:pass@host:port/db
$line = (Get-Content $EnvFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1)
$url  = ($line -replace '^DATABASE_URL=', '').Trim('"')
if ($url -notmatch '^mysql://([^:]+):([^@]*)@([^:/]+):?(\d+)?/([^?]+)') { throw "DATABASE_URL bukan format mysql:// yang valid" }
$DbUser=$Matches[1]; $DbPass=$Matches[2]; $DbHost=$Matches[3]; $DbPort=$(if($Matches[4]){$Matches[4]}else{'3306'}); $DbName=$Matches[5]

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Dest  = Join-Path $BackupRoot $Stamp
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Write-Host "[$(Get-Date)] Backup DB '$DbName' @ ${DbHost}:$DbPort -> $Dest"

# Dump DB -> gzip (pakai .NET GzipStream agar tak butuh gzip.exe)
$sqlDump = Join-Path $Dest "afvs-db.sql"
& $MysqldumpExe "--host=$DbHost" "--port=$DbPort" "--user=$DbUser" "--password=$DbPass" `
  --single-transaction --quick --routines --triggers $DbName | Out-File -Encoding utf8 $sqlDump
$gz = "$sqlDump.gz"
$in = [System.IO.File]::OpenRead($sqlDump)
$out = [System.IO.File]::Create($gz)
$gzip = New-Object System.IO.Compression.GzipStream($out, [System.IO.Compression.CompressionMode]::Compress)
$in.CopyTo($gzip); $gzip.Close(); $out.Close(); $in.Close()
Remove-Item $sqlDump

# Backup folder uploads
$uploadLine = (Get-Content $EnvFile | Where-Object { $_ -match '^UPLOAD_DIR=' } | Select-Object -First 1)
$uploadDir = if ($uploadLine) { ($uploadLine -replace '^UPLOAD_DIR=', '').Trim('"') } else { "./uploads" }
if ($uploadDir -notmatch '^[A-Za-z]:') { $uploadDir = Join-Path $BackendDir $uploadDir }
if (Test-Path $uploadDir) {
  Compress-Archive -Path $uploadDir -DestinationPath (Join-Path $Dest "uploads.zip") -Force
  Write-Host "  uploads -> uploads.zip"
} else { Write-Host "  (UPLOAD_DIR $uploadDir tidak ada - dilewati)" }

# Rotasi
Get-ChildItem $BackupRoot -Directory | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item -Recurse -Force
Write-Host "[$(Get-Date)] Backup selesai: $Dest"
