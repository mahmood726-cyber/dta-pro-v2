#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = {
    dataset: "pubbias_comparator_dataset.csv",
    reference: "pubbias_reference_r.json",
    output: "pubbias_comparison_report.json",
    absTol: 2e-6,
    relTol: 1e-6
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dataset" && argv[i + 1]) out.dataset = argv[++i];
    else if (a === "--reference" && argv[i + 1]) out.reference = argv[++i];
    else if (a === "--output" && argv[i + 1]) out.output = argv[++i];
    else if (a === "--absTol" && argv[i + 1]) out.absTol = Number(argv[++i]);
    else if (a === "--relTol" && argv[i + 1]) out.relTol = Number(argv[++i]);
  }
  return out;
}

function readCsv2x2(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length < 2) throw new Error(`CSV has no rows: ${filePath}`);
  const header = lines[0].split(",").map((s) => s.trim());
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  const required = ["TP", "FP", "FN", "TN"];
  for (const c of required) {
    if (!(c in idx)) throw new Error(`CSV missing required column ${c}`);
  }
  return lines.slice(1).map((line, i) => {
    const parts = line.split(",").map((s) => s.trim());
    return {
      study: parts[idx.Study] || `Study${String(i + 1).padStart(2, "0")}`,
      tp: Number(parts[idx.TP]),
      fp: Number(parts[idx.FP]),
      fn: Number(parts[idx.FN]),
      tn: Number(parts[idx.TN])
    };
  });
}

function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const xAbs = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * xAbs);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-xAbs * xAbs));
  return 0.5 * (1 + sign * y);
}

function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687,
    138.357751867269, -30.66479806614716, 2.506628277459239
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866,
    66.80131188771972, -13.28068155288572
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783
  ];
  const d = [
    0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q;
  let r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function gammaln(x) {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(x, a, b) {
  const ITMAX = 200;
  const EPS = 1e-10;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= ITMAX; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammaln(a + b) - gammaln(a) - gammaln(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(x, a, b) / a;
  return 1 - bt * betacf(1 - x, b, a) / b;
}

function tCDF(t, df) {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

function twoSidedTPValue(tStat, df) {
  const tAbs = Math.abs(tStat);
  if (!Number.isFinite(tAbs) || !Number.isFinite(df) || df <= 0) {
    return { p: NaN, method: "invalid" };
  }
  try {
    const cdf = tCDF(tAbs, df);
    if (Number.isFinite(cdf)) {
      const p = Math.max(0, Math.min(1, 2 * (1 - cdf)));
      return { p, method: "student_t_incomplete_beta" };
    }
  } catch (_) {
    // fallback below
  }
  const p = Math.max(0, Math.min(1, 2 * (1 - normalCDF(tAbs))));
  return { p, method: "normal_approx_fallback" };
}

function gammainc(a, x) {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  const ITMAX = 200;
  const EPS = 1e-10;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < ITMAX; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < EPS * Math.abs(sum)) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
}

function pchisq(x, df) {
  if (x <= 0) return 0;
  if (df <= 0) return NaN;
  return gammainc(df / 2, x / 2);
}

function transformStudyData(studies) {
  return studies.map((s, idx) => {
    let tp = Number(s.tp) || 0;
    let fp = Number(s.fp) || 0;
    let fn = Number(s.fn) || 0;
    let tn = Number(s.tn) || 0;
    const hasZero = tp === 0 || fp === 0 || fn === 0 || tn === 0;
    if (hasZero) {
      tp += 0.5;
      fp += 0.5;
      fn += 0.5;
      tn += 0.5;
    }
    const sens = tp / (tp + fn);
    const spec = tn / (tn + fp);
    const varLogitSens = 1 / tp + 1 / fn;
    const varLogitSpec = 1 / tn + 1 / fp;
    const dor = (tp * tn) / (fp * fn);
    return {
      ...s,
      tp, fp, fn, tn,
      sens, spec, dor,
      varLogitSens, varLogitSpec,
      originalIndex: idx
    };
  }).filter((s) => s.tp + s.fp + s.fn + s.tn > 0);
}

function weightedLinearRegression(x, y, w) {
  const n = x.length;
  if (!Array.isArray(x) || !Array.isArray(y) || !Array.isArray(w) || y.length !== n || w.length !== n || n < 3) {
    return { error: "Need at least 3 points for weighted regression" };
  }
  const weights = w.map((v) => Math.max(1e-12, Number(v) || 0));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumWX = x.reduce((s, xi, i) => s + xi * weights[i], 0);
  const sumWX2 = x.reduce((s, xi, i) => s + xi * xi * weights[i], 0);
  const sumWY = y.reduce((s, yi, i) => s + yi * weights[i], 0);
  const sumWXY = x.reduce((s, xi, i) => s + xi * y[i] * weights[i], 0);
  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) {
    return { error: "Weighted regression is singular for this dataset" };
  }
  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;
  const residuals = y.map((yi, i) => yi - (intercept + slope * x[i]));
  const sse = residuals.reduce((s, ri, i) => s + weights[i] * ri * ri, 0);
  const df = Math.max(1, n - 2);
  const sigma2 = sse / df;
  const varIntercept = Math.max(1e-12, sigma2 * (sumWX2 / denom));
  const varSlope = Math.max(1e-12, sigma2 * (sumW / denom));
  return {
    intercept,
    slope,
    interceptSE: Math.sqrt(varIntercept),
    slopeSE: Math.sqrt(varSlope),
    df,
    sigma2
  };
}

function simpleLinearRegression(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) {
    return { slope: 0, intercept: sumY / Math.max(1, n), slopeSE: NaN, interceptSE: NaN };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yPred = x.map((xi) => intercept + slope * xi);
  const sse = y.reduce((s, yi, i) => s + (yi - yPred[i]) ** 2, 0);
  const mse = sse / Math.max(1, n - 2);
  const sxx = sumX2 - (sumX * sumX / n);
  if (!Number.isFinite(sxx) || Math.abs(sxx) < 1e-12) {
    return { slope, intercept, slopeSE: NaN, interceptSE: NaN };
  }
  const interceptSE = Math.sqrt(Math.max(0, mse * (1 / n + (sumX / n) ** 2 / sxx)));
  const slopeSE = Math.sqrt(Math.max(0, mse / sxx));
  return { slope, intercept, slopeSE, interceptSE };
}

function safeWeightedMean(values, weights) {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (!(sumW > 0)) return NaN;
  return values.reduce((s, v, i) => s + v * weights[i], 0) / sumW;
}

function rankNormalize(values) {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (a.v - b.v) || (a.i - b.i))
    .map((o) => o.i);
  const ranks = new Array(values.length).fill(0);
  order.forEach((idx, rank) => { ranks[idx] = rank; });
  const denom = Math.max(1, values.length - 1);
  return ranks.map((r) => r / denom);
}

function computeMonotoneStepBounds(yi, wi, score, pMinGrid = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
  const n = yi.length;
  const order = score
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s - b.s) || (a.i - b.i))
    .map((o) => o.i);
  const evaluate = (pMin, cutoffRank) => {
    const adjW = order.map((idx, rank) => wi[idx] / (rank <= cutoffRank ? pMin : 1));
    const orderedY = order.map((idx) => yi[idx]);
    return safeWeightedMean(orderedY, adjW);
  };
  let lower = Infinity;
  let upper = -Infinity;
  let lowerCfg = { p_min: NaN, cutoff: NaN };
  let upperCfg = { p_min: NaN, cutoff: NaN };
  for (const pMin of pMinGrid) {
    for (let cutoff = -1; cutoff < n; cutoff++) {
      const theta = evaluate(pMin, cutoff);
      if (Number.isFinite(theta) && theta < lower) {
        lower = theta;
        lowerCfg = { p_min: pMin, cutoff };
      }
      if (Number.isFinite(theta) && theta > upper) {
        upper = theta;
        upperCfg = { p_min: pMin, cutoff };
      }
    }
  }
  return { lower, upper, lower_cfg: lowerCfg, upper_cfg: upperCfg };
}

