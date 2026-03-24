# PLOS ONE Peer Review

**Manuscript ID:** PONE-D-26-XXXXX
**Title:** DTA Meta-Analysis Pro: A validated, accessible web-based tool for diagnostic test accuracy meta-analysis
**Article Type:** Software/Methods

---

## REVIEWER 1 (Statistical Methods & Validation)

**Recommendation:** Minor Revision

### Summary

This manuscript describes DTA Meta-Analysis Pro, a browser-based tool for diagnostic test accuracy meta-analysis. The authors have addressed many concerns from the previous review round, including accessibility improvements and documentation of statistical methods. The validation against R mada is comprehensive. However, several issues require attention before publication.

### Major Comments

**1. Incomplete Reference List (CRITICAL)**

Multiple references contain placeholder text "Defined" instead of actual author names (References 1, 2, 3, 6, 9, 11, 12, 16, 17, 20, 21, 23, 24, 25, 26). This must be corrected with proper citations. For example:

- Reference 1 should cite: Defined JJ → Defined JJ (Cochrane Handbook chapter authors)
- Reference 17 (Deeks test) should be: Defined JJ → Deeks JJ

This is a fundamental requirement for publication.

**2. Validation Protocol - Independent Verification**

While the authors compare DTA Pro against R mada, both could theoretically contain the same systematic error. Consider:
- Adding validation against a second independent source (e.g., Stata midas, or hand calculations for simple cases)
- Providing worked examples with step-by-step calculations that readers can verify manually

**3. HSROC Model Description Incomplete**

The HSROC model section (lines 86-88) is notably brief compared to the bivariate model description. Please provide:
- Full parameterization of the model
- Explanation of how accuracy (Theta), threshold (Lambda), and shape (beta) parameters relate to clinical interpretation
- Mathematical notation or at minimum prose equivalent

### Minor Comments

**4. Table 1 Formatting**

Edge case rows show "Within tolerance" without specific numeric values. For transparency, report actual DTA Pro and R mada values for these edge cases, even if summarized.

**5. Tolerance Justification**

The pre-specified tolerance of ±0.005 for proportions is stated but not justified. Why is this threshold clinically or statistically meaningful? A brief rationale would strengthen the validation claims.

**6. Bootstrap CI Implementation**

Line 112 mentions "bias-corrected and accelerated method" but the Results do not present any bootstrap-based confidence intervals. Either:
- Present validation results for bootstrap CIs, or
- Clarify this is an optional feature not validated in this study

**7. Line 92 - Convergence Criteria**

"parameter change less than 10^-4" - is this absolute or relative change? Please specify.

**8. Software Version Statement**

The manuscript does not clearly state which version of DTA Pro was validated. Abstract mentions the tool but not version; Results section should state "DTA Meta-Analysis Pro version 4.9.1" explicitly.

### Statistical Accuracy

The reported validation results appear sound. The differences between DTA Pro and R mada (e.g., 0.0001 for sensitivity) are well within expected floating-point precision limits. The inclusion of variance components and correlation validation is commendable.

### Questions for Authors

1. How does DTA Pro handle non-convergence? Are users warned?
2. Is there a mechanism to detect and warn about sparse data beyond zero cells?
3. What happens when the Hessian is not positive definite?

---

## REVIEWER 2 (Clinical Utility & Usability)

**Recommendation:** Minor Revision

### Summary

This manuscript presents a valuable tool that addresses a genuine need in the systematic review community. The accessibility features are appreciated. However, several aspects require clarification for clinical users.

### Major Comments

**1. User Testing Not Reported**

The manuscript validates statistical accuracy but does not report any user testing. PLOS ONE readers would benefit from knowing:
- Has the tool been pilot-tested with actual systematic reviewers?
- What is the learning curve for users unfamiliar with DTA meta-analysis?
- Are there plans for user experience studies?

Consider adding a brief statement about user testing status or planned evaluations.

**2. Error Handling and User Guidance**

The Discussion mentions warnings for small sample sizes, but the Methods section does not describe the full error handling system:
- What errors can users encounter?
- How are invalid inputs handled (negative values, non-numeric entries)?
- Are error messages written for clinical researchers or statisticians?

**3. Clinical Interpretation Guidance**

While the tool calculates likelihood ratios and post-test probabilities, does it provide interpretation guidance for clinicians? For example:
- What constitutes a "useful" positive likelihood ratio?
- When should results NOT be used clinically due to high heterogeneity?
- Are there warnings when I-squared exceeds concerning thresholds?

### Minor Comments

**4. QUADAS-2 Integration**

Line 159 mentions "quality assessment summary" and Table 2 mentions "Quality assessment integration," but no details are provided about how QUADAS-2 is implemented. Please describe:
- Can users enter QUADAS-2 domain assessments?
- Is there visual representation of quality across studies?
- Does quality assessment integrate with the statistical analysis (e.g., sensitivity analysis by quality)?

**5. Data Export Formats**

Line 160 mentions "Exportable tables (CSV) and figures (PNG)." Modern systematic review workflows often require:
- Direct export to RevMan format
- Integration with GRADE/GRADEpro
- Structured data formats (JSON, XML)

Are additional export formats available or planned?

**6. Offline Capability Verification**

