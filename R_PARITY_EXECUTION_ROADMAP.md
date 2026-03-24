# R Parity Execution Roadmap

Date: 2026-03-07

## Goal

Make DTA Meta-Analysis Pro match the current R reference stack on validated core methods, then exceed R on workflow quality, transparency, reproducibility, and interactive clinical interpretation.

The priority order is:

1. Statistical parity
2. Validation evidence
3. Product workflow superiority
4. Experimental breadth

Do not add new "advanced" methods ahead of the validation layer. Breadth without comparator evidence is how the app falls behind R in practice.

## Reference Baseline

Use these CRAN package baselines for parity work.

| Package | Version | Published | Role | Source |
| --- | --- | --- | --- | --- |
| mada | 0.5.12 | 2025-05-06 | Reitsma, HSROC, core DTA synthesis | https://cran.r-project.org/web/packages/mada/index.html |
| diagmeta | 0.5-1 | 2022-12-21 | Multi-cutpoint threshold meta-analysis | https://cran.r-project.org/web/packages/diagmeta/index.html |
| meta4diag | 2.1.1 | 2021-11-30 | Bayesian bivariate DTA meta-analysis | https://cran.r-project.org/web/packages/meta4diag/index.html |
| metafor | 4.8-0 | 2025-01-28 | Meta-regression, multilevel diagnostics, influence methods | https://cran.r-project.org/web/packages/metafor/index.html |
| netmeta | 3.3-1 | 2026-01-28 | Network workflows and presentation standards | https://cran.r-project.org/web/packages/netmeta/index.html |

## Current Code Anchors

The current app already has the right structural hooks. The roadmap should build on these anchors rather than spreading logic into more files.

- Core bivariate model: `dta-pro-v3.7.html` line ~4361
- HSROC model: `dta-pro-v3.7.html` line ~4948
- Auto model stack: `dta-pro-v3.7.html` line ~5393
- Meta-regression: `dta-pro-v3.7.html` line ~5637
- Advanced analysis bundle: `dta-pro-v3.7.html` line ~7130
- Extended analysis bundle: `dta-pro-v3.7.html` line ~7742
- Bayesian worker path: `dta-pro-v3.7.html` line ~24053
- Reporting path: `dta-pro-v3.7.html` line ~9649
- PRISMA-DTA export path: `dta-pro-v3.7.html` line ~18127
- Existing validation harness: `R_validation/`
- Existing browser smoke harness: `test_selenium.py`, `comprehensive_test_suite.py`

## Delivery Principle

Keep the single-file app architecture intact. Add reference scripts, datasets, and reports under `R_validation/`, but avoid turning the app into a build-heavy framework.

## Phase 0: Parity Foundation

### Scope

Create the formal parity matrix, dataset inventory, and validation schema that every later feature must satisfy.

### Files

- `R_validation/validation_reference.json`
- `R_validation/advanced_validation_reference.json`
- `R_validation/benchmark_compare.js`
- `R_validation/generate_benchmark_datasets.js`
- new `R_validation/package_baseline_2026-03-07.json`
- new `R_validation/parity_matrix.json`

### Deliverables

- Package baseline file with package, version, date, URL, and supported methods
- Parity matrix listing each app method, reference R package, comparator dataset, tolerance, and status
- Separation of deterministic benchmarks from simulation coverage benchmarks
- Versioned benchmark inventory for demo data, literature examples, edge cases, and sparse-data scenarios

### Acceptance Criteria

- Every method exposed in the main UI maps to a named comparator target or is explicitly marked experimental
- No method remains unclassified as "validated", "partially validated", or "experimental"
- Comparator schema can record package version, source URL, metric-level tolerance, and last validation date

## Phase 1: Core DTA Parity

### Scope

Lock down exact or near-exact agreement with `mada` for the core engine before expanding into new methods.

### Files

- `dta-pro-v3.7.html`
- `R_validation/benchmark_mada_reference_r.R`
- `R_validation/benchmark_mada_reference_r.json`
- `R_validation/validate_dta_pro.R`
- `R_validation/benchmark_compare.js`

### Deliverables

- Pooled sensitivity, specificity, PLR, NLR, DOR, AUC, tau2, rho, CI, and prediction-region parity checks
- Warning parity for small-k, zero-cell, and convergence scenarios
- Automatic validation badge in the app for validated outputs

### Acceptance Criteria

- Deterministic reference datasets: absolute difference <= 0.005 for pooled sens/spec/DOR/AUC/tau2/rho
- Interval endpoints: absolute difference <= 0.01 unless documented as methodologically different
- No silent convergence fallback
- Every core model result object includes `referencePackage`, `referenceVersion`, `validationStatus`, and `validationDate`

## Phase 2: Threshold and Bayesian Parity

### Scope

Close the two clearest gaps versus R: threshold meta-analysis and Bayesian DTA synthesis.

### Files

- `dta-pro-v3.7.html`
- new `R_validation/diagmeta_reference_r.R`
- new `R_validation/diagmeta_reference_r.json`
- new `R_validation/meta4diag_reference_r.R`
- new `R_validation/meta4diag_reference_r.json`
- new `R_validation/threshold_comparator.js`
- new `R_validation/bayesian_comparator.js`

### Deliverables

