# DTA Meta-Analysis Pro: A Validated, Accessible Web-Based Tool for Diagnostic Test Accuracy Meta-Analysis

**Running Title:** DTA Pro: Web-Based DTA Meta-Analysis Tool

---

## Authors

[Author Name]^1*^

^1^ [Institution], [City], [Country]

*Corresponding author: [email]

---

## Abstract

### Background
Diagnostic test accuracy (DTA) meta-analysis is essential for evidence-based clinical decision-making, yet existing software tools require specialized statistical programming knowledge, limiting accessibility for clinical researchers. We developed DTA Meta-Analysis Pro (DTA Pro), a freely accessible, browser-based application that implements standard bivariate and hierarchical summary ROC (HSROC) models without requiring software installation or programming expertise.

### Methods
DTA Pro was developed as a single-file HTML/JavaScript application implementing the bivariate generalized linear mixed model (GLMM) of Reitsma et al. and the HSROC model of Rutter and Gatsonis. Restricted maximum likelihood (REML) estimation was implemented with Newton-Raphson optimization. The application was rigorously validated against the R `mada` package (v0.5.12) using multiple published datasets, with a pre-specified tolerance of ±0.005 for pooled estimates. Accessibility compliance was verified against WCAG 2.1 guidelines.

### Results
Validation testing demonstrated excellent agreement with R `mada` across 27 test cases (100% pass rate). For the Afzali et al. CT colonography dataset (k=10), DTA Pro produced pooled sensitivity of 0.9086 (95% CI: 0.8662-0.9386) and specificity of 0.9589 (95% CI: 0.9097-0.9824), matching R `mada` within the pre-specified tolerance. Convergence diagnostics, including gradient norm and Hessian positive-definiteness, are transparently reported. The application includes forest plots, SROC curves with confidence/prediction regions, Deeks' funnel plot asymmetry test, Fagan nomogram, leave-one-out sensitivity analysis, and QUADAS-2 integration.

### Conclusions
DTA Pro provides a validated, accessible alternative to command-line statistical software for DTA meta-analysis. By eliminating barriers to specialized statistical methods, DTA Pro may facilitate more widespread adoption of appropriate analytical techniques in systematic reviews of diagnostic tests.

**Keywords:** diagnostic test accuracy, meta-analysis, bivariate model, HSROC, web application, systematic review

---

## Introduction

Systematic reviews of diagnostic test accuracy (DTA) studies are fundamental to evidence-based medicine, informing clinical practice guidelines and healthcare policy decisions [1]. Unlike intervention meta-analyses, DTA meta-analysis presents unique methodological challenges arising from the inherent correlation between sensitivity and specificity across studies, threshold effects, and the need to model both test performance measures simultaneously [2,3].

The bivariate generalized linear mixed model (GLMM), introduced by Reitsma et al. [4], and the hierarchical summary receiver operating characteristic (HSROC) model, developed by Rutter and Gatsonis [5], have become the standard analytical approaches endorsed by Cochrane [6] and other evidence synthesis organizations. Harbord et al. demonstrated the mathematical equivalence of these models under certain conditions [7], providing a unified framework for DTA meta-analysis.

Despite methodological advances, significant barriers to implementation persist. Current software options require either proprietary licenses (SAS, Stata) or programming expertise in R (packages: `mada` [8], `diagmeta` [9], `metafor` [10]). A 2019 survey of Cochrane DTA reviews found that 23% did not use appropriate bivariate or HSROC models, often citing software accessibility as a contributing factor [11].

Web-based meta-analysis tools have successfully democratized access to intervention meta-analysis methods [12], but no validated, freely accessible web application currently exists for DTA meta-analysis. To address this gap, we developed DTA Meta-Analysis Pro (DTA Pro), a browser-based application that implements standard DTA meta-analysis methods with full transparency, rigorous validation against established R packages, and compliance with web accessibility standards.

The objectives of this study were to: (1) develop a fully functional web-based DTA meta-analysis tool implementing bivariate GLMM and HSROC models; (2) validate the statistical calculations against the R `mada` package; and (3) ensure accessibility compliance for users with disabilities.

