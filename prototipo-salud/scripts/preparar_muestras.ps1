<#
.SYNOPSIS
Copia las muestras oficiales de vendor\ a samples\ (si faltan) y verifica su sha256 contra samples\FUENTES.md.
.DESCRIPTION
Reconoce dos tipos de fila en FUENTES.md:
- origen `vendor/...`: se copia de vendor\ si falta en samples\ y se verifica el sha256. Si vendor\ no tiene el
  archivo de origen, indica correr scripts\clonar_repos.ps1.
- origen `physionet:...` (p. ej. `physionet:mitdb/1.0.0/100`): la muestra YA viene dentro de samples\ (no se copia de
  vendor ni se descarga); si existe se verifica su sha256 y si falta se indica volver a copiar la carpeta samples.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$fuentes = Join-Path $Root (Join-Path 'samples' 'FUENTES.md')
if (-not (Test-Path -LiteralPath $fuentes)) { throw ('Falta ' + $fuentes) }

# Filas: | `archivo` | `vendor/ruta` o `physionet:ruta` (url, commit ...) | ... | sha256 |
$filas = @()
foreach ($linea in (Read-TextoUtf8 $fuentes) -split "`r?`n") {
    if ($linea -match '^\|\s*`([^`]+)`\s*\|\s*`((?:vendor/|physionet:)[^`]+)`.*\|\s*([0-9a-fA-F]{64})\s*\|\s*$') {
        $filas += [pscustomobject]@{ Archivo = $Matches[1]; Origen = $Matches[2]; Sha256 = $Matches[3].ToLower() }
    }
}
if ($filas.Count -eq 0) { throw 'No pude leer ninguna muestra de FUENTES.md (formato de tabla inesperado).' }

$vendorOk = Test-Path -LiteralPath (Join-Path $Root 'vendor')
$res = @()
foreach ($f in $filas) {
    $dest = Join-Path (Join-Path $Root 'samples') $f.Archivo
    $esPhysionet = $f.Origen.StartsWith('physionet:')
    $est = ''
    if (-not (Test-Path -LiteralPath $dest)) {
        if ($esPhysionet) {
            $est = 'FALTA (viene incluida en la entrega: vuelve a copiar la carpeta samples)'
            Write-Host ('FALTA: ' + $f.Archivo + ' (' + $f.Origen + ') viene incluida en la entrega; vuelve a copiar la carpeta samples.') -ForegroundColor Yellow
        } elseif (Test-Path -LiteralPath (Resolve-RutaManifest $f.Origen)) {
            $orig = Resolve-RutaManifest $f.Origen
            Copy-Item -LiteralPath $orig -Destination $dest
            Write-Host ('Copiado: ' + $f.Origen + ' -> samples\' + $f.Archivo)
        } else {
            $est = 'FALTA (no esta en vendor\; ejecuta scripts\clonar_repos.ps1)'
            Write-Host ('FALTA: ' + $f.Archivo + ' - ' + $f.Origen + ' no existe. Ejecuta scripts\clonar_repos.ps1') -ForegroundColor Yellow
        }
    }
    if ($est -eq '') {
        $sha = Get-Sha256 $dest
        if ($sha -eq $f.Sha256) { $est = 'OK sha256' }
        else { $est = 'SHA256 NO COINCIDE (' + $sha.Substring(0, 12) + ' vs ' + $f.Sha256.Substring(0, 12) + ')'; Write-Host ('ERROR: ' + $f.Archivo + ' ' + $est) -ForegroundColor Red }
    }
    $res += [pscustomobject]@{ Archivo = $f.Archivo; Estado = $est }
}
if (-not $vendorOk -and @($filas | Where-Object { -not $_.Origen.StartsWith('physionet:') }).Count -gt 0) { Write-Aviso 'No existe la carpeta vendor\. Ejecuta scripts\clonar_repos.ps1' }
$res | Format-Table -AutoSize | Out-Host
if (@($res | Where-Object { $_.Estado -notlike 'OK*' }).Count -gt 0) { exit 1 }
