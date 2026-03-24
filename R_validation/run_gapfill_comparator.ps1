param(
  [string]$Dataset = "gapfill_comparator_dataset.json",
  [string]$ReferenceJson = "gapfill_reference_r.json",
  [string]$ReportJson = "gapfill_comparison_report.json"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$datasetPath = Join-Path $scriptDir $Dataset
$refPath = Join-Path $scriptDir $ReferenceJson
$reportPath = Join-Path $scriptDir $ReportJson

if (-not (Test-Path $datasetPath)) {
  throw "Dataset not found: $datasetPath"
}

$rscriptCandidates = @(
  "C:\Program Files\R\R-4.5.2\bin\Rscript.exe",
  "C:\Program Files\R\R-4.5.1\bin\Rscript.exe",
  "C:\Program Files\R\R-4.4.3\bin\Rscript.exe",
  "Rscript.exe"
)
$rscript = $null
foreach ($c in $rscriptCandidates) {
  if ($c -eq "Rscript.exe") {
    $cmd = Get-Command Rscript.exe -ErrorAction SilentlyContinue
    if ($cmd) { $rscript = $cmd.Source; break }
  } elseif (Test-Path $c) {
    $rscript = $c
    break
  }
}
if (-not $rscript) {
  throw "Rscript not found. Install R or update run_gapfill_comparator.ps1."
}

Write-Host "Running non-publication gap-fill comparator..."
Write-Host "Rscript: $rscript"
Write-Host "Step 1/2: R reference calculation"
& $rscript (Join-Path $scriptDir "gapfill_reference_r.R") $datasetPath $refPath
if ($LASTEXITCODE -ne 0) {
  throw "R reference script failed with exit code $LASTEXITCODE"
}

Write-Host "Step 2/2: Node comparator"
& node (Join-Path $scriptDir "gapfill_comparator.js") `
  --dataset $datasetPath `
  --reference $refPath `
  --output $reportPath
if ($LASTEXITCODE -ne 0) {
  throw "Node comparator failed with exit code $LASTEXITCODE"
}

Write-Host "Comparator completed successfully."
Write-Host "Reference JSON: $refPath"
Write-Host "Report JSON:    $reportPath"
