<#
.SYNOPSIS
Crea envs\<modelo> (Python 3.11 con uv), instala torch cu124 y el lock de Windows del adaptador, reinstala torch cu124 y verifica CUDA (error si no es cu124 con CUDA).
.DESCRIPTION
Datos-dirigido por adapters\<modelo>\manifest.json (seccion env). Requiere haber corrido instalar_app.ps1.
Modelos SIN torch (p. ej. ecg: manifest.env sin torch/torchvision/torch_index_url): se omiten la instalacion y la
reparacion de torch; el lock se instala con --no-deps y el entorno se verifica importando env.verificar_import.
Idempotente: si el entorno ya esta instalado (marca envs\<modelo>\.instalado.json) solo verifica.
.PARAMETER Modelo
panecho | echonet_dynamic | medsam2 | echoprime | echoclip | ecg
.PARAMETER Forzar
Borra y recrea envs\<modelo>.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg')]
    [string]$Modelo,
    [switch]$Forzar
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$m = Get-Manifest $Modelo
$envM = Get-Prop $m 'env'
if ($null -eq $envM) { throw ('El manifest de ' + $Modelo + ' no tiene seccion env.') }

$dirRel = Get-Prop $envM 'dir' ('envs/' + $Modelo)
$envDir = Resolve-RutaManifest $dirRel
$pyVer = [string](Get-Prop $envM 'python' '3.11')
$torchV = Get-Prop $envM 'torch' $null
$tvV = Get-Prop $envM 'torchvision' $null
$idx = Get-Prop $envM 'torch_index_url' $null
$lockRel = Get-Prop $envM 'lock_windows' $null
$instVars = Get-Prop $envM 'install_vars' $null
$editables = @(Get-Prop $envM 'editable' @())
$pyEnv = Join-Path $envDir (Join-Path 'Scripts' 'python.exe')
$marca = Join-Path $envDir '.instalado.json'
$usaTorch = Test-ModeloUsaTorch $m
$modulosVerif = @(Get-Prop $envM 'verificar_import' @() | ForEach-Object { [string]$_ })

$uv = Join-Path $Root (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'uv.exe')))
$tieneUv = Test-Path -LiteralPath $uv

if ($Forzar -and (Test-Path -LiteralPath $envDir)) {
    Write-Paso ('Eliminando ' + $dirRel + ' (-Forzar)')
    Remove-Item -LiteralPath $envDir -Recurse -Force
}

if ((Test-Path -LiteralPath $marca) -and (Test-Path -LiteralPath $pyEnv)) {
    Write-Paso ('Entorno ' + $Modelo + ' ya instalado (usa -Forzar para recrear). Solo verifico.')
    if (-not $usaTorch) {
        $vers = Test-ImportsEnv -Py $pyEnv -Modulos $modulosVerif
        Write-Host ('Imports verificados: ' + (($vers.PSObject.Properties | ForEach-Object { $_.Name + '=' + $_.Value }) -join ', '))
        return [pscustomobject]@{ Modelo = $Modelo; Estado = 'ok'; Detalle = 'ya instalado (sin torch)'; CUDA = $null; UsaTorch = $false }
    }
    $info = Test-TorchCuda $pyEnv
    Show-TorchCuda $info
    if (-not (Test-TorchOk $info)) {
        Write-Aviso 'torch no es cu124 con CUDA disponible: se repara (reinstalacion de torch/torchvision cu124).'
        $info = Repair-TorchCuda $Modelo
    }
    return [pscustomobject]@{ Modelo = $Modelo; Estado = 'ok'; Detalle = 'ya instalado'; CUDA = $info.cuda_disponible }
}

# 1) Crear venv
if (-not (Test-Path -LiteralPath $pyEnv)) {
    Write-Paso ('Creando ' + $dirRel + ' con Python ' + $pyVer)
    $creado = $false
    if ($tieneUv) {
        try {
            Invoke-Native -Exe $uv -Argumentos @('venv', '--python', $pyVer, $envDir)
            $creado = $true
        } catch {
            Write-Aviso ('uv venv fallo: ' + $_.Exception.Message + ' ; intento con py -' + $pyVer + ' -m venv')
        }
    } else {
        Write-Aviso 'No existe envs\app\Scripts\uv.exe (corre instalar_app.ps1). Intento con py launcher.'
    }
    if (-not $creado) {
        if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
            throw ('No se pudo crear el entorno: uv fallo/no esta y no existe el launcher "py". Instala Python ' + $pyVer + ' o corre instalar_app.ps1.')
        }
        if (Test-Path -LiteralPath $envDir) { Remove-Item -LiteralPath $envDir -Recurse -Force }
        Invoke-Native -Exe 'py' -Argumentos @(('-' + $pyVer), '-m', 'venv', $envDir)
    }
}
if (-not (Test-Path -LiteralPath $pyEnv)) { throw ('No existe ' + $pyEnv + ' tras crear el entorno.') }

# Instalador: uv si existe; si no, pip
function Install-Pip {
    param([string[]]$Args2)
    if ($tieneUv) {
        Invoke-Native -Exe $uv -Argumentos (@('pip', 'install', '--python', $pyEnv) + $Args2)
    } else {
        Invoke-Native -Exe $pyEnv -Argumentos (@('-m', 'pip', 'install') + $Args2)
    }
}

