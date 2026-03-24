#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = {
    output: "benchmark_sim_datasets.json",
    seed: 20260304,
    replicates: 80,
    minStudies: 6,
    maxStudies: 20
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--output" && argv[i + 1]) out.output = argv[++i];
    else if (a === "--seed" && argv[i + 1]) out.seed = Number(argv[++i]);
    else if (a === "--replicates" && argv[i + 1]) out.replicates = Number(argv[++i]);
    else if (a === "--minStudies" && argv[i + 1]) out.minStudies = Number(argv[++i]);
    else if (a === "--maxStudies" && argv[i + 1]) out.maxStudies = Number(argv[++i]);
  }
  return out;
}

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function rng() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randn(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function logit(p) {
  const x = Math.max(1e-9, Math.min(1 - 1e-9, p));
  return Math.log(x / (1 - x));
}

function invLogit(x) {
  return 1 / (1 + Math.exp(-x));
}

function rbinom(n, p, rng) {
  let k = 0;
  const prob = Math.max(1e-9, Math.min(1 - 1e-9, p));
  for (let i = 0; i < n; i++) {
    if (rng() < prob) k++;
  }
  return k;
}

function randint(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function runif(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

const SCENARIOS = [
  {
    key: "balanced",
    sensRange: [0.72, 0.92],
    specRange: [0.72, 0.92],
    tauSensRange: [0.08, 0.22],
    tauSpecRange: [0.08, 0.22],
    nDiseasedRange: [60, 240],
    nHealthyRange: [60, 240],
    thresholdShiftSD: 0.12
  },
  {
    key: "rare_disease_high_specificity",
    sensRange: [0.62, 0.88],
    specRange: [0.90, 0.99],
    tauSensRange: [0.08, 0.24],
    tauSpecRange: [0.06, 0.18],
    nDiseasedRange: [16, 70],
    nHealthyRange: [180, 650],
    thresholdShiftSD: 0.10
  },
  {
    key: "rule_out_high_sensitivity",
    sensRange: [0.90, 0.99],
    specRange: [0.45, 0.75],
    tauSensRange: [0.06, 0.18],
    tauSpecRange: [0.12, 0.28],
    nDiseasedRange: [55, 220],
    nHealthyRange: [130, 480],
    thresholdShiftSD: 0.10
  },
  {
    key: "sparse_zero_cells",
    sensRange: [0.78, 0.99],
    specRange: [0.78, 0.99],
    tauSensRange: [0.20, 0.48],
    tauSpecRange: [0.20, 0.48],
    nDiseasedRange: [8, 35],
    nHealthyRange: [8, 35],
    thresholdShiftSD: 0.18
  },
  {
    key: "threshold_heterogeneity",
    sensRange: [0.62, 0.95],
    specRange: [0.58, 0.95],
    tauSensRange: [0.22, 0.55],
    tauSpecRange: [0.22, 0.55],
    nDiseasedRange: [45, 180],
    nHealthyRange: [45, 180],
    thresholdShiftSD: 0.55
  },
  {
    key: "low_accuracy_noisy",
    sensRange: [0.50, 0.76],
    specRange: [0.50, 0.76],
    tauSensRange: [0.20, 0.50],
    tauSpecRange: [0.20, 0.50],
    nDiseasedRange: [40, 180],
    nHealthyRange: [40, 180],
    thresholdShiftSD: 0.20
  }
];

function generateReplicate(rng, scenario, idx, opts) {
  const muSens = runif(rng, scenario.sensRange[0], scenario.sensRange[1]);
  const muSpec = runif(rng, scenario.specRange[0], scenario.specRange[1]);
  const tauSens = runif(rng, scenario.tauSensRange[0], scenario.tauSensRange[1]);
  const tauSpec = runif(rng, scenario.tauSpecRange[0], scenario.tauSpecRange[1]);
  const k = randint(rng, opts.minStudies, opts.maxStudies);

  const studies = [];
  let zeroCellStudies = 0;

  for (let s = 0; s < k; s++) {
    const nDiseased = randint(rng, scenario.nDiseasedRange[0], scenario.nDiseasedRange[1]);
    const nHealthy = randint(rng, scenario.nHealthyRange[0], scenario.nHealthyRange[1]);

    const zSens = randn(rng);
    const zSpec = randn(rng);
    const thresholdShift = scenario.thresholdShiftSD * randn(rng);
    const sens = Math.max(0.001, Math.min(0.999, invLogit(
      logit(muSens) + tauSens * zSens + thresholdShift
    )));
    const spec = Math.max(0.001, Math.min(0.999, invLogit(
      logit(muSpec) + tauSpec * zSpec - thresholdShift
    )));

    const tp = rbinom(nDiseased, sens, rng);
    const fn = nDiseased - tp;
    const tn = rbinom(nHealthy, spec, rng);
    const fp = nHealthy - tn;

    if (tp === 0 || fp === 0 || fn === 0 || tn === 0) zeroCellStudies++;
    studies.push({ tp, fp, fn, tn });
  }

  const dor = (muSens * muSpec) / ((1 - muSens) * (1 - muSpec));
  return {
    id: `rep_${String(idx + 1).padStart(4, "0")}`,
    scenario: scenario.key,
    true: {
      sens: muSens,
      spec: muSpec,
      dor,
      log_dor: Math.log(Math.max(1e-12, dor))
    },
    tau: { sens: tauSens, spec: tauSpec },
    summary: {
      n_studies: k,
      zero_cell_studies: zeroCellStudies,
      zero_cell_rate: zeroCellStudies / Math.max(1, k)
    },
    studies
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const rng = makeRng(opts.seed);
  const reps = [];

  for (let i = 0; i < opts.replicates; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    reps.push(generateReplicate(rng, scenario, i, opts));
  }

  const scenarioCounts = {};
  for (const r of reps) scenarioCounts[r.scenario] = (scenarioCounts[r.scenario] || 0) + 1;

  const out = {
    generated_at: new Date().toISOString(),
    seed: opts.seed,
    replicates: opts.replicates,
    min_studies: opts.minStudies,
    max_studies: opts.maxStudies,
    scenarios: SCENARIOS.map((s) => s.key),
    scenario_counts: scenarioCounts,
    datasets: reps
  };

  const outPath = path.resolve(opts.output);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote simulation datasets: ${outPath}`);
  console.log(`Replicates: ${opts.replicates}`);
  console.log(`Scenarios: ${SCENARIOS.map((s) => s.key).join(", ")}`);
}

main();

