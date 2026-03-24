param(
  [string]$Dataset = "benchmark_sim_datasets.json",
  [string]$ReferenceJson = "benchmark_mada_reference_r.json",
  [string]$ReportJson = "benchmark_comparison_report.json",
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

function Resolve-RscriptPath {
  $cmd = Get-Command Rscript -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\R\R-4.5.2\bin\Rscript.exe",
    "C:\Program Files\R\R-4.5.2\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.5.1\bin\Rscript.exe",
    "C:\Program Files\R\R-4.5.1\bin\x64\Rscript.exe",
    "C:\Program Files\R\R-4.4.3\bin\Rscript.exe",
    "C:\Program Files\R\R-4.4.3\bin\x64\Rscript.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  throw "Rscript.exe not found. Install R or add Rscript to PATH."
}

$datasetPath = Join-Path $scriptDir $Dataset
$refPath = Join-Path $scriptDir $ReferenceJson
$reportPath = Join-Path $scriptDir $ReportJson

Write-Host "Running benchmark suite..."
Write-Host "Working directory: $scriptDir"
Write-Host "Step 1/3: Generate simulation datasets"
& node (Join-Path $scriptDir "generate_benchmark_datasets.js") `
  --output $datasetPath `
  --seed $Seed `
  --replicates $Replicates `
  --minStudies $MinStudies `
  --maxStudies $MaxStudies
if ($LASTEXITCODE -ne 0) {
  throw "Dataset generator failed with exit code $LASTEXITCODE"
}

$rscript = Resolve-RscriptPath
Write-Host "Step 2/3: R benchmark reference calculation"
Write-Host "Rscript: $rscript"
& $rscript (Join-Path $scriptDir "benchmark_mada_reference_r.R") $datasetPath $refPath
if ($LASTEXITCODE -ne 0) {
  throw "R benchmark reference script failed with exit code $LASTEXITCODE"
}

Write-Host "Step 3/3: JS benchmark comparator"
$nodeArgs = @(
  (Join-Path $scriptDir "benchmark_compare.js"),
  "--dataset", $datasetPath,
  "--reference", $refPath,
  "--output", $reportPath,
  "--maxMaeSens", $MaxMAESens,
  "--maxMaeSpec", $MaxMAESpec,
  "--maxMaeLogDor", $MaxMAELogDOR,
  "--minCoverageSens", $MinCoverageSens,
  "--minCoverageSpec", $MinCoverageSpec,
  "--minCoverageLogDor", $MinCoverageLogDOR,
  "--minReplicates", $MinReplicatesForKPI,
  "--minScenarioReplicates", $MinScenarioReplicates,
  "--scenarioMaxMaeLogDor", $ScenarioMaxMAELogDOR,
  "--scenarioMinCoverageSens", $ScenarioMinCoverageSens,
  "--scenarioMinCoverageSpec", $ScenarioMinCoverageSpec,
  "--scenarioMinCoverageLogDor", $ScenarioMinCoverageLogDOR,
  "--aicAverageThreshold", $AICAverageThreshold
)
if ($SkipProfile.IsPresent) {
  $nodeArgs += "--skipProfile"
}
& node @nodeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Benchmark comparator failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $reportPath)) {
  throw "Benchmark report not found: $reportPath"
}
$report = Get-Content $reportPath | ConvertFrom-Json

Write-Host ""
Write-Host "=== Benchmark Summary ==="
Write-Host ("Pass: {0}" -f $report.summary.pass)
Write-Host ("Validity pass: {0}" -f $report.summary.validity_pass)
Write-Host ("KPI pass: {0}" -f $report.summary.kpi_pass)
Write-Host ("Replicates analyzed: {0}/{1}" -f $report.summary.n_replicates_analyzed, $report.summary.n_replicates_expected)
Write-Host ("R estimator counts: {0}" -f (($report.summary.r_estimator_counts | ConvertTo-Json -Compress)))
Write-Host ("JS-auto MAE sens/spec/log_dor: {0}, {1}, {2}" -f `
  $report.performance_vs_truth.js_auto.sens.mae, `
  $report.performance_vs_truth.js_auto.spec.mae, `
  $report.performance_vs_truth.js_auto.log_dor.mae)
Write-Host ("JS-auto coverage sens/spec/log_dor: {0}, {1}, {2}" -f `
  $report.coverage.js_auto.sens.rate, `
  $report.coverage.js_auto.spec.rate, `
  $report.coverage.js_auto.log_dor.rate)
Write-Host ("R  MAE sens/spec/log_dor: {0}, {1}, {2}" -f `
  $report.performance_vs_truth.r_reference.sens.mae, `
  $report.performance_vs_truth.r_reference.spec.mae, `
  $report.performance_vs_truth.r_reference.log_dor.mae)
if ($report.kpi -and $report.kpi.scenarios) {
  $failedScenarios = @($report.kpi.scenarios | Where-Object { -not [bool]$_.pass })
  Write-Host ("Scenario checks failed: {0}" -f $failedScenarios.Count)
  foreach ($s in $failedScenarios) {
    Write-Host ("  - {0}: n={1}; mae_log_dor={2}; cov_sens={3}; cov_spec={4}; cov_log_dor={5}" -f `
      $s.scenario, `
      $s.n_replicates, `
      $s.js_auto.mae_log_dor, `
      $s.js_auto.coverage_sens, `
      $s.js_auto.coverage_spec, `
      $s.js_auto.coverage_log_dor)
  }
}
Write-Host ("Benchmark report: {0}" -f $reportPath)

if (-not [bool]$report.summary.pass) {
  throw "Benchmark suite reported failure."
}