function poissonBinomialTailProbability(probabilities, threshold) {
  const probs = (probabilities || [])
    .map((p) => Math.max(1e-9, Math.min(1 - 1e-9, Number(p) || 0)))
    .filter((p) => Number.isFinite(p));
  const n = probs.length;
  if (threshold <= 0) return 1;
  if (threshold > n) return 0;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 0; i < n; i++) {
    const p = probs[i];
    for (let j = i + 1; j >= 1; j--) {
      dp[j] = dp[j] * (1 - p) + dp[j - 1] * p;
    }
    dp[0] *= (1 - p);
  }
  return dp.slice(threshold).reduce((a, b) => a + b, 0);
}

function logChoose(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return gammaln(n + 1) - gammaln(k + 1) - gammaln(n - k + 1);
}

function binomialTailGE(n, p, kMin) {
  if (kMin <= 0) return 1;
  if (kMin > n) return 0;
  const prob = Math.max(1e-12, Math.min(1 - 1e-12, Number(p) || 0.5));
  let sum = 0;
  for (let k = kMin; k <= n; k++) {
    const lp = logChoose(n, k) + k * Math.log(prob) + (n - k) * Math.log(1 - prob);
    sum += Math.exp(lp);
  }
  return Math.max(0, Math.min(1, sum));
}

function runPetPeese(studies) {
  const transformed = transformStudyData(studies);
  const yi = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const sei = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const vi = sei.map((s) => s * s);
  const wi = vi.map((v) => 1 / Math.max(1e-12, v));

  const pet = weightedLinearRegression(sei, yi, wi);
  const peese = weightedLinearRegression(vi, yi, wi);
  if (pet.error || peese.error) {
    throw new Error(pet.error || peese.error || "PET/PEESE model fitting failed");
  }

  const pPetIntercept = twoSidedTPValue(pet.intercept / pet.interceptSE, pet.df).p;
  const pPetSlope = twoSidedTPValue(pet.slope / pet.slopeSE, pet.df).p;
  const pPeeseIntercept = twoSidedTPValue(peese.intercept / peese.interceptSE, peese.df).p;
  const usePEESE = pPetIntercept < 0.10;
  const correctedLogDOR = usePEESE ? peese.intercept : pet.intercept;
  const correctedDOR = Math.exp(correctedLogDOR);
  const unadjustedLogDOR = yi.reduce((s, l, i) => s + l * wi[i], 0) / wi.reduce((a, b) => a + b, 0);
  const unadjustedDOR = Math.exp(unadjustedLogDOR);
  const changePct = (correctedDOR / Math.max(1e-12, unadjustedDOR) - 1) * 100;

  return {
    pet: {
      intercept: pet.intercept,
      slope: pet.slope,
      intercept_se: pet.interceptSE,
      slope_se: pet.slopeSE,
      df: pet.df,
      p_intercept: pPetIntercept,
      p_slope: pPetSlope
    },
    peese: {
      intercept: peese.intercept,
      slope: peese.slope,
      intercept_se: peese.interceptSE,
      slope_se: peese.slopeSE,
      df: peese.df,
      p_intercept: pPeeseIntercept
    },
    decision: {
      use_peese: usePEESE,
      corrected_log_dor: correctedLogDOR,
      corrected_dor: correctedDOR,
      unadjusted_log_dor: unadjustedLogDOR,
      unadjusted_dor: unadjustedDOR,
      change_pct: changePct
    }
  };
}

