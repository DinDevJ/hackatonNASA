<#
.SYNOPSIS
Funciones comunes de los scripts del prototipo (se carga con dot-source: . (Join-Path $PSScriptRoot '_comun.ps1')).
.DESCRIPTION
Compatible con Windows PowerShell 5.1 y pwsh 7. Solo ASCII.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Root {
    # Raiz del prototipo = carpeta padre de scripts\
    return (Split-Path -Parent $PSScriptRoot)
}

function Write-Paso {
    param([Parameter(Mandatory=$true)][string]$Mensaje)
    Write-Host ''
    Write-Host ('==> ' + $Mensaje) -ForegroundColor Cyan
}

function Write-Aviso {
    param([Parameter(Mandatory=$true)][string]$Mensaje)
    Write-Host ('AVISO: ' + $Mensaje) -ForegroundColor Yellow
}

function Get-Prop {
    # Lee una propiedad opcional de un PSCustomObject o hashtable sin fallar bajo StrictMode.
    param($Obj, [string]$Name, $Default = $null)
    if ($null -eq $Obj) { return $Default }
    if ($Obj -is [System.Collections.IDictionary]) {
        if ($Obj.Contains($Name)) { return $Obj[$Name] }
        return $Default
    }
    $p = $Obj.PSObject.Properties[$Name]
    if ($null -eq $p) { return $Default }
    if ($null -eq $p.Value) { return $Default }
    return $p.Value
}

function Read-TextoUtf8 {
    param([Parameter(Mandatory=$true)][string]$Ruta)
    return [System.IO.File]::ReadAllText($Ruta, [System.Text.Encoding]::UTF8)
}

function Write-TextoUtf8 {
    # UTF-8 SIN BOM (Set-Content -Encoding UTF8 en 5.1 agrega BOM y rompe json.load de Python)
    param([Parameter(Mandatory=$true)][string]$Ruta, [Parameter(Mandatory=$true)][string]$Texto)
    $dir = Split-Path -Parent $Ruta
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Ruta, $Texto, $enc)
}

function Get-Manifest {
    param([Parameter(Mandatory=$true)][string]$Key)
    $ruta = Join-Path (Get-Root) (Join-Path 'adapters' (Join-Path $Key 'manifest.json'))
    if (-not (Test-Path -LiteralPath $ruta)) {
        throw ('No existe el manifest del modelo ' + $Key + ': ' + $ruta)
    }
    try {
        return (Read-TextoUtf8 $ruta) | ConvertFrom-Json
    } catch {
        throw ('Manifest invalido (' + $ruta + '): ' + $_.Exception.Message)
    }
}

function Get-Manifests {
    # Devuelve todos los manifests encontrados en adapters\*\manifest.json
    $dirAd = Join-Path (Get-Root) 'adapters'
    $res = @()
    if (Test-Path -LiteralPath $dirAd) {
        foreach ($d in (Get-ChildItem -LiteralPath $dirAd -Directory | Sort-Object Name)) {
            $m = Join-Path $d.FullName 'manifest.json'
            if (Test-Path -LiteralPath $m) { $res += ,(Get-Manifest $d.Name) }
        }
    }
    return $res   # usar @(Get-Manifests) en el llamador
}

function Get-EnvPython {
    # Ruta del python de envs\<key>. Respeta PROTOTIPO_ENVS_DIR (usado en pruebas Linux).
    param([Parameter(Mandatory=$true)][string]$Key)
    $base = $null
    if ($env:PROTOTIPO_ENVS_DIR) { $base = Join-Path $env:PROTOTIPO_ENVS_DIR $Key }
    else { $base = Join-Path (Join-Path (Get-Root) 'envs') $Key }
    $win = Join-Path $base (Join-Path 'Scripts' 'python.exe')
    if (Test-Path -LiteralPath $win) { return $win }
    $nix = Join-Path $base (Join-Path 'bin' 'python')
    if (Test-Path -LiteralPath $nix) { return $nix }
    return $win   # ruta esperada (puede no existir todavia)
}

function ConvertTo-ArgNativo {
    # Windows PowerShell 5.1 y pwsh < 7.3 pierden las comillas dobles al pasar argumentos a ejecutables nativos.
    param([Parameter(Mandatory=$true)][AllowEmptyString()][string]$Texto)
    if ($PSVersionTable.PSVersion -lt [version]'7.3') {
        return ($Texto -replace '"', '\"')
    }
    return $Texto
}

