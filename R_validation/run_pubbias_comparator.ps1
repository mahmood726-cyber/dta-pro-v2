param(
  [string]$Dataset = "pubbias_comparator_dataset.csv",
  [string]$ReferenceJson = "pubbias_reference_r.json",
  [string]$ReportJson = "pubbias_comparison_report.json",
  [double]$AbsTol = 2e-6,
  [double]$RelTol = 1e-6
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Resolve-RscriptPath {
  $cmd = Get-Command Rscript -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\R\R-4.5.2\bin\Rscript.exe",
    "C:\Program Files\R\R-4.5.2\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.4.3\bin\Rscript.exe",
    "C:\Program Files\R\R-4.4.3\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.4.2\bin\Rscript.exe",
    "C:\Program Files\R\R-4.4.2\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.4.1\bin\Rscript.exe",
    "C:\Program Files\R\R-4.4.1\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.4.0\bin\Rscript.exe",
    "C:\Program Files\R\R-4.4.0\bin\x64\Rscript.exe"
  )

  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }

  throw "Rscript.exe not found. Install R or add Rscript to PATH."
}

Write-Host "Running publication-bias comparator..."
$rscript = Resolve-RscriptPath
Write-Host "Rscript: $rscript"

$datasetPath = Resolve-Path $Dataset
$refPath = Join-Path $scriptDir $ReferenceJson
$reportPath = Join-Path $scriptDir $ReportJson

Write-Host "Step 1/2: R reference calculation"
& $rscript (Join-Path $scriptDir "pubbias_reference_r.R") $datasetPath $refPath
if ($LASTEXITCODE -ne 0) {
  throw "R reference script failed with exit code $LASTEXITCODE"
}

Write-Host "Step 2/2: Node comparator"
& node (Join-Path $scriptDir "pubbias_comparator.js") `
  --dataset $datasetPath `
  --reference $refPath `
  --output $reportPath `
  --absTol $AbsTol `
  --relTol $RelTol
if ($LASTEXITCODE -ne 0) {
  throw "Node comparator failed with exit code $LASTEXITCODE"
}

Write-Host "Comparator completed successfully."
Write-Host "Reference JSON: $refPath"
Write-Host "Report JSON:    $reportPath"