function runExcessSignificance(studies) {
  const transformed = transformStudyData(studies);
  const yi = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const sei = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const vi = sei.map((s) => s * s);
  const wi = vi.map((v) => 1 / Math.max(1e-12, v));
  const alpha = 0.05;
  const zCrit = normalQuantile(1 - alpha / 2);
  const pValues = yi.map((effect, i) => {
    const z = effect / Math.max(1e-12, sei[i]);
    return 2 * (1 - normalCDF(Math.abs(z)));
  });
  const observedSig = pValues.filter((p) => Number.isFinite(p) && p < alpha).length;
  const k = studies.length;

  const thetaFE = yi.reduce((s, e, i) => s + e * wi[i], 0) / Math.max(1e-12, wi.reduce((a, b) => a + b, 0));
  const q = yi.reduce((s, e, i) => s + wi[i] * (e - thetaFE) ** 2, 0);
  const sumW = wi.reduce((a, b) => a + b, 0);
  const sumW2 = wi.reduce((a, b) => a + b * b, 0);
  const cTau = sumW - sumW2 / Math.max(1e-12, sumW);
  const tau2DL = Math.max(0, (q - (k - 1)) / Math.max(1e-12, cTau));
  const wRE = vi.map((v) => 1 / Math.max(1e-12, v + tau2DL));
  const thetaRE = yi.reduce((s, e, i) => s + wRE[i] * e, 0) / Math.max(1e-12, wRE.reduce((a, b) => a + b, 0));

  const powersFrom = (theta, tau2Adj) => sei.map((se) => {
    const totalSe = Math.sqrt(Math.max(1e-12, se * se + tau2Adj));
    const nonCentral = Math.abs(theta) / totalSe;
    const power = 1 - normalCDF(zCrit - nonCentral) + normalCDF(-zCrit - nonCentral);
    return Math.max(1e-6, Math.min(1 - 1e-6, power));
  });

  const powersFE = powersFrom(thetaFE, 0);
  const powersRE = powersFrom(thetaRE, tau2DL);
  const expectedSigFE = powersFE.reduce((a, b) => a + b, 0);
  const expectedSigRE = powersRE.reduce((a, b) => a + b, 0);
  const exactPFE = poissonBinomialTailProbability(powersFE, observedSig);
  const exactPRE = poissonBinomialTailProbability(powersRE, observedSig);

  const excessStats = (expectedSig, pExact) => {
    if (!(expectedSig > 1e-6 && expectedSig < k - 1e-6)) {
      return { expected_sig: expectedSig, chi2: NaN, p_excess: NaN, p_exact: NaN, ratio: NaN };
    }
    const chi2 = ((observedSig - expectedSig) ** 2) / expectedSig +
      (((k - observedSig) - (k - expectedSig)) ** 2) / (k - expectedSig);
    const pExcess = 1 - pchisq(chi2, 1);
    const ratio = observedSig / expectedSig;
    return { expected_sig: expectedSig, chi2, p_excess: pExcess, p_exact: pExact, ratio };
  };

  const statsFE = excessStats(expectedSigFE, exactPFE);
  const statsRE = excessStats(expectedSigRE, exactPRE);
  const primary = Number.isFinite(statsRE.p_exact) ? statsRE : statsFE;
  const primaryLabel = Number.isFinite(statsRE.p_exact) ? "Random-effects (primary)" : "Fixed-effect (fallback)";

  return {
    alpha,
    z_crit: zCrit,
    observed_sig: observedSig,
    k,
    theta_fe: thetaFE,
    theta_re: thetaRE,
    tau2_dl: tau2DL,
    stats_fe: statsFE,
    stats_re: statsRE,
    primary,
    primary_label: primaryLabel
  };
}

function runDeeks(studies) {
  const transformed = transformStudyData(studies);
  const n = transformed.length;
  if (n < 3) {
    return {
      intercept: NaN,
      slope: NaN,
      se_slope: NaN,
      t: NaN,
      p_value: NaN,
      n
    };
  }
  const ess = transformed.map((d) => {
    const diseased = d.tp + d.fn;
    const healthy = d.fp + d.tn;
    const total = diseased + healthy;
    return 4 * diseased * healthy / Math.max(1e-12, total);
  });
  const invSqrtEss = ess.map((e) => 1 / Math.sqrt(Math.max(1e-12, e)));
  const logDOR = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const meanX = invSqrtEss.reduce((a, b) => a + b, 0) / n;
  const meanY = logDOR.reduce((a, b) => a + b, 0) / n;
  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (invSqrtEss[i] - meanX) * (logDOR[i] - meanY);
    ssXX += (invSqrtEss[i] - meanX) ** 2;
  }
  if (ssXX < 1e-12) {
    return {
      intercept: meanY,
      slope: 0,
      se_slope: NaN,
      t: 0,
      p_value: 1,
      n
    };
  }
  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const yPred = invSqrtEss.map((x) => intercept + slope * x);
  const residSS = logDOR.reduce((s, y, i) => s + (y - yPred[i]) ** 2, 0);
  const residSE = Math.sqrt(residSS / Math.max(1, n - 2));
  const seSlope = residSE / Math.sqrt(ssXX);
  const t = slope / Math.max(1e-12, seSlope);
  const pValue = twoSidedTPValue(t, Math.max(1, n - 2)).p;
  return {
    intercept,
    slope,
    se_slope: seSlope,
    t,
    p_value: pValue,
    n
  };
}

