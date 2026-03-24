# DTA Meta-Analysis Pro v4.9.1 -- Multi-Persona Code Review
## Consolidated Report (Planner + Builder + Verifier)
**Date:** 2026-02-05
**Methodology:** OpenClaw 3-role review (per CLAUDE.md Section 6)

---

## Executive Summary

Three independent review personas analyzed the ~22,000-line single-file application. The review identified **1 critical bug**, **5 high-severity issues**, **10 medium-severity issues**, and **8 low-severity issues**. The most impactful finding -- confirmed independently by both the Builder and Verifier -- is that `wilsonCI()` receives `alpha=0.05` where it expects `z=1.96`, producing individual study confidence intervals that are **~39x too narrow**. Secondary critical findings include mislabeled estimation methods (ML labeled as REML; DL-moments labeled as HSROC) and incomplete score function derivatives in the bivariate optimizer.

Despite these issues, the core pooled point estimates (sensitivity, specificity, DOR) from the bivariate GLMM are correct and match R mada validation targets. The problems primarily affect: (1) individual study CIs, (2) variance component SEs, (3) likelihood ratio CIs, (4) prediction intervals, and (5) method labeling accuracy.

---

## CRITICAL FINDINGS (Corroborated by Multiple Personas)

### C1. `wilsonCI` Parameter Mismatch -- All Individual Study CIs Are Wrong
**Found by:** Builder (B01), Verifier (Finding 1)
**Lines:** 3247, 3803-3804 (call sites), 16816 (definition)
**Severity:** CRITICAL

The function signature expects a z-score (`z=1.96`), but all production call sites pass `alpha=0.05`. Wilson CIs collapse to near-zero width. The test suite at line 265 calls it correctly with `z=1.96`, masking the bug entirely.

**Affected outputs:** Forest plot crosshairs, study-level CI table, crosshairs plot, threshold analysis.
**Not affected:** Pooled model CIs (computed via bivariate covariance matrix, separate code path).

**Fix:** Change `wilsonCI(x, n, z=1.96)` to accept alpha: `function wilsonCI(x, n, alpha=0.05) { const z = jStat.normal.inv(1 - alpha/2, 0, 1); ... }`

---

### C2. Estimation Method Mislabeling
**Found by:** Builder (B02), Verifier (Finding 2, Finding 5)
**Severity:** HIGH (impacts reproducibility claims)

| What code does | What code claims |
|----------------|-----------------|
| ML log-likelihood (line 4123) | "REML" (lines 3961, 4218, 4232) |
| DL method-of-moments for HSROC (lines 4583-4586) | "HSROC (Rutter-Gatsonis)" (line 4544) |
| Unconverged REML iteration values (line 4231) | "DerSimonian-Laird fallback" |

**Impact:** Papers citing this tool's REML or HSROC output would misrepresent the method used. ML underestimates between-study variance vs REML for small k. The "HSROC" is actually univariate DL applied to D and S dimensions independently.

**Fix:** Either implement true REML/HSROC or relabel honestly. At minimum, rename `hsrocModel` to reflect the actual estimation method.

---

## HIGH-SEVERITY FINDINGS

### H1. Score Function Missing Second-Row Quadratic Form
**Found by:** Builder (B03), Planner (Risk 1)
**Lines:** 4146-4158
**Impact:** Variance component gradient is incomplete. The model still converges due to aggressive damping (0.3) and ridge regularization, but convergence is slower and SE estimates may be inaccurate.

### H2. `improvedBivariatePool()` Unconditional +0.5 Correction
**Found by:** Builder (B04), Planner (H3)
**Lines:** 3147-3150
**Impact:** All studies (not just zero-cell studies) receive continuity correction, biasing sensitivity/specificity toward 0.5. Affects test comparison features and R validation display.

### H3. SRI Hashes Claimed in Manuscript but Absent in Code
**Found by:** Planner (H1)
**Lines:** 52-60 (code), line 76 of `DTA_Pro_PLOS_ONE_Manuscript_Final.md`
**Impact:** Security vulnerability (CDN supply chain) and factual discrepancy between manuscript and code. The Reviewer 2 re-review at `PLOS_ONE_Reviewer2_ReReview.md` lines 56-73 specifically verified SRI hashes -- but those hash values do not appear in the actual HTML file.

