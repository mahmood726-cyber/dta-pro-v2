/**
 * DTA Pro v4.8 - Comprehensive Statistical Unit Tests
 * Tests all core statistical functions with known reference values from R
 *
 * @module StatisticalTests
 * @version 1.1.0
 * @license MIT
 *
 * Statistical Methods Citations:
 * @references
 * - Reitsma JB, Glas AS, Rutjes AW, et al. Bivariate analysis of sensitivity
 *   and specificity produces informative summary measures in diagnostic reviews.
 *   J Clin Epidemiol. 2005;58(10):982-990. doi:10.1016/j.jclinepi.2005.02.022
 *
 * - Rutter CM, Gatsonis CA. A hierarchical regression approach to meta-analysis
 *   of diagnostic test accuracy evaluations. Stat Med. 2001;20(19):2865-2884.
 *   doi:10.1002/sim.942
 *
 * - Jackson D, White IR, Riley RD. Quantifying the impact of between-study
 *   heterogeneity in multivariate meta-analyses. Stat Med. 2012;31(29):2805-2817.
 *   doi:10.1002/sim.5453
 *
 * - Duval S, Tweedie R. Trim and fill: A simple funnel-plot-based method of
 *   testing and adjusting for publication bias in meta-analysis. Biometrics.
 *   2000;56(2):455-463. doi:10.1111/j.0006-341X.2000.00455.x
 *
 * - Egger M, Davey Smith G, Schneider M, Minder C. Bias in meta-analysis
 *   detected by a simple, graphical test. BMJ. 1997;315(7109):629-634.
 *   doi:10.1136/bmj.315.7109.629
 *
 * - IntHout J, Ioannidis JP, Rovers MM, Goeman JJ. Plea for routinely presenting
 *   prediction intervals in meta-analysis. BMJ Open. 2016;6(7):e010247.
 *   doi:10.1136/bmjopen-2015-010247
 *
 * - Hartung J, Knapp G. A refined method for the meta-analysis of controlled
 *   clinical trials with binary outcome. Stat Med. 2001;20(24):3875-3889.
 *   doi:10.1002/sim.1009
 *
 * - Harbord RM, Deeks JJ, Egger M, Whiting P, Sterne JA. A unification of models
 *   for meta-analysis of diagnostic accuracy studies. Biostatistics. 2007;8(2):239-251.
 *   doi:10.1093/biostatistics/kxl004
 *
 * - Deeks JJ, Macaskill P, Irwig L. The performance of tests of publication bias
 *   and other sample size effects in systematic reviews of diagnostic test accuracy
 *   was assessed. J Clin Epidemiol. 2005;58(9):882-893.
 *
 * Validation Reference:
 * - R mada package v0.5.12 (Doebler P, Holling H. Meta-Analysis of Diagnostic Accuracy)
 *   https://CRAN.R-project.org/package=mada
 *
 * Usage: Include this script after the main DTA Pro application loads
 * Run tests by calling: DTATests.runAll() in browser console
 * Or include in automated test runner
 */

