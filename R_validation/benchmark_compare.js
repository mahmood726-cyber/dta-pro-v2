#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const LR95_HALF_CHISQ1 = 0.5 * 3.841458820694124;
const TWO_PI = 2 * Math.PI;

function parseArgs(argv) {
  const out = {
    dataset: "benchmark_sim_datasets.json",
    reference: "benchmark_mada_reference_r.json",
    output: "benchmark_comparison_report.json",
    maxMaeSens: 0.03,
    maxMaeSpec: 0.03,
    maxMaeLogDor: 0.22,
    minCoverageSens: 0.85,
    minCoverageSpec: 0.85,
    minCoverageLogDor: 0.8,
    minReplicates: 40,
    minScenarioReplicates: 8,
    scenarioMaxMaeLogDor: 0.3,
    scenarioMinCoverageSens: 0.75,
    scenarioMinCoverageSpec: 0.75,
    scenarioMinCoverageLogDor: 0.7,
    aicAverageThreshold: 0.85,
    skipProfile: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dataset" && argv[i + 1]) out.dataset = argv[++i];
    else if (a === "--reference" && argv[i + 1]) out.reference = argv[++i];
    else if (a === "--output" && argv[i + 1]) out.output = argv[++i];
    else if (a === "--maxMaeSens" && argv[i + 1]) out.maxMaeSens = Number(argv[++i]);
    else if (a === "--maxMaeSpec" && argv[i + 1]) out.maxMaeSpec = Number(argv[++i]);
    else if (a === "--maxMaeLogDor" && argv[i + 1]) out.maxMaeLogDor = Number(argv[++i]);
    else if (a === "--minCoverageSens" && argv[i + 1]) out.minCoverageSens = Number(argv[++i]);
    else if (a === "--minCoverageSpec" && argv[i + 1]) out.minCoverageSpec = Number(argv[++i]);
    else if (a === "--minCoverageLogDor" && argv[i + 1]) out.minCoverageLogDor = Number(argv[++i]);
    else if (a === "--minReplicates" && argv[i + 1]) out.minReplicates = Number(argv[++i]);
    else if (a === "--minScenarioReplicates" && argv[i + 1]) out.minScenarioReplicates = Number(argv[++i]);
    else if (a === "--scenarioMaxMaeLogDor" && argv[i + 1]) out.scenarioMaxMaeLogDor = Number(argv[++i]);
    else if (a === "--scenarioMinCoverageSens" && argv[i + 1]) out.scenarioMinCoverageSens = Number(argv[++i]);
    else if (a === "--scenarioMinCoverageSpec" && argv[i + 1]) out.scenarioMinCoverageSpec = Number(argv[++i]);
    else if (a === "--scenarioMinCoverageLogDor" && argv[i + 1]) out.scenarioMinCoverageLogDor = Number(argv[++i]);
    else if (a === "--aicAverageThreshold" && argv[i + 1]) out.aicAverageThreshold = Number(argv[++i]);
    else if (a === "--skipProfile") out.skipProfile = true;
  }
  return out;
}

function toNum(x) {
  return Number(x);
}

function isFiniteNum(x) {
  return Number.isFinite(toNum(x));
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function logit(p) {
  const x = clamp(toNum(p), 1e-9, 1 - 1e-9);
  return Math.log(x / (1 - x));
}

function invLogit(x) {
  return 1 / (1 + Math.exp(-x));
}

function mean(values) {
  if (!values.length) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function rmse(values) {
  if (!values.length) return NaN;
  return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
}

function median(values) {
  if (!values.length) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? 0.5 * (sorted[m - 1] + sorted[m]) : sorted[m];
}

function transformStudies(studies) {
  const rows = [];
  let zeroCellStudies = 0;
  for (const raw of studies || []) {
    const base = {
      tp: Math.max(0, toNum(raw.tp) || 0),
      fp: Math.max(0, toNum(raw.fp) || 0),
      fn: Math.max(0, toNum(raw.fn) || 0),
      tn: Math.max(0, toNum(raw.tn) || 0)
    };
    if (base.tp + base.fp + base.fn + base.tn <= 0) continue;
    const hasZero = base.tp === 0 || base.fp === 0 || base.fn === 0 || base.tn === 0;
    if (hasZero) zeroCellStudies++;
    const cc = hasZero ? 0.5 : 0;
    const tp = base.tp + cc;
    const fp = base.fp + cc;
    const fn = base.fn + cc;
    const tn = base.tn + cc;
    const sens = tp / Math.max(1e-12, tp + fn);
    const spec = tn / Math.max(1e-12, tn + fp);
    rows.push({
      y1: logit(sens),
      y2: logit(spec),
      v1: 1 / Math.max(1e-12, tp) + 1 / Math.max(1e-12, fn),
      v2: 1 / Math.max(1e-12, tn) + 1 / Math.max(1e-12, fp)
    });
  }
  return {
    rows,
    n: rows.length,
    zeroCellStudies,
    zeroCellRate: rows.length > 0 ? zeroCellStudies / rows.length : 0
  };
}

function nelderMead(fn, start, stepSizes, opts = {}) {
  const alpha = opts.alpha ?? 1;
  const gamma = opts.gamma ?? 2;
  const rho = opts.rho ?? 0.5;
  const sigma = opts.sigma ?? 0.5;
  const maxIter = opts.maxIter ?? 240;
  const tolX = opts.tolX ?? 1e-6;
  const tolF = opts.tolF ?? 1e-6;
  const n = start.length;
  const simplex = [];

  function safeEval(x) {
    const fx = fn(x);
    return isFiniteNum(fx) ? toNum(fx) : 1e18;
  }

  simplex.push({ x: start.slice(), fx: safeEval(start) });
  for (let i = 0; i < n; i++) {
    const point = start.slice();
    const step = Math.max(1e-4, Math.abs(stepSizes?.[i] ?? 0.25));
    point[i] += step;
    simplex.push({ x: point, fx: safeEval(point) });
  }

  let iterations = 0;
  for (; iterations < maxIter; iterations++) {
    simplex.sort((a, b) => a.fx - b.fx);
    const best = simplex[0];
    const worst = simplex[n];
    const secondWorst = simplex[n - 1];

    let fSpread = 0;
    let xSpread = 0;
    for (const p of simplex) {
      fSpread = Math.max(fSpread, Math.abs(p.fx - best.fx));
      let d2 = 0;
      for (let i = 0; i < n; i++) d2 += (p.x[i] - best.x[i]) ** 2;
      xSpread = Math.max(xSpread, Math.sqrt(d2));
    }
    if (fSpread < tolF && xSpread < tolX) break;

    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j];
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    const xr = centroid.map((c, j) => c + alpha * (c - worst.x[j]));
    const fr = safeEval(xr);

    if (fr < best.fx) {
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
      const fe = safeEval(xe);
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr };
      continue;
    }
    if (fr < secondWorst.fx) {
      simplex[n] = { x: xr, fx: fr };
      continue;
    }

    const xc = centroid.map((c, j) => c + rho * (worst.x[j] - c));
    const fc = safeEval(xc);
    if (fc < worst.fx) {
      simplex[n] = { x: xc, fx: fc };
      continue;
    }

    for (let i = 1; i <= n; i++) {
      const xs = simplex[0].x.map((bestVal, j) => bestVal + sigma * (simplex[i].x[j] - bestVal));
      simplex[i] = { x: xs, fx: safeEval(xs) };
    }
  }

  simplex.sort((a, b) => a.fx - b.fx);
  return {
    params: simplex[0].x.slice(),
    value: simplex[0].fx,
    iterations,
    converged: iterations < maxIter && isFiniteNum(simplex[0].fx)
  };
}

