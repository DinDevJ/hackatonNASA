<#
.SYNOPSIS
Descarga los pesos PUBLICOS de un modelo (o de todos) segun adapters\<modelo>\manifest.json.
.DESCRIPTION
- pesos[] vacio (p. ej. ecg): Estado 'no_requiere', no descarga ni crea carpetas, codigo de salida 0.
- acceso == "publico": descarga a pesos[].archivo, verifica tamano/sha256 si se conocen, descomprime si
  hay descomprimir_en y escribe weights\<modelo>\FUENTE.json.
- acceso != "publico" (gated/registro): NO descarga. Imprime pasos_manuales y escribe weights\<modelo>\BLOQUEADO.txt.
Nunca pide ni imprime tokens. Muestra el tamano total y pide confirmacion salvo -Si.
.PARAMETER Modelo
panecho | echonet_dynamic | medsam2 | echoprime | echoclip | ecg | todos
.PARAMETER Si
No pedir confirmacion.
.PARAMETER SoloMostrar
Solo muestra que se descargaria y que esta bloqueado (no descarga ni escribe nada).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg', 'todos')]
    [string]$Modelo,
    [switch]$Si,
    [switch]$SoloMostrar
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

function Format-Tamano {
    param([double]$Bytes)
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    return ('{0:N0} bytes' -f $Bytes)
}

$claves = @()
if ($Modelo -eq 'todos') { $claves = Get-ClavesModelo } else { $claves = @($Modelo) }

# Cargar manifests (los que existan)
$manifs = @{}
foreach ($k in $claves) {
    try { $manifs[$k] = Get-Manifest $k }
    catch {
        if ($Modelo -eq 'todos') { Write-Aviso ($k + ': ' + $_.Exception.Message) }
        else { throw }
    }
}

# Plan: tamano total de lo publico que falta
$total = [double]0
$desconocido = $false
foreach ($k in $manifs.Keys) {
    foreach ($p in @(Get-Prop $manifs[$k] 'pesos' @())) {
        if ((Get-Prop $p 'acceso' 'desconocido') -ne 'publico') { continue }
        $dest = Resolve-RutaManifest ([string](Get-Prop $p 'archivo' ''))
        if (Test-Path -LiteralPath $dest -PathType Leaf) { continue }
        $t = [int64](Get-Prop $p 'tamano_bytes' 0)
        if ($t -gt 0) { $total += $t } else { $desconocido = $true }
    }
}
Write-Paso 'Plan de descarga'
$txt = 'Tamano total a descargar (pesos publicos que faltan): ' + (Format-Tamano $total)
if ($desconocido) { $txt += ' (+ archivos de tamano desconocido)' }
Write-Host $txt
if ($SoloMostrar) { Write-Host 'Modo -SoloMostrar: no se descarga nada.' }
elseif ($total -gt 0 -or $desconocido) {
    if (-not $Si) {
        $r = Read-Host 'Descargar ahora? (s/N)'
        if ($r -notmatch '^(s|si|y|yes)$') { Write-Host 'Cancelado por el usuario.'; return }
    }
}