- Multi-cutpoint threshold meta-analysis benchmarked against `diagmeta`
- Bayesian bivariate lane benchmarked against `meta4diag`
- UI labeling that clearly distinguishes frequentist and Bayesian outputs
- Prior configuration and posterior diagnostic reporting

### Acceptance Criteria

- Threshold module can ingest multi-threshold study structures without collapsing them to a single cutpoint
- Bayesian posterior means and interval summaries match reference outputs within agreed tolerances on benchmark datasets
- Any unsupported `meta4diag` capability is explicitly listed as out of scope, not implied

## Phase 3: Meta-Regression, Diagnostics, and Publication Bias Depth

### Scope

Raise the quality bar on moderator handling, influence analysis, residual heterogeneity, and small-study diagnostics using `metafor` as the benchmark style reference.

### Files

- `dta-pro-v3.7.html`
- `R_validation/pubbias_reference_r.R`
- `R_validation/pubbias_reference_r.json`
- new `R_validation/metafor_reference_r.R`
- new `R_validation/metafor_reference_r.json`
- new `R_validation/metareg_comparator.js`

### Deliverables

- Stronger meta-regression validation
- Clear residual diagnostics and influence reporting
- Better separation of validated bias diagnostics versus exploratory heuristics
- Evidence-strength labeling for each publication-bias output

### Acceptance Criteria

- Meta-regression outputs report model assumptions, covariate completeness, and residual heterogeneity
- Influence and leave-one-out tables match reference calculations on fixed datasets
- Exploratory methods are visually distinguished from validated inferential methods

## Phase 4: Exceed R on Workflow

### Scope

This is where the app should surpass R. Do not try to beat R on package count. Beat it on trust, explainability, and execution speed for end users.

### Files

- `dta-pro-v3.7.html`
- `README.md`
- `CHANGELOG.md`
- `test_selenium.py`
- `comprehensive_test_suite.py`

### Deliverables

- Validation status panel inside the app
- One-click reproducibility bundle with data, settings, results JSON, validation metadata, and generated R code
- Audit trail for every result block
- Comparator diff viewer showing app result versus R reference
- Stronger report export with embedded validation provenance

### Acceptance Criteria

- A user can export one package containing enough information to reproduce the run and audit it later
- Every major result card shows method, assumption summary, reference status, and warning status
- Browser regression suite runs without unhandled JS errors on validated workflows

## Phase 5: Network and Experimental Territory

### Scope

Only expand network or exotic methods after the earlier phases are green.

### Files

- `dta-pro-v3.7.html`
- new `R_validation/netmeta_reference_r.R`
- new `R_validation/netmeta_reference_r.json`

### Deliverables

- Network or comparative workflows that are benchmarked, clearly scoped, and honestly labeled
- "Experimental" switch for methods without reference-grade validation

### Acceptance Criteria

- No network feature is promoted as reference-grade until it has an explicit comparator dataset and passing validation report
- Unsupported network assumptions are disclosed in the UI and report export

## Cross-Cutting Acceptance Gates

These gates apply to every release once parity work starts.

- Zero unhandled browser exceptions in the smoke suite for validated paths
- Green comparator reports for all validated methods
- Validation artifacts stored as JSON under `R_validation/`
- Changelog entry references the validation artifact that justifies the release
- No validated method can silently downgrade to exploratory output

## First 10 Implementation Tasks

1. Create `R_validation/package_baseline_2026-03-07.json` with the five CRAN baselines and source URLs.
2. Create `R_validation/parity_matrix.json` with one row per app method and columns for package, dataset, tolerance, status, and owner file.
3. Extend `R_validation/validation_reference.json` schema to include `referencePackage`, `referenceVersion`, `sourceUrl`, `validationDate`, `toleranceAbs`, and `toleranceRel`.
4. Add a validation-status block to the core result object in `dta-pro-v3.7.html` and render it in the results/report UI.
5. Add `diagmeta_reference_r.R` plus `diagmeta_reference_r.json` for at least one multi-cutpoint benchmark dataset.
6. Add `meta4diag_reference_r.R` plus `meta4diag_reference_r.json` for at least one Bayesian benchmark dataset with frozen posterior summaries.
7. Split the current benchmark harness into deterministic parity checks and scenario coverage checks, starting in `R_validation/benchmark_compare.js`.
8. Add generated R-code export for the current run in `dta-pro-v3.7.html`, tied to the same settings object used by the app.
9. Upgrade `generateReport()` so exported reports embed validation provenance, package baselines, and method status.
10. Expand `test_selenium.py` and `comprehensive_test_suite.py` to assert the new validation badges, provenance labels, and comparator status text.

## Immediate Execution Order

Do these next, in order:

1. Phase 0 foundation files
2. Validation-status rendering in the app
3. `diagmeta` comparator lane
4. `meta4diag` comparator lane
5. Report and export provenance

## Stop Conditions

Stop and reassess if any of these happen:

- A new method cannot be mapped to a defensible R reference
- A benchmark mismatch exceeds tolerance and there is no methodological reason documented
- UI complexity grows faster than comparator coverage
- Network or Bayesian scope starts delaying core parity completion

## Definition of "Match and Exceed R"

Match R means:

- same core methods
- same warning behavior
- same reference outputs on benchmark datasets
- same or tighter documented tolerances

Exceed R means:

- faster end-user workflow
- no-code execution
- interactive auditability
- built-in provenance and reproducibility bundles
- clinically useful interpretation layers tied to validated model outputs

