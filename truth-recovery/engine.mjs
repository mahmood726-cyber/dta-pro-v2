// ============================================================
// engine.mjs -- pure DOM-free numerical core EXTRACTED VERBATIM from
// dta-pro.html (DTA_Pro_v2 / dta-pro-v2). bivariateGLMM and computeAUCProper
// are copied unchanged (sed -n '5165,5516p' and '5670,5699p' dta-pro.html) so
// the SAME math the app ships is what the harness measures.
//
// The app resolves qnorm/qt/pnorm/pchisq/invLogit through jStat at runtime in
// the browser. Here we supply self-contained pure-JS equivalents (Acklam
// inverse-normal + Cornish-Fisher t + chi-square CDF) so the verbatim function
// bodies run unchanged under node. `document` is stubbed to the default 0.95
// confLevel (no DOM in node).
// ============================================================

// --- DOM stub: bivariateGLMM only reads document.getElementById('confLevel') ---
const document = { getElementById: () => ({ value: '0.95' }) };

// --- self-contained quantile / CDF helpers (replace jStat at parity) ---
const invLogit = x => 1 / (1 + Math.exp(-x));

function qnorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
            ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
}

function pnorm(z) {
  // Abramowitz & Stegun 7.1.26 (same as app's jStat-less fallback)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function qt(p, df) {
  // Cornish-Fisher expansion (4-term) -> accurate t quantile for df>=1
  if (df >= 120) return qnorm(p);
  if (df <= 0) return NaN;
  const z = qnorm(p);
  const g1 = (z*z*z + z) / 4;
  const g2 = (5*Math.pow(z,5) + 16*Math.pow(z,3) + 3*z) / 96;
  const g3 = (3*Math.pow(z,7) + 19*Math.pow(z,5) + 17*Math.pow(z,3) - 15*z) / 384;
  const g4 = (79*Math.pow(z,9) + 776*Math.pow(z,7) + 1482*Math.pow(z,5)
              - 1920*Math.pow(z,3) - 945*z) / 92160;
  return z + g1/df + g2/(df*df) + g3/(df*df*df) + g4/(df*df*df*df);
}

function pchisq(x, df) {
  // Wilson-Hilferty normal approximation (matches app's jStat-less fallback)
  if (x <= 0) return 0;
  const t = Math.cbrt(x / df) - (1 - 2 / (9 * df));
  return pnorm(t / Math.sqrt(2 / (9 * df)));
}

// ANALYSIS_CONFIG copied verbatim from dta-pro.html line 3607
const ANALYSIS_CONFIG = {
  HKSJ_THRESHOLD: 30,
  MIN_TAU2: 1e-6,
  RIDGE_BASE: 0.001,
  RIDGE_INCREMENT: 0.01,
  DEFAULT_ALPHA: 0.05,
  MAX_ITERATIONS: 500,
  CONVERGENCE_TOL: 1e-8,
  BOOTSTRAP_ITERATIONS: 500,
  MCMC_ITERATIONS: 5000,
  MCMC_BURNIN: 1000,
  AUTO_AIC_AVERAGE_THRESHOLD: 0.85,
  AUTO_SPARSE_ZERO_RATE: 0.25
};

