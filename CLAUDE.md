# CLAUDE.md — DTA Pro Review

## Project Overview
**23K-line single-file HTML app** (v4.9.2) implementing bivariate GLMM + HSROC for diagnostic test accuracy meta-analysis. Fully client-side, no server required.

## Key File
- `index.html` — the entire application (~23K lines)

## Statistical Model Notes
- **ML (not REML)**: no -0.5*log|P| correction term
- **HSROC**: uses DL moment estimation (not Rutter-Gatsonis likelihood)
- **Fisher info**: F_{ij} = 0.5*tr(W*dVi * W*dVj), computed via 2x2 matrix product entries inline
- **DOR = exp(mu1 + mu2)** is CORRECT — DOR = Sens*Spec/((1-Sens)*(1-Spec))
- **SROC prediction region** is bivariate → must use `sqrt(chi2_{alpha,2})` not univariate z
- **HSROC AUC**: use `normalCDF(Lambda/sqrt(2))` (Phi, not logistic)

## Critical Warnings
- **`getStudyData()` pre-corrects data** → bivariateGLMM's inner CC check is dead code (hasZero always false)
- **tau2 guards**: use `?? 0.01` not `|| 0.1` — falsy-or drops valid tau2=0 (homogeneous case)
- **Bootstrap cache key**: must include alpha so different confLevels don't share cached results
- **Cache invalidation**: include ALL settings in cache key (confLevel, tolerance, maxIter, modelType, alpha)
- **LOO model mismatch**: Don't pass HSROC result as precomputed bivariate
- **rbeta fallback**: use gamma-ratio method (Marsaglia-Tsang), not Johnk's (loops forever for large a,b)
- **Near-singular warnings**: deduplicate across Newton-Raphson iterations using Set
- **Wilson-Hilferty approximation** `df*(1-2/(9*df)+z*sqrt(2/(9*df)))^3` is excellent fallback for chi-squared quantiles
- **BMA must run actual models** — fabricated BIC from `n*log(var)` with arbitrary multipliers is meaningless
- **DCA requires fixed prevalence** separate from swept threshold — same variable for both gives NB_all=0
- **When mixing logit-scale and probability-scale**, use delta method at AVERAGE of both quantities
- **Seeded PRNG**: xoshiro128** is the standard

## Known Agent False Positives
Do NOT "fix" these — they are already correct:
- Clayton copula θ = 2τ/(1-τ) (correct Kendall-to-Clayton)
- `qbeta` IS defined (at ~L3585)
- Exact CI uses alpha/2 (correct Clopper-Pearson)
- Bootstrap results ARE sorted

## Do NOT
- Add build dependencies (must work offline, single-file architecture)
- Change DOR formula to exp(mu1 - mu2) — the current formula is correct
- Use `|| fallback` for tau2 (drops valid zero)
- Use logistic function where normal CDF (Phi) is needed

## Workflow Rules (from usage insights)

### Data Integrity
Never fabricate or hallucinate identifiers (NCT IDs, DOIs, trial names, PMIDs). If you don't have the real identifier, say so and ask the user to provide it. Always verify identifiers against existing data files before using them in configs or gold standards.

### Multi-Persona Reviews
When running multi-persona reviews, run agents sequentially (not in parallel) to avoid rate limits and empty agent outputs. If an agent returns empty output, immediately retry it before moving on. Never launch more than 2 sub-agents simultaneously.

### Fix Completeness
When asked to "fix all issues", fix ALL identified issues in a single pass — do not stop partway. After applying fixes, re-run the relevant tests/validation before reporting completion. If fixes introduce new failures, fix those too before declaring done.

### Scope Discipline
Stay focused on the specific files and scope the user requests. Do not survey or analyze files outside the stated scope. When editing files, triple-check you are editing the correct file path — never edit a stale copy or wrong directory.

### Regression Prevention
Before applying optimization changes to extraction or analysis pipelines, save a snapshot of current accuracy metrics. After each change, compare against the snapshot. If any trial/metric regresses by more than 2%, immediately rollback and try a different approach. Never apply aggressive heuristics without isolated testing first.
