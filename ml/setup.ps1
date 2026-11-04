[CmdletBinding()]
param(
    [string]$PythonCommand = 'python'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSCommandPath
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'

Push-Location -LiteralPath $projectRoot
try {
    Write-Verbose "Checking $PythonCommand"
    & $PythonCommand -c 'import sys; print(sys.version); sys.exit(0 if (3, 12) <= sys.version_info[:2] < (3, 14) else 1)'
    if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.12 or 3.13, then rerun setup.ps1.' }

    if (-not (Test-Path -LiteralPath $venvPython)) {
        Write-Verbose 'Creating project virtual environment'
        & $PythonCommand -m venv (Join-Path $projectRoot '.venv')
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the virtual environment.' }
    }

    Write-Verbose 'Installing pinned packages into the project virtual environment'
    & $venvPython -m pip install -r (Join-Path $projectRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Package installation failed.' }
    & $venvPython -m pip check
    if ($LASTEXITCODE -ne 0) { throw 'Installed packages have a dependency conflict.' }
    Write-Output 'Setup complete. Run .\run.ps1 -Mode Test, then .\run.ps1 -Mode Smoke.'
}
finally {
    Pop-Location
}