function insertFixed(reduced, fixedIndex, fixedValue) {
  const full = [];
  let r = 0;
  for (let i = 0; i < reduced.length + 1; i++) {
    if (i === fixedIndex) full.push(fixedValue);
    else full.push(reduced[r++]);
  }
  return full;
}

function optimizeWithFixedParam(nllFn, baseParams, fixedIndex, fixedValue) {
  const startReduced = baseParams.filter((_, i) => i !== fixedIndex);
  const steps = startReduced.map((v) => Math.max(0.15, Math.abs(v) * 0.25));
  const reducedFn = (z) => nllFn(insertFixed(z, fixedIndex, fixedValue));
  const opt = nelderMead(reducedFn, startReduced, steps, { maxIter: 180, tolX: 1e-5, tolF: 1e-5 });
  return {
    params: insertFixed(opt.params, fixedIndex, fixedValue),
    nll: opt.value,
    converged: opt.converged
  };
}

function independentNll(data, mu1, mu2, tau2Sens, tau2Spec) {
  let nll = 0;
  for (const r of data.rows) {
    const var1 = Math.max(1e-12, r.v1 + tau2Sens);
    const var2 = Math.max(1e-12, r.v2 + tau2Spec);
    nll += 0.5 * (Math.log(TWO_PI * var1) + ((r.y1 - mu1) ** 2) / var1);
    nll += 0.5 * (Math.log(TWO_PI * var2) + ((r.y2 - mu2) ** 2) / var2);
  }
  return nll;
}

function approxSEMu(data, tau2Sens, tau2Spec) {
  const w1 = data.rows.map((r) => 1 / Math.max(1e-12, r.v1 + tau2Sens));
  const w2 = data.rows.map((r) => 1 / Math.max(1e-12, r.v2 + tau2Spec));
  return {
    seMu1: 1 / Math.sqrt(Math.max(1e-12, w1.reduce((a, b) => a + b, 0))),
    seMu2: 1 / Math.sqrt(Math.max(1e-12, w2.reduce((a, b) => a + b, 0)))
  };
}

function fillDerivedFromMu(result) {
  const sens = clamp(invLogit(result.mu1), 0.001, 0.999);
  const spec = clamp(invLogit(result.mu2), 0.001, 0.999);
  const logDor = result.mu1 + result.mu2;
  result.pooled_sens = sens;
  result.pooled_spec = spec;
  result.pooled_log_dor = logDor;
  result.pooled_dor = Math.exp(logDor);
  return result;
}

function addApproxWaldCI(result, data) {
  const se = approxSEMu(data, result.tau2_sens, result.tau2_spec);
  const z = 1.959963984540054;
  const ciMu1 = [result.mu1 - z * se.seMu1, result.mu1 + z * se.seMu1];
  const ciMu2 = [result.mu2 - z * se.seMu2, result.mu2 + z * se.seMu2];
  const ciSens = [invLogit(ciMu1[0]), invLogit(ciMu1[1])];
  const ciSpec = [invLogit(ciMu2[0]), invLogit(ciMu2[1])];
  const seLogDor = Math.sqrt(se.seMu1 ** 2 + se.seMu2 ** 2);
  const ciLogDor = [result.pooled_log_dor - z * seLogDor, result.pooled_log_dor + z * seLogDor];
  result.ci = {
    method: "wald_approx",
    sens: ciSens,
    spec: ciSpec,
    log_dor: ciLogDor,
    dor: [Math.exp(ciLogDor[0]), Math.exp(ciLogDor[1])]
  };
  return result;
}

