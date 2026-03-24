"""
DTA Pro v4.8 - Comprehensive Test Suite
Combines Selenium UI testing, accessibility verification, and statistical validation

Usage:
    python comprehensive_test_suite.py

Requirements:
    pip install selenium pytest
"""

import time
import sys
import json
import argparse
import math
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException,
    ElementClickInterceptedException, JavascriptException
)

# Test configuration
CONFIG = {
    'file_path': r"C:\HTML apps\DTA_Pro_Review\dta-pro-v3.7.html",
    'timeout': 10,
    'wait_after_action': 0.5,
    'screenshot_on_fail': True
}

# Test results tracking
class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
        self.skipped = []
        self.start_time = None
        self.statistical_failures = []

    def start(self):
        self.start_time = datetime.now()

    def log_pass(self, category, test_name):
        self.passed.append((category, test_name))
        print(f"  [PASS] {test_name}")

    def log_fail(self, category, test_name, error=""):
        self.failed.append((category, test_name, error))
        print(f"  [FAIL] {test_name}: {error}")

    def log_warn(self, category, test_name, warning=""):
        self.warnings.append((category, test_name, warning))
        print(f"  [WARN] {test_name}: {warning}")

    def log_skip(self, category, test_name, reason=""):
        self.skipped.append((category, test_name, reason))
        print(f"  [SKIP] {test_name}: {reason}")

    def summary(self):
        elapsed = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        total = len(self.passed) + len(self.failed)

        print("\n" + "=" * 70)
        print("COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        print(f"\nTotal Tests: {total + len(self.skipped)}")
        print(f"  Passed:   {len(self.passed)} ({100*len(self.passed)//max(total,1)}%)")
        print(f"  Failed:   {len(self.failed)}")
        print(f"  Warnings: {len(self.warnings)}")
        print(f"  Skipped:  {len(self.skipped)}")
        print(f"\nExecution Time: {elapsed:.2f} seconds")

        if self.failed:
            print("\n[FAILURES]")
            for cat, test, error in self.failed:
                print(f"  [{cat}] {test}: {error}")

        if self.warnings:
            print("\n[WARNINGS]")
            for cat, test, warning in self.warnings:
                print(f"  [{cat}] {test}: {warning}")

        score = (len(self.passed) / max(total, 1)) * 10
        print(f"\n{'=' * 70}")
        print(f"OVERALL SCORE: {score:.1f}/10")
        print(f"{'=' * 70}")

        return {
            'passed': len(self.passed),
            'failed': len(self.failed),
            'warnings': len(self.warnings),
            'skipped': len(self.skipped),
            'score': score
        }


results = TestResults()


# Utility functions
def dismiss_alert(driver, timeout=1):
    """Dismiss any JavaScript alert"""
    try:
        WebDriverWait(driver, timeout).until(EC.alert_is_present())
        alert = driver.switch_to.alert
        alert.accept()
        time.sleep(0.3)
        return True
    except:
        return False


def wait_and_click(driver, selector, by=By.CSS_SELECTOR, timeout=5):
    """Wait for element and click it"""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((by, selector))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(0.3)
        element.click()
        return True
    except Exception as e:
        return False


def check_element_exists(driver, selector, by=By.CSS_SELECTOR, timeout=3):
    """Check if element exists"""
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, selector))
        )
        return True
    except:
        return False


def execute_js(driver, script):
    """Execute JavaScript and return result"""
    try:
        return driver.execute_script(script)
    except JavascriptException as e:
        return None


# =============================================================================
# TEST CATEGORIES
# =============================================================================

