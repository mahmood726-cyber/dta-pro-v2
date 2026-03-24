# Advanced R Methods (v4.9.3)

This folder now includes an additional reference pipeline:

- `advanced_gapfill_methods.R`
- Output: `advanced_validation_reference.json`

And a non-publication-bias parity harness:

- `gapfill_comparator_dataset.json`
- `gapfill_reference_r.R`
- `gapfill_comparator.js`
- `run_gapfill_comparator.ps1`
- Output: `gapfill_comparison_report.json`

Master runner for both comparator suites:

- `run_all_comparators.ps1`

Benchmark + quality-gate harness:

- `generate_benchmark_datasets.js`
- `benchmark_mada_reference_r.R`
- `benchmark_compare.js`
- `run_benchmark_suite.ps1`
- `run_quality_gate.ps1`

CI workflow:

- `.github/workflows/parity-and-benchmark.yml`

## What Was Added

1. Comparative DTA (paired-study logit differences)
2. Network DTA point ranking (DOR ranking + point-SUCRA)
3. IPD two-stage DTA pooling
4. Selection-function SROC sensitivity analysis over assumed publication probability `p`

## Novel Method Implemented

`selection_sroc_sensitivity()` implements a t-statistic selection-function sensitivity analysis for SROC:

- Selection model: `P(select | t) = Phi(beta * t + alpha)`
- Contrast defaults to `(1/sqrt(2), 1/sqrt(2))`, corresponding to log-DOR direction.
- Sensitivity grid over `p_select` quantifies shifts in pooled sensitivity, specificity, DOR, and SAUC.

This implementation is profile-based and designed for reproducible sensitivity analysis in the app validation workflow.

## Benchmark Layer

The benchmark harness adds simulation-based diagnostics beyond strict parity:

1. Generate synthetic DTA datasets with known truth (`sens`, `spec`, `DOR`)
2. Fit R-side reference estimates via `mada::reitsma` with deterministic fallback
3. Fit JS-side estimates using the app-aligned univariate random-effects pooling
4. Report truth-facing performance (`bias`, `MAE`, `RMSE`) and JS-vs-R deltas

This supports a practical "beyond parity" objective: maintaining numerical agreement where expected while also quantifying
which implementation is closer to known truth in controlled simulation.

## Beyond-R Upgrades (Current)

The benchmark comparator now includes a stronger JS-side estimation stack:

1. Bivariate random-effects MLE (`bivariate_re_mle`) on study-level logit sensitivity/specificity with full covariance.
2. HSROC-like symmetric approximation (`hsroc_symmetric_approx`) as a second bivariate candidate.
3. Profile-likelihood CIs for core location parameters when optimization permits, with Wald fallback.
4. Automatic model selection/averaging via AIC weights, plus sparse-data guardrails for zero-cell scenarios.

Simulation generation now covers multiple hard regimes:

- balanced
- rare-disease/high-specificity
- rule-out/high-sensitivity
- sparse zero-cell studies
- high threshold heterogeneity
- low-accuracy noisy settings

Quality-gate benchmarks now enforce KPI checks (global + scenario-level):

- MAE limits on sensitivity/specificity/log-DOR
- CI coverage checks
- scenario-specific stress checks with calibrated sparse-data thresholds

## References

- Copas JB, Shi JQ. *A sensitivity analysis for publication bias in systematic reviews*. Stat Methods Med Res. 2001;10(4):251-265. doi:10.1177/096228020101000402
- Hattori S, Zhou XH. *A likelihood-based sensitivity analysis for publication bias on the summary ROC in meta-analysis of diagnostic test accuracy*. Stat Med. 2024;43(6):1048-1067. doi:10.1002/sim.10053
