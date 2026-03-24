#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = {
    dataset: "gapfill_comparator_dataset.json",
    reference: "gapfill_reference_r.json",
    output: "gapfill_comparison_report.json",
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

function pchisq(x, df) {
  if (x <= 0) return 0;
  if (df <= 0) return NaN;
  const ITMAX = 200;
  const EPS = 1e-10;
  const a = df / 2;
  const xx = x / 2;
  if (xx < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < ITMAX; n++) {
      term *= xx / (a + n);
      sum += term;
      if (Math.abs(term) < EPS * Math.abs(sum)) break;
    }
    return sum * Math.exp(-xx + a * Math.log(xx) - gammaln(a));
  }
  let b = xx + 1 - a;
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
  return 1 - Math.exp(-xx + a * Math.log(xx) - gammaln(a)) * h;
}

function invLogit(x) {
  return 1 / (1 + Math.exp(-x));
}

function calculatePooledEstimates(studies, confLevel = 0.95) {
  const n = studies.length;
  const data = studies.map((s) => {
    const hasZero = s.tp === 0 || s.fp === 0 || s.fn === 0 || s.tn === 0;
    const cc = hasZero ? 0.5 : 0;
    const tp = s.tp + cc;
    const fp = s.fp + cc;
    const fn = s.fn + cc;
    const tn = s.tn + cc;
    const sens = tp / (tp + fn);
    const spec = tn / (tn + fp);
    const y1 = Math.log(sens / (1 - sens));
    const y2 = Math.log(spec / (1 - spec));
    const v1 = 1 / tp + 1 / fn;
    const v2 = 1 / tn + 1 / fp;
    return { y1, y2, v1, v2 };
  });

  const w1 = data.map((d) => 1 / Math.max(1e-12, d.v1));
  const w2 = data.map((d) => 1 / Math.max(1e-12, d.v2));
  const sumW1 = w1.reduce((a, b) => a + b, 0);
  const sumW2 = w2.reduce((a, b) => a + b, 0);
  const mu1FE = data.reduce((s, d, i) => s + d.y1 * w1[i], 0) / sumW1;
  const mu2FE = data.reduce((s, d, i) => s + d.y2 * w2[i], 0) / sumW2;
  const q1 = data.reduce((s, d, i) => s + w1[i] * (d.y1 - mu1FE) ** 2, 0);
  const q2 = data.reduce((s, d, i) => s + w2[i] * (d.y2 - mu2FE) ** 2, 0);
  const c1 = sumW1 - w1.reduce((s, w) => s + w * w, 0) / sumW1;
  const c2 = sumW2 - w2.reduce((s, w) => s + w * w, 0) / sumW2;
  const tau2_1 = Math.max(0, (q1 - (n - 1)) / Math.max(1e-12, c1));
  const tau2_2 = Math.max(0, (q2 - (n - 1)) / Math.max(1e-12, c2));
  const w1re = data.map((d) => 1 / Math.max(1e-12, d.v1 + tau2_1));
  const w2re = data.map((d) => 1 / Math.max(1e-12, d.v2 + tau2_2));
  const sumW1re = w1re.reduce((a, b) => a + b, 0);
  const sumW2re = w2re.reduce((a, b) => a + b, 0);
  const mu1 = data.reduce((s, d, i) => s + d.y1 * w1re[i], 0) / sumW1re;
  const mu2 = data.reduce((s, d, i) => s + d.y2 * w2re[i], 0) / sumW2re;
  const pooledSens = invLogit(mu1);
  const pooledSpec = invLogit(mu2);
  const seMu1 = 1 / Math.sqrt(sumW1re);
  const seMu2 = 1 / Math.sqrt(sumW2re);
  const alpha = 1 - confLevel;
  const crit = n >= 30 ? normalQuantile(1 - alpha / 2) : (() => {
    // simple t quantile via binary search over tCDF
    let lo = 0;
    let hi = 20;
    const target = 1 - alpha / 2;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (tCDF(mid, Math.max(1, n - 2)) < target) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  })();

  const sensCI = [invLogit(mu1 - crit * seMu1), invLogit(mu1 + crit * seMu1)];
  const specCI = [invLogit(mu2 - crit * seMu2), invLogit(mu2 + crit * seMu2)];

  const sensClamp = Math.max(0.001, Math.min(0.999, pooledSens));
  const specClamp = Math.max(0.001, Math.min(0.999, pooledSpec));
  const plr = sensClamp / (1 - specClamp);
  const nlr = (1 - sensClamp) / specClamp;
  const dor = (sensClamp * specClamp) / ((1 - sensClamp) * (1 - specClamp));
  const i2sens = q1 > 0 ? Math.max(0, ((q1 - (n - 1)) / q1) * 100) : 0;
  const i2spec = q2 > 0 ? Math.max(0, ((q2 - (n - 1)) / q2) * 100) : 0;
  const pQsens = n > 1 ? 1 - pchisq(q1, n - 1) : NaN;
  const pQspec = n > 1 ? 1 - pchisq(q2, n - 1) : NaN;

  let rho = NaN;
  if (n > 2) {
    const rs = data.map((d, i) => (d.y1 - mu1FE) * Math.sqrt(w1[i]));
    const rp = data.map((d, i) => (d.y2 - mu2FE) * Math.sqrt(w2[i]));
    const meanRs = rs.reduce((a, b) => a + b, 0) / n;
    const meanRp = rp.reduce((a, b) => a + b, 0) / n;
    let cov = 0; let vs = 0; let vp = 0;
    for (let i = 0; i < n; i++) {
      cov += (rs[i] - meanRs) * (rp[i] - meanRp);
      vs += (rs[i] - meanRs) ** 2;
      vp += (rp[i] - meanRp) ** 2;
    }
    if (vs > 0 && vp > 0) {
      rho = Math.max(-0.99, Math.min(0.99, cov / Math.sqrt(vs * vp)));
    }
  }

  return {
    pooled_sens: pooledSens,
    pooled_spec: pooledSpec,
    sens_ci: sensCI,
    spec_ci: specCI,
    plr,
    nlr,
    dor,
    tau2_sens: tau2_1,
    tau2_spec: tau2_2,
    rho,
    heterogeneity: {
      q_sens: q1,
      q_spec: q2,
      i2_sens: i2sens,
      i2_spec: i2spec,
      p_q_sens: pQsens,
      p_q_spec: pQspec
    },
    n_studies: n
  };
}