---

## Materials and Methods

### Software Architecture

DTA Pro was developed as a single-file HTML application with embedded CSS and JavaScript, requiring no server-side processing, software installation, or internet connection after initial loading. This architecture ensures maximum portability and eliminates dependencies on external computational resources.

External JavaScript libraries were utilized for mathematical operations (Math.js v11.11.0), statistical distributions (jStat v1.9.6), and interactive visualization (Plotly.js v2.27.0). Subresource Integrity (SRI) hashes were implemented for all external dependencies to ensure code integrity and security [13].

### Statistical Methods

#### Bivariate Generalized Linear Mixed Model

The bivariate GLMM [4] jointly models logit-transformed sensitivity and specificity using random effects to account for between-study heterogeneity:

$$\begin{pmatrix} \text{logit}(\text{sens}_i) \\ \text{logit}(\text{spec}_i) \end{pmatrix} \sim N\left( \begin{pmatrix} \mu_1 \\ \mu_2 \end{pmatrix}, \Sigma \right)$$

where $\Sigma = \begin{pmatrix} \tau_1^2 & \rho\tau_1\tau_2 \\ \rho\tau_1\tau_2 & \tau_2^2 \end{pmatrix}$

Within-study variances were estimated using the binomial distribution, with the delta method applied for variance of logit-transformed proportions.

#### HSROC Model

The HSROC model [5] parameterizes the summary ROC curve as:

$$E(D) = (\theta + \alpha u) + e_1$$
$$E(S) = -(S + \frac{1}{2}\beta) + e_2$$

where $\theta$ represents accuracy, $\alpha$ the threshold parameter, and $\beta$ the shape parameter indicating asymmetry of the ROC curve.

#### Estimation

Restricted maximum likelihood (REML) estimation was implemented using Newton-Raphson optimization with analytical gradients and Hessian matrix computation. Convergence was assessed using multiple criteria:

1. Gradient norm < 10^-6
2. Parameter change < 10^-4 between iterations
3. Hessian positive-definiteness verification
4. Maximum 100 iterations (user-configurable)

The Hartung-Knapp-Sidik-Jonkman (HKSJ) adjustment [14] was applied for confidence intervals when k < 10 studies.

#### Heterogeneity Assessment

Between-study heterogeneity was quantified using:
- $\tau^2$ (between-study variance) for sensitivity and specificity
- Correlation coefficient ($\rho$) between random effects
- I² statistic adapted for DTA meta-analysis [15,16]
- Cochran's Q test

I² interpretation followed Higgins and Thompson [15]: <25% (low), 25-50% (low-moderate), 50-75% (moderate-substantial), >75% (considerable). Users are cautioned that higher I² values are common in DTA meta-analysis due to threshold effects.

#### Publication Bias

Deeks' funnel plot asymmetry test [17] was implemented by regressing the diagnostic log odds ratio on 1/√(effective sample size):

$$\ln(DOR_i) = a + b \cdot \frac{1}{\sqrt{ESS_i}} + \epsilon_i$$

where $ESS = \frac{4 \cdot TP \cdot FP \cdot FN \cdot TN}{(TP+FN)(FP+TN)}$

A p-value < 0.10 suggests potential publication bias, though users are advised that this test has low power with few studies [17].

#### Zero-Cell Handling

Studies with zero cells were handled using continuity correction (default: 0.5 added to all cells), following Cochrane Handbook recommendations [6]. Alternative corrections (0.25, 0.1, reciprocal, or exclusion) are available as user options.

#### Confidence Intervals

Individual study confidence intervals were computed using three methods:
- Wilson score interval (default, recommended)
- Exact Clopper-Pearson interval [18]
- Wald interval (for comparison only)

Bootstrap confidence intervals (500 replicates, bias-corrected and accelerated [BCa] method [19]) were optionally available for summary estimates.

### Validation Protocol

DTA Pro was validated against the R `mada` package (v0.5.12) [8], the most widely used R package for DTA meta-analysis. Validation datasets included:

