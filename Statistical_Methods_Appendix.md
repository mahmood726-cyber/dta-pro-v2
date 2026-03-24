# DTA Pro v4.8 - Statistical Methods Appendix

## Research Synthesis Methods - Supplementary Documentation

**Version:** 1.0
**Date:** 2026-01-19
**Prepared for:** RSM Peer Review

---

## 1. Bivariate Random-Effects Model

### 1.1 Model Specification

DTA Pro implements the bivariate random-effects model as described by Reitsma et al. (2005). The model jointly analyzes logit-transformed sensitivity and specificity:

```
(logit(sens_i))   (μ_A)   (u_Ai)
(logit(spec_i)) = (μ_B) + (u_Bi)
```

where:
- `sens_i` = sensitivity of study i
- `spec_i` = specificity of study i
- `μ_A` = mean logit sensitivity across studies
- `μ_B` = mean logit specificity across studies
- `(u_Ai, u_Bi)'` = random effects for study i

### 1.2 Covariance Structure

The random effects follow a bivariate normal distribution:

```
(u_Ai)     ((0))   (σ²_A      ρσ_Aσ_B)
(u_Bi) ~ N ((0)), (ρσ_Aσ_B   σ²_B    )
```

where:
- `σ²_A` = between-study variance in logit sensitivity
- `σ²_B` = between-study variance in logit specificity
- `ρ` = correlation between logit sensitivity and logit specificity
- `σ_A`, `σ_B` = standard deviations

### 1.3 Within-Study Variance

Within-study sampling variances are estimated using the normal approximation:

```
Var(logit(p)) ≈ 1/(n × p × (1-p))
```

For extreme proportions (p < 0.05 or p > 0.95), exact binomial variance is used.

### 1.4 References

> Reitsma JB, Glas AS, Rutjes AW, Scholten RJ, Bossuyt PM, Zwinderman AH. Bivariate analysis of sensitivity and specificity produces informative summary measures in diagnostic reviews. J Clin Epidemiol. 2005;58(10):982-990. doi:10.1016/j.jclinepi.2005.02.022

---

## 2. HSROC Model

### 2.1 Model Parameterization

The Hierarchical Summary ROC (HSROC) model (Rutter & Gatsonis, 2001) uses an alternative parameterization:

```
D_i = (θ_i + α × S_i) / exp(-β × S_i / 2)
```

where:
- `D_i` = (logit(sens_i) - logit(1-spec_i)) / 2 (accuracy)
- `S_i` = logit(sens_i) + logit(1-spec_i) (threshold)
- `θ_i` = study-specific accuracy parameter
- `α` = mean accuracy across studies
- `β` = asymmetry parameter (shape of SROC curve)

### 2.2 Relationship to Bivariate Model

As demonstrated by Harbord et al. (2007), the bivariate and HSROC models are mathematically equivalent when:

- No covariates are included
- Correlation structure is unrestricted

The parameter transformations are:

```
α = (μ_A - μ_B) / 2
β = log(σ_A / σ_B)
Λ = (μ_A + μ_B) / 2
```

### 2.3 References

> Rutter CM, Gatsonis CA. A hierarchical regression approach to meta-analysis of diagnostic test accuracy evaluations. Stat Med. 2001;20(19):2865-2884. doi:10.1002/sim.942

> Harbord RM, Deeks JJ, Egger M, Whiting P, Sterne JA. A unification of models for meta-analysis of diagnostic accuracy studies. Biostatistics. 2007;8(2):239-251. doi:10.1093/biostatistics/kxl004

---

## 3. Estimation Methods

### 3.1 Primary Method: REML

Restricted Maximum Likelihood (REML) is the default estimation method:

**Algorithm:** Fisher scoring with analytical gradients

**Convergence criteria:**
- Maximum iterations: 100
- Tolerance: 1e-6 (relative change in log-likelihood)
- Parameter change tolerance: 1e-5