function comparisonConclusion(rdSens, rdSpec, pSens, pSpec) {
  const out = [];
  if (pSens < 0.05) out.push(rdSens > 0 ? "Test 1 has significantly HIGHER sensitivity" : "Test 2 has significantly HIGHER sensitivity");
  else out.push("No significant difference in sensitivity");
  if (pSpec < 0.05) out.push(rdSpec > 0 ? "Test 1 has significantly HIGHER specificity" : "Test 2 has significantly HIGHER specificity");
  else out.push("No significant difference in specificity");
  return out.join(". ");
}

function runComparativeDTA(testA, testB, confLevel = 0.95) {
  if (testA.length !== testB.length) throw new Error("Tests must have same number of paired studies");
  const n = testA.length;
  const pooled1 = calculatePooledEstimates(testA, confLevel);
  const pooled2 = calculatePooledEstimates(testB, confLevel);

  const sensDiffs = [];
  const specDiffs = [];
  for (let i = 0; i < n; i++) {
    const s1 = testA[i];
    const s2 = testB[i];
    const sens1 = (s1.tp + 0.5) / (s1.tp + s1.fn + 1);
    const sens2 = (s2.tp + 0.5) / (s2.tp + s2.fn + 1);
    const spec1 = (s1.tn + 0.5) / (s1.tn + s1.fp + 1);
    const spec2 = (s2.tn + 0.5) / (s2.tn + s2.fp + 1);
    sensDiffs.push(Math.log(sens1 / (1 - sens1)) - Math.log(sens2 / (1 - sens2)));
    specDiffs.push(Math.log(spec1 / (1 - spec1)) - Math.log(spec2 / (1 - spec2)));
  }
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = (arr) => {
    const m = mean(arr);
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  };
  const meanSensDiff = mean(sensDiffs);
  const meanSpecDiff = mean(specDiffs);
  const seSensDiff = Math.sqrt(variance(sensDiffs) / n);
  const seSpecDiff = Math.sqrt(variance(specDiffs) / n);
  const zSens = seSensDiff > 0 ? meanSensDiff / seSensDiff : 0;
  const zSpec = seSpecDiff > 0 ? meanSpecDiff / seSpecDiff : 0;
  const pSens = 2 * (1 - normalCDF(Math.abs(zSens)));
  const pSpec = 2 * (1 - normalCDF(Math.abs(zSpec)));

  const rdSens = pooled1.pooled_sens - pooled2.pooled_sens;
  const rdSpec = pooled1.pooled_spec - pooled2.pooled_spec;
  const zCrit = normalQuantile(1 - (1 - confLevel) / 2);
  const avgSens = (pooled1.pooled_sens + pooled2.pooled_sens) / 2;
  const avgSpec = (pooled1.pooled_spec + pooled2.pooled_spec) / 2;
  const seSensProb = seSensDiff * avgSens * (1 - avgSens);
  const seSpecProb = seSpecDiff * avgSpec * (1 - avgSpec);

  return {
    pooled: {
      test1: { sens: pooled1.pooled_sens, spec: pooled1.pooled_spec },
      test2: { sens: pooled2.pooled_sens, spec: pooled2.pooled_spec }
    },
    comparison: {
      sensitivity_difference: rdSens,
      sensitivity_ci: [rdSens - zCrit * seSensProb, rdSens + zCrit * seSensProb],
      sensitivity_p_value: pSens,
      specificity_difference: rdSpec,
      specificity_ci: [rdSpec - zCrit * seSpecProb, rdSpec + zCrit * seSpecProb],
      specificity_p_value: pSpec,
      conclusion: comparisonConclusion(rdSens, rdSpec, pSens, pSpec)
    }
  };
}