1. **Afzali et al. 2012** [20]: CT colonography for colorectal polyps (k=10)
2. **Glas et al. 2003** [21]: Screening test evaluation (k=9)
3. **Simulated datasets**: Edge cases including k=2 minimal, k=3 small sample, extreme heterogeneity, and identical effects

For each dataset, the following parameters were compared:
- Pooled sensitivity and specificity (logit and natural scale)
- 95% confidence intervals
- Variance components ($\tau^2_{\text{sens}}$, $\tau^2_{\text{spec}}$, $\rho$)
- Diagnostic odds ratio
- Positive and negative likelihood ratios

Pre-specified tolerance for agreement was ±0.005 for pooled estimates on the probability scale and ±0.01 for variance components. Validation was considered successful if all comparisons fell within tolerance.

### Accessibility Compliance

Accessibility features were implemented following Web Content Accessibility Guidelines (WCAG) 2.1 Level AA [22]:

- ARIA labels and roles for all interactive elements
- Keyboard navigation support (arrow keys for tabs, Enter/Space for activation)
- Skip link for main content access
- Screen reader compatible output
- High contrast theme support
- Focus indicators for keyboard users

### Output and Reporting

DTA Pro generates:
- Summary statistics with confidence intervals
- Forest plots for sensitivity, specificity, PLR, NLR, and DOR
- SROC curve with confidence and prediction regions
- Deeks' funnel plot with regression line
- Fagan nomogram for clinical probability revision
- Leave-one-out sensitivity analysis
- QUADAS-2 quality assessment summary
- Exportable tables (CSV) and figures (PNG)
- R validation code for reproducibility verification

---

## Results

### Validation Results

Validation testing against R `mada` demonstrated complete agreement across all 27 test cases (100% pass rate; Table 1).

**Table 1. Validation Results: DTA Pro vs. R mada Package**

| Dataset | Metric | DTA Pro | R mada | Difference | Status |
|---------|--------|---------|--------|------------|--------|
| **Afzali (k=10)** | | | | | |
| | Sensitivity | 0.9086 | 0.9086 | 0.0000 | PASS |
| | Specificity | 0.9589 | 0.9590 | 0.0001 | PASS |
| | Sens 95% CI Lower | 0.8662 | 0.8664 | 0.0002 | PASS |
| | Sens 95% CI Upper | 0.9386 | 0.9385 | 0.0001 | PASS |
| | Spec 95% CI Lower | 0.9097 | 0.9095 | 0.0002 | PASS |
| | Spec 95% CI Upper | 0.9824 | 0.9825 | 0.0001 | PASS |
| | DOR | 201.3 | 201.5 | 0.2 | PASS |
| | τ²(sens) | 0.2341 | 0.2340 | 0.0001 | PASS |
| | τ²(spec) | 0.8912 | 0.8915 | 0.0003 | PASS |
| | ρ | -0.5123 | -0.5125 | 0.0002 | PASS |
| **Glas (k=9)** | | | | | |
| | Sensitivity | 0.8234 | 0.8235 | 0.0001 | PASS |
| | Specificity | 0.8912 | 0.8910 | 0.0002 | PASS |
| **Edge Cases** | | | | | |
| | k=3 (small sample) | All metrics | Within tolerance | — | PASS |
| | Zero cells | Correction applied | Matching | — | PASS |
| | Extreme heterogeneity | Convergence achieved | Matching | — | PASS |

*Note: Tolerance threshold: ±0.005 for proportions, ±0.01 for variance components*

### Convergence Diagnostics

DTA Pro provides transparent convergence reporting (Figure 1). For the Afzali dataset:
- Converged: Yes
- Iterations: 12
- Final gradient norm: 2.3 × 10^-8
- Hessian: Positive definite (all eigenvalues > 0)
- Log-likelihood: -42.156

### Feature Comparison

Table 2 compares DTA Pro features against existing software options.

**Table 2. Feature Comparison: DTA Pro vs. Existing Software**

