param(
  [string]$PubBiasDataset = "pubbias_comparator_dataset.csv",
  [string]$PubBiasReferenceJson = "pubbias_reference_r.json",
  [string]$PubBiasReportJson = "pubbias_comparison_report.json",
  [double]$PubBiasAbsTol = 2e-6,
  [double]$PubBiasRelTol = 1e-6,
  [string]$GapFillDataset = "gapfill_comparator_dataset.json",
  [string]$GapFillReferenceJson = "gapfill_reference_r.json",
  [string]$GapFillReportJson = "gapfill_comparison_report.json",
  [string]$BenchmarkDataset = "benchmark_sim_datasets.json",
  [string]$BenchmarkReferenceJson = "benchmark_mada_reference_r.json",
  [string]$BenchmarkReportJson = "benchmark_comparison_report.json",
  [int]$Seed = 20260304,
  [int]$Replicates = 80,
  [int]$MinStudies = 6,
  [int]$MaxStudies = 20,
  [double]$MaxMAESens = 0.03,
  [double]$MaxMAESpec = 0.03,
  [double]$MaxMAELogDOR = 0.22,
  [double]$MinCoverageSens = 0.85,
  [double]$MinCoverageSpec = 0.85,
  [double]$MinCoverageLogDOR = 0.80,
  [int]$MinReplicatesForKPI = 40,
  [int]$MinScenarioReplicates = 8,
  [double]$ScenarioMaxMAELogDOR = 0.30,
  [double]$ScenarioMinCoverageSens = 0.75,
  [double]$ScenarioMinCoverageSpec = 0.75,
  [double]$ScenarioMinCoverageLogDOR = 0.70,
  [double]$AICAverageThreshold = 0.85,
  [switch]$SkipProfile
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Running quality gate (comparators + benchmark)..."
Write-Host "Working directory: $scriptDir"

Write-Host ""
Write-Host "=== Step 1/2: R Parity Comparator Suites ==="
& (Join-Path $scriptDir "run_all_comparators.ps1") `
  -PubBiasDataset $PubBiasDataset `
  -PubBiasReferenceJson $PubBiasReferenceJson `
  -PubBiasReportJson $PubBiasReportJson `
  -PubBiasAbsTol $PubBiasAbsTol `
  -PubBiasRelTol $PubBiasRelTol `
  -GapFillDataset $GapFillDataset `
  -GapFillReferenceJson $GapFillReferenceJson `
  -GapFillReportJson $GapFillReportJson
if ($LASTEXITCODE -ne 0) {
  throw "Comparator suites failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== Step 2/2: Benchmark Suite ==="
& (Join-Path $scriptDir "run_benchmark_suite.ps1") `
  -Dataset $BenchmarkDataset `
  -ReferenceJson $BenchmarkReferenceJson `
  -ReportJson $BenchmarkReportJson `
  -Seed $Seed `
  -Replicates $Replicates `
  -MinStudies $MinStudies `
  -MaxStudies $MaxStudies `
  -MaxMAESens $MaxMAESens `
  -MaxMAESpec $MaxMAESpec `
  -MaxMAELogDOR $MaxMAELogDOR `
  -MinCoverageSens $MinCoverageSens `
  -MinCoverageSpec $MinCoverageSpec `
  -MinCoverageLogDOR $MinCoverageLogDOR `
  -MinReplicatesForKPI $MinReplicatesForKPI `
  -MinScenarioReplicates $MinScenarioReplicates `
  -ScenarioMaxMAELogDOR $ScenarioMaxMAELogDOR `
  -ScenarioMinCoverageSens $ScenarioMinCoverageSens `
  -ScenarioMinCoverageSpec $ScenarioMinCoverageSpec `
  -ScenarioMinCoverageLogDOR $ScenarioMinCoverageLogDOR `
  -AICAverageThreshold $AICAverageThreshold `
  -SkipProfile:$SkipProfile
if ($LASTEXITCODE -ne 0) {
  throw "Benchmark suite failed with exit code $LASTEXITCODE"
}

$pubReportPath = Join-Path $scriptDir $PubBiasReportJson
$gapReportPath = Join-Path $scriptDir $GapFillReportJson
$benchReportPath = Join-Path $scriptDir $BenchmarkReportJson

foreach ($p in @($pubReportPath, $gapReportPath, $benchReportPath)) {
  if (-not (Test-Path $p)) {
    throw "Required report not found: $p"
  }
}

$pubReport = Get-Content $pubReportPath | ConvertFrom-Json
$gapReport = Get-Content $gapReportPath | ConvertFrom-Json
$benchReport = Get-Content $benchReportPath | ConvertFrom-Json

$pubPass = [bool]$pubReport.summary.pass
$gapPass = [bool]$gapReport.summary.pass
$benchPass = [bool]$benchReport.summary.pass
$benchValidityPass = [bool]$benchReport.summary.validity_pass
$benchKpiPass = [bool]$benchReport.summary.kpi_pass
$overallPass = $pubPass -and $gapPass -and $benchPass

Write-Host ""
Write-Host "=== Quality Gate Summary ==="
Write-Host ("Publication-bias comparator: pass={0}; metrics={1}; failed={2}" -f `
  $pubReport.summary.pass, `
  $pubReport.summary.total_metrics, `
  $pubReport.summary.failed_metrics)
Write-Host ("Gap-fill comparator:         pass={0}; metrics={1}; failed={2}" -f `
  $gapReport.summary.pass, `
  $gapReport.summary.total_metrics, `
  $gapReport.summary.failed_metrics)
Write-Host ("Benchmark suite:             pass={0}; replicates={1}/{2}; missing_ref={3}" -f `
  $benchReport.summary.pass, `
  $benchReport.summary.n_replicates_analyzed, `
  $benchReport.summary.n_replicates_expected, `
  $benchReport.summary.missing_reference)
Write-Host ("Benchmark validity/kpi:      {0}/{1}" -f $benchValidityPass, $benchKpiPass)
if ($benchReport.kpi -and $benchReport.kpi.checks) {
  Write-Host ("Benchmark KPI checks:        {0}" -f (($benchReport.kpi.checks | ConvertTo-Json -Compress)))
}
Write-Host ("Overall quality gate pass:   {0}" -f $overallPass)
Write-Host ("Publication-bias report: {0}" -f $pubReportPath)
Write-Host ("Gap-fill report:         {0}" -f $gapReportPath)
Write-Host ("Benchmark report:        {0}" -f $benchReportPath)

if (-not $overallPass) {
  throw "Quality gate failed."
}
