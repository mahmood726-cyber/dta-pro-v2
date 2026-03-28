Mahmood Ahmad
Tahir Heart Institute
mahmood.ahmad2@nhs.net

DTA Meta-Analysis Pro: A Browser-Based Tool for Diagnostic Test Accuracy Evidence Synthesis

How can systematic reviewers synthesize diagnostic accuracy data using hierarchical models without specialized statistical programming? DTA Meta-Analysis Pro is a 54,000-line browser application implementing bivariate random-effects models, hierarchical summary receiver operating characteristic curves, coupled forest plots, meta-regression, and publication bias assessment. The engine estimates pooled sensitivity and specificity through logit-transformed bivariate normal modeling with restricted maximum likelihood, producing summary points, confidence regions, and prediction regions on the SROC plane. Validation against the R mada package version 0.5.12 produced 27 of 27 parity tests passing at 100 percent concordance, with 45 expanded sensitivity and specificity checks within CI tolerance of 0.005. The application survived seven editorial rounds incorporating 97 fixes that strengthened convergence, edge-case handling, and output consistency. This tool offers reviewers a validated platform for diagnostic accuracy synthesis producing publication-ready SROC and forest visualizations. Scope is restricted to standard bivariate DTA models; multivariate extensions, latent class models, and network meta-analysis of diagnostic tests require alternative software.

Outside Notes

Type: methods
Primary estimand: Pooled sensitivity and specificity
App: DTA Meta-Analysis Pro v4.9.2
Data: 54,000-line browser application with R mada validation
Code: https://github.com/mahmood726-cyber/dta-pro-v2
Version: 4.9.2
Validation: DRAFT

References

1. Salanti G. Indirect and mixed-treatment comparison, network, or multiple-treatments meta-analysis. Res Synth Methods. 2012;3(2):80-97.
2. Rucker G, Schwarzer G. Ranking treatments in frequentist network meta-analysis. BMC Med Res Methodol. 2015;15:58.
3. Dias S, Welton NJ, Caldwell DM, Ades AE. Checking consistency in mixed treatment comparison meta-analysis. Stat Med. 2010;29(7-8):932-944.

AI Disclosure

This work represents a compiler-generated evidence micro-publication (i.e., a structured, pipeline-based synthesis output). AI is used as a constrained synthesis engine operating on structured inputs and predefined rules, rather than as an autonomous author. Deterministic components of the pipeline, together with versioned, reproducible evidence capsules (TruthCert), are designed to support transparent and auditable outputs. All results and text were reviewed and verified by the author, who takes full responsibility for the content. The workflow operationalises key transparency and reporting principles consistent with CONSORT-AI/SPIRIT-AI, including explicit input specification, predefined schemas, logged human-AI interaction, and reproducible outputs.