// ===================== VERBATIM from dta-pro.html below =====================
function bivariateGLMM(studies, options = {}) {
  const n = studies.length;

  // Edge case handling for small k
  if (n < 2) {
    throw new Error('Minimum 2 studies required for meta-analysis');
  }
  // R2-B04: These warnings now added to warnings[] below (after declaration) for UI display

  const maxIter = options.maxIter || ANALYSIS_CONFIG.MAX_ITERATIONS;
  const tol = options.tol || ANALYSIS_CONFIG.CONVERGENCE_TOL;
  const useBootstrap = options.bootstrap === true;
  const nBoot = options.nBootstrap || 1000;
  const confLevel = options.confLevel || (typeof document !== 'undefined' && document.getElementById('confLevel') ? parseFloat(document.getElementById('confLevel').value) : 0.95);
  // E2-01: getStudyData() already applies continuity correction; no need to re-apply here
  const data = studies.map(s => {
    const tp = s.tp, fp = s.fp, fn = s.fn, tn = s.tn;
    const sens = tp / (tp + fn);
    const spec = tn / (tn + fp);
    const y1 = Math.log(sens / (1 - sens));
    const y2 = Math.log(spec / (1 - spec));
    const v1 = 1/tp + 1/fn;
    const v2 = 1/tn + 1/fp;
    return { y1, y2, v1, v2, tp, fp, fn, tn, sens, spec };
  });
  const y1 = data.map(d => d.y1);
  const y2 = data.map(d => d.y2);
  const v1 = data.map(d => d.v1);
  const v2 = data.map(d => d.v2);
  const w1 = v1.map(v => 1/v);
  const w2 = v2.map(v => 1/v);
  const sumW1 = w1.reduce((a,b) => a+b, 0);
  const sumW2 = w2.reduce((a,b) => a+b, 0);
  let mu1 = y1.reduce((s,y,i) => s + y*w1[i], 0) / sumW1;
  let mu2 = y2.reduce((s,y,i) => s + y*w2[i], 0) / sumW2;
  const Q1 = y1.reduce((s,y,i) => s + w1[i] * Math.pow(y - mu1, 2), 0);
  const Q2 = y2.reduce((s,y,i) => s + w2[i] * Math.pow(y - mu2, 2), 0);
  const C1 = sumW1 - w1.reduce((s,w) => s + w*w, 0) / sumW1;
  const C2 = sumW2 - w2.reduce((s,w) => s + w*w, 0) / sumW2;
  let tau2_1 = Math.max(0, (Q1 - (n-1)) / C1);
  let tau2_2 = Math.max(0, (Q2 - (n-1)) / C2);
  let rho = -0.5; // Initial estimate
  let converged = false;
  let iterations = 0;
  let logLik = -Infinity;
  let warnings = [];
  // R2-B04: Show k=2-3 warnings in UI, not just console
  if (n === 2) warnings.push('Only 2 studies — results highly uncertain. CIs use t(df=1). Consider narrative synthesis.');
  if (n === 3) warnings.push('Only 3 studies — heterogeneity estimates unreliable. Interpret with caution.');
  let fisherInverse = null; // For variance component SEs
  let lastScore_tau1 = 0, lastScore_tau2 = 0, lastScore_rho = 0;
  let singularStudies = null; // R3-08: Collect across iterations, deduplicate
  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    let P11 = 0, P12 = 0, P22 = 0;
    let Py1 = 0, Py2 = 0;
    let newLogLik = 0;
    const Ws = [];
    for (let i = 0; i < n; i++) {
      const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);
      const V11 = v1[i] + tau2_1;
      const V22 = v2[i] + tau2_2;
      const V12 = sigma12;
      const det = V11 * V22 - V12 * V12;
      if (det <= 1e-10) {
        // R3-08: Collect singular study indices, add single warning after loop
        if (!singularStudies) singularStudies = [];
        singularStudies.push(i + 1);
        Ws.push(null);
        continue;
      }
      const W11 = V22 / det;
      const W22 = V11 / det;
      const W12 = -V12 / det;
      Ws.push({ W11, W22, W12, det });
      P11 += W11;
      P12 += W12;
      P22 += W22;
      Py1 += W11 * y1[i] + W12 * y2[i];
      Py2 += W12 * y1[i] + W22 * y2[i];
      const e1 = y1[i] - mu1;
      const e2 = y2[i] - mu2;
      newLogLik -= 0.5 * (Math.log(det) + W11*e1*e1 + 2*W12*e1*e2 + W22*e2*e2);
    }
    const detP = P11 * P22 - P12 * P12;
    if (Math.abs(detP) < 1e-10) {
      warnings.push("Near-singular precision matrix for fixed effects");
      break;
    }
    const newMu1 = (P22 * Py1 - P12 * Py2) / detP;
    const newMu2 = (-P12 * Py1 + P11 * Py2) / detP;
    let score_tau1 = 0, score_tau2 = 0, score_rho = 0;
    let fish_11 = 0, fish_12 = 0, fish_13 = 0;
    let fish_22 = 0, fish_23 = 0, fish_33 = 0;
    for (let i = 0; i < n; i++) {
      if (!Ws[i]) continue;
      const { W11, W22, W12, det } = Ws[i];
      const e1 = y1[i] - newMu1;
      const e2 = y2[i] - newMu2;
      // r = W * e (weighted residual vector)
      const r1 = W11 * e1 + W12 * e2;
      const r2 = W12 * e1 + W22 * e2;
      // Derivatives of V w.r.t. variance parameters
      // V = [[v1+tau2_1, rho*sqrt(tau2_1*tau2_2)], [rho*sqrt(tau2_1*tau2_2), v2+tau2_2]]
      const sqrtRatio12 = tau2_1 > 0.001 ? Math.sqrt(tau2_2 / tau2_1) : 0;
      const sqrtRatio21 = tau2_2 > 0.001 ? Math.sqrt(tau2_1 / tau2_2) : 0;
      const sqrtProd = Math.sqrt(tau2_1 * tau2_2);
      // dV/dtau2_1 = [[1, d12_1], [d12_1, 0]]
      const d12_1 = rho * 0.5 * sqrtRatio12;
      // dV/dtau2_2 = [[0, d12_2], [d12_2, 1]]
      const d12_2 = rho * 0.5 * sqrtRatio21;
      // dV/drho = [[0, sqrtProd], [sqrtProd, 0]]
      // Score = -0.5 * tr(W * dV) + 0.5 * r' * dV * r
      // Using r'*A*r for symmetric 2x2 A=[[a,b],[b,c]]: a*r1^2 + 2*b*r1*r2 + c*r2^2
      score_tau1 += -0.5 * (W11 + 2 * W12 * d12_1);
      score_tau1 += 0.5 * (r1 * r1 + 2 * d12_1 * r1 * r2);
      score_tau2 += -0.5 * (W22 + 2 * W12 * d12_2);
      score_tau2 += 0.5 * (r2 * r2 + 2 * d12_2 * r1 * r2);
      score_rho += -0.5 * (2 * W12 * sqrtProd);
      score_rho += 0.5 * (2 * sqrtProd * r1 * r2);
      // Fisher info: F_{ij} = 0.5 * tr(W*dVi * W*dVj)
      // Compute M = W*dV for each parameter, then tr(Mi*Mj)
      const M1_00 = W11 + W12*d12_1, M1_01 = W11*d12_1;
      const M1_10 = W12 + W22*d12_1, M1_11 = W12*d12_1;
      const M2_00 = W12*d12_2,       M2_01 = W11*d12_2 + W12;
      const M2_10 = W22*d12_2,       M2_11 = W12*d12_2 + W22;
      const M3_00 = W12*sqrtProd,     M3_01 = W11*sqrtProd;
      const M3_10 = W22*sqrtProd,     M3_11 = W12*sqrtProd;
      // tr(A*B) = A00*B00 + A01*B10 + A10*B01 + A11*B11
      fish_11 += 0.5 * (M1_00*M1_00 + M1_01*M1_10 + M1_10*M1_01 + M1_11*M1_11);
      fish_22 += 0.5 * (M2_00*M2_00 + M2_01*M2_10 + M2_10*M2_01 + M2_11*M2_11);
      fish_33 += 0.5 * (M3_00*M3_00 + M3_01*M3_10 + M3_10*M3_01 + M3_11*M3_11);
      fish_12 += 0.5 * (M1_00*M2_00 + M1_01*M2_10 + M1_10*M2_01 + M1_11*M2_11);
      fish_13 += 0.5 * (M1_00*M3_00 + M1_01*M3_10 + M1_10*M3_01 + M1_11*M3_11);
      fish_23 += 0.5 * (M2_00*M3_00 + M2_01*M3_10 + M2_10*M3_01 + M2_11*M3_11);
    }
    // Save scores for post-loop gradient norm
    lastScore_tau1 = score_tau1;
    lastScore_tau2 = score_tau2;
    lastScore_rho = score_rho;
    const ridge = ANALYSIS_CONFIG.RIDGE_BASE * (1 + iter * ANALYSIS_CONFIG.RIDGE_INCREMENT);
    fish_11 += ridge;
    fish_22 += ridge;
    fish_33 += ridge;
    const F = [
      [fish_11, fish_12, fish_13],
      [fish_12, fish_22, fish_23],
      [fish_13, fish_23, fish_33]
    ];
    const detF = fish_11 * (fish_22 * fish_33 - fish_23 * fish_23)
               - fish_12 * (fish_12 * fish_33 - fish_23 * fish_13)
               + fish_13 * (fish_12 * fish_23 - fish_22 * fish_13);
    let delta_tau1, delta_tau2, delta_rho;
    if (Math.abs(detF) > 1e-12) {
      const invF11 = (fish_22 * fish_33 - fish_23 * fish_23) / detF;
      const invF12 = (fish_13 * fish_23 - fish_12 * fish_33) / detF;
      const invF13 = (fish_12 * fish_23 - fish_13 * fish_22) / detF;
      const invF22 = (fish_11 * fish_33 - fish_13 * fish_13) / detF;
      const invF23 = (fish_12 * fish_13 - fish_11 * fish_23) / detF;
      const invF33 = (fish_11 * fish_22 - fish_12 * fish_12) / detF;
      delta_tau1 = invF11 * score_tau1 + invF12 * score_tau2 + invF13 * score_rho;
      delta_tau2 = invF12 * score_tau1 + invF22 * score_tau2 + invF23 * score_rho;
      delta_rho = invF13 * score_tau1 + invF23 * score_tau2 + invF33 * score_rho;
      // Always capture latest inverse; final value after loop exit is what matters
      fisherInverse = { invF11, invF12, invF13, invF22, invF23, invF33 };
    } else {
      delta_tau1 = score_tau1 / (fish_11 + 0.1);
      delta_tau2 = score_tau2 / (fish_22 + 0.1);
      delta_rho = score_rho / (fish_33 + 0.1);
    }
    const dampFactor = iter < 20 ? 0.3 : (iter < 50 ? 0.5 : 0.7);
    const newTau2_1 = Math.max(0, tau2_1 + dampFactor * delta_tau1);
    const newTau2_2 = Math.max(0, tau2_2 + dampFactor * delta_tau2);
    const newRho = Math.max(-0.99, Math.min(0.99, rho + dampFactor * delta_rho));
    const diff = Math.abs(newMu1 - mu1) + Math.abs(newMu2 - mu2) +
                 Math.abs(newTau2_1 - tau2_1) + Math.abs(newTau2_2 - tau2_2) +
                 Math.abs(newRho - rho);
    mu1 = newMu1;
    mu2 = newMu2;
    tau2_1 = newTau2_1;
    tau2_2 = newTau2_2;
    rho = newRho;
    logLik = newLogLik;
    if (diff < tol && iter > 5) {
      converged = true;
      break;
    }
  }
  // R3-08: Single consolidated warning for all singular studies (deduplicated)
  if (singularStudies && singularStudies.length > 0) {
    const unique = [...new Set(singularStudies)];
    warnings.push(`Near-singular variance matrix in ${unique.length} stud${unique.length === 1 ? 'y' : 'ies'}: ${unique.join(', ')}`);
  }
  // PLOS ONE Reviewer 1 Fix: Track convergence diagnostics
  let gradientNorm = NaN;
  let hessianPD = false;
  let method = 'ml';

  // Calculate final gradient norm (L2 norm of score vector) using outer-scoped variables
  gradientNorm = Math.sqrt(lastScore_tau1*lastScore_tau1 + lastScore_tau2*lastScore_tau2 + lastScore_rho*lastScore_rho);

  // Check Hessian positive definiteness via Sylvester's criterion on Fisher inverse
  if (fisherInverse) {
    const { invF11, invF12, invF13, invF22, invF23, invF33 } = fisherInverse;
    const minor2 = invF11 * invF22 - invF12 * invF12;
    const minor3 = invF11 * (invF22 * invF33 - invF23 * invF23)
                 - invF12 * (invF12 * invF33 - invF23 * invF13)
                 + invF13 * (invF12 * invF23 - invF22 * invF13);
    hessianPD = invF11 > 0 && minor2 > 0 && minor3 > 0;
  }
  // E2-03: Warn when Fisher information matrix is singular (variance component SEs will be NaN)
  if (!fisherInverse) {
    warnings.push('Fisher information matrix near-singular; variance component SEs unavailable');
  } else if (!hessianPD) {
    warnings.push('Fisher information matrix not positive definite; variance component SEs may be unreliable');
  }

  if (!converged) {
    warnings.push("ML did not fully converge; results from last iteration used");
    method = 'ml-unconverged';
  }
  const finalQ1 = y1.reduce((s,y,i) => s + (1/(v1[i]+tau2_1)) * Math.pow(y - mu1, 2), 0);
  const finalQ2 = y2.reduce((s,y,i) => s + (1/(v2[i]+tau2_2)) * Math.pow(y - mu2, 2), 0);
  let I11 = 0, I12 = 0, I22 = 0;
  for (let i = 0; i < n; i++) {
    const sigma12 = rho * Math.sqrt(tau2_1 * tau2_2);
    const V11 = v1[i] + tau2_1;
    const V22 = v2[i] + tau2_2;
    const V12 = sigma12;
    const det = V11 * V22 - V12 * V12;
    if (det <= 1e-10) continue;
    I11 += V22 / det;
    I12 += -V12 / det;
    I22 += V11 / det;
  }
  const detI = I11 * I22 - I12 * I12;
  const varMu1 = detI > 0 ? I22 / detI : 0.1;
  const varMu2 = detI > 0 ? I11 / detI : 0.1;
  const covMu12 = detI > 0 ? -I12 / detI : 0;
  const seMu1 = Math.sqrt(varMu1);
  const seMu2 = Math.sqrt(varMu2);
  const sens = invLogit(mu1);
  const spec = invLogit(mu2);
  const alpha = 1 - confLevel;
  // HKSJ: use t-distribution for small k, z-normal for large k (Hartung-Knapp-Sidik-Jonkman)
  const critVal = n >= 30 ? qnorm(1 - alpha/2) : qt(1 - alpha/2, Math.max(1, n - 2));
  const sensCI = [invLogit(mu1 - critVal*seMu1), invLogit(mu1 + critVal*seMu1)];
  const specCI = [invLogit(mu2 - critVal*seMu2), invLogit(mu2 + critVal*seMu2)];
  // Guard against division by zero for perfect sens/spec (clamp to [0.001, 0.999] for LR calculations)
  const sensLR = Math.max(0.001, Math.min(0.999, sens));
  const specLR = Math.max(0.001, Math.min(0.999, spec));
  const plr = sensLR / (1 - specLR);
  const nlr = (1 - sensLR) / specLR;
  // R2-B12: Use exp(logDOR) for consistency with CI (both from logit scale)
  const logDOR = mu1 + mu2;
  const dor = Math.exp(logDOR);
  const varLogDOR = varMu1 + varMu2 + 2 * covMu12;
  const seLogDOR = Math.sqrt(Math.max(0.001, varLogDOR));
  let plrCI, nlrCI, dorCI;
  if (useBootstrap && n >= 4) {
    const bootResults = parametricBootstrapDTA(studies, data, mu1, mu2, tau2_1, tau2_2, rho, nBoot, alpha);
    plrCI = bootResults.plrCI;
    nlrCI = bootResults.nlrCI;
    dorCI = bootResults.dorCI;
  } else {
    // Delta method for LR SE on log scale including covariance term
    // log(PLR) = log(sens/(1-spec)); derivatives: d/dmu1 = (1-sens), d/dmu2 = spec
    // log(NLR) = log((1-sens)/spec); derivatives: d/dmu1 = -sens, d/dmu2 = -(1-spec)
    const varLogPlr = Math.pow(1 - sens, 2) * varMu1 + Math.pow(spec, 2) * varMu2 + 2 * (1 - sens) * spec * covMu12;
    const varLogNlr = Math.pow(sens, 2) * varMu1 + Math.pow(1 - spec, 2) * varMu2 + 2 * sens * (1 - spec) * covMu12;
    // B08 fix: Guard against negative variance due to strong negative covariance
    const seLogPlr = Math.sqrt(Math.max(0.0001, varLogPlr));
    const seLogNlr = Math.sqrt(Math.max(0.0001, varLogNlr));
    const logPlr = Math.log(Math.max(plr, 0.001)); // Guard against log(0)
    const logNlr = Math.log(Math.max(nlr, 0.001));
    plrCI = [Math.exp(logPlr - critVal*seLogPlr), Math.exp(logPlr + critVal*seLogPlr)];
    nlrCI = [Math.exp(logNlr - critVal*seLogNlr), Math.exp(logNlr + critVal*seLogNlr)];
    dorCI = [Math.exp(logDOR - critVal*seLogDOR), Math.exp(logDOR + critVal*seLogDOR)];
  }
  const tCrit = qt(1 - alpha/2, Math.max(1, n-2));
  const predVarSens = varMu1 + tau2_1;
  const predVarSpec = varMu2 + tau2_2;
  const sensPredCI = [invLogit(mu1 - tCrit*Math.sqrt(predVarSens)),
                      invLogit(mu1 + tCrit*Math.sqrt(predVarSens))];
  const specPredCI = [invLogit(mu2 - tCrit*Math.sqrt(predVarSpec)),
                      invLogit(mu2 + tCrit*Math.sqrt(predVarSpec))];
  // Use fixed-effects weights for Cochran Q / I² (Higgins & Thompson 2002)
  const wFE_sens = data.map((d, i) => 1 / v1[i]);
  const wFE_spec = data.map((d, i) => 1 / v2[i]);
  const muFE_sens = y1.reduce((s,y,i) => s + wFE_sens[i] * y, 0) / wFE_sens.reduce((a,b) => a+b, 0);
  const muFE_spec = y2.reduce((s,y,i) => s + wFE_spec[i] * y, 0) / wFE_spec.reduce((a,b) => a+b, 0);
  const Q_FE_sens = y1.reduce((s,y,i) => s + wFE_sens[i] * Math.pow(y - muFE_sens, 2), 0);
  const Q_FE_spec = y2.reduce((s,y,i) => s + wFE_spec[i] * Math.pow(y - muFE_spec, 2), 0);
  const I2_sens = Q_FE_sens > (n-1) ? Math.min(100, ((Q_FE_sens - (n-1)) / Q_FE_sens) * 100) : 0;
  const I2_spec = Q_FE_spec > (n-1) ? Math.min(100, ((Q_FE_spec - (n-1)) / Q_FE_spec) * 100) : 0;
  const weights = wFE_sens;
  const totalWeight = weights.reduce((a,b) => a+b, 0);
  const relWeights = weights.map(w => w / totalWeight * 100);
  const k = 5;
  const AIC = -2 * logLik + 2 * k;
  const BIC = -2 * logLik + k * Math.log(n);
  const auc = computeAUCProper(mu1, mu2, tau2_1, tau2_2, rho);
  // E2-01: Use correctionApplied flag from getStudyData() (not data.hasZero which is always false post-correction)
  const nCorrected = studies.filter(s => s.correctionApplied).length;
  if (nCorrected > 0) {
    warnings.push(`Continuity correction applied to ${nCorrected}/${n} studies with zero cells`);
  }
  return {
    type: 'bivariate',
    converged,
    iterations,
    warnings,
    logLik,
    AIC, BIC,
    // PLOS ONE Reviewer 1 Fix: Include convergence diagnostics
    gradientNorm,
    hessianPD,
    method,
    nStudies: n,
    totalN: studies.reduce((s,d) => s + (d.n || (d.tp + d.fp + d.fn + d.tn)), 0),
    summary: {
      sens, spec, plr, nlr, dor,
      sensCI, specCI, plrCI, nlrCI, dorCI,
      sensPredCI, specPredCI, // NEW: prediction intervals
      auc
    },
    heterogeneity: {
      tau2_sens: tau2_1,
      tau2_spec: tau2_2,
      tau_sens: Math.sqrt(tau2_1),
      tau_spec: Math.sqrt(tau2_2),
      rho,
      Q_sens: Q_FE_sens,
      Q_spec: Q_FE_spec,
      I2_sens,
      I2_spec,
      pQ_sens: 1 - pchisq(Q_FE_sens, n-1),
      pQ_spec: 1 - pchisq(Q_FE_spec, n-1)
    },
    parameters: [
      { name: 'μ (logit Sens)', estimate: mu1, se: seMu1, pvalue: 2*(1-pnorm(Math.abs(mu1/seMu1))) },
      { name: 'μ (logit Spec)', estimate: mu2, se: seMu2, pvalue: 2*(1-pnorm(Math.abs(mu2/seMu2))) },
      // E2-03: Guard against negative Fisher inverse diagonal (numerical artifacts) — use Math.max(0, ...)
      { name: 'τ² (Sens)', estimate: tau2_1, se: fisherInverse && fisherInverse.invF11 > 0 ? Math.sqrt(fisherInverse.invF11) : NaN, pvalue: NaN },
      { name: 'τ² (Spec)', estimate: tau2_2, se: fisherInverse && fisherInverse.invF22 > 0 ? Math.sqrt(fisherInverse.invF22) : NaN, pvalue: NaN },
      { name: 'ρ (correlation)', estimate: rho, se: fisherInverse && fisherInverse.invF33 > 0 ? Math.sqrt(fisherInverse.invF33) : NaN, pvalue: NaN }
    ],
    varCovar: { varMu1, varMu2, covMu12 },
    weights: relWeights,
    studies: studies.map((s, i) => ({ ...s, weight: relWeights[i] }))
  };
}
function computeAUCProper(mu1, mu2, tau2_1, tau2_2, rho) {
  // Guard against NaN inputs (B10 fix)
  if (!isFinite(mu1) || !isFinite(mu2) || !isFinite(tau2_1) || !isFinite(tau2_2) || !isFinite(rho)) {
    console.warn('computeAUCProper received non-finite inputs');
    return NaN;
  }
  const nPoints = 100;
  let auc = 0;
  let prevFPR = 0;
  let prevSens = 1;
  for (let i = 0; i <= nPoints; i++) {
    const fpr = i / nPoints; // 1 - specificity
    const beta = Math.sqrt(tau2_1 / Math.max(0.001, tau2_2));
    if (fpr > 0 && fpr < 1) {
      const logitFPR = Math.log(fpr / (1 - fpr));
      // E-01: Correct SROC formula — conditional E[logit(Sens)|Spec] uses logit(Spec) = -logitFPR
      // E[logit(Sens)] = mu1 + rho*sqrt(tau2_1/tau2_2) * (logit(Spec) - mu2)
      //                = mu1 - rho*sqrt(tau2_1/tau2_2) * (logitFPR + mu2)
      const logitSens = mu1 - beta * rho * (logitFPR + mu2);
      const sens = invLogit(logitSens);
      auc += 0.5 * (prevSens + sens) * (fpr - prevFPR);
      prevFPR = fpr;
      prevSens = sens;
    }
  }
  if (auc < 0.5 || auc > 1.0) {
    console.warn(`AUC ${auc.toFixed(4)} outside expected [0.5, 1.0]; clamping`);
  }
  return Math.max(0.5, Math.min(1.0, auc));
}


// ===================== exports =====================
export { bivariateGLMM, computeAUCProper, invLogit, qt, qnorm, pnorm, pchisq };
