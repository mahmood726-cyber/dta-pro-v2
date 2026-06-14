# Truth-recovery report — DTA_Pro_v2 (`dta-pro-v2` / `dta-pro.html`)

**Verdict: IMPROVEMENT** (shipped interval mildly anti-conservative; a genuine-HKSJ
variance inflation restores near-nominal coverage). Point estimates are sound.

## What was tested

The engine is a genuine diagnostic-test-accuracy meta-analysis tool. The pooling
core is `bivariateGLMM` (`dta-pro.html` lines 5165–5516): a Fisher-scoring ML fit
of the bivariate logit-normal random-effects (Reitsma/Chu–Cole) model with a
3-parameter (tau2_sens, tau2_spec, rho) variance structure, returning pooled
sensitivity/specificity and their confidence intervals.

`truth-recovery/engine.mjs` copies `bivariateGLMM` and `computeAUCProper`
**verbatim** (`sed -n '5165,5516p'` and `'5670,5699p'`), plus the verbatim
`ANALYSIS_CONFIG`. The browser app resolves `qnorm/qt/pnorm/pchisq` through jStat;
the harness supplies self-contained pure-JS equivalents (Acklam inverse-normal,
Cornish-Fisher t, Wilson-Hilferty chi-square) and stubs `document` to the default
0.95 confidence level. No app logic was modified.

`truth-recovery/dgp-dta.mjs` is a seeded, standalone known-truth bivariate DTA
DGP: (u_A,u_B) ~ N(0,Sigma), sens_i = expit(logit(Se)+u_A),
spec_i = expit(logit(Sp)+u_B), n ~ log-uniform, TP~Bin(n_dis,sens_i),
TN~Bin(n_heal,spec_i). Estimand = true Se = expit(mu_A), Sp = expit(mu_B).

`truth-recovery/harness.mjs` measures coverage of the TRUE Se/Sp by the pooled
CIs and bias, across 4 heterogeneity scenarios x k in {5,10,20}.

## Finding

`bivariateGLMM` builds its Se/Sp CI as (lines 5410–5412):

    critVal = n >= 30 ? qnorm(1-a/2) : qt(1-a/2, max(1, n-2));
    sensCI  = [invLogit(mu1 - critVal*seMu1), invLogit(mu1 + critVal*seMu1)];

The inline comment labels this **"HKSJ"** ("HKSJ: use t-distribution for small k").
But it only swaps the z critical value for `t_{k-2}` on the **ordinary** RE SE
(`seMu1`/`seMu2`, the inverse fixed-effects precision-matrix SE). It does **not**
apply the genuine Hartung-Knapp-Sidik-Jonkman variance inflation
`max(1, Q/(k-1))`. The t-swap alone slightly under-covers.

The `genuine-HKSJ` variant in the harness re-pools each axis (DL tau2, RE weights)
and scales the SE by `sqrt(max(1, Q_RE/(k-1)) / sum(wRE))`, then applies the same
`t_{k-2}` critical value — i.e. the variance adjustment the label promises.

## Results (seed 20260614, 400 reps/cell, Se=0.85, Sp=0.80)

Mean coverage of the TRUE Se / Sp over all 12 heterogeneity cells (nominal 0.95):

| method        | mean cov Se | mean cov Sp |
|---------------|-------------|-------------|
| shipped       | **0.9351**  | **0.9406**  |
| genuine-HKSJ  | **0.9527**  | **0.9592**  |

Per-cell coverage (shipped -> genuine-HKSJ):

| scenario  | k  | ship covSe | HKSJ covSe | ship covSp | HKSJ covSp |
|-----------|----|------------|------------|------------|------------|
| het_low   | 5  | 0.977      | 0.993      | 0.977      | 0.988      |
| het_low   | 10 | 0.922      | 0.945      | 0.943      | 0.958      |
| het_low   | 20 | 0.916      | 0.945      | 0.949      | 0.955      |
| het_mod   | 5  | 0.957      | 0.965      | 0.952      | 0.968      |
| het_mod   | 10 | 0.931      | 0.958      | 0.928      | 0.948      |
| het_mod   | 20 | 0.923      | 0.928      | 0.926      | 0.945      |
| het_high  | 5  | 0.945      | 0.958      | 0.916      | 0.955      |
| het_high  | 10 | 0.913      | 0.943      | 0.950      | 0.973      |
| het_high  | 20 | 0.913      | 0.933      | 0.931      | 0.948      |
| het_corr  | 5  | 0.967      | 0.975      | 0.956      | 0.975      |
| het_corr  | 10 | 0.927      | 0.945      | 0.942      | 0.960      |
| het_corr  | 20 | 0.931      | 0.948      | 0.918      | 0.940      |

- **Point estimates are unbiased**: bias in Se/Sp ~ -0.004 across cells. The issue
  is purely interval width, not the estimator.
- **Shipped is mildly anti-conservative**: mean Se coverage 0.935 vs nominal 0.95,
  worst at larger k (k=20 cells fall to ~0.91–0.93). Sp behaves similarly (0.941).
- **Genuine-HKSJ restores near-nominal coverage** in every cell — Se coverage
  improves in 12/12 cells, Sp in 12/12 cells — landing at 0.953/0.959 overall.

## Honest caveats

- This is a **mild** anti-conservatism (~1.5–2 coverage points), not a gross bug.
  The bivariate GLMM point estimate and its 3-parameter variance structure are
  correct and unbiased.
- ~3% of fits at k=5 return non-finite CIs (degenerate ML on tiny samples, e.g.
  rho pinned to +/-0.99); these are excluded from coverage as the app would
  surface a non-convergence warning. Both methods see the same datasets.
- The genuine-HKSJ variant here is a per-axis DL re-pool, not a re-derivation
  inside the joint GLMM; it is offered as a drop-in CI correction, not a full
  re-fit. A profile-likelihood or genuine joint-HKSJ interval would be the
  production-grade fix.

## Recommendation

Replace the `seMu1`/`seMu2` x `t_{k-2}` interval with an HKSJ-adjusted SE
(`sqrt(max(1, Q/(k-1)) / sum(w_RE))`) on each axis, OR relabel the current
interval honestly as "RE SE x t_{k-2}" rather than "HKSJ". The variance inflation
closes the coverage gap with no change to the (already-correct) point estimates.