**Starting values:**
- `μ_A, μ_B`: Method of moments estimates
- `σ²_A, σ²_B`: DerSimonian-Laird estimates
- `ρ`: 0 (no initial correlation)

### 3.2 Fallback Method: DerSimonian-Laird

When REML fails to converge, DerSimonian-Laird (DL) is used:

```
τ² = max(0, (Q - (k-1)) / C)
```

where:
- `Q` = Cochran's Q statistic
- `k` = number of studies
- `C` = sum of weights minus sum of squared weights over sum of weights

### 3.3 Confidence Interval Methods

| Parameter | Primary Method | Alternative |
|-----------|---------------|-------------|
| Pooled estimates | Profile likelihood | Wald |
| Heterogeneity | Q-profile | Bootstrap |
| Prediction intervals | HKSJ-adjusted | Wald |

### 3.4 HKSJ Correction

For small samples (k < 10), the Hartung-Knapp-Sidik-Jonkman correction is applied:

```
t_HKSJ = θ̂ / √(q × V̂)
```

where `q` is the adjustment factor based on the residual heterogeneity.

### 3.5 References

> Hartung J, Knapp G. A refined method for the meta-analysis of controlled clinical trials with binary outcome. Stat Med. 2001;20(24):3875-3889. doi:10.1002/sim.1009

> DerSimonian R, Laird N. Meta-analysis in clinical trials. Control Clin Trials. 1986;7(3):177-188. doi:10.1016/0197-2456(86)90046-2

---

## 4. Heterogeneity Measures

### 4.1 Bivariate I-squared

DTA Pro computes bivariate I-squared following Jackson et al. (2012):

```
I²_bivariate = 1 - (k-1) / trace(Σ⁻¹ × Σ̂_between)
```

This generalizes univariate I² to the bivariate setting.

### 4.2 Cochran's Q

The Q statistic for DTA follows the generalized form:

```
Q = Σ_i (y_i - θ̂)' × V_i⁻¹ × (y_i - θ̂)
```

where `y_i` is the bivariate outcome vector for study i.

### 4.3 Prediction Intervals

95% prediction intervals are computed per IntHout et al. (2016):

```
PI = θ̂ ± t_(k-2, 0.975) × √(SE² + τ²)
```

### 4.4 References

> Jackson D, White IR, Riley RD. Quantifying the impact of between-study heterogeneity in multivariate meta-analyses. Stat Med. 2012;31(29):2805-2817. doi:10.1002/sim.5453

> IntHout J, Ioannidis JP, Rovers MM, Goeman JJ. Plea for routinely presenting prediction intervals in meta-analysis. BMJ Open. 2016;6(7):e010247. doi:10.1136/bmjopen-2015-010247

---

## 5. Publication Bias Assessment

### 5.1 Deeks Funnel Plot Asymmetry Test

DTA Pro implements the Deeks test for diagnostic studies:

```
1/√ESS_i = a + b × lnDOR_i + ε_i
```

where:
- `ESS_i` = effective sample size = 4 × (1/n1_i + 1/n0_i)⁻¹
- `lnDOR_i` = log diagnostic odds ratio
- Significance assessed via weighted regression

### 5.2 Trim and Fill

When asymmetry is detected, Duval and Tweedie's trim and fill method estimates missing studies:

1. Estimate number of missing studies (L₀)
2. Trim extreme studies
3. Re-estimate pooled effect
4. Fill with imputed studies
5. Compute adjusted estimate

### 5.3 Egger's Test (Univariate)

For univariate outcomes (e.g., DOR), Egger's regression test:

```
θ_i / SE_i = a + b × (1/SE_i) + ε_i
```

### 5.4 Exact Excess Significance (Poisson-Binomial)

In addition to the chi-square approximation for excess-significance testing, DTA Pro computes an exact one-sided tail probability for:

```
P(X >= O),   X = Σ Bernoulli(power_i)
```

where `O` is the observed number of significant studies and `power_i` is study-specific power under the FE or RE pooled effect.

