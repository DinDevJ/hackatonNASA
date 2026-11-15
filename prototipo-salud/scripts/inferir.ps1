<#
.SYNOPSIS
Ejecuta un modelo sobre una o varias entradas mediante el runner de la app (python -m core.run_model).
.DESCRIPTION
Llama envs\app\Scripts\python.exe -m core.run_model desde la raiz del proyecto y propaga el codigo de salida
(0 ok, 2 rechazado, 1 error). Con -PruebaCarga agrega options.prueba_carga_dummy=true (NO es inferencia real).
Banderas CLI asumidas de core.run_model: --model --input --subject --study --timestamp --modality --view --options
.PARAMETER Fs
Frecuencia de muestreo en Hz para entradas CSV/TXT/TSV de ECG (modelo ecg). 0 (por defecto) = no se envia. Si es
mayor que 0 se fusiona en las opciones como "fs" (numero JSON con punto decimal). Si ademas OpcionesJson ya trae "fs"
y difiere, se aborta con error. Un registro WFDB no la necesita: la toma del .hea.
.PARAMETER Modalidad
video_2d | imagen_2d | volumen_3d | doppler_color | doppler_espectral | ecg_1d | desconocida. Por defecto video_2d; si
el modelo es ecg y no se pasa -Modalidad, se usa ecg_1d (se avisa).
.NOTES
ECG (modelo ecg, sin torch ni pesos): para un registro WFDB basta pasar el archivo .hea; el runner copia a la corrida
los companeros del mismo nombre (.dat, .atr, .qrs). Para CSV/TXT/TSV hay que pasar -Modalidad ecg_1d (implicita con
-Modelo ecg) y -Fs. Todo es experimental; la bandera de ritmo irregular NO es un diagnostico.
Con varias entradas se emite --input antes de CADA ruta (core.run_model usa action="append").
.EXAMPLE
.\scripts\inferir.ps1 -Modelo panecho -Entrada samples\echoclip_example_video.avi -Sujeto S1 -Vista A4C
.EXAMPLE
.\scripts\inferir.ps1 -Modelo ecg -Entrada samples\ecg_normal_mitdb100.hea -Sujeto MUESTRA-ecg_normal_mitdb100 -Estudio ecg_normal_mitdb100 -Modalidad ecg_1d
.EXAMPLE
.\scripts\inferir.ps1 -Modelo ecg -Entrada datos\mi_ecg.csv -Sujeto S1 -Modalidad ecg_1d -Fs 360
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg')]
    [string]$Modelo,
    [Parameter(Mandatory=$true)][string[]]$Entrada,
    [Parameter(Mandatory=$true)][string]$Sujeto,
    [string]$Estudio = '',
    [string]$Timestamp = '',
    [ValidateSet('video_2d', 'imagen_2d', 'volumen_3d', 'doppler_color', 'doppler_espectral', 'ecg_1d', 'desconocida')]
    [string]$Modalidad = 'video_2d',
    [string]$Vista = 'desconocida',
    [string]$OpcionesJson = '{}',
    [ValidateRange(0, 1000000)][double]$Fs = 0,
    [switch]$PruebaCarga
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$pyApp = Join-Path $Root (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'python.exe')))
if (-not (Test-Path -LiteralPath $pyApp)) {
    throw 'Falta envs\app. Ejecuta primero scripts\instalar_app.ps1'
}

if ($Modelo -eq 'ecg' -and -not $PSBoundParameters.ContainsKey('Modalidad')) {
    $Modalidad = 'ecg_1d'
    Write-Host 'Modelo ecg sin -Modalidad: se usa ecg_1d.'
}

# Opciones: validar JSON y, si aplica, agregar prueba_carga_dummy
try { $op = $OpcionesJson | ConvertFrom-Json } catch { throw ('OpcionesJson no es JSON valido: ' + $_.Exception.Message) }
if ($null -eq $op) { $op = [pscustomobject]@{} }
if ($PruebaCarga) {
    if ($null -ne $op.PSObject.Properties['prueba_carga_dummy']) { $op.prueba_carga_dummy = $true }
    else { $op | Add-Member -NotePropertyName 'prueba_carga_dummy' -NotePropertyValue $true }
    Write-Aviso 'Prueba de carga con tensor aleatorio: NO es inferencia real.'
}
$opTxt = Merge-OpcionFs -Opciones $op -Fs $Fs

$argv = @('-m', 'core.run_model', '--model', $Modelo)
foreach ($e in $Entrada) {
    # core.run_model declara --input con action="append": una bandera --input por CADA ruta.
    # powershell -File no convierte "a,b" en arreglo: separar por coma solo si la ruta literal no existe
    if (($e -like '*,*') -and -not (Test-Path -LiteralPath $e)) { foreach ($x in ($e -split ',')) { if ($x.Trim() -ne '') { $argv += @('--input', $x.Trim()) } } }
    else { $argv += @('--input', $e) }
}
$argv += @('--subject', $Sujeto, '--modality', $Modalidad, '--view', $Vista)
if ($Estudio -ne '') { $argv += @('--study', $Estudio) }
if ($Timestamp -ne '') { $argv += @('--timestamp', $Timestamp) }
$argv += @('--options', (ConvertTo-ArgNativo $opTxt))

Push-Location $Root
try {
    $global:LASTEXITCODE = 0
    & $pyApp @argv
    $codigo = $LASTEXITCODE
} finally {
    Pop-Location
}
switch ($codigo) {
    0 { Write-Host 'Resultado: ok' -ForegroundColor Green }
    2 { Write-Host 'Resultado: RECHAZADO (modalidad/vista no admitida; ver mensaje arriba)' -ForegroundColor Yellow }
    default { Write-Host ('Resultado: ERROR (codigo ' + $codigo + ')') -ForegroundColor Red }
}
exit $codigo