$resultados = @()
foreach ($k in $claves) {
    if (-not $manifs.ContainsKey($k)) {
        $resultados += [pscustomobject]@{ Modelo = $k; Estado = 'error'; Detalle = 'sin manifest' }
        continue
    }
    $m = $manifs[$k]
    $pesos = @(Get-Prop $m 'pesos' @())
    $dirW = Join-Path (Join-Path $Root 'weights') $k
    Write-Paso ('Pesos de ' + $k)
    if ($pesos.Count -eq 0) {
        Write-Host 'El modelo no usa pesos (manifest con pesos[] vacio); no se crea weights\<modelo>.'
        $resultados += [pscustomobject]@{ Modelo = $k; Estado = 'no_requiere'; Detalle = 'el modelo no usa pesos' }
        continue
    }
    $fuentes = @()
    $bloqueos = @()
    $errores = @()
    foreach ($p in $pesos) {
        $archivo = [string](Get-Prop $p 'archivo' '')
        $acceso = [string](Get-Prop $p 'acceso' 'desconocido')
        $url = [string](Get-Prop $p 'url' '')
        $lic = Get-Prop $p 'licencia' $null
        if ($acceso -ne 'publico') {
            $pasos = Get-Prop $p 'pasos_manuales' '(el manifest no trae pasos manuales; consulta la pagina del modelo)'
            Write-Host ('BLOQUEADO: requiere aceptar terminos/registro; hazlo tu manualmente si corresponde. (' + $archivo + ', acceso=' + $acceso + ')') -ForegroundColor Yellow
            Write-Host 'Pasos manuales:'
            foreach ($linea in @($pasos)) { Write-Host ('  ' + $linea) }
            $bloqueos += [pscustomobject]@{ archivo = $archivo; acceso = $acceso; url = $url; licencia = $lic; pasos = @($pasos) }
            continue
        }
        if ($SoloMostrar) { Write-Host ('(solo mostrar) se descargaria ' + $url + ' -> ' + $archivo); continue }
        try {
            $dest = Resolve-RutaManifest $archivo
            $tamEsp = Get-Prop $p 'tamano_bytes' 0
            $shaEsp = Get-Prop $p 'sha256' $null
            $existe = Test-Path -LiteralPath $dest -PathType Leaf
            $ok = $false
            if ($existe) {
                $it = Get-Item -LiteralPath $dest
                $tOk = ([int64]$tamEsp -le 0) -or ($it.Length -eq [int64]$tamEsp)
                $hOk = $true
                $shaAct = Get-Sha256 $dest
                if ($shaEsp) { $hOk = ($shaAct -eq ([string]$shaEsp).ToLower()) }
                if ($tOk -and $hOk) { Write-Host ('Ya existe y coincide: ' + $archivo); $ok = $true; $res = [pscustomobject]@{ Ruta = $dest; Tamano = $it.Length; Sha256 = $shaAct } }
                else { Write-Aviso ('Existe pero no coincide; se reintenta la descarga/reanudacion: ' + $archivo) }
            }
            if (-not $ok) {
                if (-not $url) { throw 'El manifest no trae url para un peso publico.' }
                Write-Host ('Descargando ' + $url)
                $res = Get-FileFromUrl -Url $url -Destino $dest -TamanoEsperado $tamEsp -Sha256Esperado $shaEsp
            }
            $descEn = Get-Prop $p 'descomprimir_en' $null
            if ($descEn) {
                $dd = Resolve-RutaManifest ([string]$descEn)
                if (-not (Test-Path -LiteralPath $dd)) { New-Item -ItemType Directory -Force -Path $dd | Out-Null }
                Write-Host ('Descomprimiendo en ' + $descEn)
                if ($dest -match '\.zip$') { Expand-Archive -LiteralPath $dest -DestinationPath $dd -Force }
                else { Invoke-Native -Exe 'tar' -Argumentos @('-xf', $dest, '-C', $dd) }
            }
            $fuentes += [pscustomobject]@{
                archivo = $archivo; url = $url; fecha_descarga = (Get-Date).ToString('s')
                tamano_bytes = $res.Tamano; sha256 = $res.Sha256; licencia = $lic
                sha256_verificado_contra_manifest = [bool]$shaEsp
                descomprimido_en = $descEn
            }
        } catch {
            Write-Host ('ERROR en ' + $archivo + ': ' + $_.Exception.Message) -ForegroundColor Red
            $errores += ($archivo + ': ' + $_.Exception.Message)
        }
    }
    if ($SoloMostrar) {
        $resultados += [pscustomobject]@{ Modelo = $k; Estado = 'solo_mostrar'; Detalle = ('bloqueados=' + $bloqueos.Count) }
        continue
    }
    if ($fuentes.Count -gt 0) {
        Write-TextoUtf8 (Join-Path $dirW 'FUENTE.json') (([pscustomobject]@{ modelo = $k; archivos = $fuentes }) | ConvertTo-Json -Depth 6)
    }
    if ($bloqueos.Count -gt 0) {
        $l = @('BLOQUEADO: este modelo requiere aceptar terminos o registro. El prototipo NO lo hace por ti.',
               'Hazlo tu manualmente solo si corresponde y colocas el archivo en la ruta indicada.', '')
        foreach ($b in $bloqueos) {
            $l += ('Archivo esperado: ' + $b.archivo)
            $l += ('Acceso: ' + $b.acceso)
            $l += ('URL: ' + $b.url)
            $l += ('Licencia: ' + $b.licencia)
            $l += 'Pasos manuales:'
            foreach ($s in $b.pasos) { $l += ('  ' + $s) }
            $l += ''
        }
        Write-TextoUtf8 (Join-Path $dirW 'BLOQUEADO.txt') (($l -join "`r`n") + "`r`n")
    }
    if ($errores.Count -gt 0) { $est = 'error'; $det = ($errores -join ' | ') }
    elseif ($bloqueos.Count -gt 0) { $est = 'bloqueado'; $det = 'requiere aceptar terminos/registro (ver weights\' + $k + '\BLOQUEADO.txt)' }
    else { $est = 'ok'; $det = ('' + $fuentes.Count + ' archivo(s)') }
    $resultados += [pscustomobject]@{ Modelo = $k; Estado = $est; Detalle = $det }
}

Write-Paso 'Resumen de pesos'
$resultados
if (@($resultados | Where-Object { $_.Estado -eq 'error' }).Count -gt 0) { exit 1 }
