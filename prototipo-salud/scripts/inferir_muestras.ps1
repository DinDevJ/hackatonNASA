<#
.SYNOPSIS
Corre las muestras oficiales (manifest.muestras[]) de cada modelo que tenga entorno y pesos.
.DESCRIPTION
Modalidad = muestra.modalidad o la primera de modalidades_admitidas (si no es valida, se omite).
Vista = muestra.vista, o "desconocida" (nunca se adivina). Sujeto = "MUESTRA-<nombre del archivo>" (una persona por muestra).
MedSAM2 requiere una caja inicial: se salta salvo que se pase -CajaMedSAM2 "x0,y0,x1,y1" (pixeles del frame original).
.PARAMETER Modelos
Lista de modelos (por defecto los seis). ecg no usa pesos (pesos[] vacio: nunca faltan) ni torch; sus muestras son registros WFDB (.hea).
.PARAMETER CajaMedSAM2
Caja inicial para MedSAM2, "x0,y0,x1,y1".
#>
[CmdletBinding()]
param(
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg')]
    [string[]]$Modelos = @('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg'),
    [string]$CajaMedSAM2 = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$inferir = Join-Path $PSScriptRoot 'inferir.ps1'
$validMod = @('video_2d', 'imagen_2d', 'volumen_3d', 'doppler_color', 'doppler_espectral', 'ecg_1d', 'desconocida')
$resumen = @()

foreach ($k in $Modelos) {
    Write-Paso ('Muestras de ' + $k)
    try {
        $m = Get-Manifest $k
    } catch {
        $resumen += [pscustomobject]@{ Modelo = $k; Muestra = '-'; Resultado = 'omitido'; Motivo = $_.Exception.Message }
        continue
    }
    $py = Get-EnvPython $k
    if (-not (Test-Path -LiteralPath $py)) {
        $resumen += [pscustomobject]@{ Modelo = $k; Muestra = '-'; Resultado = 'omitido'; Motivo = ('sin entorno (scripts\instalar_modelo.ps1 -Modelo ' + $k + ')') }
        continue
    }
    $faltan = @()
    foreach ($p in @(Get-Prop $m 'pesos' @())) {
        $a = [string](Get-Prop $p 'archivo' '')
        if ($a -and -not (Test-Path -LiteralPath (Resolve-RutaManifest $a))) { $faltan += $a }
    }
    if ($faltan.Count -gt 0) {
        $resumen += [pscustomobject]@{ Modelo = $k; Muestra = '-'; Resultado = 'omitido'; Motivo = ('faltan pesos: ' + ($faltan -join ', ')) }
        continue
    }
    $muestras = @(Get-Prop $m 'muestras' @())
    if ($muestras.Count -eq 0) {
        $resumen += [pscustomobject]@{ Modelo = $k; Muestra = '-'; Resultado = 'omitido'; Motivo = 'el manifest no declara muestras[]' }
        continue
    }
    $opciones = '{}'
    if (Get-Prop $m 'requiere_prompt' $false) {
        if ($k -eq 'medsam2' -and $CajaMedSAM2 -ne '') {
            if ($CajaMedSAM2 -notmatch '^\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*$') {
                throw 'CajaMedSAM2 debe tener formato "x0,y0,x1,y1" (numeros).'
            }
            $opciones = '{"caja":[' + (($CajaMedSAM2 -replace '\s', '')) + ']}'
        } else {
            $resumen += [pscustomobject]@{ Modelo = $k; Muestra = '-'; Resultado = 'omitido'; Motivo = 'requiere indicacion inicial (use -CajaMedSAM2 "x0,y0,x1,y1")' }
            Write-Host 'Se omite: este modelo requiere una indicacion inicial (caja); no se inventa una.' -ForegroundColor Yellow
            continue
        }
    }
    $mods = @(Get-Prop $m 'modalidades_admitidas' @('video_2d'))
    $vistas = @(Get-Prop $m 'vistas_admitidas' @())
    $esp = @($vistas | Where-Object { $_ -ne 'cualquiera' -and $_ -ne 'desconocida' })
    foreach ($s in $muestras) {
        $arch = [string](Get-Prop $s 'archivo' '')
        $ruta = Resolve-RutaManifest $arch
        if (-not (Test-Path -LiteralPath $ruta)) {
            $resumen += [pscustomobject]@{ Modelo = $k; Muestra = $arch; Resultado = 'omitido'; Motivo = 'muestra inexistente (scripts\preparar_muestras.ps1)' }
            continue
        }
        $mod = [string](Get-Prop $s 'modalidad' ([string]$mods[0]))
        if ($validMod -notcontains $mod) {
            $resumen += [pscustomobject]@{ Modelo = $k; Muestra = $arch; Resultado = 'omitido'; Motivo = ('modalidad de la muestra no valida: ' + $mod + ' (no se cambia en silencio)') }
            continue
        }
        # La vista NUNCA se adivina: si la muestra no la declara, se usa 'desconocida' (EchoNet-Dynamic la rechazara).
        $vista = [string](Get-Prop $s 'vista' '')
        if ($vista -eq '') { $vista = 'desconocida' }
        # Cada muestra es un sujeto distinto: no se mezclan personas de fuentes independientes.
        $stem = [System.IO.Path]::GetFileNameWithoutExtension($ruta)
        $sujeto = 'MUESTRA-' + $stem
        Write-Host ('Ejecutando ' + $k + ' sobre ' + $arch + ' (modalidad=' + $mod + ', vista=' + $vista + ')')
        try {
            $global:LASTEXITCODE = 0
            & $inferir -Modelo $k -Entrada $ruta -Sujeto $sujeto -Estudio $stem -Modalidad $mod -Vista $vista -OpcionesJson $opciones
            $cod = $LASTEXITCODE
        } catch {
            $cod = 1
            Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
        }
        $r = 'error'
        if ($cod -eq 0) { $r = 'ok' } elseif ($cod -eq 2) { $r = 'rechazado' }
        $resumen += [pscustomobject]@{ Modelo = $k; Muestra = $arch; Resultado = $r; Motivo = ('codigo ' + $cod) }
    }
}
Write-Paso 'Resumen de muestras'
$resumen | Format-Table -AutoSize | Out-Host
if (@($resumen | Where-Object { $_.Resultado -eq 'error' }).Count -gt 0) { exit 1 }