# Variables de entorno temporales (install_vars)
$guardadas = @{}
if ($null -ne $instVars) {
    foreach ($p in $instVars.PSObject.Properties) {
        $guardadas[$p.Name] = [System.Environment]::GetEnvironmentVariable($p.Name, 'Process')
        [System.Environment]::SetEnvironmentVariable($p.Name, [string]$p.Value, 'Process')
        Write-Host ('Variable temporal: ' + $p.Name + '=' + $p.Value)
    }
}
try {
    # 2) torch + torchvision
    if (-not $usaTorch) {
        Write-Host 'Modelo sin torch (CPU, sin pesos): se omite el paso de torch.'
    } elseif ($torchV -and $tvV -and $idx) {
        Write-Paso ('Instalando torch==' + $torchV + ' torchvision==' + $tvV + ' desde ' + $idx)
        try {
            Install-Pip @(('torch==' + $torchV), ('torchvision==' + $tvV), '--index-url', $idx, '--override', (Join-Path $PSScriptRoot 'torch-cu124-overrides.txt'))
        } catch {
            Write-Aviso 'Fallo con solo el indice de PyTorch; reintento con PyPI como indice extra.'
            if ($tieneUv) {
                Install-Pip @(('torch==' + $torchV), ('torchvision==' + $tvV), '--index-url', $idx, '--extra-index-url', 'https://pypi.org/simple', '--index-strategy', 'unsafe-best-match')
            } else {
                Install-Pip @(('torch==' + $torchV), ('torchvision==' + $tvV), '--index-url', $idx, '--extra-index-url', 'https://pypi.org/simple')
            }
        }
    } else {
        Write-Aviso 'El manifest no define torch/torchvision/torch_index_url; se omite el paso de torch.'
    }

    # 3) lock de Windows (sin torch)
    if ($lockRel) {
        $lock = Resolve-RutaManifest $lockRel
        if (-not (Test-Path -LiteralPath $lock)) { throw ('Falta el lock: ' + $lock) }
        Write-Paso ('Instalando ' + $lockRel)
        # --no-deps: el lock ya trae TODAS las dependencias resueltas (menos torch/torchvision); asi nada re-resuelve torch.
        if ($usaTorch) {
            Install-Pip @('-r', $lock, '--no-deps', '--override', (Join-Path $PSScriptRoot 'torch-cu124-overrides.txt'))
        } else {
            Install-Pip @('-r', $lock, '--no-deps')
        }
    } else {
        Write-Aviso 'El manifest no define env.lock_windows.'
    }

    # 4) editables
    if ($editables.Count -gt 0) {
        Write-Paso 'Instalando paquetes editables (--no-deps --no-build-isolation)'
        Install-Pip @('setuptools', 'wheel')   # necesarios porque no hay build isolation
        foreach ($e in $editables) {
            $rutaE = Resolve-RutaManifest ([string]$e)
            if (-not (Test-Path -LiteralPath $rutaE)) { throw ('Ruta editable inexistente (corre clonar_repos.ps1): ' + $rutaE) }
            Install-Pip @('--no-deps', '--no-build-isolation', '-e', $rutaE)
        }
    }
} finally {
    foreach ($k in $guardadas.Keys) {
        [System.Environment]::SetEnvironmentVariable($k, $guardadas[$k], 'Process')
    }
}

# 5) torch cu124: reinstalacion forzada + verificacion (lanza error si no es cu124 con CUDA disponible)
$info = $null
$vers = $null
if ($usaTorch) {
    $info = Repair-TorchCuda $Modelo
} else {
    Write-Paso 'Verificando imports del entorno (modelo sin torch)'
    $vers = Test-ImportsEnv -Py $pyEnv -Modulos $modulosVerif
    Write-Host ('Imports verificados: ' + (($vers.PSObject.Properties | ForEach-Object { $_.Name + '=' + $_.Value }) -join ', '))
}

# 6) freeze
Write-Paso 'Guardando requirements-freeze.txt'
if ($tieneUv) {
    $fr = Invoke-Native -Exe $uv -Argumentos @('pip', 'freeze', '--python', $pyEnv) -Capturar
} else {
    $fr = Invoke-Native -Exe $pyEnv -Argumentos @('-m', 'pip', 'freeze') -Capturar
}
Write-TextoUtf8 (Join-Path $envDir 'requirements-freeze.txt') ((@($fr) -join "`n") + "`n")

if ($usaTorch) {
    $meta = @{ modelo = $Modelo; fecha = (Get-Date).ToString('s'); torch = $info.torch; cuda_build = $info.cuda_build; cuda_disponible = $info.cuda_disponible }
    Write-TextoUtf8 $marca ($meta | ConvertTo-Json -Compress)
    Write-Host ('OK: entorno ' + $Modelo + ' listo (' + $info.torch + ', CUDA disponible).') -ForegroundColor Green
    return [pscustomobject]@{ Modelo = $Modelo; Estado = 'ok'; Detalle = 'instalado'; CUDA = $info.cuda_disponible }
}
$impDic = @{}
foreach ($pp in $vers.PSObject.Properties) { $impDic[$pp.Name] = [string]$pp.Value }
$meta = @{ modelo = $Modelo; fecha = (Get-Date).ToString('s'); torch = 'no aplica (modelo sin torch)'; imports = $impDic }
Write-TextoUtf8 $marca ($meta | ConvertTo-Json -Compress -Depth 4)
Write-Host ('OK: entorno ' + $Modelo + ' listo (sin torch; CPU).') -ForegroundColor Green
return [pscustomobject]@{ Modelo = $Modelo; Estado = 'ok'; Detalle = 'instalado (sin torch)'; CUDA = $null; UsaTorch = $false }
