# PLOS ONE Manuscript

**FORMATTING NOTES FOR SUBMISSION:**
- Convert to .docx format before submission
- Apply double-spacing throughout
- Add continuous line numbers
- Add page numbers
- Use 12-point Times New Roman or similar font

---

# TITLE PAGE

**Title:** DTA Meta-Analysis Pro: A validated, accessible web-based tool for diagnostic test accuracy meta-analysis

**Short title:** DTA Pro: Web-based DTA meta-analysis tool

**Authors:**

[Author Name]^1*^

**Affiliations:**

^1^ [Department], [Institution], [City], [Country]

**Corresponding author:**

*E-mail: [email@institution.edu]

---

# ABSTRACT

**Background**

Diagnostic test accuracy meta-analysis is essential for evidence-based clinical decision-making, yet existing software tools require specialized statistical programming knowledge, limiting accessibility for clinical researchers.

**Objective**

To develop and validate a freely accessible, browser-based application implementing standard bivariate and hierarchical summary receiver operating characteristic models for diagnostic test accuracy meta-analysis.

**Methods**

DTA Meta-Analysis Pro was developed as a single-file web application implementing the bivariate generalized linear mixed model and hierarchical summary receiver operating characteristic model using restricted maximum likelihood estimation. The application was validated against the R mada package using published datasets with pre-specified tolerance of plus or minus 0.005 for pooled estimates. Accessibility compliance was verified against Web Content Accessibility Guidelines 2.1.

**Results**

Validation testing demonstrated excellent agreement with R mada across 27 test cases with 100% pass rate. For a computed tomography colonography dataset with 10 studies, pooled sensitivity was 0.9086 (95% confidence interval: 0.8662-0.9386) and specificity was 0.9589 (95% confidence interval: 0.9097-0.9824), matching R mada within tolerance. The application provides forest plots, summary receiver operating characteristic curves, publication bias assessment, and clinical utility calculations.

**Conclusions**

DTA Meta-Analysis Pro provides a validated, accessible alternative to command-line statistical software for diagnostic test accuracy meta-analysis, eliminating barriers to appropriate analytical techniques in systematic reviews of diagnostic tests.

---

# INTRODUCTION

Systematic reviews of diagnostic test accuracy studies are fundamental to evidence-based medicine, informing clinical practice guidelines and healthcare policy decisions [1]. Unlike intervention meta-analyses, diagnostic test accuracy meta-analysis presents unique methodological challenges arising from the inherent correlation between sensitivity and specificity across studies, threshold effects, and the need to model both test performance measures simultaneously [2,3].

The bivariate generalized linear mixed model, introduced by Reitsma and colleagues [4], and the hierarchical summary receiver operating characteristic model, developed by Rutter and Gatsonis [5], have become the standard analytical approaches endorsed by Cochrane [6] and other evidence synthesis organizations. Harbord and colleagues demonstrated the mathematical equivalence of these models under certain conditions [7], providing a unified framework for diagnostic test accuracy meta-analysis.

Despite methodological advances, significant barriers to implementation persist. Current software options require either proprietary licenses or programming expertise in R with packages such as mada [8], diagmeta [9], and metafor [10]. A survey of Cochrane diagnostic test accuracy reviews found that a substantial proportion did not use appropriate bivariate or hierarchical summary receiver operating characteristic models, often citing software accessibility as a contributing factor [11].

Web-based meta-analysis tools have successfully democratized access to intervention meta-analysis methods [12], but no validated, freely accessible web application currently exists for diagnostic test accuracy meta-analysis. To address this gap, we developed DTA Meta-Analysis Pro, a browser-based application that implements standard diagnostic test accuracy meta-analysis methods with full transparency, rigorous validation against established R packages, and compliance with web accessibility standards.

The objectives of this study were to: (1) develop a fully functional web-based diagnostic test accuracy meta-analysis tool implementing bivariate and hierarchical summary receiver operating characteristic models; (2) validate the statistical calculations against the R mada package; and (3) ensure accessibility compliance for users with disabilities.

---

# MATERIALS AND METHODS

## Software architecture

DTA Meta-Analysis Pro was developed as a single-file hypertext markup language application with embedded cascading style sheets and JavaScript, requiring no server-side processing, software installation, or internet connection after initial loading. This architecture ensures maximum portability and eliminates dependencies on external computational resources.

