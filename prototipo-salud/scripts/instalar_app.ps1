<#
.SYNOPSIS
Crea envs\app (venv de la app Streamlit) con el Python del sistema e instala requirements-app.txt.
.DESCRIPTION
Uso: powershell -File scripts\instalar_app.ps1 [-Forzar]
Si faltan permisos de ejecucion: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.PARAMETER Forzar
Borra y recrea envs\app.
#>
[CmdletBinding()]
param([switch]$Forzar)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

Write-Paso 'Comprobando Python del sistema'
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'No se encontro "python" en el PATH. Instala Python 3.13 (python.org) y marca "Add to PATH".'
}
$verTxt = (Invoke-Native -Exe 'python' -Argumentos @('--version') -Capturar | Out-String).Trim()
Write-Host $verTxt
if ($verTxt -notmatch 'Python\s+(\d+)\.(\d+)\.(\d+)') { throw ('No pude interpretar la version: ' + $verTxt) }
$mayor = [int]$Matches[1]; $menor = [int]$Matches[2]
if ($mayor -lt 3 -or ($mayor -eq 3 -and $menor -lt 10)) {
    throw ('Python ' + $verTxt + ' es demasiado antiguo; se requiere 3.10 o superior (recomendado 3.13.x).')
}
if (-not ($mayor -eq 3 -and $menor -eq 13)) {
    Write-Aviso ('Se esperaba Python 3.13.x y hay ' + $verTxt + '. Se continua, pero no esta probado.')
}

$envApp = Join-Path (Join-Path $Root 'envs') 'app'
$pyApp = Join-Path $envApp (Join-Path 'Scripts' 'python.exe')

if ($Forzar -and (Test-Path -LiteralPath $envApp)) {
    Write-Paso 'Eliminando envs\app (-Forzar)'
    Remove-Item -LiteralPath $envApp -Recurse -Force
}
if (-not (Test-Path -LiteralPath $pyApp)) {
    Write-Paso 'Creando envs\app'
    Invoke-Native -Exe 'python' -Argumentos @('-m', 'venv', $envApp)
} else {
    Write-Host 'envs\app ya existe (usa -Forzar para recrear).'
}

Write-Paso 'Actualizando pip'
Invoke-Native -Exe $pyApp -Argumentos @('-m', 'pip', 'install', '--upgrade', 'pip')

$req = Join-Path $Root 'requirements-app.txt'
if (-not (Test-Path -LiteralPath $req)) { throw ('Falta ' + $req) }
Write-Paso 'Instalando requirements-app.txt'
Invoke-Native -Exe $pyApp -Argumentos @('-m', 'pip', 'install', '-r', $req)

Write-Paso 'Versiones instaladas'
Invoke-Native -Exe $pyApp -Argumentos @('--version')
Invoke-Native -Exe $pyApp -Argumentos @('-m', 'pip', '--version')
$uv = Join-Path $envApp (Join-Path 'Scripts' 'uv.exe')
if (Test-Path -LiteralPath $uv) { Invoke-Native -Exe $uv -Argumentos @('--version') }
else { Write-Aviso 'uv.exe no esta en envs\app; instalar_modelo.ps1 usara la alternativa py -3.11 -m venv.' }
Invoke-Native -Exe $pyApp -Argumentos @('-m', 'pip', 'list', '--format=columns')
Write-Host 'OK: envs\app listo.' -ForegroundColor Green
