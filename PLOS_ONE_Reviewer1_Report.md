# PLOS ONE Peer Review Report

## Manuscript: DTA Pro v4.8 - A Web-Based Application for Diagnostic Test Accuracy Meta-Analysis

**Reviewer:** Reviewer 1 (Statistical Methodology Expert)
**Date:** 2026-01-19
**Manuscript ID:** PONE-D-26-XXXXX

---

## Recommendation: Minor Revision

---

## Summary

This manuscript presents DTA Pro v4.8, a browser-based tool for conducting diagnostic test accuracy meta-analyses. The application implements established statistical methods including bivariate generalized linear mixed models (Reitsma et al., 2005) and hierarchical summary ROC models (Rutter & Gatsonis, 2001). The tool has been validated against the R mada package with excellent agreement.

Overall, the manuscript meets PLOS ONE criteria for scientific rigor and technical soundness. Minor revisions are needed to strengthen the statistical documentation and edge case handling.

---

## PLOS ONE Criteria Assessment

### 1. Scientific Rigor and Methodology

| Criterion | Assessment | Score |
|-----------|------------|-------|
| Experiments rigorously conducted | Yes | 4/5 |
| Analysis performed to high standard | Yes | 5/5 |
| Conclusions supported by results | Yes | 5/5 |
| Methods described in detail | Partially | 3/5 |

**Comments:**

**Strengths:**
- Bivariate GLMM implementation correctly models the correlation between sensitivity and specificity
- REML estimation with Fisher scoring is appropriate for this model class
- The HKSJ correction for small samples (Hartung & Knapp, 2001) is a welcome addition often missing from competing tools
- Validation against R mada v0.5.12 shows excellent agreement (tolerance ±0.005)

**Areas for Improvement:**

1. **Convergence Diagnostics:** The manuscript should describe what diagnostics are reported when REML fails to converge. Specifically:
   - Are gradient norms reported?
   - Is the Hessian checked for positive definiteness?
   - What fallback method is used (DerSimonian-Laird is mentioned but not documented in the UI)?

2. **Boundary Constraints:** How does the software handle:
   - Correlation approaching ±1 (Heywood cases)?
   - Variance components approaching zero?
   - Perfect separation in individual studies?

3. **Small Sample Behavior:** While k=2 and k=3 are tested, the manuscript should clarify:
   - Minimum recommended k for reliable inference
   - Whether penalized likelihood is available for small k

### 2. Statistical Validity of Implemented Methods

| Method | Implementation | Validation Status |
|--------|---------------|-------------------|
| Bivariate GLMM | Correct | Validated |
| HSROC | Correct | Validated |
| Wilson Score CI | Correct | Validated |
| Clopper-Pearson CI | Correct | Validated |
| Deeks' Test | Correct | Validated |
| HKSJ Correction | Correct | Validated |
| Bootstrap CIs | Not independently verified | Needs validation |

**Specific Methodological Comments:**

1. **Line 3587 (bivariateGLMM function):** The bivariate normal assumption for random effects is standard but should be noted as a limitation. Consider adding a reference to Takwoingi et al. (2017) who discuss departures from this assumption.

2. **Line 4252 (deeksTest function):** The Deeks test is known to have low power with fewer than 10 studies. The software currently shows a warning but should quantify this limitation more explicitly (e.g., "With k=7 studies, this test has approximately 30% power to detect meaningful asymmetry").

3. **Zero Cell Handling:** The default 0.5 continuity correction is appropriate for most cases, but the manuscript should note that this can bias results when zeros are informative (e.g., highly specific tests). Consider adding the treatment arm continuity correction as an option.

### 3. Data Availability and Reproducibility

| Criterion | Status |
|-----------|--------|
| Code availability | Open source (HTML/JavaScript) |
| Test data included | Yes (multiple datasets) |
| Validation scripts provided | Yes (R code export) |
| Results reproducible | Yes |

**Comments:**

- The R script export feature is excellent for reproducibility
- Including Cochrane DTA review datasets adds credibility
- Edge case datasets (k=2, k=3, extreme heterogeneity) are valuable for testing

**Recommendation:** Add a DOI-registered archive (e.g., Zenodo) for version-controlled releases.

### 4. Presentation and Clarity

**Strengths:**
- Clear tab-based organization
- Informative tooltips and warnings
- Professional visualization using Plotly.js

**Weaknesses:**
- Statistical methods appendix needs expansion (see RSM Reviewer Report)
- Some advanced options lack documentation (e.g., convergence tolerance)

---

## Specific Comments by Section

### Data Input Panel
- **Good:** Real-time validation of 2x2 tables
- **Good:** Zero cell detection with visual warnings
- **Improve:** Add data import from common formats (RevMan, Stata)

### Results Panel
- **Good:** Comprehensive summary statistics
- **Good:** Model comparison when both models run
- **Improve:** Add AIC/BIC for model comparison

### SROC Curve
- **Excellent:** Confidence and prediction regions correctly implemented
- **Good:** Interactive study-level display
- **Minor:** Consider adding AUC with confidence interval

### Forest Plots
- **Good:** Paired forest plots for sensitivity/specificity
- **Good:** Weight visualization
- **Improve:** Allow sorting by effect size or weight

### Publication Bias
- **Good:** Deeks funnel plot correctly implemented
- **Good:** Trim-and-fill available
- **Improve:** Add contour-enhanced funnel plot option

### Clinical Utility
- **Excellent:** Fagan nomogram is interactive and well-designed
- **Good:** Probability modifying plot
- **Good:** Number needed to diagnose calculations

---

## Required Revisions

### Major (Required for Acceptance)

1. **Document convergence diagnostics** - Describe what information is provided when REML fails to converge and what fallback procedures are implemented.

2. **Clarify minimum k** - State the minimum number of studies recommended for reliable inference (suggest k ≥ 4 for point estimates, k ≥ 10 for heterogeneity measures).

3. **Archive code** - Deposit versioned code in a DOI-registered repository (Zenodo, Figshare, or OSF).

### Minor (Recommended)

1. Add model selection statistics (AIC, BIC, deviance)
2. Expand documentation of advanced settings
3. Include simulation study demonstrating coverage properties
4. Add acknowledgment of limitations in the UI

---

## Questions for Authors

1. Has the bootstrap CI implementation been validated against R boot package results?

2. What is the computational complexity of the REML algorithm, and what is the practical limit on number of studies?

3. Are there plans to add network DTA capabilities (multiple index tests)?

---

## References Cited

- Reitsma JB, et al. J Clin Epidemiol. 2005;58:982-990.
- Rutter CM, Gatsonis CA. Stat Med. 2001;20:2865-2884.
- Hartung J, Knapp G. Stat Med. 2001;20:3875-3889.
- Takwoingi Y, et al. Stat Methods Med Res. 2017;26:1896-1911.
- Deeks JJ, et al. J Clin Epidemiol. 2005;58:882-893.

---

## Confidential Comments to Editor

This manuscript describes a well-implemented statistical tool that fills a need in the diagnostic accuracy meta-analysis space. The core methods are sound and have been properly validated. The main concerns relate to documentation completeness rather than methodological errors.

The tool compares favorably to existing options (R mada, Meta-DiSc) in terms of usability while maintaining statistical rigor. I recommend acceptance after minor revisions.

**Conflict of Interest:** None declared.

---

*Review completed: 2026-01-19*
*Time spent: 3.5 hours*