This is evaluated via Poisson-binomial dynamic programming recursion (Hong, 2013), reducing approximation error when `k` is modest and powers are heterogeneous.

### 5.5 Worst-Case Selection Bounds (Partial Identification)

DTA Pro adds nonparametric worst-case bounds for pooled log-DOR under monotone publication mechanisms:

- Monotone in precision (`1/SE`)
- Monotone in `|z|` significance
- Monotone in a composite precision-significance rank

The implementation uses a step-monotone envelope over publication-probability floors (`p_min`) to report an identification interval for pooled DOR rather than a single corrected point estimate.

### 5.6 Significance Caliper Discontinuity Test

DTA Pro includes a near-threshold discontinuity diagnostic based on counts of study-level p-values:

- Left bin: `[0.04, 0.05)`
- Right bin: `[0.05, 0.06)`

Under no discontinuity, counts are expected to be similar. The app reports:

1. Exact one-sided binomial tail probability for excess left-bin counts
2. Normal approximation p-value
3. Left/right ratio with log-ratio CI

### 5.7 Selection-Ratio Sensitivity Curve

DTA Pro adds a publication-selection sensitivity model where statistically significant studies are assumed `eta` times more likely to be published than non-significant studies.

For each `eta` in a pre-specified grid, pooled log-DOR is re-estimated by inverse-selection reweighting, producing a sensitivity curve for DOR attenuation and robustness values (e.g., `eta` required for 20% attenuation or null crossing).

### 5.8 References

> Deeks JJ, Macaskill P, Irwig L. The performance of tests of publication bias and other sample size effects in systematic reviews of diagnostic test accuracy was assessed. J Clin Epidemiol. 2005;58(9):882-893.

> Duval S, Tweedie R. Trim and fill: A simple funnel-plot-based method of testing and adjusting for publication bias in meta-analysis. Biometrics. 2000;56(2):455-463. doi:10.1111/j.0006-341X.2000.00455.x

> Egger M, Davey Smith G, Schneider M, Minder C. Bias in meta-analysis detected by a simple, graphical test. BMJ. 1997;315(7109):629-634. doi:10.1136/bmj.315.7109.629

> Ioannidis JPA, Trikalinos TA. An exploratory test for an excess of significant findings. Clin Trials. 2007;4(3):245-253. doi:10.1177/1740774507079441

> Hong Y. On computing the distribution function for the Poisson binomial distribution. Comput Stat Data Anal. 2013;59:41-51. doi:10.1016/j.csda.2012.10.006

> Hattori S, Zhou XH. Publication bias correction and sensitivity analysis with diagnostics in meta-analysis of diagnostic test accuracy studies. Stat Med. 2024;43(6):1048-1067. doi:10.1002/sim.9979

> Gerber AS, Malhotra N. Do statistical reporting standards affect what is published? Publication bias in two leading political science journals. Sociol Methods Res. 2008;37(1):3-30.

> Brodeur A, L\'e M, Sangnier M, Zylberberg Y. Star Wars: The empirics strike back. Am Econ Rev. 2016;106(5):61-65.

> Mathur MB, VanderWeele TJ. Sensitivity analysis for publication bias in meta-analyses. JRSS-C. 2020;69(5):1091-1119.

---

## 6. Confidence Interval Methods

### 6.1 Wilson Score Interval

For individual study proportions:

```
p̃ = (x + z²/2) / (n + z²)
w = z × √(p(1-p)/n + z²/(4n²)) / (1 + z²/n)

CI = [p̃ - w, p̃ + w]
```

### 6.2 Clopper-Pearson Exact Interval

For extreme proportions or small samples:

```
Lower = Beta(α/2; x, n-x+1)
Upper = Beta(1-α/2; x+1, n-x)
```

### 6.3 Comparison of Methods

| Method | Coverage | Width | Recommended Use |
|--------|----------|-------|-----------------|
| Wilson | 94.5-95.5% | Narrower | Default for most cases |
| Clopper-Pearson | ≥95% | Wider | Small n, extreme p |
| Wald | 85-95% | Narrowest | Avoid |

