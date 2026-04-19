# E156 Protocol — `dta-pro-v2`

This repository is the source code and dashboard backing an E156 micro-paper on the [E156 Student Board](https://mahmood726-cyber.github.io/e156/students.html).

---

## `[473]` DTA Meta-Analysis Pro: A Browser-Based Tool for Diagnostic Test Accuracy Evidence Synthesis

**Type:** methods  |  ESTIMAND: Pooled sensitivity and specificity  
**Data:** A 54,000-line browser application for DTA meta-analysis with bivariate GLMM and HSROC, achieving 27/27 R mada parity tests at 100% concordance.

### 156-word body

How can systematic reviewers synthesize diagnostic accuracy data using hierarchical models without specialized statistical programming? DTA Meta-Analysis Pro is a 54,000-line browser application implementing bivariate random-effects models, hierarchical summary receiver operating characteristic curves, coupled forest plots, meta-regression, and publication bias assessment. The engine estimates pooled sensitivity and specificity through logit-transformed bivariate normal modeling with restricted maximum likelihood, producing summary points, confidence regions, and prediction regions on the SROC plane. Validation against the R mada package version 0.5.12 produced 27 of 27 parity tests passing at 100 percent concordance, with 45 expanded sensitivity and specificity checks within CI tolerance of 0.005. The application survived seven editorial rounds incorporating 97 fixes that strengthened convergence, edge-case handling, and output consistency. This tool offers reviewers a validated platform for diagnostic accuracy synthesis producing publication-ready SROC and forest visualizations. Scope is restricted to standard bivariate DTA models; multivariate extensions, latent class models, and network meta-analysis of diagnostic tests require alternative software.

### Submission metadata

```
Corresponding author: Mahmood Ahmad <mahmood.ahmad2@nhs.net>
ORCID: 0000-0001-9107-3704
Affiliation: Tahir Heart Institute, Rabwah, Pakistan

Links:
  Code:      https://github.com/mahmood726-cyber/dta-pro-v2
  Protocol:  https://github.com/mahmood726-cyber/dta-pro-v2/blob/main/E156-PROTOCOL.md
  Dashboard: https://mahmood726-cyber.github.io/dta-pro-v2/

References (topic pack: diagnostic meta-analysis (DTA)):
  1. Reitsma JB et al. 2005. Bivariate analysis of sensitivity and specificity produces informative summary measures in diagnostic reviews. J Clin Epidemiol. 58(10):982-990. doi:10.1016/j.jclinepi.2005.02.022
  2. Rutter CM, Gatsonis CA. 2001. A hierarchical regression approach to meta-analysis of diagnostic test accuracy evaluations. Stat Med. 20(19):2865-2884. doi:10.1002/sim.942

Data availability: No patient-level data used. Analysis derived exclusively
  from publicly available aggregate records. All source identifiers are in
  the protocol document linked above.

Ethics: Not required. Study uses only publicly available aggregate data; no
  human participants; no patient-identifiable information; no individual-
  participant data. No institutional review board approval sought or required
  under standard research-ethics guidelines for secondary methodological
  research on published literature.

Funding: None.

Competing interests: MA serves on the editorial board of Synthēsis (the
  target journal); MA had no role in editorial decisions on this
  manuscript, which was handled by an independent editor of the journal.

Author contributions (CRediT):
  [STUDENT REWRITER, first author] — Writing – original draft, Writing –
    review & editing, Validation.
  [SUPERVISING FACULTY, last/senior author] — Supervision, Validation,
    Writing – review & editing.
  Mahmood Ahmad (middle author, NOT first or last) — Conceptualization,
    Methodology, Software, Data curation, Formal analysis, Resources.

AI disclosure: Computational tooling (including AI-assisted coding via
  Claude Code [Anthropic]) was used to develop analysis scripts and assist
  with data extraction. The final manuscript was human-written, reviewed,
  and approved by the author; the submitted text is not AI-generated. All
  quantitative claims were verified against source data; cross-validation
  was performed where applicable. The author retains full responsibility for
  the final content.

Preprint: Not preprinted.

Reporting checklist: PRISMA 2020 (methods-paper variant — reports on review corpus).

Target journal: ◆ Synthēsis (https://www.synthesis-medicine.org/index.php/journal)
  Section: Methods Note — submit the 156-word E156 body verbatim as the main text.
  The journal caps main text at ≤400 words; E156's 156-word, 7-sentence
  contract sits well inside that ceiling. Do NOT pad to 400 — the
  micro-paper length is the point of the format.

Manuscript license: CC-BY-4.0.
Code license: MIT.
```


---

_Auto-generated from the workbook by `C:/E156/scripts/create_missing_protocols.py`. If something is wrong, edit `rewrite-workbook.txt` and re-run the script — it will overwrite this file via the GitHub API._