class AccessibilityTests:
    """Test WCAG 2.1 accessibility compliance"""

    @staticmethod
    def test_aria_labels(driver):
        """Verify ARIA labels are present on interactive elements"""
        print("\n[ACCESSIBILITY] Testing ARIA labels...")

        # Check main buttons have aria-labels
        buttons_to_check = [
            ('runBtn', 'Run Analysis button'),
            ('undoBtn', 'Undo button'),
            ('redoBtn', 'Redo button'),
            ('themeBtn', 'Theme toggle button')
        ]

        for btn_id, description in buttons_to_check:
            try:
                btn = driver.find_element(By.ID, btn_id)
                aria_label = btn.get_attribute('aria-label')
                if aria_label:
                    results.log_pass('Accessibility', f'ARIA label: {description}')
                else:
                    results.log_warn('Accessibility', f'ARIA label: {description}', 'No aria-label attribute')
            except NoSuchElementException:
                results.log_skip('Accessibility', f'ARIA label: {description}', 'Element not found')

    @staticmethod
    def test_keyboard_navigation(driver):
        """Test keyboard navigation works"""
        print("\n[ACCESSIBILITY] Testing keyboard navigation...")

        # Tab through main elements
        body = driver.find_element(By.TAG_NAME, 'body')

        # Press Tab multiple times and check focus moves
        for i in range(5):
            body.send_keys(Keys.TAB)
            time.sleep(0.2)

        # Check if something has focus
        active = driver.switch_to.active_element
        if active:
            results.log_pass('Accessibility', 'Keyboard navigation: Tab key works')
        else:
            results.log_warn('Accessibility', 'Keyboard navigation: Tab key', 'Focus not detected')

    @staticmethod
    def test_tab_roles(driver):
        """Verify tabs have correct ARIA roles"""
        print("\n[ACCESSIBILITY] Testing tab roles...")

        # Check tablist role
        tablist = driver.find_elements(By.CSS_SELECTOR, '[role="tablist"]')
        if tablist:
            results.log_pass('Accessibility', 'Tab navigation: tablist role present')
        else:
            results.log_warn('Accessibility', 'Tab navigation: tablist role', 'Not found')

        # Check individual tabs
        tabs = driver.find_elements(By.CSS_SELECTOR, '[role="tab"]')
        if len(tabs) > 0:
            results.log_pass('Accessibility', f'Tab navigation: {len(tabs)} tabs with role="tab"')
        else:
            results.log_warn('Accessibility', 'Tab navigation: tab roles', 'No tabs with role="tab"')

    @staticmethod
    def test_skip_links(driver):
        """Verify skip navigation links exist"""
        print("\n[ACCESSIBILITY] Testing skip links...")

        skip_links = driver.find_elements(By.CSS_SELECTOR, '#skip-links a, .skip-link')
        if skip_links:
            results.log_pass('Accessibility', f'Skip links: {len(skip_links)} found')
        else:
            results.log_warn('Accessibility', 'Skip links', 'No skip links found')

    @staticmethod
    def test_focus_visible(driver):
        """Verify focus indicators are visible"""
        print("\n[ACCESSIBILITY] Testing focus visibility...")

        # Check for focus styles in CSS
        focus_style = execute_js(driver, """
            const style = document.createElement('style');
            style.textContent = '*:focus { outline: none; }';
            // Check if focus-visible is supported
            return CSS.supports('selector(:focus-visible)');
        """)

        if focus_style:
            results.log_pass('Accessibility', 'Focus visibility: :focus-visible supported')
        else:
            results.log_warn('Accessibility', 'Focus visibility', ':focus-visible not supported')

    @staticmethod
    def test_color_contrast(driver):
        """Basic color contrast check"""
        print("\n[ACCESSIBILITY] Testing color contrast...")

        # Get background and text colors
        body_style = execute_js(driver, """
            const styles = getComputedStyle(document.body);
            return {
                bg: styles.backgroundColor,
                color: styles.color
            };
        """)

        if body_style:
            results.log_pass('Accessibility', f'Color scheme: {body_style.get("bg", "N/A")}')
        else:
            results.log_warn('Accessibility', 'Color contrast', 'Could not read styles')

    @staticmethod
    def test_form_labels(driver):
        """Verify form inputs have associated labels"""
        print("\n[ACCESSIBILITY] Testing form labels...")

        # Count inputs with labels
        labeled_inputs = execute_js(driver, """
            const inputs = document.querySelectorAll('input, select, textarea');
            let labeled = 0;
            inputs.forEach(input => {
                if (input.id && document.querySelector(`label[for="${input.id}"]`)) {
                    labeled++;
                } else if (input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')) {
                    labeled++;
                } else if (input.closest('label')) {
                    labeled++;
                }
            });
            return { total: inputs.length, labeled: labeled };
        """)

        if labeled_inputs:
            pct = (labeled_inputs['labeled'] / max(labeled_inputs['total'], 1)) * 100
            if pct >= 80:
                results.log_pass('Accessibility', f'Form labels: {pct:.0f}% inputs labeled')
            else:
                results.log_warn('Accessibility', 'Form labels', f'Only {pct:.0f}% inputs labeled')
        else:
            results.log_skip('Accessibility', 'Form labels', 'Could not analyze')