function Invoke-Native {
    # Ejecuta un ejecutable nativo y lanza excepcion si el codigo de salida es distinto de 0.
    # -Capturar devuelve la salida estandar (stderr sigue a la consola; no se redirige).
    param(
        [Parameter(Mandatory=$true)][string]$Exe,
        [string[]]$Argumentos = @(),
        [switch]$Capturar
    )
    $global:LASTEXITCODE = 0
    if ($Capturar) {
        $salida = & $Exe @Argumentos
    } else {
        & $Exe @Argumentos | Out-Host
        $salida = $null
    }
    if ($LASTEXITCODE -ne 0) {
        throw ('Fallo (codigo ' + $LASTEXITCODE + '): ' + $Exe + ' ' + ($Argumentos -join ' '))
    }
    if ($Capturar) { return $salida }
}

function Get-Sha256 {
    param([Parameter(Mandatory=$true)][string]$Ruta)
    return (Get-FileHash -LiteralPath $Ruta -Algorithm SHA256).Hash.ToLower()
}

function Get-FileFromUrl {
    # Descarga con curl.exe (reanuda con -C -) o, si no esta, con Invoke-WebRequest.
    # Verifica tamano y sha256 si se conocen. Devuelve objeto con Ruta, Tamano, Sha256.
    param(
        [Parameter(Mandatory=$true)][string]$Url,
        [Parameter(Mandatory=$true)][string]$Destino,
        $TamanoEsperado = 0,
        $Sha256Esperado = $null
    )
    $dir = Split-Path -Parent $Destino
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

    $curl = Get-Command 'curl.exe' -CommandType Application -ErrorAction SilentlyContinue
    if ($curl) {
        $global:LASTEXITCODE = 0
        & $curl.Source -L --fail --retry 3 -C - -o $Destino $Url
        if ($LASTEXITCODE -ne 0) { throw ('curl.exe fallo (codigo ' + $LASTEXITCODE + ') al descargar ' + $Url) }
    } else {
        $prev = $ProgressPreference
        $ProgressPreference = 'SilentlyContinue'
        try {
            Invoke-WebRequest -Uri $Url -OutFile $Destino -UseBasicParsing
        } finally {
            $ProgressPreference = $prev
        }
    }
    if (-not (Test-Path -LiteralPath $Destino)) { throw ('No se creo el archivo ' + $Destino) }
    $tam = (Get-Item -LiteralPath $Destino).Length
    $esp = 0
    if ($null -ne $TamanoEsperado) { $esp = [int64]$TamanoEsperado }
    if ($esp -gt 0 -and $tam -ne $esp) {
        throw ('Tamano distinto al esperado en ' + $Destino + ': ' + $tam + ' bytes (esperado ' + $esp + ')')
    }
    $sha = Get-Sha256 $Destino
    if ($Sha256Esperado -and ($sha -ne ([string]$Sha256Esperado).ToLower())) {
        throw ('sha256 distinto al esperado en ' + $Destino + ': ' + $sha)
    }
    return [pscustomobject]@{ Ruta = $Destino; Tamano = $tam; Sha256 = $sha }
}

function Resolve-RutaManifest {
    # Convierte una ruta relativa del manifest (con /) en ruta absoluta bajo la raiz.
    param([Parameter(Mandatory=$true)][string]$Relativa)
    $r = $Relativa -replace '/', [System.IO.Path]::DirectorySeparatorChar
    return (Join-Path (Get-Root) $r)
}

function Get-ClavesModelo {
    return @('panecho', 'echonet_dynamic', 'medsam2', 'echoprime', 'echoclip', 'ecg')
}

function Test-ModeloUsaTorch {
    # $true solo si el manifest tiene env.torch Y env.torchvision Y env.torch_index_url no vacios.
    # Acepta la clave del modelo (string) o el objeto manifest ya leido.
    param([Parameter(Mandatory=$true)]$Modelo)
    $m = $Modelo
    if ($Modelo -is [string]) { $m = Get-Manifest $Modelo }
    $e = Get-Prop $m 'env'
    if ($null -eq $e) { return $false }
    foreach ($n in @('torch', 'torchvision', 'torch_index_url')) {
        $v = Get-Prop $e $n ''
        if ([string]::IsNullOrWhiteSpace([string]$v)) { return $false }
    }
    return $true
}

