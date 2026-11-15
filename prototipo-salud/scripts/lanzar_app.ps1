<#
.SYNOPSIS
Lanza la app Streamlit (app.py) con el entorno envs\app.
.PARAMETER Puerto
Puerto local (por defecto 8501).
#>
[CmdletBinding()]
param([ValidateRange(1, 65535)][int]$Puerto = 8501)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$pyApp = Join-Path $Root (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'python.exe')))
if (-not (Test-Path -LiteralPath $pyApp)) { throw 'Falta envs\app. Ejecuta primero scripts\instalar_app.ps1' }
if (-not (Test-Path -LiteralPath (Join-Path $Root 'app.py'))) { throw 'Falta app.py en la raiz del proyecto.' }

Push-Location $Root
try {
    $global:LASTEXITCODE = 0
    & $pyApp -m streamlit run app.py --server.port $Puerto
    $codigo = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($codigo -ne 0) { Write-Host ('Streamlit termino con codigo ' + $codigo) -ForegroundColor Red }
exit $codigo