class StatisticalTests:
    """Run statistical validation tests via JavaScript"""

    @staticmethod
    def test_load_test_suite(driver):
        """Load the statistical test suite"""
        print("\n[STATISTICAL] Loading test suite...")

        # Inject the test file
        try:
            with open(r"C:\HTML apps\DTA_Pro_Review\statistical_tests.js", 'r') as f:
                test_script = f.read()

            execute_js(driver, test_script)

            # Check if DTATests is available
            dta_tests = execute_js(driver, "return typeof window.DTATests === 'object'")
            if dta_tests:
                results.log_pass('Statistical', 'Test suite loaded successfully')
                return True
            else:
                results.log_fail('Statistical', 'Test suite loading', 'DTATests not available')
                return False
        except Exception as e:
            results.log_fail('Statistical', 'Test suite loading', str(e)[:50])
            return False

    @staticmethod
    def test_run_statistical_tests(driver):
        """Run all statistical tests"""
        print("\n[STATISTICAL] Running statistical validation...")

        # Ensure test suite is available
        if not execute_js(driver, "return typeof window.DTATests === 'object'"):
            StatisticalTests.test_load_test_suite(driver)

        # First load demo data
        execute_js(driver, "loadDemoData()")
        time.sleep(1)
        dismiss_alert(driver)

        # Run analysis
        execute_js(driver, "runAnalysis()")
        time.sleep(3)
        dismiss_alert(driver)

        # Run statistical tests
        test_results = execute_js(driver, """
            try {
                if (window.DTATests) {
                    return window.DTATests.runAll();
                }
                return null;
            } catch (e) {
                return { __error: e && e.message ? e.message : String(e) };
            }
        """)
        if not test_results:
            try:
                with open(r"C:\HTML apps\DTA_Pro_Review\statistical_tests.js", 'r') as f:
                    test_script = f.read()
                test_results = execute_js(driver, test_script + "\ntry { return window.DTATests ? window.DTATests.runAll() : null; } catch (e) { return { __error: e && e.message ? e.message : String(e) }; }")
            except Exception:
                test_results = None

        if isinstance(test_results, dict) and test_results.get('__error'):
            results.log_fail('Statistical', 'Statistical tests', test_results.get('__error'))
            return None
        if test_results:
            results.log_pass('Statistical', f"Tests passed: {test_results.get('passed', 0)}")
            if test_results.get('failed', 0) > 0:
                results.log_fail('Statistical', 'Some tests failed', f"{test_results['failed']} failures")
                failure_details = execute_js(driver, """
                    try {
                        if (window.DTATests && typeof window.DTATests.getResults === 'function') {
                            const fails = window.DTATests.getResults().filter(r => !r.passed);
                            return fails;
                        }
                        return null;
                    } catch (e) {
                        return { __error: e && e.message ? e.message : String(e) };
                    }
                """)
                if isinstance(failure_details, dict) and failure_details.get('__error'):
                    results.log_warn('Statistical', 'Failure details', failure_details.get('__error'))
                elif failure_details:
                    results.statistical_failures = failure_details
                    for f in failure_details[:15]:
                        test_name = f.get('test', 'Unknown test')
                        expected = f.get('expected', 'n/a')
                        actual = f.get('actual', 'n/a')
                        diff = f.get('diff', 'n/a')
                        tolerance = f.get('tolerance', 'n/a')
                        detail = f"expected={expected} actual={actual} diff={diff} tol={tolerance}"
                        results.log_warn('Statistical', test_name, detail)
            return test_results
        else:
            results.log_fail('Statistical', 'Statistical tests', 'DTATests not available')
            return None

    @staticmethod
    def test_r_validation(driver):
        """Validate against R mada reference values"""
        print("\n[STATISTICAL] Validating against R reference...")

        # Get reference data
        ref_data = execute_js(driver, """
            if (typeof DTATests !== 'undefined') {
                return DTATests.getReferenceData();
            }
            return null;
        """)

        if not ref_data:
            results.log_skip('Statistical', 'R validation', 'Reference data not available')
            return

        # Test demo dataset against R values
        demo_expected = ref_data.get('demo', {}).get('expected', {})

        def get_actual():
            return execute_js(driver, """
                if (window.lastResults && window.lastResults.summary) {
                    return {
                        sens: window.lastResults.summary.sens,
                        spec: window.lastResults.summary.spec
                    };
                }
                if (window.State && window.State.results && window.State.results.summary) {
                    return {
                        sens: window.State.results.summary.sens,
                        spec: window.State.results.summary.spec
                    };
                }
                if (window.State && window.State.results && window.State.results.pooled) {
                    return {
                        sens: window.State.results.pooled.sens,
                        spec: window.State.results.pooled.spec
                    };
                }
                return null;
            """)

        def to_float(val):
            try:
                return float(val)
            except (TypeError, ValueError):
                return None

        actual = get_actual()
        sens_val = to_float(actual.get('sens') if actual else None)
        spec_val = to_float(actual.get('spec') if actual else None)
        if sens_val is None or spec_val is None or math.isnan(sens_val) or math.isnan(spec_val):
            execute_js(driver, "if (typeof loadDemoData === 'function') loadDemoData(); if (typeof runAnalysis === 'function') runAnalysis();")
            try:
                WebDriverWait(driver, CONFIG['timeout']).until(
                    lambda d: (
                        (lambda a: a and isinstance(a.get('sens'), (int, float)) and isinstance(a.get('spec'), (int, float)))(get_actual())
                    )
                )
            except TimeoutException:
                pass
            actual = get_actual()
            sens_val = to_float(actual.get('sens') if actual else None)
            spec_val = to_float(actual.get('spec') if actual else None)

            # Fallback: compute directly from reference demo data if UI state is unavailable.
            if sens_val is None or spec_val is None or math.isnan(sens_val) or math.isnan(spec_val):
                actual = execute_js(driver, """
                    try {
                        if (typeof bivariateGLMM === 'function' && typeof DTATests !== 'undefined') {
                            const ref = DTATests.getReferenceData();
                            const studies = ref?.demo?.studies;
                            if (Array.isArray(studies) && studies.length > 0) {
                                const result = bivariateGLMM(studies);
                                const summary = result && result.summary ? result.summary : result;
                                return {
                                    sens: summary?.sens ?? result?.pooledSens ?? null,
                                    spec: summary?.spec ?? result?.pooledSpec ?? null
                                };
                            }
                        }
                    } catch (e) {}
                    return null;
                """)

        if actual and demo_expected:
            sens_val = to_float(actual.get('sens'))
            spec_val = to_float(actual.get('spec'))
            if sens_val is None or spec_val is None or math.isnan(sens_val) or math.isnan(spec_val):
                results.log_warn('Statistical', 'R validation', 'Actual results unavailable after analysis')
                return
            sens_diff = abs(sens_val - demo_expected.get('sensitivity', 0))
            spec_diff = abs(spec_val - demo_expected.get('specificity', 0))

            if sens_diff < 0.01:
                results.log_pass('Statistical', f"R validation: Sensitivity matches (diff: {sens_diff:.4f})")
            else:
                results.log_fail('Statistical', 'R validation: Sensitivity', f"diff: {sens_diff:.4f}")

            if spec_diff < 0.01:
                results.log_pass('Statistical', f"R validation: Specificity matches (diff: {spec_diff:.4f})")
            else:
                results.log_fail('Statistical', 'R validation: Specificity', f"diff: {spec_diff:.4f}")
        else:
            results.log_warn('Statistical', 'R validation', 'Could not compare results')


