// node --test truth-recovery/test-truth-recovery.mjs
// Asserts measured invariants of DTA_Pro_v2's bivariateGLMM under the known-truth
// bivariate DTA DGP. All numbers come from the seeded harness here -- truth-first.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bivariateGLMM } from './engine.mjs';
import { runCell, runGrid, summarize } from './harness.mjs';
import { generate, makeRng } from './dgp-dta.mjs';

const SEED = 20260614;

test('engine: bivariateGLMM recovers point Se/Sp ~unbiased on a clean DGP cell', () => {
  const rng = makeRng(SEED);
  const c = runCell(0.85, 0.80, 10, 'het_mod', 300, rng);
  // point estimates essentially unbiased (logit RE pool targets expit(mu))
  assert.ok(Math.abs(c.shipped.biasSe) < 0.03, `biasSe ${c.shipped.biasSe}`);
  assert.ok(Math.abs(c.shipped.biasSp) < 0.03, `biasSp ${c.shipped.biasSp}`);
  // the vast majority of fits return finite CIs
  assert.ok(c.shipped.n >= 270, `valid fits ${c.shipped.n}/300`);
});

test('finding: shipped Se/Sp interval is mildly ANTI-conservative (mean cov < 0.95)', () => {
  const grid = runGrid({ reps: 250 });
  const s = summarize(grid);
  // shipped labels the interval "HKSJ" but only swaps z->t on the ordinary RE SE
  assert.ok(s.shipped.meanCovSe < 0.95, `shipped meanCovSe ${s.shipped.meanCovSe} should under-cover`);
  assert.ok(s.shipped.meanCovSp < 0.95, `shipped meanCovSp ${s.shipped.meanCovSp} should under-cover`);
  // but not badly broken -- still in a usable band
  assert.ok(s.shipped.meanCovSe > 0.90, `shipped meanCovSe ${s.shipped.meanCovSe}`);
});

test('fix: genuine-HKSJ variance inflation improves coverage of BOTH Se and Sp', () => {
  const grid = runGrid({ reps: 250 });
  const s = summarize(grid);
  assert.ok(s['genuine-HKSJ'].meanCovSe > s.shipped.meanCovSe,
    `HKSJ Se ${s['genuine-HKSJ'].meanCovSe} should beat shipped ${s.shipped.meanCovSe}`);
  assert.ok(s['genuine-HKSJ'].meanCovSp > s.shipped.meanCovSp,
    `HKSJ Sp ${s['genuine-HKSJ'].meanCovSp} should beat shipped ${s.shipped.meanCovSp}`);
});

test('fix: genuine-HKSJ lands near nominal 0.95 (within [0.93, 0.98])', () => {
  const grid = runGrid({ reps: 250 });
  const s = summarize(grid);
  assert.ok(s['genuine-HKSJ'].meanCovSe >= 0.93 && s['genuine-HKSJ'].meanCovSe <= 0.98,
    `HKSJ meanCovSe ${s['genuine-HKSJ'].meanCovSe}`);
  assert.ok(s['genuine-HKSJ'].meanCovSp >= 0.93 && s['genuine-HKSJ'].meanCovSp <= 0.98,
    `HKSJ meanCovSp ${s['genuine-HKSJ'].meanCovSp}`);
});

test('improvement is monotone per-cell, not just on average (>= 9 of 12 Se cells)', () => {
  const grid = runGrid({ reps: 250 });
  let better = 0, total = 0;
  for (const c of grid) {
    if (c.results.shipped.covSe == null) continue;
    total++;
    if (c.results['genuine-HKSJ'].covSe >= c.results.shipped.covSe - 0.005) better++;
  }
  assert.ok(better >= 9, `HKSJ >= shipped Se coverage in ${better}/${total} cells`);
});