---

## 7. Derived Measures

### 7.1 Diagnostic Odds Ratio (DOR)

```
DOR = (TP × TN) / (FP × FN)
```

With variance:
```
Var(lnDOR) = 1/TP + 1/FP + 1/FN + 1/TN
```

### 7.2 Likelihood Ratios

```
LR+ = Sensitivity / (1 - Specificity)
LR- = (1 - Sensitivity) / Specificity
```

### 7.3 Youden Index

```
J = Sensitivity + Specificity - 1
```

Optimal cutoff maximizes J.

### 7.4 Number Needed to Diagnose

```
NND = 1 / J = 1 / (Sens + Spec - 1)
```

---

## 8. Edge Case Handling

### 8.1 Zero Cells

When any cell contains zero, continuity corrections are applied:

| Scenario | Correction Method |
|----------|------------------|
| Single zero | Add 0.5 to all cells (Haldane) |
| Double zero (same row/col) | Add 0.5 to all cells |
| Double zero (diagonal) | Exclude study with warning |

### 8.2 Small Number of Studies

| k | Behavior |
|---|----------|
| k = 1 | Not supported; display study-level estimates only |
| k = 2 | Warning: "Results unreliable; consider narrative synthesis" |
| k = 3-4 | HKSJ correction automatically applied |
| k ≥ 5 | Standard analysis |

### 8.3 Extreme Heterogeneity

| I² Range | Warning |
|----------|---------|
| 0-25% | None |
| 25-50% | Moderate heterogeneity |
| 50-75% | Substantial heterogeneity |
| 75-95% | Considerable heterogeneity; explore sources |
| >95% | Extreme heterogeneity; pooling may not be appropriate |

### 8.4 Convergence Failures

When REML fails to converge:
1. Retry with alternative starting values
2. Fall back to DerSimonian-Laird
3. Display warning to user
4. Log convergence diagnostics

---

## 9. Validation

### 9.1 Reference Software

All methods validated against R mada package v0.5.12:

```r
# Example validation code
library(mada)
data <- data.frame(
  TP = c(85, 92, 78, ...),
  FP = c(12, 8, 15, ...),
  FN = c(8, 15, 12, ...),
  TN = c(145, 185, 195, ...)
)
fit <- reitsma(data)
summary(fit)
```

### 9.2 Acceptance Criteria

| Parameter | Tolerance |
|-----------|-----------|
| Pooled sensitivity/specificity | ±0.005 |
| Confidence intervals | ±0.02 |
| Heterogeneity (τ²) | ±0.05 |
| DOR | ±5% relative |

### 9.3 Test Coverage

- 19 statistical test suites
- 100 iterations per property-based test
- 3 benchmark datasets (k=3, k=10, k=12)
- Edge case coverage for zero cells, extreme values

---

## 10. Limitations

1. **Model assumptions**: Bivariate normal distribution of logit-transformed accuracies
2. **Independence**: Studies assumed independent (no multiple reports from same population)
3. **Threshold effects**: Single implicit threshold assumed unless meta-regression applied
4. **Missing data**: Complete case analysis only; studies with missing 2x2 data excluded

---

## 11. R Gap-Fill Extensions (v4.9.3)

To close R-side validation gaps for advanced app modules, v4.9.3 adds:

1. **Comparative DTA (paired studies):** logit-scale paired differences for sensitivity and specificity with delta-method confidence intervals on probability differences.
2. **Network DTA point ranking:** per-test pooled sensitivity/specificity and DOR-based point ranking with point-SUCRA summary.
3. **IPD two-stage DTA:** patient-level aggregation to study-level 2x2 tables followed by bivariate pooling.

Implementation file:

- `R_validation/advanced_gapfill_methods.R`

Generated reference artifact:

- `R_validation/advanced_validation_reference.json`

---

## 12. Novel Publication-Bias Sensitivity Method (v4.9.3)