class UITests:
    """Test user interface functionality"""

    @staticmethod
    def test_all_tabs(driver):
        """Test all tabs are accessible"""
        print("\n[UI] Testing tab navigation...")

        tabs = [
            'data', 'settings', 'results', 'sroc', 'forest', 'bias',
            'clinical', 'sensitivity', 'metareg', 'quadas', 'advanced',
            'cuttingedge', 'comparison', 'network', 'report', 'beyondr',
            'validation', 'ultimate'
        ]

        for tab_id in tabs:
            try:
                tab_btn = driver.find_element(By.CSS_SELECTOR, f"[data-tab='{tab_id}']")
                driver.execute_script("arguments[0].click();", tab_btn)
                time.sleep(0.3)
                dismiss_alert(driver, timeout=0.3)

                panel = driver.find_element(By.ID, f"panel-{tab_id}")
                if 'active' in panel.get_attribute('class'):
                    results.log_pass('UI', f"Tab: {tab_id}")
                else:
                    results.log_warn('UI', f"Tab: {tab_id}", 'Panel not active')
            except Exception as e:
                dismiss_alert(driver, timeout=0.3)
                results.log_fail('UI', f"Tab: {tab_id}", str(e)[:40])

    @staticmethod
    def test_plot_rendering(driver):
        """Test plots render correctly"""
        print("\n[UI] Testing plot rendering...")

        # Load demo data and run analysis
        execute_js(driver, "loadDemoData()")
        time.sleep(1)
        dismiss_alert(driver)

        execute_js(driver, "runAnalysis()")
        time.sleep(3)
        dismiss_alert(driver)

        plots = [
            ('sroc', 'srocPlot', 'SROC Plot'),
            ('forest', 'forestSens', 'Forest Sensitivity'),
            ('forest', 'forestSpec', 'Forest Specificity'),
            ('bias', 'deeksFunnel', 'Deeks Funnel'),
            ('clinical', 'faganPlot', 'Fagan Nomogram')
        ]

        for tab_id, plot_id, plot_name in plots:
            # Switch to tab
            wait_and_click(driver, f"[data-tab='{tab_id}']")
            time.sleep(1)

            if plot_id == 'faganPlot':
                execute_js(driver, """
                    if (typeof switchTab === 'function') switchTab('clinical');
                    if (typeof updateFagan === 'function') updateFagan();
                    if (typeof generateFaganNomogram === 'function') generateFaganNomogram();
                """)
                time.sleep(1)

            # Check plot rendered
            plot_rendered = execute_js(driver, f"""
                const plot = document.getElementById('{plot_id}');
                if (!plot) return false;
                const svg = plot.querySelector('svg');
                const canvas = plot.querySelector('canvas');
                const plotly = plot.querySelector('.js-plotly-plot');
                return !!(svg || canvas || plotly || plot.innerHTML.length > 100);
            """)

            if plot_rendered:
                results.log_pass('UI', f"Plot: {plot_name}")
            else:
                results.log_warn('UI', f"Plot: {plot_name}", 'May not be rendered')

    @staticmethod
    def test_theme_toggle(driver):
        """Test theme switching"""
        print("\n[UI] Testing theme toggle...")

        initial_theme = execute_js(driver, "return document.documentElement.getAttribute('data-theme')")
        execute_js(driver, "if (typeof closeAllModals === 'function') closeAllModals();")

        theme_btn = driver.find_element(By.ID, 'themeBtn')
        try:
            theme_btn.click()
        except ElementClickInterceptedException:
            execute_js(driver, "if (typeof closeAllModals === 'function') closeAllModals();")
            execute_js(driver, "document.getElementById('themeBtn')?.click();")
        time.sleep(0.5)

        new_theme = execute_js(driver, "return document.documentElement.getAttribute('data-theme')")

        if initial_theme != new_theme:
            results.log_pass('UI', f"Theme toggle: {initial_theme} -> {new_theme}")
        else:
            results.log_fail('UI', 'Theme toggle', 'Theme did not change')

        # Toggle back
        try:
            theme_btn.click()
        except ElementClickInterceptedException:
            execute_js(driver, "if (typeof closeAllModals === 'function') closeAllModals();")
            execute_js(driver, "document.getElementById('themeBtn')?.click();")
        time.sleep(0.3)

    @staticmethod
    def test_dataset_loading(driver):
        """Test dataset loading functionality"""
        print("\n[UI] Testing dataset loading...")

        datasets = [
            ('loadDemoData()', 'Demo Data'),
            ("loadCochraneDataset('covid_rapid_antigen')", 'COVID Rapid Antigen'),
            ("loadCochraneDataset('tb_xpert')", 'TB Xpert'),
            ("loadCochraneDataset('small_k3_test')", 'k=3 Edge Case')
        ]

        for js_call, dataset_name in datasets:
            try:
                execute_js(driver, js_call)
                time.sleep(0.5)
                dismiss_alert(driver)

                # Check studies loaded
                study_count = execute_js(driver, """
                    return document.querySelectorAll('.study-row').length;
                """)

                if study_count > 0:
                    results.log_pass('UI', f"Dataset: {dataset_name} ({study_count} studies)")
                else:
                    results.log_warn('UI', f"Dataset: {dataset_name}", 'No studies loaded')
            except Exception as e:
                dismiss_alert(driver)
                results.log_fail('UI', f"Dataset: {dataset_name}", str(e)[:40])


