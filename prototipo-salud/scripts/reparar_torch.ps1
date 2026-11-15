<#
.SYNOPSIS
Repara un entorno ya instalado: reinstala torch/torchvision cu124 (con uv y overrides) y verifica CUDA.
.DESCRIPTION
Usa envs\app\Scripts\uv.exe y el python de envs\<modelo>. No toca el resto de paquetes ni los pesos.
Los modelos sin torch (ecg) se omiten con un mensaje y no cuentan como fallo.
Sale con codigo 1 si despues de reinstalar torch no es la build cu124 con CUDA disponible.
.PARAMETER Modelo
panecho | echonet_dynamic | medsam2 | echoprime | echoclip | ecg | todos
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg', 'todos')]
    [string]$Modelo
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_comun.ps1')

$claves = @($Modelo)
if ($Modelo -eq 'todos') { $claves = @(Get-ClavesModelo) }
$fallos = 0
foreach ($k in $claves) {
    try {
        if (-not (Test-ModeloUsaTorch $k)) {
            Write-Host ($k + ': no usa torch, se omite') -ForegroundColor Yellow
            continue
        }
        $info = Repair-TorchCuda $k
        $marca = Join-Path (Resolve-RutaManifest ('envs/' + $k)) '.instalado.json'
        if (Test-Path -LiteralPath $marca) {
            $meta = @{ modelo = $k; fecha = (Get-Date).ToString('s'); torch = $info.torch; cuda_build = $info.cuda_build; cuda_disponible = $info.cuda_disponible; reparado = $true }
            Write-TextoUtf8 $marca ($meta | ConvertTo-Json -Compress)
        }
        Write-Host ('OK ' + $k + ': ' + $info.torch + ' CUDA=' + $info.cuda_disponible) -ForegroundColor Green
    } catch {
        $fallos++
        Write-Host ('ERROR ' + $k + ': ' + $_.Exception.Message) -ForegroundColor Red
    }
}
if ($fallos -gt 0) { exit 1 }
