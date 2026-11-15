<#
.SYNOPSIS
Instala la app, los entornos de los modelos y descarga los pesos publicos; continua si un modelo falla.
.PARAMETER Modelos
Lista de modelos (por defecto los seis; ecg no usa torch ni pesos).
.PARAMETER SinPesos
No descarga pesos.
.PARAMETER Si
Pasa -Si a descargar_pesos (sin confirmacion).
#>
[CmdletBinding()]
param(
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg')]
    [string[]]$Modelos = @('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg'),
    [switch]$SinPesos,
    [switch]$Si
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$inicio = Get-Date
$appOk = $true
try {
    & (Join-Path $PSScriptRoot 'instalar_app.ps1')
} catch {
    $appOk = $false
    Write-Host ('ERROR instalar_app: ' + $_.Exception.Message) -ForegroundColor Red
}

$filas = @()
foreach ($k in $Modelos) {
    $fe = ''; $fp = ''
    if (-not $appOk -and -not (Test-Path -LiteralPath (Join-Path $Root (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'uv.exe')))))) {
        $fe = 'omitido: falta envs\app/uv'
    } else {
        try {
            $r = & (Join-Path $PSScriptRoot 'instalar_modelo.ps1') -Modelo $k
            $ult = @($r) | Select-Object -Last 1
            $fe = 'ok'
            if ($null -ne $ult -and (Get-Prop $ult 'UsaTorch' $true) -eq $false) { $fe = 'ok (sin torch)' }
            elseif ($null -ne $ult -and (Get-Prop $ult 'CUDA' $true) -eq $false) { $fe = 'ok, SIN CUDA' }
        } catch {
            $fe = 'ERROR: ' + $_.Exception.Message
            Write-Host ('ERROR ' + $k + ': ' + $_.Exception.Message) -ForegroundColor Red
        }
    }
    if ($SinPesos) { $fp = 'omitido (-SinPesos)' }
    else {
        try {
            if ($Si) { $rp = & (Join-Path $PSScriptRoot 'descargar_pesos.ps1') -Modelo $k -Si }
            else { $rp = & (Join-Path $PSScriptRoot 'descargar_pesos.ps1') -Modelo $k }
            $up = @($rp) | Where-Object { $null -ne $_ -and $null -ne $_.PSObject.Properties['Estado'] } | Select-Object -Last 1
            if ($null -eq $up) { $fp = 'sin resultado (cancelado?)' }
            else { $fp = [string]$up.Estado + ': ' + [string]$up.Detalle }
        } catch {
            $fp = 'ERROR: ' + $_.Exception.Message
            Write-Host ('ERROR pesos ' + $k + ': ' + $_.Exception.Message) -ForegroundColor Red
        }
    }
    $est = 'listo'
    if ($fe -notlike 'ok*') { $est = 'NO LISTO (entorno)' }
    elseif ($fp -like 'bloqueado*') { $est = 'BLOQUEADO (pesos)' }
    elseif ($fp -like 'ERROR*' -or $fp -like 'error*') { $est = 'NO LISTO (pesos)' }
    elseif ($fp -like 'no_requiere*') { $est = 'listo' }
    elseif ($fp -like 'omitido*' -or $fp -like 'sin_pesos*' -or $fp -like 'sin resultado*') { $est = 'sin pesos aun' }
    $filas += [pscustomobject]@{ Modelo = $k; Entorno = $fe; Pesos = $fp; Estado = $est }
}

Write-Paso ('Resumen (' + [int]((Get-Date) - $inicio).TotalMinutes + ' min)')
$filas | Format-Table -AutoSize -Wrap | Out-Host