### H4. DOM Coupling in Statistical Functions
**Found by:** Planner (H4)
**Lines:** 4258, 4408, 4616
**Impact:** `hsrocModel()` at line 4616 has no fallback value -- produces NaN cascade when DOM element absent. Prevents unit testing of statistical functions outside a browser.

### H5. `fisherInverse` / `gradientNorm` Scoping Bugs
**Found by:** Builder (B05, B06), Verifier (Finding 6)
**Lines:** 4189, 4201, 4221-4222
**Impact:** `gradientNorm` is always NaN (convergence diagnostic non-functional). `fisherInverse` capture timing is tautological due to `iter === iterations - 1` always being true. Variance component SEs in the parameter table may be unreliable.

---

## MEDIUM-SEVERITY FINDINGS

### M1. HSROC SEs Forced Equal for Sensitivity and Specificity
**Found by:** Builder (B08), Verifier (Finding 3)
**Lines:** 4609-4610
**Impact:** Missing `Cov(Lambda, Theta)` term forces `seMu1 === seMu2`, producing artificially symmetric CIs.

### M2. Delta Method for PLR/NLR CIs Missing Covariance Term
**Found by:** Builder (B07), Verifier (Finding 8), Planner (Section 2.4)
**Lines:** 4278-4279 (covariance available at 4252 but unused)
**Impact:** LR confidence intervals ignore the estimated correlation between sensitivity and specificity.

### M3. Bootstrap Non-Reproducible (Unseeded RNG)
**Found by:** Verifier (Finding 4)
**Lines:** 4867, 4378-4385
**Impact:** Same data produces different bootstrap CIs each run. `seedRandom` exists at line 13044 but is never connected.

### M4. Prediction Intervals Hardcoded at z=1.96 in UI
**Found by:** Planner (H2), Verifier (Finding 9)
**Lines:** ~5034-5037
**Impact:** Prediction intervals ignore user confidence level, use normal instead of t-distribution, and omit estimation uncertainty. Model computes correct values but UI overwrites them.

### M5. Bootstrap Silent Failure Absorption
**Found by:** Builder (B09)
**Lines:** 4875-4876
**Impact:** Empty `catch(e) {}` silently discards failed bootstrap samples. No failure count returned. CIs biased toward convergent (less extreme) samples.

### M6. tau-squared Cannot Reach Zero
**Found by:** Builder (B11), Planner (L1)
**Lines:** 4087 (`Math.max(0.01, ...)`), 4198 (`RIDGE_BASE = 0.001`)
**Impact:** Truly homogeneous datasets cannot be identified. COVID dataset expects `tau2_spec = 0.0000` but model reports >= 0.001.

### M7. Cache Not Invalidated on Settings Change
**Found by:** Planner (M3)
**Lines:** ComputationCache at ~20166, cache key at ~4933
**Impact:** Changing confidence level or convergence tolerance returns stale cached results within 5-minute TTL.

### M8. CSV Export Formula Injection
**Found by:** Verifier (Finding 10)
**Lines:** 3937-3938
**Impact:** Study names starting with `=`, `+`, `-`, `@` are not sanitized in CSV export, enabling formula injection in spreadsheet applications.

### M9. Cumulative Meta-Analysis Mutates Study Array
**Found by:** Verifier (Finding 12)
**Line:** 9622
**Impact:** In-place sort changes study order for subsequent analyses.

### M10. "Network DTA" Tab Misrepresents Independent Per-Test Analysis
**Found by:** Planner (M4)
**Lines:** Tab at 189, `runNetworkDTA()` at 13243
**Impact:** Not a proper network meta-analysis model. Could mislead users.

---

## LOW-SEVERITY FINDINGS

| ID | Finding | Lines | Source |
|----|---------|-------|--------|
| L1 | BCa claimed in header, percentile implemented | 29, 4878-4882 | Builder B10 |
| L2 | Unused `quad` variable in inner loop | 4140 | Builder B13 |
| L3 | HSROC `converged: true` hardcoded | 4629 | Builder B14 |
| L4 | AUC silently clamped to [0.5, 1.0] | 4513 | Verifier F15 |
| L5 | 7 redundant local `invLogit` definitions | Various | Planner L3 |
| L6 | Dead code (`addCochraneDatasetMenu`) | 20704 | Planner L2 |
| L7 | `window.lastResults` leaked to global scope | 4972 | Builder B17 |
| L8 | Missing `worker-src blob:` in CSP | 6 | Planner M1 |