Table 2 claims "Offline capable: Yes." Please clarify:
- Does the application work entirely offline after initial load?
- Are external CDN-hosted libraries cached appropriately?
- What functionality (if any) requires internet connection?

**7. Browser Compatibility**

The Supporting Information mentions Chrome 90+, Firefox 90+, Safari 15+, Edge 90+. Has testing been performed on mobile browsers? Many researchers access tools via tablets.

### Positive Aspects

- The Fagan nomogram feature is excellent for clinical communication
- Accessibility compliance (WCAG 2.1 Level AA) is commendable and rarely seen in academic software
- The single-file architecture genuinely reduces barriers to adoption
- Convergence diagnostics transparency addresses a real gap in existing tools

### Questions for Authors

1. Is there a tutorial or worked example for first-time users?
2. Can analyses be saved and reloaded?
3. Is there version control or audit trail for analyses?

---

## ACADEMIC EDITOR DECISION

**Decision:** Minor Revision Required

### Summary Assessment

This manuscript describes a potentially valuable contribution to the diagnostic test accuracy meta-analysis toolkit. The software addresses a genuine accessibility gap, and the validation methodology is sound. However, several issues must be addressed before the manuscript can be accepted.

### Required Revisions

**Priority 1 - Must Address:**

1. **Complete the reference list** - Replace all "Defined" placeholders with actual author names. This is essential for publication. (Reviewer 1, Comment 1)

2. **State software version explicitly** - Add "version 4.9.1" in the Abstract and Results sections. (Reviewer 1, Comment 8)

3. **Expand HSROC model description** - The current description is inadequate. Provide sufficient detail for readers to understand the model parameterization. (Reviewer 1, Comment 3)

**Priority 2 - Strongly Recommended:**

4. **Justify tolerance thresholds** - Briefly explain why ±0.005 was chosen as clinically/statistically meaningful. (Reviewer 1, Comment 5)

5. **Describe error handling** - Add a brief paragraph in Methods about how the application handles invalid inputs and non-convergence. (Reviewer 2, Comment 2)

6. **Clarify QUADAS-2 implementation** - Describe how quality assessment is integrated. (Reviewer 2, Comment 4)

7. **Address edge case reporting** - Report specific values for edge case validation, not just "Within tolerance." (Reviewer 1, Comment 4)

**Priority 3 - Consider Addressing:**

8. **User testing statement** - Add a sentence about whether user testing has been conducted or is planned. (Reviewer 2, Comment 1)

9. **Bootstrap CI validation** - Either validate or clarify scope of bootstrap feature. (Reviewer 1, Comment 6)

10. **Offline capability details** - Clarify what works offline. (Reviewer 2, Comment 6)

### Additional Editorial Comments

**Formatting Issues:**

1. Table 1 edge case rows have inconsistent formatting - standardize presentation
2. Some abbreviations in Table 2 (HSROC, SROC) are defined in the note but should also be spelled out on first use in the main text
3. Figure captions are appropriate but ensure actual figures meet PLOS ONE resolution requirements (300 DPI minimum)

**Language/Style:**

- The manuscript is generally well-written
- Line 72: "hypertext markup language" - acceptable to use "HTML" after defining once
- Consider reducing repetition of full tool name; after first use, "DTA Pro" is acceptable throughout

**Data Availability:**

The statement mentions GitHub but provides placeholder URL. Ensure:
- Repository is public before publication
- Repository includes version tag matching manuscript
- README provides installation/usage instructions
- License file (MIT as stated) is included

**Supporting Information:**

- S1, S2, S3 files referenced appropriately
- Ensure file formats comply with PLOS ONE requirements
- R script (S1) should be tested and include session info

### Timeline

Please submit your revised manuscript within **30 days**. Include a point-by-point response to all reviewer comments. Changes in the manuscript should be highlighted or tracked.

### Positive Assessment

Despite required revisions, this manuscript has significant merit:
- Addresses a genuine gap in accessible DTA meta-analysis tools
- Rigorous validation methodology
- Excellent attention to accessibility standards
- Comprehensive feature set
- Transparent convergence reporting

We look forward to receiving your revised manuscript.

---

**Academic Editor**
PLOS ONE

---

## SUMMARY OF REQUIRED CHANGES

| # | Issue | Priority | Section |
|---|-------|----------|---------|
| 1 | Fix placeholder author names in references | Critical | References |
| 2 | State software version (4.9.1) explicitly | High | Abstract, Results |
| 3 | Expand HSROC model description | High | Methods |
| 4 | Justify ±0.005 tolerance threshold | Medium | Methods |
| 5 | Describe error handling system | Medium | Methods |
| 6 | Detail QUADAS-2 implementation | Medium | Methods |
| 7 | Report edge case specific values | Medium | Results/Table 1 |
| 8 | Add user testing statement | Low | Discussion |
| 9 | Clarify bootstrap CI validation scope | Low | Methods/Results |
| 10 | Specify offline capabilities | Low | Methods |
| 11 | Standardize Table 1 formatting | Low | Results |
| 12 | Ensure GitHub repository is ready | Required | Data Availability |

---

**Review Date:** 2026-01-19
**Manuscript Version:** Initial Formatted Submission
