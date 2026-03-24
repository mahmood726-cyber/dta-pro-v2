param(
  [string]$PubBiasDataset = "pubbias_comparator_dataset.csv",
  [string]$PubBiasReferenceJson = "pubbias_reference_r.json",
  [string]$PubBiasReportJson = "pubbias_comparison_report.json",
  [double]$PubBiasAbsTol = 2e-6,
  [double]$PubBiasRelTol = 1e-6,
  [string]$GapFillDataset = "gapfill_comparator_dataset.json",
  [string]$GapFillReferenceJson = "gapfill_reference_r.json",
  [string]$GapFillReportJson = "gapfill_comparison_report.json"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Running full comparator suite..."
Write-Host "Working directory: $scriptDir"

Write-Host ""
Write-Host "=== Publication-Bias Comparator ==="
& (Join-Path $scriptDir "run_pubbias_comparator.ps1") `
  -Dataset $PubBiasDataset `
  -ReferenceJson $PubBiasReferenceJson `
  -ReportJson $PubBiasReportJson `
  -AbsTol $PubBiasAbsTol `
  -RelTol $PubBiasRelTol
if ($LASTEXITCODE -ne 0) {
  throw "Publication-bias comparator failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== Gap-Fill Comparator ==="
& (Join-Path $scriptDir "run_gapfill_comparator.ps1") `
  -Dataset $GapFillDataset `
  -ReferenceJson $GapFillReferenceJson `
  -ReportJson $GapFillReportJson
if ($LASTEXITCODE -ne 0) {
  throw "Gap-fill comparator failed with exit code $LASTEXITCODE"
}

$pubReportPath = Join-Path $scriptDir $PubBiasReportJson
$gapReportPath = Join-Path $scriptDir $GapFillReportJson
if (-not (Test-Path $pubReportPath)) {
  throw "Publication-bias report not found: $pubReportPath"
}
if (-not (Test-Path $gapReportPath)) {
  throw "Gap-fill report not found: $gapReportPath"
}

$pubReport = Get-Content $pubReportPath | ConvertFrom-Json
$gapReport = Get-Content $gapReportPath | ConvertFrom-Json

$pubPass = [bool]$pubReport.summary.pass
$gapPass = [bool]$gapReport.summary.pass
$overallPass = $pubPass -and $gapPass

Write-Host ""
Write-Host "=== Consolidated Summary ==="
Write-Host ("Publication-bias: pass={0}; metrics={1}; failed={2}; max_abs_diff={3}" -f `
  $pubReport.summary.pass, `
  $pubReport.summary.total_metrics, `
  $pubReport.summary.failed_metrics, `
  $pubReport.summary.max_abs_diff)
Write-Host ("Gap-fill: pass={0}; metrics={1}; failed={2}; max_abs_diff={3}" -f `
  $gapReport.summary.pass, `
  $gapReport.summary.total_metrics, `
  $gapReport.summary.failed_metrics, `
  $gapReport.summary.max_abs_diff)
Write-Host ("Overall pass: {0}" -f $overallPass)
Write-Host ("Publication-bias report: {0}" -f $pubReportPath)
Write-Host ("Gap-fill report:         {0}" -f $gapReportPath)

if (-not $overallPass) {
  throw "One or more comparator suites failed."
}