function runEggerVariants(studies) {
  const transformed = transformStudyData(studies);
  const k = studies.length;
  if (k < 3) {
    const empty = { coefficient: NaN, se: NaN, t: NaN, p: NaN };
    return {
      standard_egger: empty,
      deeks_funnel_asymmetry: empty,
      peters_test: empty
    };
  }
  const logDOR = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const se = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const precision = se.map((s) => 1 / Math.max(1e-12, s));
  const egger = simpleLinearRegression(precision, logDOR.map((l, i) => l / Math.max(1e-12, se[i])));
  const tEgger = egger.intercept / Math.max(1e-12, egger.interceptSE);
  const pEgger = twoSidedTPValue(tEgger, k - 2).p;

  const ess = studies.map((s) => 4 * (s.tp + s.fn) * (s.fp + s.tn) / Math.max(1e-12, (s.tp + s.fp + s.fn + s.tn)));
  const deeks = simpleLinearRegression(ess.map((e) => 1 / Math.sqrt(Math.max(1e-12, e))), logDOR);
  const tDeeks = deeks.slope / Math.max(1e-12, deeks.slopeSE);
  const pDeeks = twoSidedTPValue(tDeeks, k - 2).p;

  const sampleSizes = studies.map((s) => s.tp + s.fp + s.fn + s.tn);
  const peters = simpleLinearRegression(sampleSizes.map((n) => 1 / Math.max(1e-12, n)), logDOR);
  const tPeters = peters.slope / Math.max(1e-12, peters.slopeSE);
  const pPeters = twoSidedTPValue(tPeters, k - 2).p;

  return {
    standard_egger: {
      coefficient: egger.intercept,
      se: egger.interceptSE,
      t: tEgger,
      p: pEgger
    },
    deeks_funnel_asymmetry: {
      coefficient: deeks.slope,
      se: deeks.slopeSE,
      t: tDeeks,
      p: pDeeks
    },
    peters_test: {
      coefficient: peters.slope,
      se: peters.slopeSE,
      t: tPeters,
      p: pPeters
    }
  };
}

