[CmdletBinding()]
param(
    [ValidateSet('Test', 'Smoke', 'Full')]
    [string]$Mode = 'Smoke',
    [string]$OutputDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSCommandPath
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    throw 'Missing project environment. Run .\setup.ps1 first.'
}

Push-Location -LiteralPath $projectRoot
try {
    if ($Mode -eq 'Test') {
        & $venvPython -B -m pytest -q tests
        if ($LASTEXITCODE -ne 0) { throw 'Focused tests failed.' }
        return
    }

    $configName = if ($Mode -eq 'Smoke') { 'smoke.yaml' } else { 'simulation_config.yaml' }
    $configPath = Join-Path $projectRoot (Join-Path 'config' $configName)
    if (-not $OutputDir) {
        $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
        $OutputDir = Join-Path 'runs' ("{0}-{1}" -f $Mode.ToLowerInvariant(), $stamp)
    }
    $runRoot = if ([IO.Path]::IsPathRooted($OutputDir)) {
        [IO.Path]::GetFullPath($OutputDir)
    } else {
        [IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDir))
    }
    if (Test-Path -LiteralPath $runRoot) {
        $existing = @(Get-ChildItem -LiteralPath $runRoot -Force)
        if ($existing.Count -gt 0) { throw "Run directory already contains files: $runRoot" }
    }
    else {
        New-Item -ItemType Directory -Path $runRoot | Out-Null
    }

    Write-Verbose "Mode: $Mode; config: $configPath; output: $runRoot"
    $env:PYTHONUNBUFFERED = '1'
    & $venvPython -B -u -m sanjeevani_ml.train_and_evaluate --config $configPath --output-dir $runRoot
    if ($LASTEXITCODE -ne 0) { throw "The $Mode run failed. Partial outputs remain at $runRoot for diagnosis." }

    & $venvPython -B (Join-Path $projectRoot 'write_manifest.py') --config $configPath --run-root $runRoot
    if ($LASTEXITCODE -ne 0) { throw 'The run finished, but the provenance manifest failed.' }
    Write-Output "Completed $Mode run: $runRoot"
}
finally {
    Pop-Location
}
