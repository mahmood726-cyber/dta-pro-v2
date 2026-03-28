# Review Findings: DTA Pro (DTA_Pro_Review)

**Date:** 2026-03-24
**App:** DTA Meta-Analysis Pro v4.8 (dta-pro.html)
**Location:** `C:\HTML apps\DTA_Pro_Review\`
**Papers:** F1000 Software Tool Article, PLOS ONE Manuscript (multiple drafts)

---

## Test Results Summary

### Selenium / GUI Tests (test_report.json, 2026-02-12)

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Setup | 3 | 0 | 3 |
| Accessibility | 9 | 0 | 9 |
| UI (tabs, datasets, plots) | 22 | 0 | 22 |
| Functions (exported) | 13 | 0 | 13 |
| Statistical (inline suite) | 4 | 0 | 4 |
| Edge Cases | 4 | 0 | 4 |
| **Selenium Total** | **63** | **0** | **63** |

### Statistical Test Suite (inline, browser-executed)

- 681 statistical tests passed (reported in test_report.json)
- R mada validation: Sensitivity matches (diff: 0.0000), Specificity matches (diff: 0.0000)

### R Parity (S2_Complete_Validation_Results.md)

- 27/27 PASS (100%) vs R mada 0.5.12
- Pre-specified tolerance: +/-0.005 (probability), +/-0.01 (variance)
- 3 datasets: Afzali 2012 (k=10), Glas 2003, and a third
- Metrics validated: pooled Sens/Spec, CIs, tau-squared, rho, DOR, PLR, NLR, AUC

### Combined Test Count

- 63 Selenium + 681 inline statistical = **744 total tests**

---

## Review Rounds

### Multi-Persona Review Round 1 (2026-02-05)

Identified: 1 Critical, 5 High, 10 Medium, 8 Low (24 total)

Key findings:
- **C1 (CRITICAL)**: `wilsonCI()` parameter mismatch -- alpha passed where z expected, collapsing individual study CIs
- **C2 (HIGH)**: Estimation method mislabeling (ML labeled as REML; DL labeled as HSROC)
- **H1-H5**: Score function incomplete, unconditional +0.5 correction, SRI hashes absent, DOM coupling, scoping bugs

**Status: All 24 issues fixed before Round 2**

### Multi-Persona Review Round 2 (2026-02-05)

Identified: 1 Critical, 7 High, 13 Medium, 13 Low (34 total)

Key findings:
- **C1 (CRITICAL)**: CSV formula injection in second export path (`exportDataCSV()`) unsanitized
- **H1**: `findOptimalThreshold()` broken (undeclared `studies` variable)
- **H2**: XSS via unsanitized study names in cumulative analysis and PPV/NPV tables
- **H3**: `logit(1.0)` produces Infinity in `getStudyData()`

### Verification Report (2026-02-07, v3.7)

5 critical division-by-zero issues identified in:
- `iSquaredWithCI()` (Q=0, df=0)
- `improvedBivariatePool()` (C1/C2=0)
- `pooledDORAnalysis()` (Q=0)
- `metaRegression()` (C1/C2=0)
- `bayesBivariatePool()` (C1/C2=0)

**Recommendation at time: NOT READY FOR PUBLIC RELEASE**

### 4-Persona Truth Review (2026-03-01)

| Persona | Verdict |
|---------|---------|
| Evidence Traceability | PASS |
| Artifact Consistency | PASS |
| Limitation Honesty | PASS |
| Language Truthfulness | PASS |
| **Overall** | **PASS** |

---

## P0 Issues (Critical / Blocking)

- **P0-1**: Division-by-zero guards in 5 locations (VERIFICATION_REPORT.txt). The v3.7 verification report flagged these. **Status: The v4.8 test_report.json (63/63 PASS, 681 statistical tests PASS) postdates this, suggesting fixes were applied, but no explicit fix confirmation document exists.**
- **P0-2**: CSV formula injection in `exportDataCSV()` (Round 2 C1). **Status: Likely fixed in v4.8+ but no explicit confirmation.**
- **P0-3**: XSS via unsanitized study names (Round 2 H2). **Status: Likely fixed but no explicit confirmation.**

## P1 Issues (High / Should-Fix)

- **P1-1**: `findOptimalThreshold()` broken due to undeclared variable (Round 2 H1). Needs verification that this was fixed.
- **P1-2**: Estimation method labeling accuracy (ML vs REML, DL vs HSROC). Needs verification that labels match actual algorithms.
- **P1-3**: SRI hashes claimed in manuscript but absent in HTML code (Round 1 H3).
- **P1-4**: No explicit fix-confirmation document linking Round 1+2 findings to verified fixes. A "fixes applied" audit trail is missing.

## P2 Issues (Low / Nice-to-Have)

None blocking.

---

## Verdict

**REVIEW CONDITIONAL**

Core statistical engine is validated (27/27 R parity, 681 statistical tests, 63 Selenium all PASS). However, the fix-confirmation chain for Round 1+2 critical findings (division-by-zero, CSV injection, XSS) lacks explicit documentation. The v4.8 test suite passing strongly suggests fixes were applied, but a formal fix-verification audit should be produced to close the gap. The 4-persona truth review (2026-03-01) passed, confirming paper claims are calibrated.