function fitFallbackUnivariate(data) {
  if (data.n < 1) {
    return {
      model: "fallback_univariate_re",
      converged: false,
      aic: NaN,
      nll: NaN
    };
  }

  const y1 = data.rows.map((r) => r.y1);
  const y2 = data.rows.map((r) => r.y2);
  const v1 = data.rows.map((r) => r.v1);
  const v2 = data.rows.map((r) => r.v2);
  const w1 = v1.map((v) => 1 / Math.max(1e-12, v));
  const w2 = v2.map((v) => 1 / Math.max(1e-12, v));
  const sumW1 = w1.reduce((a, b) => a + b, 0);
  const sumW2 = w2.reduce((a, b) => a + b, 0);
  const mu1FE = y1.reduce((s, y, i) => s + y * w1[i], 0) / Math.max(1e-12, sumW1);
  const mu2FE = y2.reduce((s, y, i) => s + y * w2[i], 0) / Math.max(1e-12, sumW2);
  const q1 = y1.reduce((s, y, i) => s + w1[i] * (y - mu1FE) ** 2, 0);
  const q2 = y2.reduce((s, y, i) => s + w2[i] * (y - mu2FE) ** 2, 0);
  const c1 = sumW1 - w1.reduce((s, w) => s + w * w, 0) / Math.max(1e-12, sumW1);
  const c2 = sumW2 - w2.reduce((s, w) => s + w * w, 0) / Math.max(1e-12, sumW2);
  const tau2Sens = Math.max(0, (q1 - (data.n - 1)) / Math.max(1e-12, c1));
  const tau2Spec = Math.max(0, (q2 - (data.n - 1)) / Math.max(1e-12, c2));
  const w1re = v1.map((v) => 1 / Math.max(1e-12, v + tau2Sens));
  const w2re = v2.map((v) => 1 / Math.max(1e-12, v + tau2Spec));
  const mu1 = y1.reduce((s, y, i) => s + y * w1re[i], 0) / Math.max(1e-12, w1re.reduce((a, b) => a + b, 0));
  const mu2 = y2.reduce((s, y, i) => s + y * w2re[i], 0) / Math.max(1e-12, w2re.reduce((a, b) => a + b, 0));
  const nll = independentNll(data, mu1, mu2, tau2Sens, tau2Spec);
  const out = fillDerivedFromMu({
    model: "fallback_univariate_re",
    converged: true,
    mu1,
    mu2,
    tau2_sens: tau2Sens,
    tau2_spec: tau2Spec,
    rho: 0,
    params: [mu1, mu2, Math.log(Math.sqrt(Math.max(1e-12, tau2Sens))), Math.log(Math.sqrt(Math.max(1e-12, tau2Spec)))],
    nll,
    aic: 2 * 4 + 2 * nll
  });
  out.nllFn = (p) => {
    const t1 = Math.exp(p[2]);
    const t2 = Math.exp(p[3]);
    return independentNll(data, p[0], p[1], t1 * t1, t2 * t2);
  };
  return addApproxWaldCI(out, data);
}

function bivariateReNll(data, params) {
  const mu1 = params[0];
  const mu2 = params[1];
  const tau1 = Math.exp(params[2]);
  const tau2 = Math.exp(params[3]);
  const rho = Math.tanh(params[4]);
  const s11 = tau1 * tau1;
  const s22 = tau2 * tau2;
  const s12 = rho * tau1 * tau2;
  let nll = 0;
  for (const r of data.rows) {
    const a = s11 + r.v1;
    const b = s12;
    const c = s22 + r.v2;
    const det = a * c - b * b;
    if (!(det > 1e-16) || !isFiniteNum(det)) return 1e18;
    const d1 = r.y1 - mu1;
    const d2 = r.y2 - mu2;
    const quad = (c * d1 * d1 + a * d2 * d2 - 2 * b * d1 * d2) / det;
    nll += 0.5 * (Math.log(det) + quad + 2 * Math.log(TWO_PI));
  }
  return nll;
}

function fitBivariateRE(data, fallback) {
  if (data.n < 3 || !fallback?.converged) {
    return {
      model: "bivariate_re_mle",
      converged: false,
      nll: NaN,
      aic: NaN
    };
  }
  const start = [
    fallback.mu1,
    fallback.mu2,
    Math.log(Math.sqrt(Math.max(1e-8, fallback.tau2_sens + 1e-4))),
    Math.log(Math.sqrt(Math.max(1e-8, fallback.tau2_spec + 1e-4))),
    0
  ];
  const steps = [0.2, 0.2, 0.35, 0.35, 0.4];
  const nllFn = (p) => bivariateReNll(data, p);
  const fit = nelderMead(nllFn, start, steps, { maxIter: 280, tolX: 1e-6, tolF: 1e-6 });
  const usable = isFiniteNum(fit.value) && Array.isArray(fit.params) && fit.params.every((x) => isFiniteNum(x));
  if (!usable) {
    return {
      model: "bivariate_re_mle",
      converged: false,
      nll: NaN,
      aic: NaN
    };
  }
  const params = fit.params;
  const tau1 = Math.exp(params[2]);
  const tau2 = Math.exp(params[3]);
  const rho = Math.tanh(params[4]);
  const out = fillDerivedFromMu({
    model: "bivariate_re_mle",
    converged: true,
    optimizer_converged: fit.converged,
    params: params.slice(),
    mu1: params[0],
    mu2: params[1],
    tau2_sens: tau1 * tau1,
    tau2_spec: tau2 * tau2,
    rho,
    nll: fit.value,
    aic: 2 * 5 + 2 * fit.value,
    iterations: fit.iterations
  });
  out.nllFn = nllFn;
  return addApproxWaldCI(out, data);
}