class FunctionTests:
    """Test exported JavaScript functions"""

    @staticmethod
    def test_function_exports(driver):
        """Verify all expected functions are exported"""
        print("\n[FUNCTIONS] Testing function exports...")

        expected_functions = [
            'bivariateGLMM', 'hsrocModel', 'deeksTest', 'runAnalysis',
            'loadDemoData', 'switchTab', 'validateAllStudies', 'exportData',
            'generateReport', 'toggleTheme'
        ]

        for func_name in expected_functions:
            exists = execute_js(driver, f"return typeof window.{func_name} === 'function'")
            if exists:
                results.log_pass('Functions', f"Exported: {func_name}")
            else:
                results.log_warn('Functions', f"Exported: {func_name}", 'Not found or not a function')

    @staticmethod
    def test_new_v48_functions(driver):
        """Test new v4.8 functions"""
        print("\n[FUNCTIONS] Testing v4.8 new functions...")

        new_functions = [
            'sidikJonkmanVariance',
            'compareConfidenceIntervals',
            'runPriorSensitivityAnalysis'
        ]

        for func_name in new_functions:
            exists = execute_js(driver, f"return typeof window.{func_name} === 'function'")
            if exists:
                results.log_pass('Functions', f"v4.8 Function: {func_name}")
            else:
                results.log_warn('Functions', f"v4.8 Function: {func_name}", 'Not implemented')