---

## CROSS-PERSONA VALIDATION MATRIX

Issues found by multiple personas carry higher confidence:

| Finding | Planner | Builder | Verifier | Confidence |
|---------|---------|---------|----------|------------|
| wilsonCI parameter bug | - | B01 | F1 | **Highest** (2/3) |
| ML mislabeled as REML | - | B02 | F2 | **Highest** (2/3) |
| Score function incomplete | Risk 1 | B03 | - | **High** (2/3) |
| Unconditional +0.5 correction | H3 | B04 | - | **High** (2/3) |
| fisherInverse scoping | - | B05 | F6 | **High** (2/3) |
| gradientNorm always NaN | - | B06 | F6 | **High** (2/3) |
| HSROC equal SEs | - | B08 | F3 | **High** (2/3) |
| LR CI missing covariance | S2.4 | B07 | F8 | **Highest** (3/3) |
| Prediction interval UI bug | H2 | - | F9 | **High** (2/3) |
| Bootstrap non-reproducible | - | - | F4 | Medium (1/3) |
| SRI hashes missing | H1 | - | - | Medium (1/3) |

---

## WHAT IS CORRECT AND WELL-DONE

The review is not solely negative. The following aspects were validated as correct:

1. **Core bivariate GLMM pooled point estimates** -- sensitivity, specificity, and DOR match R mada within 0.005 tolerance across all validation datasets
2. **Deeks' test effective sample size formula** -- correct per Deeks (2005)
3. **Zero-cell handling on the main analysis path** -- no double correction occurs
4. **Wilson CI formula itself** -- correct implementation, just called with wrong parameter
5. **Input validation** -- negative values, empty cells, missing diseased/healthy caught properly
6. **WCAG 2.1 AA accessibility** -- comprehensive skip links, ARIA roles, keyboard navigation, live regions
7. **Leave-one-out sensitivity analysis** -- correctly re-fits model for each omission
8. **Study-level DOR, PLR, NLR calculations** -- mathematically correct
9. **Heterogeneity interpretation thresholds** -- aligned with Higgins & Thompson (2002)
10. **Overall UI/UX** -- dark/light theme, responsive design, clear tab organization

---

## PRIORITIZED ACTION PLAN

### Phase 1: Must Fix (Before Any Clinical Use)
1. Fix `wilsonCI` to accept alpha (C1)
2. Either implement true REML or rename to ML (C2)
3. Add SRI hashes to CDN scripts (H3)
4. Fix prediction interval UI to use model-computed values (M4)

### Phase 2: Should Fix (For Statistical Rigor)
5. Fix score function quadratic form (H1)
6. Make `improvedBivariatePool` conditional on zero cells (H2)
7. Remove DOM access from statistical functions (H4)
8. Add covariance term to LR delta method (M2)
9. Fix HSROC seMu1/seMu2 with covariance term (M1)
10. Seed bootstrap RNG for reproducibility (M3)

### Phase 3: Should Fix (For Quality)
11. Fix `fisherInverse`/`gradientNorm` scoping (H5)
12. Count and warn on bootstrap failures (M5)
13. Allow tau-squared to reach zero (M6)
14. Invalidate cache on settings change (M7)
15. Sanitize CSV export (M8)
16. Clone studies before sorting (M9)

### Phase 4: Nice to Have
17. Relabel "Network DTA" (M10)
18. Correct BCa claim to percentile (L1)
19. Remove dead code and redundant definitions (L2, L5, L6, L7)
20. Add AUC confidence intervals (Planner L4)

---

## AUDIT LOG (Per CLAUDE.md Section 6)

| Persona | Tool Calls | Tokens Used | Duration | Key Sections Reviewed |
|---------|-----------|-------------|----------|----------------------|
| Planner | 49 | ~96K | ~179s | Architecture, CSP, dependencies, risk areas, feature completeness |
| Builder | 42 | ~119K | ~288s | Statistical implementations, test suite, code quality, documentation |
| Verifier | 39 | ~92K | ~141s | Edge cases, determinism, security, adversarial inputs, consistency |

---

*Generated by multi-persona review per CLAUDE.md Section 6 (OpenClaw "brains vs hands" loop)*
*Verification: Verifier has run and recorded checks in this audit log*