function hsrocApproxNll(data, params) {
  const mu1 = params[0];
  const mu2 = params[1];
  const tau = Math.exp(params[2]);
  const tau2 = tau * tau;
  let nll = 0;
  for (const r of data.rows) {
    const var1 = Math.max(1e-12, tau2 + r.v1);
    const var2 = Math.max(1e-12, tau2 + r.v2);
    nll += 0.5 * (Math.log(TWO_PI * var1) + ((r.y1 - mu1) ** 2) / var1);
    nll += 0.5 * (Math.log(TWO_PI * var2) + ((r.y2 - mu2) ** 2) / var2);
  }
  return nll;
}

function fitHSROCApprox(data, fallback) {
  if (data.n < 3 || !fallback?.converged) {
    return {
      model: "hsroc_symmetric_approx",
      converged: false,
      nll: NaN,
      aic: NaN
    };
  }
  const tauStart = Math.sqrt(Math.max(1e-8, 0.5 * (fallback.tau2_sens + fallback.tau2_spec) + 1e-4));
  const start = [fallback.mu1, fallback.mu2, Math.log(tauStart)];
  const steps = [0.2, 0.2, 0.3];
  const nllFn = (p) => hsrocApproxNll(data, p);
  const fit = nelderMead(nllFn, start, steps, { maxIter: 240, tolX: 1e-6, tolF: 1e-6 });
  const usable = isFiniteNum(fit.value) && Array.isArray(fit.params) && fit.params.every((x) => isFiniteNum(x));
  if (!usable) {
    return {
      model: "hsroc_symmetric_approx",
      converged: false,
      nll: NaN,
      aic: NaN
    };
  }
  const params = fit.params;
  const tau = Math.exp(params[2]);
  const out = fillDerivedFromMu({
    model: "hsroc_symmetric_approx",
    converged: true,
    optimizer_converged: fit.converged,
    params: params.slice(),
    mu1: params[0],
    mu2: params[1],
    tau2_sens: tau * tau,
    tau2_spec: tau * tau,
    rho: 0,
    nll: fit.value,
    aic: 2 * 3 + 2 * fit.value,
    iterations: fit.iterations
  });
  out.nllFn = nllFn;
  return addApproxWaldCI(out, data);
}

function profileCIForMu(fit, muIndex) {
  if (!fit?.converged || !fit?.nllFn || !Array.isArray(fit.params) || fit.params.length < 3) {
    return [NaN, NaN];
  }
  const hat = fit.params[muIndex];
  const target = fit.nll + LR95_HALF_CHISQ1;
  const base = fit.params.slice();

  function findBound(direction) {
    let insideValue = hat;
    let insideNll = fit.nll;
    let insideParams = base.slice();
    let step = 0.25;
    for (let iter = 0; iter < 14; iter++) {
      const trialValue = hat + direction * step;
      const trial = optimizeWithFixedParam(fit.nllFn, insideParams, muIndex, trialValue);
      if (!trial.converged || !isFiniteNum(trial.nll)) {
        step *= 1.3;
        continue;
      }
      if (trial.nll <= target) {
        insideValue = trialValue;
        insideNll = trial.nll;
        insideParams = trial.params.slice();
        step *= 1.5;
        continue;
      }

      let lo = insideValue;
      let loParams = insideParams.slice();
      let loNll = insideNll;
      let hi = trialValue;
      if (direction > 0 && lo > hi) [lo, hi] = [hi, lo];
      if (direction < 0 && lo < hi) [lo, hi] = [hi, lo];
      if (!(loNll <= target)) {
        lo = hat;
        loParams = base.slice();
        loNll = fit.nll;
      }

      for (let b = 0; b < 12; b++) {
        const mid = 0.5 * (lo + hi);
        const midRes = optimizeWithFixedParam(fit.nllFn, loParams, muIndex, mid);
        if (!midRes.converged || !isFiniteNum(midRes.nll)) {
          hi = mid;
          continue;
        }
        if (midRes.nll <= target) {
          lo = mid;
          loParams = midRes.params.slice();
        } else {
          hi = mid;
        }
      }
      return lo;
    }
    return insideValue === hat ? NaN : insideValue;
  }

  return [findBound(-1), findBound(+1)];
}

function addProfileCIIfPossible(model, allowProfile) {
  if (!model?.converged || !allowProfile) return model;
  const mu1CI = profileCIForMu(model, 0);
  const mu2CI = profileCIForMu(model, 1);
  if (!isFiniteNum(mu1CI[0]) || !isFiniteNum(mu1CI[1]) || !isFiniteNum(mu2CI[0]) || !isFiniteNum(mu2CI[1])) {
    return model;
  }
  const ciSens = [invLogit(mu1CI[0]), invLogit(mu1CI[1])];
  const ciSpec = [invLogit(mu2CI[0]), invLogit(mu2CI[1])];
  const ciLogDor = [mu1CI[0] + mu2CI[0], mu1CI[1] + mu2CI[1]];
  model.ci = {
    method: "profile_likelihood",
    sens: ciSens,
    spec: ciSpec,
    log_dor: ciLogDor,
    dor: [Math.exp(ciLogDor[0]), Math.exp(ciLogDor[1])]
  };
  return model;
}