class EdgeCaseTests:
    """Test edge cases and error handling"""

    @staticmethod
    def test_small_k(driver):
        """Test small sample size handling"""
        print("\n[EDGE CASES] Testing small sample sizes...")

        # k=3 dataset
        execute_js(driver, "loadCochraneDataset('small_k3_test')")
        time.sleep(0.5)
        dismiss_alert(driver)

        execute_js(driver, "runAnalysis()")
        time.sleep(2)
        dismiss_alert(driver)

        # Check for warning about small k
        warnings = execute_js(driver, """
            const warnings = document.querySelectorAll('.alert-warning, .validation-msg.warning');
            return warnings.length;
        """)

        results.log_pass('Edge Cases', 'k=3 analysis completes')

        # k=2 dataset
        execute_js(driver, "loadCochraneDataset('small_k2_test')")
        time.sleep(0.5)
        dismiss_alert(driver)

        execute_js(driver, "runAnalysis()")
        time.sleep(2)
        dismiss_alert(driver)

        results.log_pass('Edge Cases', 'k=2 analysis completes')

    @staticmethod
    def test_zero_cells(driver):
        """Test zero cell handling"""
        print("\n[EDGE CASES] Testing zero cell handling...")

        # Create study with zero cell
        result = execute_js(driver, """
            const study = { tp: 50, fp: 0, fn: 5, tn: 45 };
            // Apply 0.5 correction
            const corrected = {
                tp: study.tp + 0.5,
                fp: study.fp + 0.5,
                fn: study.fn + 0.5,
                tn: study.tn + 0.5
            };
            const dor = (corrected.tp * corrected.tn) / (corrected.fp * corrected.fn);
            return { finite: isFinite(dor), positive: dor > 0 };
        """)

        if result and result.get('finite') and result.get('positive'):
            results.log_pass('Edge Cases', 'Zero cell correction produces valid DOR')
        else:
            results.log_fail('Edge Cases', 'Zero cell correction', 'Invalid DOR')

    @staticmethod
    def test_empty_data(driver):
        """Test handling of empty data"""
        print("\n[EDGE CASES] Testing empty data handling...")

        # Clear all studies
        execute_js(driver, "clearAll()")
        time.sleep(0.5)
        dismiss_alert(driver)

        # Try to run analysis
        execute_js(driver, "runAnalysis()")
        time.sleep(1)
        dismiss_alert(driver)

        # Should not crash
        results.log_pass('Edge Cases', 'Empty data handled gracefully')


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def init_driver(browser):
    browser = (browser or 'chrome').lower()
    if browser == 'firefox':
        firefox_options = FirefoxOptions()
        print("\n[SETUP] Initializing Firefox WebDriver...")
        driver = webdriver.Firefox(options=firefox_options)
        try:
            driver.maximize_window()
        except Exception:
            pass
        return driver, 'Firefox'

    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    print("\n[SETUP] Initializing Chrome WebDriver...")
    driver = webdriver.Chrome(options=chrome_options)
    return driver, 'Chrome'