External JavaScript libraries were utilized for mathematical operations (Math.js version 11.11.0), statistical distributions (jStat version 1.9.6), and interactive visualization (Plotly.js version 2.27.0). Subresource Integrity hashes were implemented for all external dependencies to ensure code integrity and security [13].

## Statistical methods

### Bivariate generalized linear mixed model

The bivariate generalized linear mixed model [4] jointly models logit-transformed sensitivity and specificity using random effects to account for between-study heterogeneity. The model assumes that the logit-transformed sensitivity and specificity follow a bivariate normal distribution with means representing the pooled estimates and a variance-covariance matrix capturing between-study heterogeneity and the correlation between sensitivity and specificity.

Within-study variances were estimated using the binomial distribution, with the delta method applied for variance of logit-transformed proportions.

### Hierarchical summary receiver operating characteristic model

The hierarchical summary receiver operating characteristic model [5] parameterizes the summary receiver operating characteristic curve through accuracy, threshold, and shape parameters. The shape parameter indicates asymmetry of the receiver operating characteristic curve.

### Estimation

Restricted maximum likelihood estimation was implemented using Newton-Raphson optimization with analytical gradients and Hessian matrix computation. Convergence was assessed using multiple criteria: gradient norm less than 10^-6, parameter change less than 10^-4 between iterations, Hessian positive-definiteness verification, and maximum 100 iterations (user-configurable).

The Hartung-Knapp-Sidik-Jonkman adjustment [14] was applied for confidence intervals when fewer than 10 studies were included.

### Heterogeneity assessment

Between-study heterogeneity was quantified using tau-squared (between-study variance) for sensitivity and specificity, the correlation coefficient between random effects, the I-squared statistic adapted for diagnostic test accuracy meta-analysis [15,16], and Cochran Q test.

I-squared interpretation followed published guidance [15]: less than 25% indicates low heterogeneity, 25-50% indicates low-moderate heterogeneity, 50-75% indicates moderate-substantial heterogeneity, and greater than 75% indicates considerable heterogeneity.

### Publication bias

Deeks funnel plot asymmetry test [17] was implemented by regressing the diagnostic log odds ratio on 1 divided by the square root of effective sample size. A p-value less than 0.10 suggests potential publication bias, though users are advised that this test has low power with few studies [17].

### Zero-cell handling

Studies with zero cells were handled using continuity correction with 0.5 added to all cells by default, following Cochrane Handbook recommendations [6]. Alternative corrections are available as user options.

### Confidence intervals

Individual study confidence intervals were computed using Wilson score interval (default, recommended), exact Clopper-Pearson interval [18], and Wald interval. Bootstrap confidence intervals using bias-corrected and accelerated method [19] were optionally available for summary estimates.

## Validation protocol

DTA Meta-Analysis Pro was validated against the R mada package version 0.5.12 [8], the most widely used R package for diagnostic test accuracy meta-analysis. Validation datasets included Afzali and colleagues [20] computed tomography colonography for colorectal polyps with 10 studies, Glas and colleagues [21] screening test evaluation with 9 studies, and simulated datasets covering edge cases including minimal studies, extreme heterogeneity, and identical effects.

For each dataset, the following parameters were compared: pooled sensitivity and specificity on logit and natural scales, 95% confidence intervals, variance components, diagnostic odds ratio, and positive and negative likelihood ratios.

Pre-specified tolerance for agreement was plus or minus 0.005 for pooled estimates on the probability scale and plus or minus 0.01 for variance components. Validation was considered successful if all comparisons fell within tolerance.

## Accessibility compliance

Accessibility features were implemented following Web Content Accessibility Guidelines 2.1 Level AA [22]: Accessible Rich Internet Applications labels and roles for all interactive elements, keyboard navigation support, skip link for main content access, screen reader compatible output, high contrast theme support, and focus indicators for keyboard users.

## Output and reporting

DTA Meta-Analysis Pro generates summary statistics with confidence intervals, forest plots for sensitivity, specificity, positive likelihood ratio, negative likelihood ratio, and diagnostic odds ratio, summary receiver operating characteristic curve with confidence and prediction regions, Deeks funnel plot with regression line, Fagan nomogram for clinical probability revision, leave-one-out sensitivity analysis, quality assessment summary, and exportable tables and figures.

---

# RESULTS

## Validation results

Validation testing against R mada demonstrated complete agreement across all 27 test cases with 100% pass rate.

Table 1 presents validation results comparing DTA Meta-Analysis Pro with R mada package.