function Merge-OpcionFs {
    # Fusiona -Fs (Hz) en el objeto de opciones y devuelve el JSON compacto.
    # - Fs <= 0: no agrega nada. - fs ya presente e igual: se respeta. - fs presente y distinto: error.
    # El numero fs se escribe SIEMPRE con punto decimal (InvariantCulture), sin depender de ConvertTo-Json.
    param([Parameter(Mandatory=$true)]$Opciones, [double]$Fs = 0)
    $ic = [System.Globalization.CultureInfo]::InvariantCulture
    $marca = '__FS_NUM_PLACEHOLDER__'
    $txtFs = $null
    $pFs = $Opciones.PSObject.Properties['fs']
    if ($null -ne $pFs -and $null -ne $pFs.Value) {
        $v = 0.0
        if ($pFs.Value -is [string]) {
            if (-not [double]::TryParse([string]$pFs.Value, [System.Globalization.NumberStyles]::Float, $ic, [ref]$v)) {
                throw ('OpcionesJson: "fs" no es numerico: ' + $pFs.Value)
            }
        } else {
            try { $v = [double]$pFs.Value } catch { throw ('OpcionesJson: "fs" no es numerico: ' + $pFs.Value) }
        }
        if ($Fs -gt 0 -and [math]::Abs($v - $Fs) -gt 1e-9) {
            throw ('Conflicto de frecuencia de muestreo: -Fs ' + $Fs.ToString('R', $ic) + ' pero OpcionesJson trae "fs": ' + $v.ToString('R', $ic) + '. Usa solo una de las dos o que coincidan.')
        }
        $num = $v
    } elseif ($Fs -gt 0) {
        $num = $Fs
        $Opciones | Add-Member -NotePropertyName 'fs' -NotePropertyValue $marca
    } else {
        return (ConvertTo-Json -InputObject $Opciones -Compress -Depth 8)
    }
    if ($num -eq [math]::Floor($num) -and [math]::Abs($num) -lt 1e15) { $txtFs = ([int64]$num).ToString($ic) }
    else { $txtFs = $num.ToString('R', $ic) }
    $Opciones.fs = $marca
    $json = ConvertTo-Json -InputObject $Opciones -Compress -Depth 8
    return $json.Replace('"' + $marca + '"', $txtFs)
}

# ---------------------------------------------------------------------------------------------
# torch cu124: verificacion y (re)instalacion garantizada
# ---------------------------------------------------------------------------------------------
function Get-OverridesTorch {
    return (Join-Path $PSScriptRoot 'torch-cu124-overrides.txt')
}

function Get-UvApp {
    return (Join-Path (Get-Root) (Join-Path 'envs' (Join-Path 'app' (Join-Path 'Scripts' 'uv.exe'))))
}