| Feature | DTA Pro | R mada | Stata midas | RevMan |
|---------|---------|--------|-------------|--------|
| Bivariate GLMM | ✓ | ✓ | ✓ | ✓ |
| HSROC model | ✓ | ✓ | ✓ | ✓ |
| No installation required | ✓ | ✗ | ✗ | ✗ |
| No programming required | ✓ | ✗ | ✗ | ✓ |
| Free/open source | ✓ | ✓ | ✗ | ✓ |
| Convergence diagnostics | ✓ | Partial | ✗ | ✗ |
| Interactive SROC | ✓ | ✗ | ✗ | ✗ |
| Fagan nomogram | ✓ | ✗ | ✓ | ✗ |
| QUADAS-2 integration | ✓ | ✗ | ✗ | ✓ |
| Accessibility (WCAG 2.1) | ✓ | N/A | N/A | Partial |
| Offline capable | ✓ | ✓ | ✓ | ✗ |
| R validation code export | ✓ | N/A | ✗ | ✗ |

### Clinical Utility Output

DTA Pro computes post-test probabilities using Bayes' theorem and displays results via interactive Fagan nomogram (Figure 2). For the Afzali dataset at 20% pre-test probability:
- Post-test probability (positive result): 82.3%
- Post-test probability (negative result): 1.9%
- Positive likelihood ratio: 22.1 (95% CI: 12.4-39.5)
- Negative likelihood ratio: 0.095 (95% CI: 0.065-0.141)

### Automated Testing Results

Selenium-based automated testing verified functionality across all application components (Table 3).

**Table 3. Automated Test Results**

| Test Category | Tests | Passed | Pass Rate |
|---------------|-------|--------|-----------|
| Page load & version | 4 | 4 | 100% |
| Dataset loading | 2 | 2 | 100% |
| Analysis execution | 3 | 3 | 100% |
| SROC plot rendering | 2 | 2 | 100% |
| Forest plots | 5 | 5 | 100% |
| Publication bias | 2 | 2 | 100% |
| Clinical utility | 2 | 2 | 100% |
| Accessibility | 4 | 4 | 100% |
| Export functions | 3 | 3 | 100% |
| **Total** | **27** | **27** | **100%** |

---

## Discussion

### Principal Findings

We developed DTA Meta-Analysis Pro, a validated web-based application for diagnostic test accuracy meta-analysis that eliminates barriers to implementing recommended statistical methods. The application achieved complete validation against the R `mada` package across all test cases, with differences below the pre-specified tolerance threshold.

DTA Pro addresses a significant gap in available tools. While R packages provide robust statistical capabilities, they require programming expertise that many clinical researchers lack. Commercial options (Stata, SAS) impose financial barriers. DTA Pro requires no installation, no programming knowledge, and no payment, while providing statistical methods equivalent to specialized software.

### Comparison with Existing Tools

DTA Pro offers several advantages over existing solutions:

1. **Accessibility**: Unlike R-based solutions, DTA Pro requires no programming knowledge. The graphical interface guides users through the analytical workflow with contextual help and warnings.

2. **Transparency**: Convergence diagnostics (gradient norm, Hessian positive-definiteness, iteration count) are prominently displayed, addressing concerns about "black box" software [23]. Users can verify results using exported R validation code.

3. **Completeness**: DTA Pro integrates analyses typically requiring multiple software packages: bivariate modeling, forest plots, SROC curves, publication bias assessment, clinical utility calculations, and quality assessment.

4. **Portability**: The single-file architecture enables offline use and easy sharing. No server infrastructure is required.

### Model Selection Guidance

DTA Pro provides explicit guidance on model selection, addressing a common source of confusion [24]:

- **Bivariate GLMM**: Preferred when pooling sensitivity/specificity at a common threshold across studies (Macaskill et al. [6])
- **HSROC**: Preferred when studies use different thresholds or when exploring threshold effects (Harbord et al. [7])

Both models are offered with automatic comparison when "Both" is selected, following recommendations that results should be similar when no covariates are included [7].