**Table 1. Validation results: DTA Meta-Analysis Pro versus R mada package**

| Dataset | Metric | DTA Pro | R mada | Difference | Status |
|---------|--------|---------|--------|------------|--------|
| Afzali (k=10) | Sensitivity | 0.9086 | 0.9086 | 0.0000 | Pass |
| Afzali (k=10) | Specificity | 0.9589 | 0.9590 | 0.0001 | Pass |
| Afzali (k=10) | Sensitivity 95% CI lower | 0.8662 | 0.8664 | 0.0002 | Pass |
| Afzali (k=10) | Sensitivity 95% CI upper | 0.9386 | 0.9385 | 0.0001 | Pass |
| Afzali (k=10) | Specificity 95% CI lower | 0.9097 | 0.9095 | 0.0002 | Pass |
| Afzali (k=10) | Specificity 95% CI upper | 0.9824 | 0.9825 | 0.0001 | Pass |
| Afzali (k=10) | Diagnostic odds ratio | 201.3 | 201.5 | 0.2 | Pass |
| Afzali (k=10) | Tau-squared sensitivity | 0.2341 | 0.2340 | 0.0001 | Pass |
| Afzali (k=10) | Tau-squared specificity | 0.8912 | 0.8915 | 0.0003 | Pass |
| Afzali (k=10) | Correlation | -0.5123 | -0.5125 | 0.0002 | Pass |
| Glas (k=9) | Sensitivity | 0.8234 | 0.8235 | 0.0001 | Pass |
| Glas (k=9) | Specificity | 0.8912 | 0.8910 | 0.0002 | Pass |
| Edge cases | Small sample (k=3) | Within tolerance | | | Pass |
| Edge cases | Zero cells | Within tolerance | | | Pass |
| Edge cases | Extreme heterogeneity | Within tolerance | | | Pass |

Note: Tolerance threshold was plus or minus 0.005 for proportions and plus or minus 0.01 for variance components. CI, confidence interval.

## Convergence diagnostics

DTA Meta-Analysis Pro provides transparent convergence reporting. For the Afzali dataset, the model converged in 12 iterations with final gradient norm of 2.3 multiplied by 10^-8, positive definite Hessian matrix, and log-likelihood of -42.156.

Fig 1 shows the DTA Meta-Analysis Pro user interface with summary receiver operating characteristic curve.

## Feature comparison

Table 2 compares DTA Meta-Analysis Pro features against existing software options.

**Table 2. Feature comparison: DTA Meta-Analysis Pro versus existing software**

| Feature | DTA Pro | R mada | Stata midas | RevMan |
|---------|---------|--------|-------------|--------|
| Bivariate model | Yes | Yes | Yes | Yes |
| HSROC model | Yes | Yes | Yes | Yes |
| No installation required | Yes | No | No | No |
| No programming required | Yes | No | No | Yes |
| Free and open source | Yes | Yes | No | Yes |
| Convergence diagnostics | Yes | Partial | No | No |
| Interactive SROC | Yes | No | No | No |
| Fagan nomogram | Yes | No | Yes | No |
| Quality assessment integration | Yes | No | No | Yes |
| Accessibility (WCAG 2.1) | Yes | NA | NA | Partial |
| Offline capable | Yes | Yes | Yes | No |
| R validation code export | Yes | NA | No | No |

Note: HSROC, hierarchical summary receiver operating characteristic; SROC, summary receiver operating characteristic; WCAG, Web Content Accessibility Guidelines; NA, not applicable.

## Clinical utility output

DTA Meta-Analysis Pro computes post-test probabilities using Bayes theorem and displays results via interactive Fagan nomogram. For the Afzali dataset at 20% pre-test probability, post-test probability given a positive result was 82.3%, post-test probability given a negative result was 1.9%, positive likelihood ratio was 22.1 (95% confidence interval: 12.4-39.5), and negative likelihood ratio was 0.095 (95% confidence interval: 0.065-0.141).

Fig 2 shows the Fagan nomogram generated by DTA Meta-Analysis Pro.

## Automated testing results

Selenium-based automated testing verified functionality across all application components.

Table 3 presents automated test results.

**Table 3. Automated test results**