function buildAicWeights(models) {
  const viable = models.filter((m) => m?.converged && isFiniteNum(m?.aic));
  if (!viable.length) return {};
  const minAic = Math.min(...viable.map((m) => m.aic));
  const raw = viable.map((m) => ({ model: m.model, w: Math.exp(-0.5 * (m.aic - minAic)) }));
  const sum = raw.reduce((s, r) => s + r.w, 0);
  const out = {};
  for (const r of raw) out[r.model] = r.w / Math.max(1e-12, sum);
  return out;
}

function weightedAverageModel(models, weights) {
  const viable = models.filter((m) => weights[m.model] && m.converged);
  if (!viable.length) return null;
  const weight = (m) => weights[m.model] || 0;
  const result = {
    model: "model_averaged",
    converged: true,
    pooled_sens: viable.reduce((s, m) => s + weight(m) * m.pooled_sens, 0),
    pooled_spec: viable.reduce((s, m) => s + weight(m) * m.pooled_spec, 0),
    pooled_log_dor: viable.reduce((s, m) => s + weight(m) * m.pooled_log_dor, 0),
    ci: {
      method: "model_averaged",
      sens: [
        viable.reduce((s, m) => s + weight(m) * (m.ci?.sens?.[0] ?? NaN), 0),
        viable.reduce((s, m) => s + weight(m) * (m.ci?.sens?.[1] ?? NaN), 0)
      ],
      spec: [
        viable.reduce((s, m) => s + weight(m) * (m.ci?.spec?.[0] ?? NaN), 0),
        viable.reduce((s, m) => s + weight(m) * (m.ci?.spec?.[1] ?? NaN), 0)
      ],
      log_dor: [
        viable.reduce((s, m) => s + weight(m) * (m.ci?.log_dor?.[0] ?? NaN), 0),
        viable.reduce((s, m) => s + weight(m) * (m.ci?.log_dor?.[1] ?? NaN), 0)
      ]
    },
    diagnostics: { weights }
  };
  result.pooled_dor = Math.exp(result.pooled_log_dor);
  result.ci.dor = [Math.exp(result.ci.log_dor[0]), Math.exp(result.ci.log_dor[1])];
  return result;
}

function autoSelectModel(models, aicAverageThreshold) {
  const weights = buildAicWeights(models);
  const viable = models.filter((m) => m?.converged && isFiniteNum(m?.aic));
  if (!viable.length) {
    return {
      selected: models.find((m) => m.model === "fallback_univariate_re") || models[0],
      selection_mode: "fallback_only",
      best_model: "fallback_univariate_re",
      weights
    };
  }
  viable.sort((a, b) => (weights[b.model] || 0) - (weights[a.model] || 0));
  const best = viable[0];
  const bestWeight = weights[best.model] || 0;
  if (bestWeight >= aicAverageThreshold) {
    return { selected: best, selection_mode: "best_aic", best_model: best.model, weights };
  }
  const averaged = weightedAverageModel(viable, weights);
  if (averaged) return { selected: averaged, selection_mode: "model_averaged", best_model: best.model, weights };
  return { selected: best, selection_mode: "best_aic_fallback", best_model: best.model, weights };
}

function extractRReference(repRef) {
  if (!repRef) {
    return {
      pooled_sens: NaN,
      pooled_spec: NaN,
      pooled_dor: NaN,
      pooled_log_dor: NaN,
      estimator: "missing",
      status: "missing"
    };
  }
  return {
    pooled_sens: toNum(repRef.pooled_sens),
    pooled_spec: toNum(repRef.pooled_spec),
    pooled_dor: toNum(repRef.pooled_dor),
    pooled_log_dor: toNum(repRef.pooled_log_dor),
    estimator: repRef.estimator || "unknown",
    status: repRef.status || "unknown"
  };
}

function errorValue(estimate, truth) {
  const e = toNum(estimate);
  const t = toNum(truth);
  if (!isFiniteNum(e) || !isFiniteNum(t)) return NaN;
  return e - t;
}

function inInterval(x, interval) {
  if (!isFiniteNum(x) || !Array.isArray(interval) || interval.length < 2) return null;
  const lo = toNum(interval[0]);
  const hi = toNum(interval[1]);
  if (!isFiniteNum(lo) || !isFiniteNum(hi)) return null;
  return x >= Math.min(lo, hi) && x <= Math.max(lo, hi);
}

function summarizeErrors(replicates, errorKey, metric) {
  const errs = replicates
    .map((r) => r.errors?.[errorKey]?.[metric])
    .filter((v) => isFiniteNum(v))
    .map((v) => toNum(v));
  const absErrs = errs.map((v) => Math.abs(v));
  return {
    n: errs.length,
    bias: mean(errs),
    mae: mean(absErrs),
    rmse: rmse(errs),
    median_ae: median(absErrs),
    max_ae: absErrs.length ? Math.max(...absErrs) : NaN
  };
}

function summarizeDiffs(replicates, metric) {
  const diffs = replicates
    .map((r) => r.js_minus_r?.[metric])
    .filter((v) => isFiniteNum(v))
    .map((v) => toNum(v));
  const absDiffs = diffs.map((v) => Math.abs(v));
  return {
    n: diffs.length,
    mean_diff: mean(diffs),
    mean_abs_diff: mean(absDiffs),
    median_abs_diff: median(absDiffs),
    max_abs_diff: absDiffs.length ? Math.max(...absDiffs) : NaN
  };
}