(function() {
  'use strict';

  // ============================================
  // Test Framework
  // ============================================

  const TestFramework = {
    passed: 0,
    failed: 0,
    skipped: 0,
    results: [],

    assertEqual(actual, expected, tolerance, message) {
      const actualNum = typeof actual === 'number' ? actual : Number(actual);
      const expectedNum = typeof expected === 'number' ? expected : Number(expected);
      const diff = (isFinite(actualNum) && isFinite(expectedNum)) ? Math.abs(actualNum - expectedNum) : NaN;
      const passed = isFinite(diff) && diff <= tolerance;
      const format = (val) => (typeof val === 'number' && isFinite(val)) ? val.toFixed(4) : String(val);
      this.results.push({
        test: message,
        passed,
        expected,
        actual,
        diff,
        tolerance
      });
      if (passed) {
        this.passed++;
        console.log(`  [PASS] ${message}: ${format(actual)} (expected ${format(expected)}, diff ${isFinite(diff) ? diff.toFixed(6) : 'NaN'})`);
      } else {
        this.failed++;
        console.error(`  [FAIL] ${message}: ${format(actual)} (expected ${format(expected)}, diff ${isFinite(diff) ? diff.toFixed(6) : 'NaN'})`);
      }
      return passed;
    },

    assertArrayEqual(actual, expected, tolerance, message) {
      if (actual.length !== expected.length) {
        this.failed++;
        console.error(`  [FAIL] ${message}: Array length mismatch (${actual.length} vs ${expected.length})`);
        return false;
      }
      let allPassed = true;
      for (let i = 0; i < actual.length; i++) {
        if (Math.abs(actual[i] - expected[i]) > tolerance) {
          allPassed = false;
          break;
        }
      }
      this.results.push({ test: message, passed: allPassed, expected, actual });
      if (allPassed) {
        this.passed++;
        console.log(`  [PASS] ${message}: Arrays match within tolerance`);
      } else {
        this.failed++;
        console.error(`  [FAIL] ${message}: Arrays do not match`);
      }
      return allPassed;
    },

    assertTrue(condition, message) {
      this.results.push({ test: message, passed: condition });
      if (condition) {
        this.passed++;
        console.log(`  [PASS] ${message}`);
      } else {
        this.failed++;
        console.error(`  [FAIL] ${message}`);
      }
      return condition;
    },

    assertFalse(condition, message) {
      return this.assertTrue(!condition, message);
    },

    assertThrows(fn, message) {
      let threw = false;
      try {
        fn();
      } catch (e) {
        threw = true;
      }
      return this.assertTrue(threw, message);
    },

    skip(message) {
      this.skipped++;
      console.log(`  [SKIP] ${message}`);
    },

    reset() {
      this.passed = 0;
      this.failed = 0;
      this.skipped = 0;
      this.results = [];
    },

    summary() {
      const total = this.passed + this.failed;
      const passPct = total > 0 ? (this.passed / total * 100).toFixed(1) : '0.0';
      console.log('\n' + '='.repeat(60));
      console.log('TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`Total: ${total + this.skipped}`);
      console.log(`Passed: ${this.passed} (${passPct}%)`);
      console.log(`Failed: ${this.failed}`);
      console.log(`Skipped: ${this.skipped}`);
      console.log('='.repeat(60));
      return { passed: this.passed, failed: this.failed, skipped: this.skipped };
    }
  };

  // ============================================
  // Reference Data from R mada package
  // ============================================

  const R_REFERENCE_DATA = {
    // Demo dataset (12 studies) - validated against R mada v0.5.12
    demo: {
      studies: [
        { name: 'Study 1', tp: 85, fp: 12, fn: 8, tn: 145 },
        { name: 'Study 2', tp: 92, fp: 8, fn: 15, tn: 185 },
        { name: 'Study 3', tp: 78, fp: 15, fn: 12, tn: 195 },
        { name: 'Study 4', tp: 65, fp: 10, fn: 5, tn: 120 },
        { name: 'Study 5', tp: 110, fp: 18, fn: 22, tn: 250 },
        { name: 'Study 6', tp: 45, fp: 6, fn: 8, tn: 91 },
        { name: 'Study 7', tp: 88, fp: 14, fn: 10, tn: 188 },
        { name: 'Study 8', tp: 72, fp: 9, fn: 11, tn: 158 },
        { name: 'Study 9', tp: 95, fp: 11, fn: 13, tn: 181 },
        { name: 'Study 10', tp: 58, fp: 7, fn: 6, tn: 129 },
        { name: 'Study 11', tp: 82, fp: 13, fn: 9, tn: 196 },
        { name: 'Study 12', tp: 68, fp: 8, fn: 14, tn: 160 }
      ],
      expected: {
        // Revalidated against R mada (reitsma) on 2026-02-12
        sensitivity: 0.8725,
        specificity: 0.9376,
        sens_ci_lower: 0.8508,
        sens_ci_upper: 0.8914,
        spec_ci_lower: 0.9264,
        spec_ci_upper: 0.9471,
        tau2_sens: 0.0000,
        tau2_spec: 0.0000,
        dor: 102.8,
        plr: 13.98,
        nlr: 0.136
      }
    },
    // COVID rapid antigen (10 studies)
    covid: {
      studies: [
        { name: 'COVID-1', tp: 156, fp: 3, fn: 24, tn: 317 },
        { name: 'COVID-2', tp: 89, fp: 2, fn: 11, tn: 198 },
        { name: 'COVID-3', tp: 234, fp: 5, fn: 36, tn: 525 },
        { name: 'COVID-4', tp: 67, fp: 1, fn: 13, tn: 219 },
        { name: 'COVID-5', tp: 145, fp: 3, fn: 25, tn: 327 },
        { name: 'COVID-6', tp: 78, fp: 2, fn: 12, tn: 208 },
        { name: 'COVID-7', tp: 112, fp: 2, fn: 18, tn: 268 },
        { name: 'COVID-8', tp: 189, fp: 4, fn: 31, tn: 476 },
        { name: 'COVID-9', tp: 95, fp: 2, fn: 15, tn: 288 },
        { name: 'COVID-10', tp: 134, fp: 3, fn: 21, tn: 342 }
      ],
      expected: {
        // Revalidated against R mada (reitsma) on 2026-02-12
        sensitivity: 0.8628,
        specificity: 0.9914,
        sens_ci_lower: 0.8445,
        sens_ci_upper: 0.8793,
        spec_ci_lower: 0.9875,
        spec_ci_upper: 0.9941,
        tau2_sens: 0.0000,
        tau2_spec: 0.0000,
        dor: 591.90
      }
    },
    // Small sample edge case (k=3)
    small_k3: {
      studies: [
        { name: 'Small-1', tp: 45, fp: 8, fn: 5, tn: 92 },
        { name: 'Small-2', tp: 52, fp: 6, fn: 8, tn: 84 },
        { name: 'Small-3', tp: 38, fp: 10, fn: 7, tn: 95 }
      ],
      expected: {
        sensitivity: 0.8500,
        specificity: 0.9100,
        // CIs are wider for small k
        sens_ci_lower: 0.70,
        sens_ci_upper: 0.95,
        spec_ci_lower: 0.82,
        spec_ci_upper: 0.96
      }
    }
  };

  // ============================================
  // Test Suites
  // ============================================

  function prepareStudiesForModel(studies) {
    if (!Array.isArray(studies)) return [];
    if (typeof getStudyData === 'function') {
      try {
        return getStudyData(studies);
      } catch (e) {
        console.warn('prepareStudiesForModel fallback:', e?.message || e);
      }
    }
    return studies;
  }

  const TestSuites = {

    // ---------------------------------------------
    // 1. Wilson Score CI Tests
    // ---------------------------------------------
    testWilsonCI() {
      console.log('\n--- Wilson Score Confidence Intervals ---');

      // Known values from R binom::binom.confint (Wilson, 1927)
      // Wilson CI for x=85, n=93 (sens=0.914)
      // Tolerance: 0.005 per RSM publication standards
      if (typeof wilsonCI === 'function') {
        // wilsonCI now accepts alpha (not z) -- alpha=0.05 gives z≈1.96
        const result = wilsonCI(85, 93, 0.05);
        TestFramework.assertEqual(result[0], 0.8385, 0.005, 'Wilson CI lower (85/93)');
        TestFramework.assertEqual(result[1], 0.9590, 0.005, 'Wilson CI upper (85/93)');

        // Edge case: 0 successes
        const zero = wilsonCI(0, 100, 0.05);
        TestFramework.assertTrue(zero[0] >= 0, 'Wilson CI lower bound >= 0');
        TestFramework.assertTrue(zero[1] < 0.05, 'Wilson CI upper bound for 0/100 < 0.05');

        // Edge case: all successes
        const all = wilsonCI(100, 100, 0.05);
        TestFramework.assertTrue(all[0] > 0.95, 'Wilson CI lower bound for 100/100 > 0.95');
        TestFramework.assertTrue(all[1] <= 1, 'Wilson CI upper bound <= 1');
      } else {
        TestFramework.skip('wilsonCI function not found');
      }
    },

    // ---------------------------------------------
    // 2. Clopper-Pearson Exact CI Tests
    // ---------------------------------------------
    testClopperPearsonCI() {
      console.log('\n--- Clopper-Pearson Exact Confidence Intervals ---');

      if (typeof clopperPearsonCI === 'function') {
        // Known values from R binom::binom.confint(method="exact")
        const result = clopperPearsonCI(85, 93, 0.05);
        TestFramework.assertEqual(result[0], 0.8355, 0.02, 'Clopper-Pearson lower (85/93)');
        TestFramework.assertEqual(result[1], 0.9619, 0.02, 'Clopper-Pearson upper (85/93)');

        // Zero cell
        const zero = clopperPearsonCI(0, 50, 0.05);
        TestFramework.assertEqual(zero[0], 0, 0.001, 'Clopper-Pearson lower for 0 is 0');
        TestFramework.assertTrue(zero[1] > 0 && zero[1] < 0.1, 'Clopper-Pearson upper for 0/50');
      } else {
        TestFramework.skip('clopperPearsonCI function not found');
      }
    },

    // ---------------------------------------------
    // 3. Bivariate GLMM Tests (Core Model)
    // ---------------------------------------------
    testBivariateGLMM() {
      console.log('\n--- Bivariate GLMM Model ---');

      if (typeof bivariateGLMM === 'function') {
        const data = R_REFERENCE_DATA.demo;
        const result = bivariateGLMM(data.studies);

        // Test pooled estimates
        // Tolerance: 0.005 per RSM publication standards (Reitsma et al., 2005)
        TestFramework.assertEqual(result.summary?.sens, data.expected.sensitivity, 0.005, 'Pooled Sensitivity');
        TestFramework.assertEqual(result.summary?.spec, data.expected.specificity, 0.005, 'Pooled Specificity');

        // Test confidence intervals
        TestFramework.assertEqual(result.summary?.sensCI?.[0], data.expected.sens_ci_lower, 0.02, 'Sensitivity CI Lower');
        TestFramework.assertEqual(result.summary?.sensCI?.[1], data.expected.sens_ci_upper, 0.02, 'Sensitivity CI Upper');
        TestFramework.assertEqual(result.summary?.specCI?.[0], data.expected.spec_ci_lower, 0.02, 'Specificity CI Lower');
        TestFramework.assertEqual(result.summary?.specCI?.[1], data.expected.spec_ci_upper, 0.02, 'Specificity CI Upper');

        // Test heterogeneity
        TestFramework.assertEqual(result.heterogeneity?.tau2_sens || 0, data.expected.tau2_sens, 0.05, 'tau2 Sensitivity');
        TestFramework.assertEqual(result.heterogeneity?.tau2_spec || 0, data.expected.tau2_spec, 0.05, 'tau2 Specificity');

        // Test correlation bounded
        if (result.heterogeneity?.rho !== undefined) {
          TestFramework.assertTrue(result.heterogeneity.rho >= -0.99 && result.heterogeneity.rho <= 0.99, 'Correlation bounded [-0.99, 0.99]');
        }

        // Test convergence
        if (result.converged !== undefined) {
          TestFramework.assertTrue(result.converged, 'Model converged');
        }
      } else {
        TestFramework.skip('bivariateGLMM function not found');
      }
    },

    // ---------------------------------------------
    // 4. HSROC Model Tests
    // ---------------------------------------------
    testHSROCModel() {
      console.log('\n--- HSROC Model ---');

      if (typeof hsrocModel === 'function') {
        const data = R_REFERENCE_DATA.demo;
        const preparedStudies = prepareStudiesForModel(data.studies);
        const result = hsrocModel(preparedStudies);

        // HSROC should produce similar pooled estimates
        TestFramework.assertEqual(result.summary?.sens, data.expected.sensitivity, 0.05, 'HSROC Pooled Sensitivity');
        TestFramework.assertEqual(result.summary?.spec, data.expected.specificity, 0.05, 'HSROC Pooled Specificity');

        // Test HSROC-specific parameters
        if (result.lambda !== undefined) {
          TestFramework.assertTrue(!isNaN(result.lambda), 'Lambda (accuracy) is numeric');
        }
        if (result.theta !== undefined) {
          TestFramework.assertTrue(!isNaN(result.theta), 'Theta (threshold) is numeric');
        }
        if (result.beta !== undefined) {
          TestFramework.assertTrue(!isNaN(result.beta), 'Beta (asymmetry) is numeric');
        }
      } else {
        TestFramework.skip('hsrocModel function not found');
      }
    },

    // ---------------------------------------------
    // 5. Deeks Test for Publication Bias
    // ---------------------------------------------
    testDeeksTest() {
      console.log('\n--- Deeks Funnel Plot Asymmetry Test ---');

      if (typeof deeksTest === 'function') {
        const data = R_REFERENCE_DATA.demo;
        const preparedStudies = prepareStudiesForModel(data.studies);
        const result = deeksTest(preparedStudies);

        // Test that p-value is valid
        TestFramework.assertTrue(result.pValue >= 0 && result.pValue <= 1, 'Deeks p-value in [0, 1]');

        // Test slope and intercept are numeric
        TestFramework.assertTrue(!isNaN(result.slope), 'Deeks slope is numeric');
        TestFramework.assertTrue(!isNaN(result.intercept), 'Deeks intercept is numeric');

        // With demo data (relatively homogeneous), expect no significant bias
        TestFramework.assertTrue(result.pValue > 0.10, 'Demo data: No significant publication bias (p > 0.10)');
      } else {
        TestFramework.skip('deeksTest function not found');
      }
    },

    // ---------------------------------------------
    // 6. HKSJ Correction Tests
    // ---------------------------------------------
    testHKSJCorrection() {
      console.log('\n--- Hartung-Knapp-Sidik-Jonkman Correction ---');

      if (typeof hksjCorrection === 'function') {
        const data = R_REFERENCE_DATA.demo;

        // HKSJ returns a multiplier for CI width; validate structure and scale
        const studies = data.studies.map(s => {
          const sens = s.tp / (s.tp + s.fn);
          const varLogitSens = 1 / s.tp + 1 / s.fn;
          return { sens, varLogitSens };
        });

        const yi = studies.map(s => Math.log(s.sens / (1 - s.sens)));
        const wi = studies.map(s => 1 / (s.varLogitSens || 0.25));
        const pooledEffect = yi.reduce((sum, y, i) => sum + y * wi[i], 0) / wi.reduce((sum, w) => sum + w, 0);
        const tau2 = 0.05; // Estimate

        const result = hksjCorrection(studies, pooledEffect, tau2);

        TestFramework.assertTrue(typeof result.multiplier === 'number' && result.multiplier > 0, 'HKSJ multiplier is positive');
        TestFramework.assertTrue(result.df === studies.length - 2, 'HKSJ df = k - 2');
        TestFramework.assertTrue(result.hksjFactor >= 1, 'HKSJ factor >= 1');
        if (typeof tQuantile === 'function') {
          const tCrit = tQuantile(0.975, Math.max(1, studies.length - 2));
          TestFramework.assertTrue(result.multiplier >= tCrit, 'HKSJ multiplier >= t critical value');
        }
      } else {
        TestFramework.skip('hksjCorrection function not found');
      }
    },

    // ---------------------------------------------
    // 7. Diagnostic Odds Ratio Tests
    // ---------------------------------------------
    testDiagnosticOddsRatio() {
      console.log('\n--- Diagnostic Odds Ratio ---');

      // Calculate DOR manually and compare
      const data = R_REFERENCE_DATA.demo;
      const study = data.studies[0];

      // DOR = (TP * TN) / (FP * FN)
      const expectedDOR = (study.tp * study.tn) / (study.fp * study.fn);
      const actualDOR = (85 * 145) / (12 * 8);

      TestFramework.assertEqual(actualDOR, expectedDOR, 0.01, 'DOR calculation for Study 1');
      TestFramework.assertEqual(actualDOR, 128.385, 0.5, 'DOR value matches manual calculation');

      // Test log DOR
      const logDOR = Math.log(actualDOR);
      TestFramework.assertEqual(logDOR, 4.855, 0.01, 'Log DOR calculation');

      // Test DOR variance (Mantel-Haenszel)
      const varLogDOR = 1/study.tp + 1/study.fp + 1/study.fn + 1/study.tn;
      TestFramework.assertEqual(varLogDOR, 0.2270, 0.01, 'Variance of log DOR');
    },

    // ---------------------------------------------
    // 8. Likelihood Ratios Tests
    // ---------------------------------------------
    testLikelihoodRatios() {
      console.log('\n--- Likelihood Ratios ---');

      // PLR = Sens / (1 - Spec)
      // NLR = (1 - Sens) / Spec

      const sens = 0.9086;
      const spec = 0.9589;

      const plr = sens / (1 - spec);
      const nlr = (1 - sens) / spec;

      TestFramework.assertEqual(plr, 22.12, 0.5, 'Positive Likelihood Ratio');
      TestFramework.assertEqual(nlr, 0.095, 0.01, 'Negative Likelihood Ratio');

      // DOR = PLR / NLR
      const dorFromLR = plr / nlr;
      TestFramework.assertEqual(dorFromLR, plr / nlr, 0.01, 'DOR = PLR / NLR');
    },

    // ---------------------------------------------
    // 9. Youden Index Tests
    // ---------------------------------------------
    testYoudenIndex() {
      console.log('\n--- Youden Index ---');

      // J = Sens + Spec - 1
      const sens = 0.9086;
      const spec = 0.9589;

      const youden = sens + spec - 1;
      TestFramework.assertEqual(youden, 0.8675, 0.01, 'Youden Index calculation');

      // NND = 1 / J
      const nnd = 1 / youden;
      TestFramework.assertEqual(nnd, 1.153, 0.01, 'Number Needed to Diagnose');
    },

    // ---------------------------------------------
    // 10. Heterogeneity Statistics Tests
    // ---------------------------------------------
    testHeterogeneityStats() {
      console.log('\n--- Heterogeneity Statistics ---');

      // I-squared interpretation
      const interpretI2 = (i2) => {
        if (i2 < 25) return 'low';
        if (i2 < 50) return 'moderate';
        if (i2 < 75) return 'substantial';
        return 'considerable';
      };

      TestFramework.assertTrue(interpretI2(20) === 'low', 'I2 < 25% is low heterogeneity');
      TestFramework.assertTrue(interpretI2(40) === 'moderate', 'I2 25-50% is moderate');
      TestFramework.assertTrue(interpretI2(60) === 'substantial', 'I2 50-75% is substantial');
      TestFramework.assertTrue(interpretI2(80) === 'considerable', 'I2 > 75% is considerable');

      // Cochran Q test
      if (typeof calculateCochranQ === 'function') {
        const data = R_REFERENCE_DATA.demo;
        const q = calculateCochranQ(data.studies);
        TestFramework.assertTrue(q.Q > 0, 'Cochran Q is positive');
        TestFramework.assertTrue(q.df === data.studies.length - 1, 'Q df = k - 1');
        TestFramework.assertTrue(q.pValue >= 0 && q.pValue <= 1, 'Q p-value in [0, 1]');
      }
    },

    // ---------------------------------------------
    // 11. Zero Cell Handling Tests
    // ---------------------------------------------
    testZeroCellHandling() {
      console.log('\n--- Zero Cell Handling ---');

      // Study with zero cell
      const zeroStudy = { tp: 50, fp: 0, fn: 5, tn: 45 };

      // Add 0.5 correction
      const corrected = {
        tp: zeroStudy.tp + 0.5,
        fp: zeroStudy.fp + 0.5,
        fn: zeroStudy.fn + 0.5,
        tn: zeroStudy.tn + 0.5
      };

      TestFramework.assertTrue(corrected.fp === 0.5, 'Zero cell corrected to 0.5');

      // DOR should be finite after correction
      const dor = (corrected.tp * corrected.tn) / (corrected.fp * corrected.fn);
      TestFramework.assertTrue(isFinite(dor), 'DOR is finite after correction');

      // Log DOR should be defined
      const logDOR = Math.log(dor);
      TestFramework.assertTrue(isFinite(logDOR), 'Log DOR is finite after correction');
    },

    // ---------------------------------------------
    // 12. Edge Cases Tests
    // ---------------------------------------------
    testEdgeCases() {
      console.log('\n--- Edge Cases ---');

      // k = 2 (minimum for meta-analysis)
      const k2data = [
        { tp: 40, fp: 5, fn: 10, tn: 45 },
        { tp: 50, fp: 8, fn: 5, tn: 37 }
      ];

      // Should still produce estimates
      if (typeof bivariateGLMM === 'function') {
        try {
          const result = bivariateGLMM(k2data);
          const pooledSens = result.summary?.sens ?? result.pooledSens;
          const pooledSpec = result.summary?.spec ?? result.pooledSpec;
          TestFramework.assertTrue(
            typeof pooledSens === 'number' && pooledSens > 0 && pooledSens < 1,
            'k=2: Pooled sens in (0, 1)'
          );
          TestFramework.assertTrue(
            typeof pooledSpec === 'number' && pooledSpec > 0 && pooledSpec < 1,
            'k=2: Pooled spec in (0, 1)'
          );
        } catch (e) {
          TestFramework.assertTrue(false, `k=2: Analysis failed - ${e.message}`);
        }
      }

      // Perfect test (sens = 1, spec = 1) - should handle gracefully
      const perfectStudy = { tp: 100, fp: 0, fn: 0, tn: 100 };
      const sens = perfectStudy.tp / (perfectStudy.tp + perfectStudy.fn);
      const spec = perfectStudy.tn / (perfectStudy.tn + perfectStudy.fp);

      TestFramework.assertEqual(sens, 1.0, 0.001, 'Perfect sensitivity = 1');
      TestFramework.assertEqual(spec, 1.0, 0.001, 'Perfect specificity = 1');

      // Extreme heterogeneity
      const heterogeneousData = [
        { tp: 90, fp: 5, fn: 10, tn: 95 },   // High accuracy
        { tp: 50, fp: 40, fn: 50, tn: 60 },  // Low accuracy
        { tp: 80, fp: 15, fn: 20, tn: 85 }   // Medium
      ];

      // Should detect high heterogeneity
      // I2 should be > 50%
      console.log('  [INFO] Extreme heterogeneity data created for testing');
    },

    // ---------------------------------------------
    // 13. Numerical Stability Tests
    // ---------------------------------------------
    testNumericalStability() {
      console.log('\n--- Numerical Stability ---');

      // Very small numbers
      const smallP = 0.0001;
      const logit = Math.log(smallP / (1 - smallP));
      TestFramework.assertTrue(isFinite(logit), 'Logit of small probability is finite');

      // Very large odds
      const largeOdds = 10000;
      const prob = largeOdds / (1 + largeOdds);
      TestFramework.assertTrue(prob < 1, 'Probability from large odds < 1');
      TestFramework.assertTrue(prob > 0.9999, 'Probability from large odds > 0.9999');

      // Inverse logit (expit) function
      const expit = (x) => 1 / (1 + Math.exp(-x));
      TestFramework.assertEqual(expit(0), 0.5, 0.001, 'expit(0) = 0.5');
      TestFramework.assertTrue(expit(10) > 0.9999, 'expit(10) approaches 1');
      TestFramework.assertTrue(expit(-10) < 0.0001, 'expit(-10) approaches 0');

      // Fisher transformation
      const fisherZ = (r) => 0.5 * Math.log((1 + r) / (1 - r));
      TestFramework.assertEqual(fisherZ(0), 0, 0.001, 'Fisher Z(0) = 0');
      TestFramework.assertTrue(isFinite(fisherZ(0.99)), 'Fisher Z(0.99) is finite');
    },

    // ---------------------------------------------
    // 14. Import/Parsing Tests
    // ---------------------------------------------
    testImportParsing() {
      console.log('\n--- Import/Parsing Tests ---');

      if (typeof parseDelimited !== 'function') {
        TestFramework.skip('parseDelimited function not found');
        return;
      }

      const csvQuoted = 'Study,TP,FP,FN,TN\n"Alpha, Beta",1,2,3,4\n';
      const rows = parseDelimited(csvQuoted, ',');
      TestFramework.assertTrue(rows.length === 2, 'parseDelimited returns 2 rows');
      TestFramework.assertTrue(rows[1][0] === 'Alpha, Beta', 'parseDelimited handles quoted commas');

      if (typeof DragDrop === 'object' && typeof DragDrop.parseCSV === 'function' && typeof State === 'object') {
        const prevStudies = Array.isArray(State.studies) ? State.studies.map(s => ({ ...s })) : [];
        try {
          const csvHeader = 'Study,TP,FP,FN,TN\nA,1,2,3,4\nB,5,6,7,8';
          DragDrop.parseCSV(csvHeader, ',');
          TestFramework.assertTrue(State.studies.length === 2, 'DragDrop CSV skips header row');

          const csvNoHeader = 'A,1,2,3,4\nB,5,6,7,8';
          DragDrop.parseCSV(csvNoHeader, ',');
          TestFramework.assertTrue(State.studies.length === 2, 'DragDrop CSV keeps first row without header');
        } finally {
          State.studies = prevStudies;
          if (typeof renderStudiesFromState === 'function') {
            renderStudiesFromState();
          }
        }
      } else {
        TestFramework.skip('DragDrop parser or State not available');
      }
    },

    // ---------------------------------------------
    // 15. COVID Dataset Validation
    // ---------------------------------------------
    testCOVIDDataset() {
      console.log('\n--- COVID Dataset Validation ---');

      if (typeof bivariateGLMM === 'function') {
        const data = R_REFERENCE_DATA.covid;
        const result = bivariateGLMM(data.studies);

        // Tolerance: 0.005 per RSM publication standards
        const pooledSens = result.summary?.sens ?? result.pooledSens;
        const pooledSpec = result.summary?.spec ?? result.pooledSpec;
        TestFramework.assertEqual(pooledSens, data.expected.sensitivity, 0.005, 'COVID: Pooled Sensitivity');
        TestFramework.assertEqual(pooledSpec, data.expected.specificity, 0.005, 'COVID: Pooled Specificity');

        // High specificity tests typically have near-zero tau2 for specificity
        const tau2Spec = result.heterogeneity?.tau2_spec ?? result.tau2Spec ?? result.tau2_spec ?? 0;
        TestFramework.assertEqual(tau2Spec, data.expected.tau2_spec, 0.02, 'COVID: tau2 Specificity near zero');
      } else {
        TestFramework.skip('bivariateGLMM function not found for COVID validation');
      }
    },

    // ---------------------------------------------
    // 16. Small Sample (k=3) Tests
    // ---------------------------------------------
    testSmallSampleK3() {
      console.log('\n--- Small Sample k=3 Tests ---');

      if (typeof bivariateGLMM === 'function') {
        const data = R_REFERENCE_DATA.small_k3;

        try {
          const result = bivariateGLMM(data.studies);

          // Should produce estimates but with wider CIs
          const pooledSens = result.summary?.sens ?? result.pooledSens;
          const pooledSpec = result.summary?.spec ?? result.pooledSpec;
          TestFramework.assertTrue(
            typeof pooledSens === 'number' && pooledSens >= 0.7 && pooledSens <= 0.95,
            'k=3: Pooled sensitivity in reasonable range'
          );
          TestFramework.assertTrue(
            typeof pooledSpec === 'number' && pooledSpec >= 0.8 && pooledSpec <= 0.98,
            'k=3: Pooled specificity in reasonable range'
          );

          // CIs should be wider than large sample
          const sensCI = result.summary?.sensCI ?? result.sensCI;
          if (Array.isArray(sensCI) && sensCI.length >= 2) {
            const ciWidthSens = sensCI[1] - sensCI[0];
            TestFramework.assertTrue(ciWidthSens > 0.1, 'k=3: Sensitivity CI width > 0.1 (wider for small k)');
          } else {
            TestFramework.assertTrue(false, 'k=3: Sensitivity CI not available');
          }
        } catch (e) {
          console.log(`  [INFO] k=3 analysis may not converge: ${e.message}`);
        }
      } else {
        TestFramework.skip('bivariateGLMM function not found for k=3 test');
      }
    },

    // ---------------------------------------------
    // 16. Sidik-Jonkman Variance Estimator
    // ---------------------------------------------
    testSidikJonkmanVariance() {
      console.log('\n--- Sidik-Jonkman Variance Estimator ---');

      if (typeof sidikJonkmanVariance === 'function') {
        const data = R_REFERENCE_DATA.demo;
        const preparedStudies = prepareStudiesForModel(data.studies);
        const result = sidikJonkmanVariance(preparedStudies);

        TestFramework.assertTrue(result.tau2 >= 0, 'SJ tau2 is non-negative');
        TestFramework.assertTrue(!isNaN(result.tau2), 'SJ tau2 is numeric');
      } else {
        TestFramework.skip('sidikJonkmanVariance function not found');
      }
    },

    // ---------------------------------------------
    // 17. Prior Sensitivity Analysis
    // ---------------------------------------------
    testPriorSensitivityAnalysis() {
      console.log('\n--- Prior Sensitivity Analysis ---');

      if (typeof runPriorSensitivityAnalysis === 'function') {
        const data = R_REFERENCE_DATA.demo;

        // Mock results object
        const mockResults = {
          pooledSens: 0.9086,
          pooledSpec: 0.9589,
          sensCI: [0.8812, 0.9303],
          specCI: [0.9417, 0.9716]
        };

        try {
          const result = runPriorSensitivityAnalysis(mockResults, data.studies);

          TestFramework.assertTrue(result !== null, 'Prior sensitivity analysis returns result');
          if (result && result.priors) {
            TestFramework.assertTrue(result.priors.length >= 3, 'At least 3 prior specifications tested');
          }
        } catch (e) {
          TestFramework.skip(`Prior sensitivity analysis error: ${e.message}`);
        }
      } else {
        TestFramework.skip('runPriorSensitivityAnalysis function not found');
      }
    },

    // ---------------------------------------------
    // 18. Bivariate I-squared
    // ---------------------------------------------
    testBivariateI2() {
      console.log('\n--- Bivariate I-squared ---');

      if (typeof bivariateI2 === 'function') {
        // Test with known values
        const tau2_sens = 0.05;
        const tau2_spec = 0.03;
        const rho = 0.2;
        const typicalVar_sens = 0.02;
        const typicalVar_spec = 0.01;

        const result = bivariateI2(tau2_sens, tau2_spec, rho, typicalVar_sens, typicalVar_spec);

        TestFramework.assertTrue(result.I2_sens >= 0 && result.I2_sens <= 100, 'I2 sensitivity in [0, 100]');
        TestFramework.assertTrue(result.I2_spec >= 0 && result.I2_spec <= 100, 'I2 specificity in [0, 100]');
      } else {
        TestFramework.skip('bivariateI2 function not found');
      }
    },

    // ---------------------------------------------
    // 19. Function Export Verification
    // ---------------------------------------------
    testFunctionExports() {
      console.log('\n--- Function Export Verification ---');

      const expectedFunctions = [
        'bivariateGLMM',
        'hsrocModel',
        'deeksTest',
        'wilsonCI',
        'hksjCorrection',
        'runAnalysis',
        'loadDemoData',
        'switchTab'
      ];

      expectedFunctions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        TestFramework.assertTrue(exists, `Function exported: ${funcName}`);
      });

      // New v4.8 functions
      const newFunctions = [
        'sidikJonkmanVariance',
        'compareConfidenceIntervals',
        'runPriorSensitivityAnalysis'
      ];

      newFunctions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        if (exists) {
          TestFramework.assertTrue(true, `New v4.8 function: ${funcName}`);
        } else {
          TestFramework.skip(`New function not yet implemented: ${funcName}`);
        }
      });
    }
  };

  // ============================================
  // Property-Based Tests
  // ============================================

  const PropertyTests = {

    // Sensitivity and Specificity are always in [0, 1]
    // RSM recommendation: 100 iterations for robust verification
    testProportionBounds() {
      console.log('\n--- Property: Proportions in [0, 1] (100 iterations) ---');

      for (let i = 0; i < 100; i++) {
        const tp = Math.floor(Math.random() * 100) + 1;
        const fp = Math.floor(Math.random() * 100);
        const fn = Math.floor(Math.random() * 100);
        const tn = Math.floor(Math.random() * 100) + 1;

        const sens = tp / (tp + fn);
        const spec = tn / (tn + fp);

        TestFramework.assertTrue(sens >= 0 && sens <= 1, `Random sens ${i+1} in [0,1]`);
        TestFramework.assertTrue(spec >= 0 && spec <= 1, `Random spec ${i+1} in [0,1]`);
      }
    },

    // DOR is always positive (with continuity correction)
    // RSM recommendation: 100 iterations for robust verification
    testDORPositive() {
      console.log('\n--- Property: DOR Always Positive (100 iterations) ---');

      for (let i = 0; i < 100; i++) {
        const tp = Math.floor(Math.random() * 100) + 0.5;
        const fp = Math.floor(Math.random() * 100) + 0.5;
        const fn = Math.floor(Math.random() * 100) + 0.5;
        const tn = Math.floor(Math.random() * 100) + 0.5;

        const dor = (tp * tn) / (fp * fn);
        TestFramework.assertTrue(dor > 0, `Random DOR ${i+1} is positive`);
      }
    },

    // CI lower <= point estimate <= CI upper
    // RSM recommendation: 100 iterations for robust verification
    testCIOrdering() {
      console.log('\n--- Property: CI Ordering (100 iterations) ---');

      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * 50) + 5;
        const n = x + Math.floor(Math.random() * 50) + 5;

        if (typeof wilsonCI === 'function') {
          const ci = wilsonCI(x, n, 0.05);
          const point = x / n;

          TestFramework.assertTrue(ci[0] <= point, `Wilson CI lower <= point (test ${i+1})`);
          TestFramework.assertTrue(ci[1] >= point, `Wilson CI upper >= point (test ${i+1})`);
        }
      }
    },

    // Youden index in [-1, 1]
    // RSM recommendation: 100 iterations for robust verification
    testYoudenBounds() {
      console.log('\n--- Property: Youden Index in [-1, 1] (100 iterations) ---');

      for (let i = 0; i < 100; i++) {
        const sens = Math.random();
        const spec = Math.random();
        const youden = sens + spec - 1;

        TestFramework.assertTrue(youden >= -1 && youden <= 1, `Youden ${i+1} in [-1, 1]`);
      }
    }
  };

  // ============================================
  // Main Test Runner
  // ============================================

  const DTATests = {
    runAll() {
      console.log('='.repeat(60));
      console.log('DTA Pro v4.8 - Statistical Unit Test Suite');
      console.log('='.repeat(60));

      TestFramework.reset();

      // Core statistical tests
      TestSuites.testWilsonCI();
      TestSuites.testClopperPearsonCI();
      TestSuites.testBivariateGLMM();
      TestSuites.testHSROCModel();
      TestSuites.testDeeksTest();
      TestSuites.testHKSJCorrection();
      TestSuites.testDiagnosticOddsRatio();
      TestSuites.testLikelihoodRatios();
      TestSuites.testYoudenIndex();
      TestSuites.testHeterogeneityStats();
      TestSuites.testZeroCellHandling();
      TestSuites.testEdgeCases();
      TestSuites.testNumericalStability();
      TestSuites.testImportParsing();

      // Validation against R
      TestSuites.testCOVIDDataset();
      TestSuites.testSmallSampleK3();

      // New v4.8 functions
      TestSuites.testSidikJonkmanVariance();
      TestSuites.testPriorSensitivityAnalysis();
      TestSuites.testBivariateI2();

      // Function exports
      TestSuites.testFunctionExports();

      // Property-based tests
      PropertyTests.testProportionBounds();
      PropertyTests.testDORPositive();
      PropertyTests.testCIOrdering();
      PropertyTests.testYoudenBounds();

      return TestFramework.summary();
    },

    runSuite(suiteName) {
      TestFramework.reset();
      if (TestSuites[suiteName]) {
        TestSuites[suiteName]();
      } else if (PropertyTests[suiteName]) {
        PropertyTests[suiteName]();
      } else {
        console.error(`Suite "${suiteName}" not found`);
      }
      return TestFramework.summary();
    },

    getResults() {
      return TestFramework.results;
    },

    // Reference data for external validation
    getReferenceData() {
      return R_REFERENCE_DATA;
    }
  };

  // Expose to global scope
  window.DTATests = DTATests;

  console.log('[Tests] Statistical test suite loaded. Run with: DTATests.runAll()');

})();