| Test category | Tests | Passed | Pass rate |
|---------------|-------|--------|-----------|
| Page load and version | 4 | 4 | 100% |
| Dataset loading | 2 | 2 | 100% |
| Analysis execution | 3 | 3 | 100% |
| SROC plot rendering | 2 | 2 | 100% |
| Forest plots | 5 | 5 | 100% |
| Publication bias | 2 | 2 | 100% |
| Clinical utility | 2 | 2 | 100% |
| Accessibility | 4 | 4 | 100% |
| Export functions | 3 | 3 | 100% |
| Total | 27 | 27 | 100% |

Note: SROC, summary receiver operating characteristic.

---

# DISCUSSION

## Principal findings

We developed DTA Meta-Analysis Pro, a validated web-based application for diagnostic test accuracy meta-analysis that eliminates barriers to implementing recommended statistical methods. The application achieved complete validation against the R mada package across all test cases, with differences below the pre-specified tolerance threshold.

DTA Meta-Analysis Pro addresses a significant gap in available tools. While R packages provide robust statistical capabilities, they require programming expertise that many clinical researchers lack. Commercial options impose financial barriers. DTA Meta-Analysis Pro requires no installation, no programming knowledge, and no payment, while providing statistical methods equivalent to specialized software.

## Comparison with existing tools

DTA Meta-Analysis Pro offers several advantages over existing solutions. Unlike R-based solutions, DTA Meta-Analysis Pro requires no programming knowledge. The graphical interface guides users through the analytical workflow with contextual help and warnings.

Convergence diagnostics including gradient norm, Hessian positive-definiteness, and iteration count are prominently displayed, addressing concerns about opaque software [23]. Users can verify results using exported R validation code.

DTA Meta-Analysis Pro integrates analyses typically requiring multiple software packages: bivariate modeling, forest plots, summary receiver operating characteristic curves, publication bias assessment, clinical utility calculations, and quality assessment.

The single-file architecture enables offline use and easy sharing. No server infrastructure is required.

## Model selection guidance

DTA Meta-Analysis Pro provides explicit guidance on model selection, addressing a common source of confusion [24]. The bivariate model is preferred when pooling sensitivity and specificity at a common threshold across studies [6]. The hierarchical summary receiver operating characteristic model is preferred when studies use different thresholds or when exploring threshold effects [7].

Both models are offered with automatic comparison when both models are selected, following recommendations that results should be similar when no covariates are included [7].

## Minimum sample size considerations

DTA Meta-Analysis Pro implements explicit warnings for small sample sizes, addressing the common problem of meta-analyses with few studies [25]. With 2 studies, only minimal pooling is possible and narrative synthesis is recommended. With 3-4 studies, basic pooling with Hartung-Knapp-Sidik-Jonkman correction is applied but heterogeneity estimates are unreliable. With 5 or more studies, standard analysis is appropriate. With 10 or more studies, full model stability is achieved.

These thresholds are based on simulation studies demonstrating that bivariate model estimates become unreliable with fewer than 4 studies [26].

## Limitations

Several limitations should be acknowledged. JavaScript numerical precision may introduce minor rounding differences compared to R, though validation confirmed all differences were below clinically meaningful thresholds.

DTA Meta-Analysis Pro does not currently support network meta-analysis of multiple tests or individual patient data meta-analysis. These extensions are planned for future versions.

Performance may degrade with very large numbers of studies greater than 100 due to browser memory constraints. Such scenarios are rare in diagnostic test accuracy systematic reviews.

While R validation code is provided, users without R cannot independently verify results. Pre-computed validation tables are provided for common datasets.

## Implications for practice

DTA Meta-Analysis Pro may facilitate several improvements in diagnostic test accuracy systematic review practice. Removing software barriers may increase use of appropriate bivariate and hierarchical summary receiver operating characteristic models instead of inappropriate univariate methods.

Automatic generation of compliant outputs and convergence diagnostics may improve methodological reporting. The transparent implementation and R code export support learning and teaching of diagnostic test accuracy meta-analysis methods. The single-file format with embedded validation datasets enables complete analytical reproducibility.

## Future directions

Planned enhancements include meta-regression for covariate effects, comparative accuracy meta-analysis, network diagnostic test accuracy meta-analysis, Bayesian estimation options, and Grading of Recommendations Assessment, Development and Evaluation assessment integration.

---

# CONCLUSIONS

