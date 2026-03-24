# PLOS ONE Editorial Decision

## Manuscript: DTA Pro v4.8 - A Web-Based Application for Diagnostic Test Accuracy Meta-Analysis

**Manuscript ID:** PONE-D-26-XXXXX
**Academic Editor:** [Editor Name]
**Date:** 2026-01-19
**Article Type:** Software/Methods Article

---

## DECISION: Minor Revision

---

Dear Authors,

Thank you for submitting your manuscript "DTA Pro v4.8 - A Web-Based Application for Diagnostic Test Accuracy Meta-Analysis" to PLOS ONE. Your manuscript has been reviewed by two experts in the field.

Both reviewers found the manuscript to describe a scientifically sound and useful tool for the evidence synthesis community. The statistical methods are correctly implemented and appropriately validated against established reference software. The accessibility features are commendable and enhance usability for researchers with disabilities.

However, both reviewers identified areas requiring attention before the manuscript can be accepted. Please address the following points in your revision.

---

## Summary of Reviews

| Reviewer | Recommendation | Key Concerns |
|----------|---------------|--------------|
| Reviewer 1 | Minor Revision | Convergence diagnostics, minimum k documentation |
| Reviewer 2 | Minor Revision | Version control, software sustainability |

**Overall Assessment:**
- Statistical implementation: Excellent
- Validation: Comprehensive
- Accessibility: Excellent (WCAG 2.1 AA)
- Documentation: Needs improvement
- Software sustainability: Needs attention

---

## Required Revisions

The following revisions are **required** for acceptance. Please address each point and indicate where changes have been made in your response letter.

### 1. Statistical Documentation (Reviewer 1)

**Issue:** The manuscript lacks sufficient detail on convergence diagnostics and fallback procedures.

**Required Action:**
- Document what diagnostics are reported when REML fails to converge
- Describe the fallback to DerSimonian-Laird estimation
- State the recommended minimum number of studies (k) for reliable inference

### 2. Version Control and Archival (Reviewer 2)

**Issue:** No evidence of version control or long-term archival strategy.

**Required Action:**
- Establish a public Git repository (GitHub, GitLab, or Bitbucket)
- Add README.md, CHANGELOG.md, and LICENSE files
- Archive a versioned release in a DOI-registered repository (Zenodo, Figshare, or OSF)
- Provide the DOI in the revised manuscript

### 3. Software Sustainability Statement

**Issue:** No information on long-term maintenance.

**Required Action:**
Add a section addressing:
- Maintenance plan and update schedule
- How users report bugs or request features
- Policy on community contributions (if any)

### 4. Code Documentation

**Issue:** Function documentation is sparse.

**Required Action:**
- Add JSDoc-style comments to all major statistical functions
- Include method references in comments where applicable

---

## Recommended Revisions

The following revisions are **strongly recommended** but not required for acceptance:

### 1. Model Selection Statistics (Reviewer 1)
Consider adding AIC/BIC for comparing bivariate and HSROC models.

### 2. Subresource Integrity (Reviewer 2)
Add SRI hashes to CDN script tags for security.

### 3. Browser Compatibility Documentation
Document tested browser versions and any known compatibility issues.

### 4. Bootstrap Validation
Provide validation of bootstrap CI results against R boot package.

---

## Response Requirements

When submitting your revision, please:

1. **Response Letter:** Provide a point-by-point response to each reviewer comment, indicating:
   - How you addressed the concern, OR
   - Why you believe the concern does not require changes

2. **Track Changes:** Submit a marked-up version showing all changes

3. **Clean Copy:** Submit a clean final version

4. **Repository Link:** Include the URL to your public repository and DOI

---

## Reviewer Comments (Full)

### Reviewer 1 Comments

Reviewer 1 is an expert in statistical methodology for diagnostic test accuracy meta-analysis.

**Major Points:**
1. Document convergence diagnostics and fallback procedures
2. Clarify minimum k for reliable inference
3. Archive code in DOI-registered repository

**Minor Points:**
1. Add model selection statistics (AIC, BIC)
2. Expand documentation of advanced settings
3. Acknowledge limitations in the UI

Please see the full Reviewer 1 report for detailed comments.

### Reviewer 2 Comments

Reviewer 2 is an expert in software engineering and reproducibility.

**Major Points:**
1. Establish version control repository
2. Improve error handling documentation
3. Add JSDoc comments to exported functions

**Minor Points:**
1. Implement CI/CD pipeline
2. Add SRI hashes to CDN scripts
3. Document browser compatibility
4. Consider PWA for offline use

Please see the full Reviewer 2 report for detailed comments.

---

## PLOS ONE Criteria Checklist

| Criterion | Meets Standard |
|-----------|----------------|
| Scientific validity | Yes |
| Rigorous methodology | Yes |
| Results support conclusions | Yes |
| Ethical standards | N/A (no human subjects) |
| Data availability | Pending (need DOI) |
| Meets formatting requirements | Yes |

---

## Timeline

Please submit your revised manuscript within **60 days** of this decision. If you require additional time, please contact the editorial office.

When resubmitting, please include:
- Revised manuscript (Word or LaTeX)
- Response to reviewers (separate document)
- Any supplementary files

---

## Additional Information

### Data Availability
PLOS ONE requires that data underlying findings be freely available. Since this is a software tool, please ensure:
- Source code is publicly accessible
- Sample datasets are included
- A DOI-registered archive exists

### Competing Interests
Please ensure your competing interests statement is complete and accurate.

### Funding
Please ensure all funding sources are acknowledged.

---

## Next Steps

1. Address required revisions
2. Respond to reviewer comments
3. Submit revised manuscript via Editorial Manager
4. Await editorial review of revision

If the revision adequately addresses all concerns, we anticipate being able to accept your manuscript for publication.

---

Thank you for choosing to submit your work to PLOS ONE. We look forward to receiving your revision.

Sincerely,

**[Academic Editor Name]**
Academic Editor, PLOS ONE

**[Staff Editor Name]**
Staff Editor, PLOS ONE

---

## Attachments

1. Reviewer 1 Full Report (PLOS_ONE_Reviewer1_Report.md)
2. Reviewer 2 Full Report (PLOS_ONE_Reviewer2_Report.md)

---

*Decision Date: 2026-01-19*
*Original Submission: 2026-01-XX*
*Reviews Completed: 2026-01-19*