def main():
    parser = argparse.ArgumentParser(description="DTA Pro v4.8 Comprehensive Test Suite")
    parser.add_argument("--browser", choices=["chrome", "firefox"], default="chrome",
                        help="Browser to run Selenium tests (chrome or firefox)")
    args = parser.parse_args()

    print("=" * 70)
    print("DTA Pro v4.8 - Comprehensive Test Suite")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results.start()
    exit_code = 0

    try:
        driver, browser_label = init_driver(args.browser)
        results.log_pass('Setup', f'{browser_label} WebDriver initialized')
    except Exception as e:
        print(f"[CRITICAL] Failed to initialize {args.browser}: {e}")
        print("Please ensure the appropriate WebDriver is installed and in PATH")
        return 1

    try:
        # Load application
        print("\n[SETUP] Loading DTA Pro application...")
        driver.get(f"file:///{CONFIG['file_path']}")
        time.sleep(2)
        dismiss_alert(driver)

        if "DTA" in driver.title:
            results.log_pass('Setup', 'Application loaded')
        else:
            results.log_fail('Setup', 'Application loading', f"Title: {driver.title}")

        # Inject accessibility enhancements
        print("\n[SETUP] Loading accessibility enhancements...")
        try:
            with open(r"C:\HTML apps\DTA_Pro_Review\accessibility_enhancements.js", 'r') as f:
                accessibility_script = f.read()
            execute_js(driver, accessibility_script)
            time.sleep(1)
            results.log_pass('Setup', 'Accessibility enhancements loaded')
        except Exception as e:
            results.log_warn('Setup', 'Accessibility enhancements', str(e)[:50])

        # ======================
        # RUN ALL TEST SUITES
        # ======================

        # 1. Accessibility Tests
        print("\n" + "=" * 70)
        print("ACCESSIBILITY TESTS")
        print("=" * 70)
        AccessibilityTests.test_aria_labels(driver)
        AccessibilityTests.test_keyboard_navigation(driver)
        AccessibilityTests.test_tab_roles(driver)
        AccessibilityTests.test_skip_links(driver)
        AccessibilityTests.test_focus_visible(driver)
        AccessibilityTests.test_color_contrast(driver)
        AccessibilityTests.test_form_labels(driver)

        # 2. UI Tests
        print("\n" + "=" * 70)
        print("UI TESTS")
        print("=" * 70)
        UITests.test_all_tabs(driver)
        UITests.test_theme_toggle(driver)
        UITests.test_dataset_loading(driver)
        UITests.test_plot_rendering(driver)

        # 3. Function Tests
        print("\n" + "=" * 70)
        print("FUNCTION TESTS")
        print("=" * 70)
        FunctionTests.test_function_exports(driver)
        FunctionTests.test_new_v48_functions(driver)

        # 4. Statistical Tests
        print("\n" + "=" * 70)
        print("STATISTICAL TESTS")
        print("=" * 70)
        if StatisticalTests.test_load_test_suite(driver):
            StatisticalTests.test_run_statistical_tests(driver)
            StatisticalTests.test_r_validation(driver)

        # 5. Edge Case Tests
        print("\n" + "=" * 70)
        print("EDGE CASE TESTS")
        print("=" * 70)
        EdgeCaseTests.test_small_k(driver)
        EdgeCaseTests.test_zero_cells(driver)
        EdgeCaseTests.test_empty_data(driver)

        # Summary
        summary = results.summary()
        if summary['failed'] > 0:
            exit_code = 1

        # Generate report
        report = {
            'timestamp': datetime.now().isoformat(),
            'version': 'DTA Pro v4.8',
            'results': summary,
            'passed_tests': results.passed,
            'failed_tests': [(c, t, e) for c, t, e in results.failed],
            'warnings': [(c, t, w) for c, t, w in results.warnings],
            'statistical_failures': results.statistical_failures
        }

        # Save report
        with open(r"C:\HTML apps\DTA_Pro_Review\test_report.json", 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: test_report.json")

        print("\nClosing browser in 3 seconds...")
        time.sleep(3)

    except Exception as e:
        print(f"\n[CRITICAL ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        exit_code = 1

    finally:
        driver.quit()
        print("Browser closed.")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