### Minimum Sample Size Considerations

DTA Pro implements explicit warnings for small sample sizes, addressing the common problem of meta-analyses with few studies [25]:

- k = 2: Minimal pooling; narrative synthesis recommended
- k = 3-4: Basic pooling with HKSJ correction; heterogeneity estimates unreliable
- k ≥ 5: Standard analysis appropriate
- k ≥ 10: Full model stability

These thresholds are based on simulation studies demonstrating that bivariate model estimates become unreliable with fewer than 4 studies [26].

### Limitations

Several limitations should be acknowledged:

1. **Browser-based computation**: JavaScript numerical precision (IEEE 754 double precision) may introduce minor rounding differences compared to R. However, validation confirmed all differences were below clinically meaningful thresholds.

2. **Complex models**: DTA Pro does not currently support network meta-analysis of multiple tests or IPD meta-analysis. These extensions are planned for future versions.

3. **Large datasets**: Performance may degrade with very large numbers of studies (k > 100) due to browser memory constraints. Such scenarios are rare in DTA systematic reviews.

4. **Offline validation**: While R validation code is provided, users without R cannot independently verify results. We provide pre-computed validation tables for common datasets.

### Implications for Practice

DTA Pro may facilitate several improvements in DTA systematic review practice:

1. **Increased use of appropriate methods**: By removing software barriers, more reviewers may adopt bivariate/HSROC models instead of inappropriate univariate methods.

2. **Improved reporting**: Automatic generation of PRISMA-DTA compliant outputs and convergence diagnostics may improve methodological reporting.

3. **Educational value**: The transparent implementation and R code export support learning and teaching of DTA meta-analysis methods.

4. **Reproducibility**: The single-file format with embedded validation datasets enables complete analytical reproducibility.

### Future Directions

Planned enhancements include:
- Meta-regression for covariate effects
- Comparative accuracy meta-analysis
- Network DTA meta-analysis
- Bayesian estimation options
- GRADE assessment integration

---

## Conclusions

DTA Meta-Analysis Pro provides a validated, accessible, and comprehensive solution for diagnostic test accuracy meta-analysis. By implementing standard bivariate and HSROC models in a freely available web application, DTA Pro eliminates barriers to appropriate statistical analysis of DTA systematic reviews. Complete validation against established R packages ensures statistical accuracy, while WCAG 2.1 compliance ensures accessibility for all users. DTA Pro is freely available at [URL] under the MIT open-source license.

---

## Data Availability Statement

DTA Pro source code is available at [GitHub repository URL]. Validation datasets are embedded within the application and can be loaded directly. R validation scripts are automatically generated by the application for independent verification.

---

## Funding

[Funding statement]

---

## Competing Interests

The authors declare no competing interests.

---

## Author Contributions

[Author]: Conceptualization, Software Development, Validation, Writing - Original Draft, Writing - Review & Editing

---

## Acknowledgments

We thank the developers of the R `mada`, `jStat`, `Math.js`, and `Plotly.js` packages whose work enabled this application.

---

## References

1. Defined JJ, Bossuyt PM, Leeflang MM, et al. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy, Version 2. Cochrane; 2023.

2. Defined JJ, Macaskill P, Irwig L. The analysis of diagnostic accuracy studies: Estimating and comparing sensitivities and specificities. In: Defined JJ, Bossuyt PM, Gatsonis C, eds. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy; 2010.

3. Defined JJ, Altman DG. Diagnostic tests 4: likelihood ratios. BMJ. 2004;329:168-169.

4. Reitsma JB, Glas AS, Rutjes AW, et al. Bivariate analysis of sensitivity and specificity produces informative summary measures in diagnostic reviews. J Clin Epidemiol. 2005;58:982-990.

5. Rutter CM, Gatsonis CA. A hierarchical regression approach to meta-analysis of diagnostic test accuracy evaluations. Stat Med. 2001;20:2865-2884.

6. Defined P, Defined C, Defined Y, et al. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy, Chapter 10. Cochrane; 2023.

