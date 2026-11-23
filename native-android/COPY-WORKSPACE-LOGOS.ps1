param([string]$RepoPath = 'E:\Supportcenter')
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$dest=Join-Path $PSScriptRoot 'app\src\main\res\drawable-nodpi'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$map=@(
    @{ src='apps\mobile\assets\brand\workspaces\atomos\atomos-mark.png'; out='brand_atomos.png' },
    @{ src='apps\mobile\assets\brand\workspaces\angelbird\angelbird-mark.png'; out='brand_angelbird.png' }
)
foreach($item in $map){
    $source=Join-Path $repo $item.src
    if(-not (Test-Path -LiteralPath $source -PathType Leaf)){
        throw "WORKSPACE_BRAND_SOURCE_MISSING: $($item.src)"
    }
    $bytes=[System.IO.File]::ReadAllBytes($source)
    if($bytes.Length -lt 8 -or $bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71){
        throw "WORKSPACE_BRAND_NOT_PNG: $($item.src)"
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $dest $item.out) -Force
    Write-Host "WORKSPACE_BRAND_COPIED $($item.out)" -ForegroundColor Green
}
