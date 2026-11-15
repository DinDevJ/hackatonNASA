<#
.SYNOPSIS
Ejecuta verificar.py y la bateria pytest (tests\) con el entorno envs\app. Propaga los codigos de salida.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$pyApp = Join-Path $Root (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'python.exe')))
if (-not (Test-Path -LiteralPath $pyApp)) { throw 'Falta envs\app. Ejecuta primero scripts\instalar_app.ps1' }

$c1 = 0; $c2 = 0
Push-Location $Root
try {
    Write-Paso 'verificar.py'
    $global:LASTEXITCODE = 0
    & $pyApp 'verificar.py'
    $c1 = $LASTEXITCODE
    Write-Paso 'pytest -q tests'
    $global:LASTEXITCODE = 0
    & $pyApp -m pytest -q tests
    $c2 = $LASTEXITCODE
} finally {
    Pop-Location
}
Write-Host ('verificar.py: codigo ' + $c1 + ' ; pytest: codigo ' + $c2)
if ($c1 -ne 0) { exit $c1 }
exit $c2