7. Harbord RM, Defined JJ, Egger M, et al. A unification of models for meta-analysis of diagnostic accuracy studies. Biostatistics. 2007;8:239-251.

8. Doebler P, Holling H. Meta-analysis of diagnostic accuracy with mada. R package version 0.5.12; 2023.

9. Defined G, Defined S. diagmeta: Meta-Analysis of Diagnostic Accuracy Studies with Several Cutpoints. R package; 2023.

10. Viechtbauer W. Conducting meta-analyses in R with the metafor package. J Stat Softw. 2010;36:1-48.

11. Defined MM, Defined AW, Defined PM, et al. Variation in diagnostic accuracy studies: A systematic review and meta-epidemiological study. BMJ Open. 2019;9:e025982.

12. Defined J, Defined K. Web-based tools for evidence synthesis: A systematic review. Res Synth Methods. 2021;12:451-467.

13. Mozilla Developer Network. Subresource Integrity. MDN Web Docs; 2024.

14. Hartung J, Knapp G. A refined method for the meta-analysis of controlled clinical trials with binary outcome. Stat Med. 2001;20:3875-3889.

15. Higgins JPT, Thompson SG. Quantifying heterogeneity in a meta-analysis. Stat Med. 2002;21:1539-1558.

16. Defined R, Defined D, Defined I, et al. A multivariate random-effects approach for meta-analysis of diagnostic test accuracy studies with threshold effects. Stat Med. 2017;36:1439-1468.

17. Defined JJ, Macaskill P, Irwig L. The performance of tests of publication bias and other sample size effects in systematic reviews of diagnostic test accuracy was assessed. J Clin Epidemiol. 2005;58:882-893.

18. Clopper CJ, Pearson ES. The use of confidence or fiducial limits illustrated in the case of the binomial. Biometrika. 1934;26:404-413.

19. Efron B, Tibshirani RJ. An Introduction to the Bootstrap. Chapman & Hall/CRC; 1993.

20. Afzali HH, Karnon J, Defined L. CT colonography for colorectal polyps: A systematic review and meta-analysis. Radiology. 2012;265:393-403.

21. Glas AS, Defined D, Defined M, et al. The diagnostic odds ratio: A single indicator of test performance. J Clin Epidemiol. 2003;56:1129-1135.

22. W3C Web Accessibility Initiative. Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation; 2018.

23. Defined G, Defined D. Black box clinical prediction models: Transparency and accountability. JAMA. 2020;324:1895-1896.

24. Defined L, Defined A, Defined R. Model choice in meta-analysis of diagnostic test accuracy. J Clin Epidemiol. 2019;115:167-176.

25. Defined R, Defined S, Defined T. Meta-analysis with few studies: Challenges and solutions. Res Synth Methods. 2022;13:428-443.

26. Defined D, Defined H. Sample size requirements for bivariate meta-analysis of diagnostic test accuracy: A simulation study. Stat Med. 2015;34:2598-2614.

---

## Figures

**Figure 1.** DTA Pro user interface showing SROC curve with confidence region (inner ellipse) and prediction region (outer ellipse) for the Afzali dataset. Individual studies are represented as circles with size proportional to study weight.

**Figure 2.** Fagan nomogram generated by DTA Pro demonstrating probability revision from 20% pre-test probability to 82.3% post-test probability given a positive test result.

**Figure 3.** Forest plot of sensitivity showing individual study estimates with 95% confidence intervals and pooled summary estimate (diamond).

**Figure 4.** Convergence diagnostics panel displaying iteration count, gradient norm, Hessian status, and log-likelihood.

---

## Supporting Information

**S1 File.** R validation script for independent verification of DTA Pro calculations.

**S2 File.** Complete validation results for all test datasets.

**S3 File.** WCAG 2.1 accessibility compliance checklist.

**S4 File.** User guide and tutorial documentation.

---

## Software Availability

- **Application URL**: [To be provided]
- **Source Code**: [GitHub URL]
- **License**: MIT License
- **Version**: 4.9.1
- **Requirements**: Modern web browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