function runTrimAndFill(studies) {
  const transformed = transformStudyData(studies);
  const logDOR = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const se = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const sorted = logDOR.slice().sort((a, b) => a - b);
  const medianLogDOR = sorted[Math.floor(logDOR.length / 2)];
  const deviations = logDOR.map((l, i) => ({ idx: i, dev: l - medianLogDOR, se: se[i] }));
  const positiveDevs = deviations.filter((d) => d.dev > 0).sort((a, b) => b.dev - a.dev);
  const negativeDevs = deviations.filter((d) => d.dev <= 0);
  const k = Math.max(0, Math.floor((positiveDevs.length - negativeDevs.length) / 2));
  const imputed = [];
  for (let i = 0; i < k; i++) {
    if (i < positiveDevs.length) {
      imputed.push({
        logDOR: medianLogDOR - positiveDevs[i].dev,
        se: positiveDevs[i].se
      });
    }
  }
  const allLogDOR = [...logDOR, ...imputed.map((r) => r.logDOR)];
  const allSE = [...se, ...imputed.map((r) => r.se)];
  const weights = allSE.map((s) => 1 / Math.max(1e-12, s * s));
  const adjustedLogDOR = allLogDOR.reduce((s, l, i) => s + l * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  const origWeights = se.map((s) => 1 / Math.max(1e-12, s * s));
  const originalLogDOR = logDOR.reduce((s, l, i) => s + l * origWeights[i], 0) / origWeights.reduce((a, b) => a + b, 0);
  return {
    k_imputed: k,
    median_log_dor: medianLogDOR,
    original_log_dor: originalLogDOR,
    adjusted_log_dor: adjustedLogDOR,
    original_dor: Math.exp(originalLogDOR),
    adjusted_dor: Math.exp(adjustedLogDOR)
  };
}

function runPCurveAnalysis(studies) {
  const pValues = studies.map((s) => {
    const sens = s.tp / Math.max(1e-12, (s.tp + s.fn));
    const spec = s.tn / Math.max(1e-12, (s.tn + s.fp));
    const zSens = (sens - 0.5) / Math.sqrt(0.25 / Math.max(1e-12, (s.tp + s.fn)));
    const zSpec = (spec - 0.5) / Math.sqrt(0.25 / Math.max(1e-12, (s.tn + s.fp)));
    const pSens = 2 * (1 - normalCDF(Math.abs(zSens)));
    const pSpec = 2 * (1 - normalCDF(Math.abs(zSpec)));
    return Math.min(pSens, pSpec);
  });
  const sigP = pValues.filter((p) => p < 0.05);
  const b1 = sigP.filter((p) => p <= 0.01).length;
  const b2 = sigP.filter((p) => p > 0.01 && p <= 0.02).length;
  const b3 = sigP.filter((p) => p > 0.02 && p <= 0.03).length;
  const b4 = sigP.filter((p) => p > 0.03 && p <= 0.04).length;
  const b5 = sigP.filter((p) => p > 0.04 && p <= 0.05).length;
  const lowP = b1 + b2;
  const highP = b4 + b5;
  return {
    n_significant: sigP.length,
    low_p: lowP,
    high_p: highP,
    right_skew: lowP > highP,
    bins: {
      "0.00-0.01": b1,
      "0.01-0.02": b2,
      "0.02-0.03": b3,
      "0.03-0.04": b4,
      "0.04-0.05": b5
    }
  };
}

function runWorstCaseSelectionBounds(studies) {
  const transformed = transformStudyData(studies);
  const yi = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const sei = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const wi = sei.map((s) => 1 / Math.max(1e-12, s * s));
  const absZ = yi.map((y, i) => Math.abs(y / Math.max(1e-12, sei[i])));
  const precision = sei.map((s) => 1 / Math.max(1e-12, s));
  const precisionRank = rankNormalize(precision);
  const zRank = rankNormalize(absZ);
  const compositeScore = precisionRank.map((r, i) => 0.5 * r + 0.5 * zRank[i]);
  const byPrecision = computeMonotoneStepBounds(yi, wi, precisionRank);
  const bySignificance = computeMonotoneStepBounds(yi, wi, zRank);
  const byComposite = computeMonotoneStepBounds(yi, wi, compositeScore);
  const globalLower = Math.min(byPrecision.lower, bySignificance.lower, byComposite.lower);
  const globalUpper = Math.max(byPrecision.upper, bySignificance.upper, byComposite.upper);
  const spread = Math.exp(globalUpper) - Math.exp(globalLower);
  const robustness = spread < 0.5 ? "High robustness" : spread < 1.5 ? "Moderate robustness" : "Low robustness";
  return {
    global_lower: globalLower,
    global_upper: globalUpper,
    global_lower_dor: Math.exp(globalLower),
    global_upper_dor: Math.exp(globalUpper),
    spread_dor: spread,
    robustness,
    precision: byPrecision,
    significance: bySignificance,
    composite: byComposite
  };
}

function runCaliperDiscontinuity(studies) {
  const transformed = transformStudyData(studies);
  const yi = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const sei = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const alpha = 0.05;
  const width = 0.01;
  const pValues = yi.map((effect, i) => {
    const z = effect / Math.max(1e-12, sei[i]);
    return 2 * (1 - normalCDF(Math.abs(z)));
  });
  const left = pValues.filter((p) => Number.isFinite(p) && p >= (alpha - width) && p < alpha).length;
  const right = pValues.filter((p) => Number.isFinite(p) && p >= alpha && p < (alpha + width)).length;
  const nWindow = left + right;
  if (nWindow < 4) {
    return { alpha, width, left, right, n_window: nWindow, too_few_window: true };
  }
  const pExactOneSided = binomialTailGE(nWindow, 0.5, left);
  const zScore = (left - nWindow / 2) / Math.sqrt(Math.max(1e-12, nWindow / 4));
  const pNormalOneSided = 1 - normalCDF(zScore);
  const ratio = right > 0 ? left / right : Infinity;
  const logRatio = (left > 0 && right > 0) ? Math.log(ratio) : NaN;
  const seLogRatio = (left > 0 && right > 0) ? Math.sqrt(1 / left + 1 / right) : NaN;
  const ratioCI = Number.isFinite(logRatio) && Number.isFinite(seLogRatio)
    ? [Math.exp(logRatio - 1.96 * seLogRatio), Math.exp(logRatio + 1.96 * seLogRatio)]
    : [NaN, NaN];
  return {
    alpha,
    width,
    left,
    right,
    n_window: nWindow,
    too_few_window: false,
    p_exact_one_sided: pExactOneSided,
    z_score: zScore,
    p_normal_one_sided: pNormalOneSided,
    ratio,
    ratio_ci: ratioCI,
    discontinuity_flag: pExactOneSided < 0.10 && left > right
  };
}

function runSelectionRatioSensitivity(studies) {
  const transformed = transformStudyData(studies);
  const yi = transformed.map((d) => Math.log(Math.max(1e-12, d.dor)));
  const sei = transformed.map((d) => Math.sqrt(Math.max(1e-12, d.varLogitSens + d.varLogitSpec)));
  const vi = sei.map((s) => s * s);
  const wi = vi.map((v) => 1 / Math.max(1e-12, v));
  const alpha = 0.05;
  const pValues = yi.map((effect, i) => {
    const z = effect / Math.max(1e-12, sei[i]);
    return 2 * (1 - normalCDF(Math.abs(z)));
  });
  const significant = pValues.map((p) => Number.isFinite(p) && p < alpha);
  const nSig = significant.filter(Boolean).length;
  const nNonSig = significant.length - nSig;
  const etaGrid = [1, 1.25, 1.5, 2, 3, 4, 5, 7, 10, 15, 20];
  const unadjustedLogDOR = safeWeightedMean(yi, wi);
  const unadjustedDOR = Math.exp(unadjustedLogDOR);
  const rows = etaGrid.map((eta) => {
    const adjW = wi.map((w, i) => w / (significant[i] ? eta : 1));
    const theta = safeWeightedMean(yi, adjW);
    const sumAdjW = adjW.reduce((a, b) => a + b, 0);
    const seTheta = Math.sqrt(1 / Math.max(1e-12, sumAdjW));
    const dor = Math.exp(theta);
    return {
      eta,
      theta,
      dor,
      dor_ci: [Math.exp(theta - 1.96 * seTheta), Math.exp(theta + 1.96 * seTheta)],
      ratio_to_unadjusted: dor / Math.max(1e-12, unadjustedDOR)
    };
  });
  const eta20pct = rows.find((r) => r.ratio_to_unadjusted <= 0.8)?.eta ?? null;
  const etaNull = rows.find((r) => r.theta <= 0)?.eta ?? null;
  const maxAttenuation = 1 - Math.min(...rows.map((r) => r.ratio_to_unadjusted));
  const robustness = maxAttenuation < 0.15 ? "High robustness"
    : maxAttenuation < 0.35 ? "Moderate robustness"
      : "Low robustness";
  return {
    alpha,
    n_sig: nSig,
    n_non_sig: nNonSig,
    unadjusted_log_dor: unadjustedLogDOR,
    unadjusted_dor: unadjustedDOR,
    eta_20pct: eta20pct,
    eta_null: etaNull,
    max_attenuation: maxAttenuation,
    robustness,
    rows
  };
}

function num(x) {
  return Number(x);
}

function isFiniteNum(x) {
  return Number.isFinite(num(x));
}

function compareValue(name, appVal, refVal, absTol, relTol) {
  if (appVal == null || refVal == null) {
    const pass = appVal == null && refVal == null;
    return { name, app: appVal, reference: refVal, abs_diff: pass ? 0 : null, rel_diff: pass ? 0 : null, pass };
  }
  if (typeof appVal === "boolean" || typeof refVal === "boolean") {
    const pass = Boolean(appVal) === Boolean(refVal);
    return { name, app: appVal, reference: refVal, abs_diff: pass ? 0 : 1, rel_diff: pass ? 0 : 1, pass };
  }
  if (typeof appVal === "string" || typeof refVal === "string") {
    const pass = String(appVal) === String(refVal);
    return { name, app: appVal, reference: refVal, abs_diff: pass ? 0 : null, rel_diff: pass ? 0 : null, pass };
  }
  const a = num(appVal);
  const r = num(refVal);
  if (!isFiniteNum(a) && !isFiniteNum(r)) {
    return { name, app: appVal, reference: refVal, abs_diff: 0, rel_diff: 0, pass: true };
  }
  if (!isFiniteNum(a) || !isFiniteNum(r)) {
    return { name, app: appVal, reference: refVal, abs_diff: null, rel_diff: null, pass: false };
  }
  const absDiff = Math.abs(a - r);
  const scale = Math.max(Math.abs(a), Math.abs(r), 1);
  const relDiff = absDiff / scale;
  const pass = absDiff <= absTol || relDiff <= relTol;
  return { name, app: a, reference: r, abs_diff: absDiff, rel_diff: relDiff, pass };
}

function petRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("pet.intercept", app.pet.intercept, ref.pet.intercept);
  push("pet.slope", app.pet.slope, ref.pet.slope);
  push("pet.intercept_se", app.pet.intercept_se, ref.pet.intercept_se);
  push("pet.slope_se", app.pet.slope_se, ref.pet.slope_se);
  push("pet.df", app.pet.df, ref.pet.df);
  push("pet.p_intercept", app.pet.p_intercept, ref.pet.p_intercept);
  push("pet.p_slope", app.pet.p_slope, ref.pet.p_slope);
  push("peese.intercept", app.peese.intercept, ref.peese.intercept);
  push("peese.slope", app.peese.slope, ref.peese.slope);
  push("peese.intercept_se", app.peese.intercept_se, ref.peese.intercept_se);
  push("peese.slope_se", app.peese.slope_se, ref.peese.slope_se);
  push("peese.df", app.peese.df, ref.peese.df);
  push("peese.p_intercept", app.peese.p_intercept, ref.peese.p_intercept);
  push("decision.use_peese", app.decision.use_peese, ref.decision.use_peese);
  push("decision.corrected_log_dor", app.decision.corrected_log_dor, ref.decision.corrected_log_dor);
  push("decision.corrected_dor", app.decision.corrected_dor, ref.decision.corrected_dor);
  push("decision.unadjusted_log_dor", app.decision.unadjusted_log_dor, ref.decision.unadjusted_log_dor);
  push("decision.unadjusted_dor", app.decision.unadjusted_dor, ref.decision.unadjusted_dor);
  push("decision.change_pct", app.decision.change_pct, ref.decision.change_pct);
  return rows;
}

function excessRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("alpha", app.alpha, ref.alpha);
  push("z_crit", app.z_crit, ref.z_crit);
  push("observed_sig", app.observed_sig, ref.observed_sig);
  push("k", app.k, ref.k);
  push("theta_fe", app.theta_fe, ref.theta_fe);
  push("theta_re", app.theta_re, ref.theta_re);
  push("tau2_dl", app.tau2_dl, ref.tau2_dl);
  push("stats_fe.expected_sig", app.stats_fe.expected_sig, ref.stats_fe.expected_sig);
  push("stats_fe.chi2", app.stats_fe.chi2, ref.stats_fe.chi2);
  push("stats_fe.p_excess", app.stats_fe.p_excess, ref.stats_fe.p_excess);
  push("stats_fe.p_exact", app.stats_fe.p_exact, ref.stats_fe.p_exact);
  push("stats_fe.ratio", app.stats_fe.ratio, ref.stats_fe.ratio);
  push("stats_re.expected_sig", app.stats_re.expected_sig, ref.stats_re.expected_sig);
  push("stats_re.chi2", app.stats_re.chi2, ref.stats_re.chi2);
  push("stats_re.p_excess", app.stats_re.p_excess, ref.stats_re.p_excess);
  push("stats_re.p_exact", app.stats_re.p_exact, ref.stats_re.p_exact);
  push("stats_re.ratio", app.stats_re.ratio, ref.stats_re.ratio);
  push("primary.expected_sig", app.primary.expected_sig, ref.primary.expected_sig);
  push("primary.chi2", app.primary.chi2, ref.primary.chi2);
  push("primary.p_excess", app.primary.p_excess, ref.primary.p_excess);
  push("primary.p_exact", app.primary.p_exact, ref.primary.p_exact);
  push("primary.ratio", app.primary.ratio, ref.primary.ratio);
  push("primary_label", app.primary_label, ref.primary_label);
  return rows;
}

function deeksRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("deeks.intercept", app.intercept, ref.intercept);
  push("deeks.slope", app.slope, ref.slope);
  push("deeks.se_slope", app.se_slope, ref.se_slope);
  push("deeks.t", app.t, ref.t);
  push("deeks.p_value", app.p_value, ref.p_value);
  push("deeks.n", app.n, ref.n);
  return rows;
}

function eggerRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  const keys = ["standard_egger", "deeks_funnel_asymmetry", "peters_test"];
  for (const key of keys) {
    push(`${key}.coefficient`, app[key]?.coefficient, ref[key]?.coefficient);
    push(`${key}.se`, app[key]?.se, ref[key]?.se);
    push(`${key}.t`, app[key]?.t, ref[key]?.t);
    push(`${key}.p`, app[key]?.p, ref[key]?.p);
  }
  return rows;
}

function trimFillRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("k_imputed", app.k_imputed, ref.k_imputed);
  push("median_log_dor", app.median_log_dor, ref.median_log_dor);
  push("original_log_dor", app.original_log_dor, ref.original_log_dor);
  push("adjusted_log_dor", app.adjusted_log_dor, ref.adjusted_log_dor);
  push("original_dor", app.original_dor, ref.original_dor);
  push("adjusted_dor", app.adjusted_dor, ref.adjusted_dor);
  return rows;
}

function pcurveRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("n_significant", app.n_significant, ref.n_significant);
  push("low_p", app.low_p, ref.low_p);
  push("high_p", app.high_p, ref.high_p);
  push("right_skew", app.right_skew, ref.right_skew);
  for (const k of ["0.00-0.01", "0.01-0.02", "0.02-0.03", "0.03-0.04", "0.04-0.05"]) {
    push(`bins.${k}`, app.bins?.[k], ref.bins?.[k]);
  }
  return rows;
}

function worstCaseRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("global_lower", app.global_lower, ref.global_lower);
  push("global_upper", app.global_upper, ref.global_upper);
  push("global_lower_dor", app.global_lower_dor, ref.global_lower_dor);
  push("global_upper_dor", app.global_upper_dor, ref.global_upper_dor);
  push("spread_dor", app.spread_dor, ref.spread_dor);
  push("robustness", app.robustness, ref.robustness);
  for (const k of ["precision", "significance", "composite"]) {
    push(`${k}.lower`, app[k]?.lower, ref[k]?.lower);
    push(`${k}.upper`, app[k]?.upper, ref[k]?.upper);
  }
  return rows;
}

function caliperRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("alpha", app.alpha, ref.alpha);
  push("width", app.width, ref.width);
  push("left", app.left, ref.left);
  push("right", app.right, ref.right);
  push("n_window", app.n_window, ref.n_window);
  push("too_few_window", app.too_few_window, ref.too_few_window);
  if (!app.too_few_window && !ref.too_few_window) {
    push("p_exact_one_sided", app.p_exact_one_sided, ref.p_exact_one_sided);
    push("z_score", app.z_score, ref.z_score);
    push("p_normal_one_sided", app.p_normal_one_sided, ref.p_normal_one_sided);
    push("ratio", app.ratio, ref.ratio);
    push("ratio_ci.1", app.ratio_ci?.[0], ref.ratio_ci?.[0]);
    push("ratio_ci.2", app.ratio_ci?.[1], ref.ratio_ci?.[1]);
    push("discontinuity_flag", app.discontinuity_flag, ref.discontinuity_flag);
  }
  return rows;
}

function selectionRatioRows(app, ref, absTol, relTol) {
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, absTol, relTol));
  push("alpha", app.alpha, ref.alpha);
  push("n_sig", app.n_sig, ref.n_sig);
  push("n_non_sig", app.n_non_sig, ref.n_non_sig);
  push("unadjusted_log_dor", app.unadjusted_log_dor, ref.unadjusted_log_dor);
  push("unadjusted_dor", app.unadjusted_dor, ref.unadjusted_dor);
  push("eta_20pct", app.eta_20pct, ref.eta_20pct);
  push("eta_null", app.eta_null, ref.eta_null);
  push("max_attenuation", app.max_attenuation, ref.max_attenuation);
  push("robustness", app.robustness, ref.robustness);
  push("rows.length", app.rows?.length, ref.rows?.length);
  const n = Math.min(app.rows?.length || 0, ref.rows?.length || 0);
  for (let i = 0; i < n; i++) {
    push(`rows[${i}].eta`, app.rows[i]?.eta, ref.rows[i]?.eta);
    push(`rows[${i}].theta`, app.rows[i]?.theta, ref.rows[i]?.theta);
    push(`rows[${i}].dor`, app.rows[i]?.dor, ref.rows[i]?.dor);
    push(`rows[${i}].dor_ci.1`, app.rows[i]?.dor_ci?.[0], ref.rows[i]?.dor_ci?.[0]);
    push(`rows[${i}].dor_ci.2`, app.rows[i]?.dor_ci?.[1], ref.rows[i]?.dor_ci?.[1]);
    push(`rows[${i}].ratio_to_unadjusted`, app.rows[i]?.ratio_to_unadjusted, ref.rows[i]?.ratio_to_unadjusted);
  }
  return rows;
}