DTA Pro now includes an R implementation of a **t-statistic selection-function sensitivity analysis for SROC**, based on a likelihood/sensitivity-analysis framework from the statistical literature:

- Selection model: `P(select | t) = Phi(beta * t + alpha)`
- `t` statistic based on a contrast of logit-sensitivity and logit-specificity (default contrast corresponds to log-DOR direction).
- Sensitivity parameter: marginal publication probability `p` (e.g., 1.0, 0.8, 0.6, 0.4), with resulting shifts in pooled sensitivity, specificity, DOR, and SAUC.

This method is implemented as a reproducible profile-based routine in:

- `R_validation/advanced_gapfill_methods.R` (`selection_sroc_sensitivity()`)

### 12.1 App-Side Copas-Like EM Selection Adjustment (v4.9.3)

The interactive **Selection Model Bias Adjustment** panel in `dta-pro-v3.7.html` now uses a Copas-like iterative estimator for DTA:

- Selection framework: probit selection-function profile with target publication probability `p` (mapped from mild/moderate/severe assumptions).
- Iterative update: inverse-probability weighted M-step updates for pooled logit-sensitivity/logit-specificity and heterogeneity terms until convergence tolerance is met.
- Output includes convergence diagnostics, estimated selection parameters (`alpha`, `beta`), and adjusted pooled sensitivity/specificity.

This replaces the previous heuristic weighting approximation with a likelihood-informed iterative routine aligned with Copas-style sensitivity analysis for publication bias.

### 12.2 Likelihood-Based Selection SROC Model with Uncertainty (v4.9.3)

The advanced publication-bias module now also includes a likelihood-based SROC selection model in the app:

- Uses a selection-function likelihood over publication probability `p` and selection parameters (`alpha`, `beta`) with Copas-like iterative fitting.
- Performs likelihood-ratio testing against a near-no-selection null (high publication-probability setting).
- Reports adjusted pooled sensitivity, specificity, DOR, and SAUC with percentile bootstrap confidence intervals.

This adds an inferential layer (model fit + uncertainty intervals) beyond profile-only sensitivity tables.

### 12.3 Additional Novel Publication-Bias Methods (v4.9.3)

The app now also includes two additional publication-bias diagnostics in the Publication Bias Suite:

1. **PET-PEESE small-study correction (DTA-adapted on log-DOR):**
   - PET model: `y_i ~ SE_i`
   - PEESE model: `y_i ~ SE_i^2`
   - Weighted regression correction is reported as an adjusted DOR.
2. **Excess significance test (Ioannidis-Trikalinos):**
   - Compares observed significant findings (`O`) against expected significant findings (`E`) based on estimated study power.
   - Reports chi-square test and `O/E` ratio for potential selective reporting signals.

---

## References

1. Reitsma JB, et al. J Clin Epidemiol. 2005;58:982-990
2. Rutter CM, Gatsonis CA. Stat Med. 2001;20:2865-2884
3. Harbord RM, et al. Biostatistics. 2007;8:239-251
4. Jackson D, et al. Stat Med. 2012;31:2805-2817
5. Hartung J, Knapp G. Stat Med. 2001;20:3875-3889
6. DerSimonian R, Laird N. Control Clin Trials. 1986;7:177-188
7. Deeks JJ, et al. J Clin Epidemiol. 2005;58:882-893
8. Duval S, Tweedie R. Biometrics. 2000;56:455-463
9. Egger M, et al. BMJ. 1997;315:629-634
10. IntHout J, et al. BMJ Open. 2016;6:e010247
11. Copas JB, Shi JQ. Stat Methods Med Res. 2001;10:251-265
12. Hattori S, Zhou XH. Stat Med. 2024;43:1048-1067
13. Stanley TD, Doucouliagos H. Res Synth Methods. 2014;5:60-78
14. Ioannidis JPA, Trikalinos TA. Clin Trials. 2007;4:245-253

---

*Document prepared for Research Synthesis Methods peer review submission*