function Test-TorchCuda {
    # Devuelve objeto con torch, cuda_build, cuda_disponible, gpu, vram_total_gb. Si torch no importa: torch='NO IMPORTABLE'.
    param([Parameter(Mandatory=$true)][string]$Py)
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('chk_torch_' + [guid]::NewGuid().ToString('N') + '.py')
    $codigo = @'
import json
try:
    import torch
    d = {'torch': torch.__version__, 'cuda_build': torch.version.cuda, 'cuda_disponible': bool(torch.cuda.is_available()),
         'gpu': None, 'vram_total_gb': None}
    if d['cuda_disponible']:
        p = torch.cuda.get_device_properties(0)
        d['gpu'] = p.name
        d['vram_total_gb'] = round(p.total_memory / 1024**3, 2)
except Exception as e:
    d = {'torch': 'NO IMPORTABLE: ' + repr(e), 'cuda_build': None, 'cuda_disponible': False, 'gpu': None, 'vram_total_gb': None}
print(json.dumps(d))
'@
    [System.IO.File]::WriteAllText($tmp, $codigo, (New-Object System.Text.UTF8Encoding($false)))
    try {
        $out = Invoke-Native -Exe $Py -Argumentos @($tmp) -Capturar
        $linea = @($out | Where-Object { $_ -match '^\s*\{' }) | Select-Object -Last 1
        return ($linea | ConvertFrom-Json)
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

function Show-TorchCuda {
    param($Info)
    Write-Host ('torch.__version__       : ' + $Info.torch)
    Write-Host ('torch.version.cuda      : ' + $Info.cuda_build)
    Write-Host ('torch.cuda.is_available : ' + $Info.cuda_disponible)
    if ($Info.cuda_disponible) {
        Write-Host ('GPU                     : ' + $Info.gpu)
        Write-Host ('VRAM total (GB)         : ' + $Info.vram_total_gb)
    }
}

function Test-TorchOk {
    # True solo si la version contiene cu124 Y cuda esta disponible.
    param($Info)
    return (([string]$Info.torch).Contains('cu124') -and ($Info.cuda_disponible -eq $true))
}

function Test-ImportsEnv {
    # Importa cada modulo con el python indicado. Devuelve objeto {modulo = version}; lanza excepcion si alguno falla.
    # Sin modulos: solo informa la version de Python.
    param([Parameter(Mandatory=$true)][string]$Py, [string[]]$Modulos = @())
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('chk_imports_' + [guid]::NewGuid().ToString('N') + '.py')
    $codigo = @'
import sys, json, importlib
d = {}
if len(sys.argv) < 2:
    d['python'] = sys.version.split()[0]
for n in sys.argv[1:]:
    try:
        mod = importlib.import_module(n)
        v = getattr(mod, '__version__', None)
        if v is None:
            try:
                import importlib.metadata as md
                v = md.version(n)
            except Exception:
                v = 'sin __version__'
        d[n] = str(v)
    except Exception as e:
        d[n] = 'ERROR: ' + repr(e)
print(json.dumps(d))
'@
    [System.IO.File]::WriteAllText($tmp, $codigo, (New-Object System.Text.UTF8Encoding($false)))
    try {
        $out = Invoke-Native -Exe $Py -Argumentos (@($tmp) + @($Modulos)) -Capturar
        $linea = @($out | Where-Object { $_ -match '^\s*\{' }) | Select-Object -Last 1
        if ($null -eq $linea) { throw 'La verificacion de imports no devolvio JSON.' }
        $res = $linea | ConvertFrom-Json
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
    $malos = @($res.PSObject.Properties | Where-Object { ([string]$_.Value).StartsWith('ERROR') })
    if ($malos.Count -gt 0) {
        throw ('Fallo la importacion en ' + $Py + ': ' + (($malos | ForEach-Object { $_.Name + ' -> ' + $_.Value }) -join ' | '))
    }
    return $res
}

function Repair-TorchCuda {
    # (Re)instala torch/torchvision de la rama cu124 en envs\<Modelo> con uv (el python del env NO tiene pip),
    # forzando la reinstalacion de esos dos paquetes y con overrides, y luego VERIFICA. Lanza excepcion si falla.
    # Los llamadores deben comprobar antes Test-ModeloUsaTorch.
    param([Parameter(Mandatory=$true)][string]$Modelo)
    $m = Get-Manifest $Modelo
    if (-not (Test-ModeloUsaTorch $m)) { throw ('El modelo ' + $Modelo + ' no usa torch; no hay nada que reparar') }
    $envM = Get-Prop $m 'env'
    $torchV = [string](Get-Prop $envM 'torch' '2.5.1')
    $tvV = [string](Get-Prop $envM 'torchvision' '0.20.1')
    $idx = [string](Get-Prop $envM 'torch_index_url' 'https://download.pytorch.org/whl/cu124')
    $envDir = Resolve-RutaManifest ([string](Get-Prop $envM 'dir' ('envs/' + $Modelo)))
    $py = Join-Path $envDir (Join-Path 'Scripts' 'python.exe')
    if (-not (Test-Path -LiteralPath $py)) { throw ('No existe ' + $py + '. Corre primero scripts\instalar_modelo.ps1 -Modelo ' + $Modelo) }
    $uv = Get-UvApp
    if (-not (Test-Path -LiteralPath $uv)) { throw 'No existe envs\app\Scripts\uv.exe. Corre scripts\instalar_app.ps1' }
    $ov = Get-OverridesTorch
    if (-not (Test-Path -LiteralPath $ov)) { throw ('Falta ' + $ov) }

    Write-Paso ('Reinstalando torch==' + $torchV + ' torchvision==' + $tvV + ' (cu124) en ' + $envDir)
    $base = @('pip', 'install', '--python', $py, '--reinstall-package', 'torch', '--reinstall-package', 'torchvision',
              ('torch==' + $torchV), ('torchvision==' + $tvV), '--override', $ov)
    try {
        Invoke-Native -Exe $uv -Argumentos ($base + @('--index-url', $idx))
    } catch {
        Write-Aviso 'Fallo con solo el indice de PyTorch; reintento con PyPI como indice extra (la build +cu124 gana por version local).'
        Invoke-Native -Exe $uv -Argumentos ($base + @('--index-url', $idx, '--extra-index-url', 'https://pypi.org/simple', '--index-strategy', 'unsafe-best-match'))
    }

    Write-Paso 'Verificando torch y CUDA'
    $info = Test-TorchCuda $py
    Show-TorchCuda $info
    if (-not (Test-TorchOk $info)) {
        Write-Host '*************************************************************' -ForegroundColor Red
        Write-Host 'ERROR: despues de reinstalar, torch NO es la build cu124 con CUDA disponible.' -ForegroundColor Red
        Write-Host ('  esperado: version con "cu124" y cuda_disponible=True; obtenido: ' + $info.torch + ' / ' + $info.cuda_disponible) -ForegroundColor Red
        Write-Host '  Revisa: nvidia-smi (driver), que no haya variables UV_* / pip.ini apuntando a otro indice,' -ForegroundColor Red
        Write-Host '  y repite con: .\scripts\instalar_modelo.ps1 -Modelo <modelo> -Forzar' -ForegroundColor Red
        Write-Host '*************************************************************' -ForegroundColor Red
        throw ('torch cu124/CUDA no disponible en ' + $Modelo + ' (' + $info.torch + ', cuda=' + $info.cuda_disponible + ')')
    }
    return $info
}