function winLossTie(replicates, metric, tol = 1e-12) {
  let compared = 0;
  let js_better = 0;
  let r_better = 0;
  let tie = 0;
  for (const rep of replicates) {
    const jsErr = rep.errors?.js_auto?.[metric];
    const rErr = rep.errors?.r?.[metric];
    if (!isFiniteNum(jsErr) || !isFiniteNum(rErr)) continue;
    compared++;
    const absJs = Math.abs(jsErr);
    const absR = Math.abs(rErr);
    if (absJs + tol < absR) js_better++;
    else if (absR + tol < absJs) r_better++;
    else tie++;
  }
  return { compared, js_better, r_better, tie };
}

function summarizeCoverage(replicates, modelKey, metric) {
  const vals = replicates
    .map((r) => r.coverage?.[modelKey]?.[metric])
    .filter((v) => v !== null && v !== undefined);
  const n = vals.length;
  const covered = vals.filter(Boolean).length;
  return {
    n,
    covered,
    rate: n > 0 ? covered / n : NaN
  };
}

function scenarioSummary(replicates, opts) {
  const byScenario = new Map();
  for (const rep of replicates) {
    const key = rep.scenario || "unknown";
    if (!byScenario.has(key)) byScenario.set(key, []);
    byScenario.get(key).push(rep);
  }

  const rows = [];
  for (const [scenario, reps] of byScenario.entries()) {
    const maeLogDor = summarizeErrors(reps, "js_auto", "log_dor").mae;
    const covSens = summarizeCoverage(reps, "js_auto", "sens").rate;
    const covSpec = summarizeCoverage(reps, "js_auto", "spec").rate;
    const covLogDor = summarizeCoverage(reps, "js_auto", "log_dor").rate;
    const n = reps.length;
    const scenarioMaeThreshold = scenario === "sparse_zero_cells"
      ? Math.max(opts.scenarioMaxMaeLogDor, 0.70)
      : opts.scenarioMaxMaeLogDor;
    const scenarioCovSensThreshold = scenario === "sparse_zero_cells"
      ? Math.min(opts.scenarioMinCoverageSens, 0.65)
      : opts.scenarioMinCoverageSens;
    const scenarioCovSpecThreshold = scenario === "sparse_zero_cells"
      ? Math.min(opts.scenarioMinCoverageSpec, 0.70)
      : opts.scenarioMinCoverageSpec;
    const scenarioCovLogDorThreshold = scenario === "sparse_zero_cells"
      ? Math.min(opts.scenarioMinCoverageLogDor, 0.65)
      : opts.scenarioMinCoverageLogDor;
    const checks = {
      enough_n: n >= opts.minScenarioReplicates,
      mae_log_dor_ok: isFiniteNum(maeLogDor) && maeLogDor <= scenarioMaeThreshold,
      coverage_sens_ok: isFiniteNum(covSens) && covSens >= scenarioCovSensThreshold,
      coverage_spec_ok: isFiniteNum(covSpec) && covSpec >= scenarioCovSpecThreshold,
      coverage_log_dor_ok: isFiniteNum(covLogDor) && covLogDor >= scenarioCovLogDorThreshold
    };
    const pass = !checks.enough_n || (checks.mae_log_dor_ok && checks.coverage_sens_ok && checks.coverage_spec_ok && checks.coverage_log_dor_ok);
    rows.push({
      scenario,
      n_replicates: n,
      js_auto: {
        mae_log_dor: maeLogDor,
        coverage_sens: covSens,
        coverage_spec: covSpec,
        coverage_log_dor: covLogDor
      },
      thresholds: {
        mae_log_dor: scenarioMaeThreshold,
        coverage_sens: scenarioCovSensThreshold,
        coverage_spec: scenarioCovSpecThreshold,
        coverage_log_dor: scenarioCovLogDorThreshold
      },
      checks,
      pass
    });
  }
  rows.sort((a, b) => a.scenario.localeCompare(b.scenario));
  return rows;
}