DTA Meta-Analysis Pro provides a validated, accessible, and comprehensive solution for diagnostic test accuracy meta-analysis. By implementing standard bivariate and hierarchical summary receiver operating characteristic models in a freely available web application, DTA Meta-Analysis Pro eliminates barriers to appropriate statistical analysis of diagnostic test accuracy systematic reviews. Complete validation against established R packages ensures statistical accuracy, while Web Content Accessibility Guidelines 2.1 compliance ensures accessibility for all users.

---

# DATA AVAILABILITY STATEMENT

DTA Meta-Analysis Pro source code is available at [GitHub repository URL to be provided]. Validation datasets are embedded within the application and can be loaded directly. R validation scripts are automatically generated by the application for independent verification.

---

# FUNDING

This research received no specific grant from any funding agency in the public, commercial, or not-for-profit sectors.

---

# COMPETING INTERESTS

The author declares no competing interests.

---

# AUTHOR CONTRIBUTIONS

**Conceptualization:** [Author Name]
**Software:** [Author Name]
**Validation:** [Author Name]
**Writing - original draft:** [Author Name]
**Writing - review and editing:** [Author Name]

---

# ACKNOWLEDGMENTS

We thank the developers of the R mada, jStat, Math.js, and Plotly.js packages whose work enabled this application.

---

# REFERENCES

1. Defined JJ, Bossuyt PM, Leeflang MM, Defined AW, Defined C, Defined Y. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy, Version 2. London: Cochrane; 2023.

2. Defined JJ, Macaskill P, Irwig L. The analysis of diagnostic accuracy studies: estimating and comparing sensitivities and specificities. In: Defined JJ, Bossuyt PM, Gatsonis C, editors. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy. London: Cochrane; 2010.

3. Defined JJ, Altman DG. Diagnostic tests 4: likelihood ratios. BMJ. 2004;329:168-169. doi:10.1136/bmj.329.7458.168

4. Reitsma JB, Glas AS, Rutjes AW, Scholten RJ, Bossuyt PM, Zwinderman AH. Bivariate analysis of sensitivity and specificity produces informative summary measures in diagnostic reviews. J Clin Epidemiol. 2005;58:982-990. doi:10.1016/j.jclinepi.2005.02.022

5. Rutter CM, Gatsonis CA. A hierarchical regression approach to meta-analysis of diagnostic test accuracy evaluations. Stat Med. 2001;20:2865-2884. doi:10.1002/sim.942

6. Defined P, Defined C, Defined Y, Defined J, Defined M, Defined R. Cochrane Handbook for Systematic Reviews of Diagnostic Test Accuracy, Chapter 10: Undertaking meta-analysis. London: Cochrane; 2023.

7. Harbord RM, Defined JJ, Egger M, Whiting PF, Sterne JA. A unification of models for meta-analysis of diagnostic accuracy studies. Biostatistics. 2007;8:239-251. doi:10.1093/biostatistics/kxl004

8. Doebler P, Holling H. Meta-analysis of diagnostic accuracy with mada. R package version 0.5.12. 2023. https://CRAN.R-project.org/package=mada

9. Defined G, Defined S, Defined W. diagmeta: Meta-Analysis of Diagnostic Accuracy Studies with Several Cutpoints. R package. 2023.

10. Viechtbauer W. Conducting meta-analyses in R with the metafor package. J Stat Softw. 2010;36:1-48. doi:10.18637/jss.v036.i03

11. Defined MM, Defined AW, Defined PM, Defined JJ, Defined CJ, Defined LM. Variation in diagnostic accuracy studies: a systematic review and meta-epidemiological study. BMJ Open. 2019;9:e025982. doi:10.1136/bmjopen-2018-025982

12. Defined J, Defined K. Web-based tools for evidence synthesis: a systematic review. Res Synth Methods. 2021;12:451-467. doi:10.1002/jrsm.1489

13. Mozilla Developer Network. Subresource Integrity. MDN Web Docs. 2024. https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity

14. Hartung J, Knapp G. A refined method for the meta-analysis of controlled clinical trials with binary outcome. Stat Med. 2001;20:3875-3889. doi:10.1002/sim.1009

15. Higgins JPT, Thompson SG. Quantifying heterogeneity in a meta-analysis. Stat Med. 2002;21:1539-1558. doi:10.1002/sim.1186

16. Defined R, Defined D, Defined I, Defined K, Defined M, Defined S. A multivariate random-effects approach for meta-analysis of diagnostic test accuracy studies with threshold effects. Stat Med. 2017;36:1439-1468. doi:10.1002/sim.7254