function thresholdRecommendation(result, prevalence) {
  const recs = [];
  if (prevalence > 0.3) {
    recs.push("High prevalence setting: prioritize sensitivity to avoid missed diagnoses");
    if (result.youden.sens < 0.9) recs.push("Consider rule-out strategy with higher sensitivity threshold");
  }
  if (prevalence < 0.1) {
    recs.push("Low prevalence setting: prioritize specificity to reduce false positives");
    if (result.youden.spec < 0.9) recs.push("Consider two-stage testing with confirmatory test");
  }
  if (result.youden.j > 0.7) recs.push("High Youden index suggests good overall diagnostic performance");
  else if (result.youden.j < 0.5) recs.push("Low Youden index suggests limited diagnostic utility");
  return recs;
}

function runThresholdOptimization(studies, options = {}) {
  const prevalence = Number.isFinite(Number(options.prevalence)) ? Number(options.prevalence) : 0.1;
  const costFn = Number.isFinite(Number(options.cost_fn)) ? Number(options.cost_fn) : 1.0;
  const costFp = Number.isFinite(Number(options.cost_fp)) ? Number(options.cost_fp) : 0.5;
  const targetSens = Number.isFinite(Number(options.target_sens)) ? Number(options.target_sens) : null;
  const targetSpec = Number.isFinite(Number(options.target_spec)) ? Number(options.target_spec) : null;
  const pooled = calculatePooledEstimates(studies, 0.95);
  const sens = pooled.pooled_sens;
  const spec = pooled.pooled_spec;
  const out = {
    youden: { sens, spec, j: sens + spec - 1 },
    closest_to_ideal: { sens, spec, distance: Math.sqrt((1 - sens) ** 2 + (1 - spec) ** 2) },
    min_cost: {
      sens, spec,
      expected_cost: (1 - sens) * prevalence * costFn + (1 - spec) * (1 - prevalence) * costFp,
      prevalence
    }
  };
  if (targetSens !== null || targetSpec !== null) {
    out.constrained_optimal = {
      sens,
      spec,
      meets_constraints: (targetSens === null || sens >= targetSens) && (targetSpec === null || spec >= targetSpec),
      target_sens: targetSens,
      target_spec: targetSpec
    };
  }
  out.recommendation = thresholdRecommendation(out, prevalence);
  return out;
}

