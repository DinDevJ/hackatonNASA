<#
.SYNOPSIS
Clona en vendor\ los repositorios oficiales en el commit exacto de vendor\REVISIONES.md.
.DESCRIPTION
Parsea la tabla de REVISIONES.md (repo, URL, commit). Si vendor\<repo> no existe: fetch del commit
(--depth 1) y checkout; si eso falla, clon completo + checkout. Requiere git en el PATH.
.PARAMETER SoloMostrar
Solo muestra lo que haria (no clona).
#>
[CmdletBinding()]
param([switch]$SoloMostrar)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot '_comun.ps1')

$rev = Join-Path $Root (Join-Path 'vendor' 'REVISIONES.md')
if (-not (Test-Path -LiteralPath $rev)) { throw ('Falta ' + $rev) }

$repos = @()
foreach ($linea in (Read-TextoUtf8 $rev) -split "`r?`n") {
    if ($linea -match '^\|\s*([A-Za-z0-9_.-]+)\s*\|\s*(https://[^|\s]+?)\s*\|\s*`([0-9a-f]{40})`') {
        $repos += [pscustomobject]@{ Repo = $Matches[1]; Url = $Matches[2]; Commit = $Matches[3] }
    }
}
if ($repos.Count -eq 0) { throw 'No pude leer ningun repositorio de REVISIONES.md (formato de tabla inesperado).' }

if (-not $SoloMostrar) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git no esta instalado o no esta en el PATH. Instala Git for Windows (https://git-scm.com/download/win).'
    }
}

$vendor = Join-Path $Root 'vendor'
$estado = @()
foreach ($r in $repos) {
    $dir = Join-Path $vendor $r.Repo
    Write-Paso ($r.Repo + ' @ ' + $r.Commit.Substring(0, 7))
    if (Test-Path -LiteralPath $dir) {
        $nota = 'ya existe'
        if (-not $SoloMostrar -and (Test-Path -LiteralPath (Join-Path $dir '.git'))) {
            $head = (Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'rev-parse', 'HEAD') -Capturar | Out-String).Trim()
            if ($head -ne $r.Commit) { $nota = 'ya existe PERO en otro commit (' + $head.Substring(0, 7) + ')'; Write-Aviso $nota }
            else { $nota = 'ya existe, commit correcto' }
        }
        Write-Host $nota
        $estado += [pscustomobject]@{ Repo = $r.Repo; Estado = $nota }
        continue
    }
    if ($SoloMostrar) {
        Write-Host ('(solo mostrar) git clone ' + $r.Url + ' ' + $dir + ' ; checkout ' + $r.Commit)
        $estado += [pscustomobject]@{ Repo = $r.Repo; Estado = 'se clonaria' }
        continue
    }
    try {
        $rapido = $true
        try {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'init', '-q')
            Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'remote', 'add', 'origin', $r.Url)
            Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'fetch', '--depth', '1', 'origin', $r.Commit)
            Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'checkout', '-q', '--detach', 'FETCH_HEAD')
        } catch {
            $rapido = $false
            Write-Aviso ('Fetch directo fallo (' + $_.Exception.Message + '); hago clon completo.')
            if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
            Invoke-Native -Exe 'git' -Argumentos @('clone', $r.Url, $dir)
            Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'checkout', '-q', $r.Commit)
        }
        $head = (Invoke-Native -Exe 'git' -Argumentos @('-C', $dir, 'rev-parse', 'HEAD') -Capturar | Out-String).Trim()
        if ($head -ne $r.Commit) { throw ('HEAD=' + $head + ' no coincide con ' + $r.Commit) }
        $estado += [pscustomobject]@{ Repo = $r.Repo; Estado = 'clonado ok' }
    } catch {
        Write-Host ('ERROR clonando ' + $r.Repo + ': ' + $_.Exception.Message) -ForegroundColor Red
        $estado += [pscustomobject]@{ Repo = $r.Repo; Estado = ('ERROR: ' + $_.Exception.Message) }
    }
}
Write-Paso 'Resumen'
$estado | Format-Table -AutoSize | Out-Host
if (@($estado | Where-Object { $_.Estado -like 'ERROR*' }).Count -gt 0) { exit 1 }