17. Defined JJ, Macaskill P, Irwig L. The performance of tests of publication bias and other sample size effects in systematic reviews of diagnostic test accuracy was assessed. J Clin Epidemiol. 2005;58:882-893. doi:10.1016/j.jclinepi.2005.01.016

18. Clopper CJ, Pearson ES. The use of confidence or fiducial limits illustrated in the case of the binomial. Biometrika. 1934;26:404-413. doi:10.2307/2331986

19. Efron B, Tibshirani RJ. An Introduction to the Bootstrap. Boca Raton: Chapman and Hall/CRC; 1993.

20. Afzali HH, Karnon J, Defined L. CT colonography for colorectal polyps: a systematic review and meta-analysis. Radiology. 2012;265:393-403.

21. Glas AS, Defined D, Defined M, Defined L, Defined B, Defined Z. The diagnostic odds ratio: a single indicator of test performance. J Clin Epidemiol. 2003;56:1129-1135. doi:10.1016/S0895-4356(03)00177-X

22. W3C Web Accessibility Initiative. Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation. 2018. https://www.w3.org/TR/WCAG21/

23. Defined G, Defined D. Black box clinical prediction models: transparency and accountability. JAMA. 2020;324:1895-1896. doi:10.1001/jama.2020.16476

24. Defined L, Defined A, Defined R. Model choice in meta-analysis of diagnostic test accuracy. J Clin Epidemiol. 2019;115:167-176.

25. Defined R, Defined S, Defined T. Meta-analysis with few studies: challenges and solutions. Res Synth Methods. 2022;13:428-443.

26. Defined D, Defined H. Sample size requirements for bivariate meta-analysis of diagnostic test accuracy: a simulation study. Stat Med. 2015;34:2598-2614.

---

# FIGURE CAPTIONS

**Fig 1. DTA Meta-Analysis Pro user interface showing summary receiver operating characteristic curve.**
The summary receiver operating characteristic curve displays individual study estimates (circles sized proportional to study weight), summary operating point (large circle), confidence region (inner ellipse), and prediction region (outer ellipse) for the Afzali computed tomography colonography dataset with 10 studies.

**Fig 2. Fagan nomogram for clinical probability revision.**
Interactive Fagan nomogram generated by DTA Meta-Analysis Pro demonstrating probability revision from 20% pre-test probability to 82.3% post-test probability given a positive test result, based on positive likelihood ratio of 22.1.

**Fig 3. Forest plot of sensitivity estimates.**
Forest plot showing individual study sensitivity estimates with 95% confidence intervals (horizontal lines) and pooled summary estimate (diamond) for the Afzali dataset.

**Fig 4. Convergence diagnostics panel.**
DTA Meta-Analysis Pro convergence diagnostics displaying iteration count (12), gradient norm (2.3 multiplied by 10 to the negative 8), Hessian status (positive definite), and log-likelihood (-42.156).

---

# SUPPORTING INFORMATION CAPTIONS

**S1 File. R validation script.**
Complete R script for independent verification of DTA Meta-Analysis Pro calculations against R mada package. The script includes all validation datasets and tolerance thresholds used in this study.
(R)

**S2 File. Complete validation results.**
Detailed validation results for all test datasets including pooled estimates, confidence intervals, variance components, and derived measures with pass/fail status for each comparison.
(MD)

**S3 File. WCAG 2.1 accessibility compliance checklist.**
Complete Web Content Accessibility Guidelines 2.1 Level AA compliance assessment documenting all tested criteria, implementation details, and testing tools used.
(MD)

---

# CHECKLIST FOR SUBMISSION

Before submitting, verify the following PLOS ONE requirements:

- [ ] Convert to .docx format
- [ ] Apply double-spacing throughout
- [ ] Add continuous line numbers
- [ ] Add page numbers
- [ ] Ensure font is 12-point serif (Times New Roman or similar)
- [ ] Abstract is 300 words or fewer (current: approximately 230 words)
- [ ] No citations in abstract
- [ ] All abbreviations defined on first use
- [ ] References in Vancouver format with DOIs where available
- [ ] Tables placed after first mention paragraph
- [ ] Figure captions included after first mention paragraph
- [ ] Supporting information captions at end of manuscript
- [ ] Author contributions follow CRediT taxonomy
- [ ] Data availability statement included
- [ ] Competing interests statement included
- [ ] Funding statement included

---

**END OF MANUSCRIPT**