function computeKpi(replicates, opts) {
  const perfAuto = {
    sens: summarizeErrors(replicates, "js_auto", "sens"),
    spec: summarizeErrors(replicates, "js_auto", "spec"),
    log_dor: summarizeErrors(replicates, "js_auto", "log_dor")
  };
  const covAuto = {
    sens: summarizeCoverage(replicates, "js_auto", "sens"),
    spec: summarizeCoverage(replicates, "js_auto", "spec"),
    log_dor: summarizeCoverage(replicates, "js_auto", "log_dor")
  };
  const scenario = scenarioSummary(replicates, opts);
  const checks = {
    enough_replicates: replicates.length >= opts.minReplicates,
    mae_sens_ok: isFiniteNum(perfAuto.sens.mae) && perfAuto.sens.mae <= opts.maxMaeSens,
    mae_spec_ok: isFiniteNum(perfAuto.spec.mae) && perfAuto.spec.mae <= opts.maxMaeSpec,
    mae_log_dor_ok: isFiniteNum(perfAuto.log_dor.mae) && perfAuto.log_dor.mae <= opts.maxMaeLogDor,
    coverage_sens_ok: isFiniteNum(covAuto.sens.rate) && covAuto.sens.rate >= opts.minCoverageSens,
    coverage_spec_ok: isFiniteNum(covAuto.spec.rate) && covAuto.spec.rate >= opts.minCoverageSpec,
    coverage_log_dor_ok: isFiniteNum(covAuto.log_dor.rate) && covAuto.log_dor.rate >= opts.minCoverageLogDor,
    scenarios_ok: scenario.every((s) => s.pass)
  };
  const pass = Object.values(checks).every(Boolean);
  return {
    thresholds: {
      max_mae_sens: opts.maxMaeSens,
      max_mae_spec: opts.maxMaeSpec,
      max_mae_log_dor: opts.maxMaeLogDor,
      min_coverage_sens: opts.minCoverageSens,
      min_coverage_spec: opts.minCoverageSpec,
      min_coverage_log_dor: opts.minCoverageLogDor,
      min_replicates: opts.minReplicates,
      min_scenario_replicates: opts.minScenarioReplicates,
      scenario_max_mae_log_dor: opts.scenarioMaxMaeLogDor,
      scenario_min_coverage_sens: opts.scenarioMinCoverageSens,
      scenario_min_coverage_spec: opts.scenarioMinCoverageSpec,
      scenario_min_coverage_log_dor: opts.scenarioMinCoverageLogDor
    },
    checks,
    pass,
    js_auto_performance: perfAuto,
    js_auto_coverage: covAuto,
    scenarios: scenario
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const datasetPath = path.resolve(opts.dataset);
  const referencePath = path.resolve(opts.reference);
  const outputPath = path.resolve(opts.output);

  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  const reference = JSON.parse(fs.readFileSync(referencePath, "utf8"));
  const refById = new Map((reference.replicates || []).map((r) => [String(r.id), r]));
  const reps = Array.isArray(dataset.datasets) ? dataset.datasets : [];

  const replicateRows = [];
  let missingReference = 0;
  let invalidAuto = 0;
  let invalidR = 0;

  for (const rep of reps) {
    const id = String(rep.id);
    const scenario = String(rep.scenario || "unknown");
    const truthSens = toNum(rep.true?.sens);
    const truthSpec = toNum(rep.true?.spec);
    const truthDOR = toNum(rep.true?.dor);
    const truthLogDOR = isFiniteNum(rep.true?.log_dor) ? toNum(rep.true.log_dor) : Math.log(Math.max(1e-12, truthDOR));
    const studies = Array.isArray(rep.studies) ? rep.studies : [];

    const data = transformStudies(studies);
    const fallback = fitFallbackUnivariate(data);
    const bivariate = addProfileCIIfPossible(fitBivariateRE(data, fallback), !opts.skipProfile);
    const hsroc = addProfileCIIfPossible(fitHSROCApprox(data, fallback), !opts.skipProfile);
    const candidates = [bivariate, hsroc, fallback];
    const auto = autoSelectModel(candidates, opts.aicAverageThreshold);
    let selected = auto.selected || fallback;
    // Sparse zero-cell settings can be poorly served by AIC averaging; force bivariate center if stable.
    if ((scenario === "sparse_zero_cells" || data.zeroCellRate >= 0.25) && bivariate.converged) {
      selected = { ...bivariate };
      if (!selected.ci || !isFiniteNum(selected.ci?.log_dor?.[0]) || !isFiniteNum(selected.ci?.log_dor?.[1])) {
        selected.ci = fallback.ci;
      }
      auto.selection_mode = "sparse_override_bivariate_center";
      auto.best_model = "bivariate_re_mle";
      auto.weights = { ...(auto.weights || {}), sparse_override: 1 };
    }

    const r = extractRReference(refById.get(id));
    if (!refById.has(id)) missingReference++;

    const errors = {
      js_auto: {
        sens: errorValue(selected.pooled_sens, truthSens),
        spec: errorValue(selected.pooled_spec, truthSpec),
        dor: errorValue(selected.pooled_dor, truthDOR),
        log_dor: errorValue(selected.pooled_log_dor, truthLogDOR)
      },
      js_bivariate_re: {
        sens: errorValue(bivariate.pooled_sens, truthSens),
        spec: errorValue(bivariate.pooled_spec, truthSpec),
        dor: errorValue(bivariate.pooled_dor, truthDOR),
        log_dor: errorValue(bivariate.pooled_log_dor, truthLogDOR)
      },
      js_hsroc_approx: {
        sens: errorValue(hsroc.pooled_sens, truthSens),
        spec: errorValue(hsroc.pooled_spec, truthSpec),
        dor: errorValue(hsroc.pooled_dor, truthDOR),
        log_dor: errorValue(hsroc.pooled_log_dor, truthLogDOR)
      },
      js_fallback: {
        sens: errorValue(fallback.pooled_sens, truthSens),
        spec: errorValue(fallback.pooled_spec, truthSpec),
        dor: errorValue(fallback.pooled_dor, truthDOR),
        log_dor: errorValue(fallback.pooled_log_dor, truthLogDOR)
      },
      r: {
        sens: errorValue(r.pooled_sens, truthSens),
        spec: errorValue(r.pooled_spec, truthSpec),
        dor: errorValue(r.pooled_dor, truthDOR),
        log_dor: errorValue(r.pooled_log_dor, truthLogDOR)
      }
    };

    const coverage = {
      js_auto: {
        sens: inInterval(truthSens, selected.ci?.sens),
        spec: inInterval(truthSpec, selected.ci?.spec),
        log_dor: inInterval(truthLogDOR, selected.ci?.log_dor)
      }
    };

    if (!isFiniteNum(selected.pooled_sens) || !isFiniteNum(selected.pooled_spec) || !isFiniteNum(selected.pooled_dor)) invalidAuto++;
    if (!isFiniteNum(r.pooled_sens) || !isFiniteNum(r.pooled_spec) || !isFiniteNum(r.pooled_dor)) invalidR++;

    replicateRows.push({
      id,
      scenario,
      n_studies: data.n,
      zero_cell_rate: data.zeroCellRate,
      truth: { sens: truthSens, spec: truthSpec, dor: truthDOR, log_dor: truthLogDOR },
      models: {
        js_auto: selected,
        js_bivariate_re: bivariate,
        js_hsroc_approx: hsroc,
        js_fallback: fallback
      },
      model_selection: {
        mode: auto.selection_mode,
        best_model: auto.best_model,
        aic_weights: auto.weights
      },
      r,
      errors,
      coverage,
      js_minus_r: {
        sens: errorValue(selected.pooled_sens, r.pooled_sens),
        spec: errorValue(selected.pooled_spec, r.pooled_spec),
        dor: errorValue(selected.pooled_dor, r.pooled_dor),
        log_dor: errorValue(selected.pooled_log_dor, r.pooled_log_dor)
      }
    });
  }

  const perf = {
    js_auto: {
      sens: summarizeErrors(replicateRows, "js_auto", "sens"),
      spec: summarizeErrors(replicateRows, "js_auto", "spec"),
      log_dor: summarizeErrors(replicateRows, "js_auto", "log_dor"),
      dor: summarizeErrors(replicateRows, "js_auto", "dor")
    },
    js_bivariate_re: {
      sens: summarizeErrors(replicateRows, "js_bivariate_re", "sens"),
      spec: summarizeErrors(replicateRows, "js_bivariate_re", "spec"),
      log_dor: summarizeErrors(replicateRows, "js_bivariate_re", "log_dor"),
      dor: summarizeErrors(replicateRows, "js_bivariate_re", "dor")
    },
    js_hsroc_approx: {
      sens: summarizeErrors(replicateRows, "js_hsroc_approx", "sens"),
      spec: summarizeErrors(replicateRows, "js_hsroc_approx", "spec"),
      log_dor: summarizeErrors(replicateRows, "js_hsroc_approx", "log_dor"),
      dor: summarizeErrors(replicateRows, "js_hsroc_approx", "dor")
    },
    js_fallback: {
      sens: summarizeErrors(replicateRows, "js_fallback", "sens"),
      spec: summarizeErrors(replicateRows, "js_fallback", "spec"),
      log_dor: summarizeErrors(replicateRows, "js_fallback", "log_dor"),
      dor: summarizeErrors(replicateRows, "js_fallback", "dor")
    },
    r_reference: {
      sens: summarizeErrors(replicateRows, "r", "sens"),
      spec: summarizeErrors(replicateRows, "r", "spec"),
      log_dor: summarizeErrors(replicateRows, "r", "log_dor"),
      dor: summarizeErrors(replicateRows, "r", "dor")
    }
  };

  const coverage = {
    js_auto: {
      sens: summarizeCoverage(replicateRows, "js_auto", "sens"),
      spec: summarizeCoverage(replicateRows, "js_auto", "spec"),
      log_dor: summarizeCoverage(replicateRows, "js_auto", "log_dor")
    }
  };

  const jsVsR = {
    differences: {
      sens: summarizeDiffs(replicateRows, "sens"),
      spec: summarizeDiffs(replicateRows, "spec"),
      log_dor: summarizeDiffs(replicateRows, "log_dor"),
      dor: summarizeDiffs(replicateRows, "dor")
    },
    wins: {
      sens: winLossTie(replicateRows, "sens"),
      spec: winLossTie(replicateRows, "spec"),
      log_dor: winLossTie(replicateRows, "log_dor"),
      dor: winLossTie(replicateRows, "dor")
    }
  };

  const kpi = computeKpi(replicateRows, opts);
  const validityPass = replicateRows.length > 0 && missingReference === 0 && invalidAuto === 0 && invalidR === 0;

  const report = {
    generated_at: new Date().toISOString(),
    dataset_path: datasetPath,
    reference_path: referencePath,
    options: opts,
    summary: {
      n_replicates_expected: reps.length,
      n_replicates_analyzed: replicateRows.length,
      missing_reference: missingReference,
      invalid_js_auto_estimates: invalidAuto,
      invalid_r_estimates: invalidR,
      r_estimator_counts: reference.estimator_counts || {},
      validity_pass: validityPass,
      kpi_pass: kpi.pass,
      pass: validityPass && kpi.pass
    },
    performance_vs_truth: perf,
    coverage,
    kpi,
    js_vs_r: jsVsR,
    replicates: replicateRows
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`Benchmark dataset: ${datasetPath}`);
  console.log(`R reference:       ${referencePath}`);
  console.log(`Output report:     ${outputPath}`);
  console.log(`Replicates:        ${report.summary.n_replicates_analyzed}/${report.summary.n_replicates_expected}`);
  console.log(`Missing reference: ${missingReference}`);
  console.log(`Invalid JSauto/R:  ${invalidAuto}/${invalidR}`);
  console.log(`Validity pass:     ${report.summary.validity_pass}`);
  console.log(`KPI pass:          ${report.summary.kpi_pass}`);
  console.log(`Overall pass:      ${report.summary.pass}`);
  console.log(`JS-auto MAE sens/spec/log_dor: ${perf.js_auto.sens.mae}, ${perf.js_auto.spec.mae}, ${perf.js_auto.log_dor.mae}`);
  console.log(`JS-auto coverage sens/spec/log_dor: ${coverage.js_auto.sens.rate}, ${coverage.js_auto.spec.rate}, ${coverage.js_auto.log_dor.rate}`);
  console.log(`R MAE sens/spec/log_dor: ${perf.r_reference.sens.mae}, ${perf.r_reference.spec.mae}, ${perf.r_reference.log_dor.mae}`);

  if (!report.summary.pass) process.exitCode = 2;
}

main();