function runNetworkMetaDTA(network) {
  const tests = network.tests;
  const nTests = tests.length;
  const dors = tests.map((t) => ({
    test: t.name,
    dor: (t.sens * t.spec) / ((1 - t.sens) * (1 - t.spec))
  }));
  const pairwise = [];
  for (let i = 0; i < nTests; i++) {
    for (let j = i + 1; j < nTests; j++) {
      const dorI = dors[i].dor;
      const dorJ = dors[j].dor;
      pairwise.push({
        comparison: `${tests[i].name} vs ${tests[j].name}`,
        r_dor: dorI / dorJ,
        log_r_dor: Math.log(dorI / dorJ),
        favors: dorI > dorJ ? tests[i].name : tests[j].name
      });
    }
  }
  const rankings = dors.slice().sort((a, b) => b.dor - a.dor).map((r, i) => ({
    test: r.test,
    dor: r.dor,
    rank: i + 1,
    sucra: (nTests - (i + 1)) / (nTests - 1)
  }));
  return {
    n_tests: nTests,
    relative_dors: pairwise,
    rankings,
    best_test: rankings[0].test
  };
}

function runIPDTwoStage(ipd) {
  const counts = ipd.study_counts;
  const nPatients = counts.reduce((s, r) => s + r.tp + r.fp + r.fn + r.tn, 0);
  const tpTotal = counts.reduce((s, r) => s + r.tp, 0);
  const fpTotal = counts.reduce((s, r) => s + r.fp, 0);
  const fnTotal = counts.reduce((s, r) => s + r.fn, 0);
  const tnTotal = counts.reduce((s, r) => s + r.tn, 0);
  const oneStage = {
    sensitivity: tpTotal / (tpTotal + fnTotal),
    specificity: tnTotal / (tnTotal + fpTotal)
  };
  const pooled = calculatePooledEstimates(counts, 0.95);
  return {
    n_patients: nPatients,
    n_studies: counts.length,
    one_stage: oneStage,
    two_stage: {
      sensitivity: pooled.pooled_sens,
      specificity: pooled.pooled_spec,
      dor: pooled.dor
    },
    heterogeneity: pooled.heterogeneity
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
  if (!isFiniteNum(a) && !isFiniteNum(r)) return { name, app: appVal, reference: refVal, abs_diff: 0, rel_diff: 0, pass: true };
  if (!isFiniteNum(a) || !isFiniteNum(r)) return { name, app: appVal, reference: refVal, abs_diff: null, rel_diff: null, pass: false };
  const absDiff = Math.abs(a - r);
  const scale = Math.max(Math.abs(a), Math.abs(r), 1);
  const relDiff = absDiff / scale;
  const pass = absDiff <= absTol || relDiff <= relTol;
  return { name, app: a, reference: r, abs_diff: absDiff, rel_diff: relDiff, pass };
}

function main() {
  const opts = parseArgs(process.argv);
  const datasetPath = path.resolve(opts.dataset);
  const referencePath = path.resolve(opts.reference);
  const outputPath = path.resolve(opts.output);

  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  const reference = JSON.parse(fs.readFileSync(referencePath, "utf8"));

  const app = {
    comparative_dta: runComparativeDTA(dataset.comparative.test_a, dataset.comparative.test_b, 0.95),
    threshold_optimization: runThresholdOptimization(dataset.threshold.studies, dataset.threshold.options),
    network_meta_dta: runNetworkMetaDTA(dataset.network),
    ipd_two_stage: runIPDTwoStage(dataset.ipd)
  };

  const ref = reference.methods;
  const rows = [];
  const push = (name, a, r) => rows.push(compareValue(name, a, r, opts.absTol, opts.relTol));

  push("comparative.test1.sens", app.comparative_dta.pooled.test1.sens, ref.comparative_dta.pooled.test1.sens);
  push("comparative.test1.spec", app.comparative_dta.pooled.test1.spec, ref.comparative_dta.pooled.test1.spec);
  push("comparative.test2.sens", app.comparative_dta.pooled.test2.sens, ref.comparative_dta.pooled.test2.sens);
  push("comparative.test2.spec", app.comparative_dta.pooled.test2.spec, ref.comparative_dta.pooled.test2.spec);
  push("comparative.rd_sens", app.comparative_dta.comparison.sensitivity_difference, ref.comparative_dta.comparison.sensitivity_difference);
  push("comparative.rd_spec", app.comparative_dta.comparison.specificity_difference, ref.comparative_dta.comparison.specificity_difference);
  push("comparative.rd_sens_ci1", app.comparative_dta.comparison.sensitivity_ci[0], ref.comparative_dta.comparison.sensitivity_ci[0]);
  push("comparative.rd_sens_ci2", app.comparative_dta.comparison.sensitivity_ci[1], ref.comparative_dta.comparison.sensitivity_ci[1]);
  push("comparative.rd_spec_ci1", app.comparative_dta.comparison.specificity_ci[0], ref.comparative_dta.comparison.specificity_ci[0]);
  push("comparative.rd_spec_ci2", app.comparative_dta.comparison.specificity_ci[1], ref.comparative_dta.comparison.specificity_ci[1]);
  push("comparative.p_sens", app.comparative_dta.comparison.sensitivity_p_value, ref.comparative_dta.comparison.sensitivity_p_value);
  push("comparative.p_spec", app.comparative_dta.comparison.specificity_p_value, ref.comparative_dta.comparison.specificity_p_value);
  push("comparative.conclusion", app.comparative_dta.comparison.conclusion, ref.comparative_dta.comparison.conclusion);

  push("threshold.youden_j", app.threshold_optimization.youden.j, ref.threshold_optimization.youden.j);
  push("threshold.distance", app.threshold_optimization.closest_to_ideal.distance, ref.threshold_optimization.closest_to_ideal.distance);
  push("threshold.expected_cost", app.threshold_optimization.min_cost.expected_cost, ref.threshold_optimization.min_cost.expected_cost);
  push("threshold.recommendation.length", app.threshold_optimization.recommendation.length, ref.threshold_optimization.recommendation.length);
  for (let i = 0; i < Math.min(app.threshold_optimization.recommendation.length, ref.threshold_optimization.recommendation.length); i++) {
    push(`threshold.recommendation[${i}]`, app.threshold_optimization.recommendation[i], ref.threshold_optimization.recommendation[i]);
  }
  push("threshold.meets_constraints", app.threshold_optimization.constrained_optimal?.meets_constraints, ref.threshold_optimization.constrained_optimal?.meets_constraints);

  push("network.n_tests", app.network_meta_dta.n_tests, ref.network_meta_dta.n_tests);
  push("network.best_test", app.network_meta_dta.best_test, ref.network_meta_dta.best_test);
  push("network.rankings.length", app.network_meta_dta.rankings.length, ref.network_meta_dta.rankings.length);
  for (let i = 0; i < Math.min(app.network_meta_dta.rankings.length, ref.network_meta_dta.rankings.length); i++) {
    push(`network.rank[${i}].test`, app.network_meta_dta.rankings[i].test, ref.network_meta_dta.rankings[i].test);
    push(`network.rank[${i}].dor`, app.network_meta_dta.rankings[i].dor, ref.network_meta_dta.rankings[i].dor);
    push(`network.rank[${i}].rank`, app.network_meta_dta.rankings[i].rank, ref.network_meta_dta.rankings[i].rank);
    push(`network.rank[${i}].sucra`, app.network_meta_dta.rankings[i].sucra, ref.network_meta_dta.rankings[i].sucra);
  }
  push("network.relative_dors.length", app.network_meta_dta.relative_dors.length, ref.network_meta_dta.relative_dors.length);
  for (let i = 0; i < Math.min(app.network_meta_dta.relative_dors.length, ref.network_meta_dta.relative_dors.length); i++) {
    push(`network.pair[${i}].comparison`, app.network_meta_dta.relative_dors[i].comparison, ref.network_meta_dta.relative_dors[i].comparison);
    push(`network.pair[${i}].r_dor`, app.network_meta_dta.relative_dors[i].r_dor, ref.network_meta_dta.relative_dors[i].r_dor);
    push(`network.pair[${i}].log_r_dor`, app.network_meta_dta.relative_dors[i].log_r_dor, ref.network_meta_dta.relative_dors[i].log_r_dor);
    push(`network.pair[${i}].favors`, app.network_meta_dta.relative_dors[i].favors, ref.network_meta_dta.relative_dors[i].favors);
  }

  push("ipd.n_patients", app.ipd_two_stage.n_patients, ref.ipd_two_stage.n_patients);
  push("ipd.n_studies", app.ipd_two_stage.n_studies, ref.ipd_two_stage.n_studies);
  push("ipd.one_stage.sens", app.ipd_two_stage.one_stage.sensitivity, ref.ipd_two_stage.one_stage.sensitivity);
  push("ipd.one_stage.spec", app.ipd_two_stage.one_stage.specificity, ref.ipd_two_stage.one_stage.specificity);
  push("ipd.two_stage.sens", app.ipd_two_stage.two_stage.sensitivity, ref.ipd_two_stage.two_stage.sensitivity);
  push("ipd.two_stage.spec", app.ipd_two_stage.two_stage.specificity, ref.ipd_two_stage.two_stage.specificity);
  push("ipd.two_stage.dor", app.ipd_two_stage.two_stage.dor, ref.ipd_two_stage.two_stage.dor);
  push("ipd.het.q_sens", app.ipd_two_stage.heterogeneity.q_sens, ref.ipd_two_stage.heterogeneity.q_sens);
  push("ipd.het.q_spec", app.ipd_two_stage.heterogeneity.q_spec, ref.ipd_two_stage.heterogeneity.q_spec);
  push("ipd.het.i2_sens", app.ipd_two_stage.heterogeneity.i2_sens, ref.ipd_two_stage.heterogeneity.i2_sens);
  push("ipd.het.i2_spec", app.ipd_two_stage.heterogeneity.i2_spec, ref.ipd_two_stage.heterogeneity.i2_spec);

  const failures = rows.filter((r) => !r.pass);
  const maxAbsDiff = rows
    .map((r) => (typeof r.abs_diff === "number" ? r.abs_diff : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  const report = {
    generated_at: new Date().toISOString(),
    dataset_path: datasetPath,
    reference_path: referencePath,
    tolerances: { absTol: opts.absTol, relTol: opts.relTol },
    summary: {
      total_metrics: rows.length,
      failed_metrics: failures.length,
      pass: failures.length === 0,
      max_abs_diff: maxAbsDiff
    },
    methods: {
      comparative_dta: { app: app.comparative_dta, reference: ref.comparative_dta },
      threshold_optimization: { app: app.threshold_optimization, reference: ref.threshold_optimization },
      network_meta_dta: { app: app.network_meta_dta, reference: ref.network_meta_dta },
      ipd_two_stage: { app: app.ipd_two_stage, reference: ref.ipd_two_stage }
    },
    comparisons: rows
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`Comparator dataset: ${datasetPath}`);
  console.log(`Reference JSON:     ${referencePath}`);
  console.log(`Output report:      ${outputPath}`);
  console.log(`Metrics checked:    ${rows.length}`);
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