function main() {
  const opts = parseArgs(process.argv);
  const datasetPath = path.resolve(opts.dataset);
  const referencePath = path.resolve(opts.reference);
  const outputPath = path.resolve(opts.output);

  const studies = readCsv2x2(datasetPath);
  const reference = JSON.parse(fs.readFileSync(referencePath, "utf8"));

  const appPet = runPetPeese(studies);
  const appExcess = runExcessSignificance(studies);
  const appDeeks = runDeeks(studies);
  const appEgger = runEggerVariants(studies);
  const appTrimFill = runTrimAndFill(studies);
  const appPCurve = runPCurveAnalysis(studies);
  const appWorstCase = runWorstCaseSelectionBounds(studies);
  const appCaliper = runCaliperDiscontinuity(studies);
  const appSelection = runSelectionRatioSensitivity(studies);

  const refPet = reference.methods.pet_peese;
  const refExcess = reference.methods.excess_significance;
  const refDeeks = reference.methods.deeks;
  const refEgger = reference.methods.egger_variants;
  const refTrimFill = reference.methods.trim_and_fill;
  const refPCurve = reference.methods.pcurve;
  const refWorstCase = reference.methods.worst_case_selection_bounds;
  const refCaliper = reference.methods.caliper_discontinuity;
  const refSelection = reference.methods.selection_ratio_sensitivity;

  const petComparisons = petRows(appPet, refPet, opts.absTol, opts.relTol);
  const excessComparisons = excessRows(appExcess, refExcess, opts.absTol, opts.relTol);
  const deeksComparisons = deeksRows(appDeeks, refDeeks, opts.absTol, opts.relTol);
  const eggerComparisons = eggerRows(appEgger, refEgger, opts.absTol, opts.relTol);
  const trimFillComparisons = trimFillRows(appTrimFill, refTrimFill, opts.absTol, opts.relTol);
  const pcurveComparisons = pcurveRows(appPCurve, refPCurve, opts.absTol, opts.relTol);
  const worstCaseComparisons = worstCaseRows(appWorstCase, refWorstCase, opts.absTol, opts.relTol);
  const caliperComparisons = caliperRows(appCaliper, refCaliper, opts.absTol, opts.relTol);
  const selectionComparisons = selectionRatioRows(appSelection, refSelection, opts.absTol, opts.relTol);

  const all = [
    ...petComparisons,
    ...excessComparisons,
    ...deeksComparisons,
    ...eggerComparisons,
    ...trimFillComparisons,
    ...pcurveComparisons,
    ...worstCaseComparisons,
    ...caliperComparisons,
    ...selectionComparisons
  ];
  const failures = all.filter((r) => !r.pass);
  const maxAbsDiff = all
    .map((r) => (typeof r.abs_diff === "number" ? r.abs_diff : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  const report = {
    generated_at: new Date().toISOString(),
    dataset_path: datasetPath,
    reference_path: referencePath,
    tolerances: { absTol: opts.absTol, relTol: opts.relTol },
    summary: {
      total_metrics: all.length,
      failed_metrics: failures.length,
      pass: failures.length === 0,
      max_abs_diff: maxAbsDiff
    },
    methods: {
      pet_peese: { app: appPet, reference: refPet, comparisons: petComparisons },
      excess_significance: { app: appExcess, reference: refExcess, comparisons: excessComparisons },
      deeks: { app: appDeeks, reference: refDeeks, comparisons: deeksComparisons },
      egger_variants: { app: appEgger, reference: refEgger, comparisons: eggerComparisons },
      trim_and_fill: { app: appTrimFill, reference: refTrimFill, comparisons: trimFillComparisons },
      pcurve: { app: appPCurve, reference: refPCurve, comparisons: pcurveComparisons },
      worst_case_selection_bounds: { app: appWorstCase, reference: refWorstCase, comparisons: worstCaseComparisons },
      caliper_discontinuity: { app: appCaliper, reference: refCaliper, comparisons: caliperComparisons },
      selection_ratio_sensitivity: { app: appSelection, reference: refSelection, comparisons: selectionComparisons }
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`Comparator dataset: ${datasetPath}`);
  console.log(`Reference JSON:     ${referencePath}`);
  console.log(`Output report:      ${outputPath}`);
  console.log(`Metrics checked:    ${all.length}`);
  console.log(`Failures:           ${failures.length}`);
  console.log(`Max abs diff:       ${maxAbsDiff}`);
  if (failures.length > 0) {
    console.log("Failed metrics:");
    for (const f of failures) {
      console.log(`  - ${f.name}: app=${f.app} reference=${f.reference} abs_diff=${f.abs_diff}`);
    }
    process.exitCode = 2;
  } else {
    console.log("All compared metrics passed within tolerance.");
  }
}

main();
