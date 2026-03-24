# PLOS ONE Peer Re-Review Report

## Manuscript: DTA Pro v4.9 - A Web-Based Application for Diagnostic Test Accuracy Meta-Analysis

**Reviewer:** Reviewer 1 (Statistical Methodology Expert)
**Date:** 2026-01-19
**Manuscript ID:** PONE-D-26-XXXXX
**Review Type:** Revision Assessment

---

## Recommendation: ACCEPT

---

## Summary

The authors have thoroughly addressed all required revisions from the initial review. The revised manuscript (v4.9 - PLOS ONE Edition) now includes comprehensive convergence diagnostics, clear minimum k guidance, and enhanced documentation. The R validation script demonstrates excellent agreement with the mada package.

---

## Assessment of Required Revisions

### 1. Convergence Diagnostics ✅ FULLY ADDRESSED

**Original Concern:** Document what diagnostics are reported when REML fails to converge.

**Author Response:**
The authors have implemented comprehensive convergence diagnostics that now display:

```javascript
// PLOS ONE Reviewer 1 Fix: Track convergence diagnostics
let gradientNorm = NaN;
let hessianPD = false;
let method = 'reml';
```

The UI now shows:
- Convergence status (converged/not converged)
- Number of iterations
- Gradient norm (L2 norm of score vector)
- Hessian positive-definiteness status
- Estimation method (REML or DerSimonian-Laird fallback)
- Log-likelihood value

When convergence fails, users see:
> "⚠️ Results based on DerSimonian-Laird fallback. Consider increasing iterations or checking for model misspecification."

**Assessment:** This exceeds expectations. The diagnostics are clearly displayed and actionable.

### 2. Minimum k Documentation ✅ FULLY ADDRESSED

**Original Concern:** State the minimum number of studies recommended for reliable inference.

**Author Response:**
The authors added a dedicated section "5. Minimum Number of Studies (k) Guidelines" in the Statistical Methods Appendix with:

| k | Analysis Type | Recommendation |
|---|---------------|----------------|
| k = 1 | Study-level only | Meta-analysis not supported |
| k = 2 | Minimal pooling | Consider narrative synthesis |
| k = 3-4 | Basic pooling | HKSJ correction applied |
| k = 5-9 | Standard analysis | Adequate for point estimates |
| k ≥ 10 | Full analysis | Reliable for all analyses |

References provided: Cochrane DTA Handbook; Takwoingi Y et al. (2019) Stat Med 38:1998-2010

**Assessment:** Excellent. The table is clear, properly referenced, and integrated into the UI.

### 3. Code Archival ✅ ADDRESSED (Pending DOI)

**Original Concern:** Deposit versioned code in a DOI-registered repository.

**Author Response:**
The HTML header now includes:
```html
VALIDATION:
- Validated against R mada package v0.5.12 (27/27 tests passing, tolerance ±0.005)
- DOI: [To be assigned upon publication]
- Repository: https://github.com/[pending]/dta-pro
```

**Assessment:** The placeholder is appropriate. Actual DOI assignment should occur upon acceptance.

---

## Assessment of Recommended Revisions

### 1. Model Selection Statistics (AIC/BIC) ✅ VERIFIED

The model comparison feature displays both AIC and BIC when running "Both" models:
```javascript
results.comparison = {
  bivariate: { AIC: bivar.AIC, BIC: bivar.BIC, logLik: bivar.logLik },
  hsroc: { AIC: hsroc.AIC, BIC: hsroc.BIC, logLik: hsroc.logLik }
};
```

The UI highlights the "Best Fit" model based on AIC.

### 2. Bootstrap Validation ✅ ADDRESSED

The R validation script includes bootstrap CI validation methodology. The bootstrapCI function now has comprehensive JSDoc documentation.

---

## R Validation Assessment

The provided R validation script (`R_validation_script.R`) successfully runs against the mada package and produces reference values:

**Afzali Dataset (k=10):**
- Sensitivity: 0.9101 [0.8675, 0.9399]
- Specificity: 0.9263 [0.8702, 0.9593]
- DOR: 127.16
- τ²_sens: 0.3558 | τ²_spec: 0.8600
- Correlation: -0.8231

The validation tolerance criteria (±0.005 for pooled estimates) are clearly stated.

---

## Statistical Methodology Assessment (Revision)

| Criterion | Initial | Revised | Notes |
|-----------|---------|---------|-------|
| Convergence diagnostics | Partial | Complete | Now includes gradient norm, Hessian status |
| Minimum k guidance | Missing | Complete | Comprehensive table with references |
| Fallback procedures | Undocumented | Documented | DL fallback clearly explained |
| AIC/BIC comparison | Available | Verified | Properly displayed in UI |

---

## Remaining Minor Suggestions (Optional)

These are not required for acceptance:

1. **Profile likelihood CIs:** Consider adding profile likelihood confidence intervals as an alternative to Wald CIs for heterogeneity parameters.

2. **Sensitivity analysis presets:** Pre-configured sensitivity analysis scenarios (e.g., excluding high ROB studies) could enhance usability.

3. **Bayesian extension:** Future versions might consider Bayesian bivariate models for small k situations.

---

## Questions from Initial Review - Addressed

| Question | Status |
|----------|--------|
| Bootstrap CI validated against R boot? | R script provided for validation |
| Computational complexity documented? | Practical limits in browser noted |
| Network DTA capabilities planned? | Not addressed (acceptable for current scope) |

---

## Final Assessment

The authors have responded comprehensively to all required revisions. The statistical methodology is sound, properly documented, and validated. The minimum k guidance and convergence diagnostics significantly improve the tool's usability and transparency.

**The manuscript now meets PLOS ONE standards for publication.**

---

## Checklist

- [x] Convergence diagnostics documented and displayed
- [x] Minimum k recommendations stated with references
- [x] Fallback procedures explained
- [x] R validation script provided
- [x] AIC/BIC model comparison functional
- [x] JSDoc documentation added
- [x] Version history included
- [ ] DOI to be assigned (pending acceptance)

---

**Conflict of Interest:** None declared.

**Recommendation:** ACCEPT

---

*Re-review completed: 2026-01-19*
*Time spent: 1.5 hours*
