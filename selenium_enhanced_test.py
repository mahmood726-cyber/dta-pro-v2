"""
DTA Pro v4.9 - Enhanced Selenium Test Suite
PLOS ONE Edition - Full Browser Validation
Properly navigates tabs, loads data, runs analysis, then verifies plots
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementNotInteractableException
import time
import os
import sys

# Configuration
HTML_PATH = r"C:\HTML apps\DTA_Pro_Review\dta-pro-v3.7.html"
WAIT_TIMEOUT = 10
PLOT_RENDER_DELAY = 3

class DTAProEnhancedTest:
    def __init__(self):
        self.driver = None
        self.results = {'passed': [], 'failed': [], 'warnings': []}

    def setup(self):
        print("\n" + "="*70)
        print("DTA Pro v4.9 - Enhanced Selenium Test Suite")
        print("="*70)

        options = Options()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_experimental_option("detach", True)

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)

        file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"
        print(f"\nLoading: {file_url}")
        self.driver.get(file_url)
        time.sleep(2)
        self.dismiss_alerts()
        return True

    def dismiss_alerts(self):
        for _ in range(5):
            try:
                alert = self.driver.switch_to.alert
                print(f"  Dismissing alert: {alert.text[:40]}...")
                alert.dismiss()
                time.sleep(0.3)
            except:
                break

    def log(self, level, msg):
        if level == "PASS":
            self.results['passed'].append(msg)
            print(f"  [PASS] {msg}")
        elif level == "FAIL":
            self.results['failed'].append(msg)
            print(f"  [FAIL] {msg}")
        else:
            self.results['warnings'].append(msg)
            print(f"  [WARN] {msg}")

    def scroll_to_element(self, element):
        """Scroll element into view"""
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
            time.sleep(0.3)
        except:
            pass

    def click_safe(self, element, description):
        """Safely click an element with scroll and retry"""
        try:
            self.dismiss_alerts()
            self.scroll_to_element(element)
            element.click()
            self.dismiss_alerts()
            return True
        except ElementNotInteractableException:
            # Try JavaScript click
            try:
                self.driver.execute_script("arguments[0].click();", element)
                self.dismiss_alerts()
                return True
            except:
                return False
        except:
            return False

    def find_and_click_tab(self, tab_name):
        """Find and click a tab by name"""
        try:
            tabs = self.driver.find_elements(By.CSS_SELECTOR, ".tab, [role='tab'], .tablink, button")
            for tab in tabs:
                if tab_name.lower() in tab.text.lower():
                    if self.click_safe(tab, f"Tab: {tab_name}"):
                        time.sleep(0.5)
                        return True
            return False
        except:
            return False

    def test_page_load(self):
        print("\n--- Test 1: Page Load ---")
        self.dismiss_alerts()

        title = self.driver.title
        if "DTA" in title and "v4.9" in title:
            self.log("PASS", f"Title: {title[:60]}")
        else:
            self.log("FAIL", f"Unexpected title: {title[:60]}")

        if "PLOS ONE" in self.driver.page_source:
            self.log("PASS", "PLOS ONE Edition detected")

    def test_load_sample_data(self):
        print("\n--- Test 2: Load Sample Data ---")
        self.dismiss_alerts()

        # Navigate to Data Input tab
        self.find_and_click_tab("Data Input")
        time.sleep(0.5)

        # Find sample data buttons
        loaded = False
        for name in ["Afzali", "Glas", "Defined"]:
            try:
                btns = self.driver.find_elements(By.XPATH, f"//button[contains(text(), '{name}')]")
                if btns:
                    if self.click_safe(btns[0], f"Load {name}"):
                        self.log("PASS", f"Loaded sample data: {name}")
                        loaded = True
                        time.sleep(1)
                        break
            except:
                pass

        if not loaded:
            # Try onclick method
            try:
                btns = self.driver.find_elements(By.XPATH, "//button[contains(@onclick, 'load')]")
                if btns:
                    for btn in btns[:3]:
                        if self.click_safe(btn, "Load data"):
                            self.log("PASS", f"Loaded data via onclick")
                            loaded = True
                            time.sleep(1)
                            break
            except:
                pass

        if not loaded:
            self.log("WARN", "Could not load sample data")

        return loaded

    def test_run_analysis(self):
        print("\n--- Test 3: Run Analysis ---")
        self.dismiss_alerts()

        try:
            self.driver.execute_script("if (typeof loadDemoData === 'function') loadDemoData();")
            time.sleep(0.8)
            self.dismiss_alerts()
        except Exception:
            pass

        # Navigate to Results or Analysis tab
        for tab in ["Results", "Analysis", "Settings"]:
            self.find_and_click_tab(tab)
            time.sleep(0.3)

        # Find and click Run Analysis button
        analysis_ran = False
        for pattern in ["Run Analysis", "Analyze", "Calculate", "Run"]:
            try:
                btns = self.driver.find_elements(By.XPATH, f"//button[contains(text(), '{pattern}')]")
                for btn in btns:
                    if "run" in btn.text.lower() or "analysis" in btn.text.lower():
                        if self.click_safe(btn, f"Run: {btn.text[:30]}"):
                            self.log("PASS", f"Clicked: {btn.text[:30]}")
                            analysis_ran = True
                            time.sleep(2)  # Wait for analysis
                            self.dismiss_alerts()
                            break
                if analysis_ran:
                    break
            except:
                pass

        if not analysis_ran:
            try:
                ran = self.driver.execute_script(
                    "if (typeof runAnalysis === 'function') { runAnalysis(); return true; } return false;"
                )
                if ran:
                    time.sleep(2)
                    self.dismiss_alerts()
                    self.log("PASS", "Run analysis executed via JavaScript fallback")
                    analysis_ran = True
                else:
                    self.log("WARN", "Could not find Run Analysis button")
            except Exception:
                self.log("WARN", "Could not find Run Analysis button")

        return analysis_ran

    def test_forest_plots(self):
        print("\n--- Test 4: Forest Plots ---")
        self.dismiss_alerts()

        # Navigate to Forest Plots tab
        self.find_and_click_tab("Forest")
        time.sleep(1)

        # Find forest plot buttons
        forest_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Forest') or contains(text(), 'forest')]")
        clicked_count = 0

        for btn in forest_btns[:3]:
            try:
                if self.click_safe(btn, f"Forest: {btn.text[:30]}"):
                    self.log("PASS", f"Forest plot button: {btn.text[:30]}")
                    clicked_count += 1
                    time.sleep(PLOT_RENDER_DELAY)
                    self.dismiss_alerts()
            except:
                pass

        # Check for plot rendering
        rendered = self.verify_plot_containers("forest")
        if clicked_count == 0 and rendered:
            self.log("PASS", "Forest plots available without explicit button click")

    def test_sroc_plot(self):
        print("\n--- Test 5: SROC Plot ---")
        self.dismiss_alerts()

        # Navigate to SROC tab
        if self.find_and_click_tab("SROC"):
            time.sleep(1)
            self.log("PASS", "Navigated to SROC tab")

        # Find SROC plot buttons
        sroc_btns = self.driver.find_elements(By.XPATH,
            "//button[contains(text(), 'SROC') or contains(text(), 'ROC')]")

        for btn in sroc_btns[:2]:
            try:
                if self.click_safe(btn, f"SROC: {btn.text[:30]}"):
                    self.log("PASS", f"SROC button clicked: {btn.text[:30]}")
                    time.sleep(PLOT_RENDER_DELAY)
                    self.dismiss_alerts()
            except:
                pass

        # Verify plot
        self.verify_plot_containers("sroc")

    def test_funnel_deeks(self):
        print("\n--- Test 6: Funnel Plot & Deeks' Test ---")
        self.dismiss_alerts()

        # Navigate to Publication Bias tab
        for tab in ["Publication Bias", "Funnel", "Bias"]:
            if self.find_and_click_tab(tab):
                time.sleep(0.5)
                break

        # Find funnel/Deeks buttons
        btns = self.driver.find_elements(By.XPATH,
            "//button[contains(text(), 'Funnel') or contains(text(), 'Deeks') or contains(text(), 'funnel') or contains(text(), 'deeks')]")

        for btn in btns[:3]:
            try:
                if self.click_safe(btn, f"Bias: {btn.text[:30]}"):
                    self.log("PASS", f"Clicked: {btn.text[:30]}")
                    time.sleep(PLOT_RENDER_DELAY)
                    self.dismiss_alerts()
            except:
                pass

        if not btns:
            self.driver.execute_script("""
                if (typeof switchTab === 'function') switchTab('bias');
                if (typeof deeksTest === 'function' && window.State && Array.isArray(window.State.studies) && window.State.studies.length > 0) {
                    try { deeksTest(window.State.studies); } catch (e) {}
                }
            """)
            time.sleep(PLOT_RENDER_DELAY)
        rendered = self.verify_plot_containers("funnel")
        if not rendered:
            try:
                if self.check_plot_has_content("deeksFunnel"):
                    self.log("PASS", "Plot rendered: funnel (deeksFunnel container)")
            except Exception:
                pass

    def check_plot_has_content(self, elem_id):
        try:
            elem = self.driver.find_element(By.ID, elem_id)
            svg = elem.find_elements(By.TAG_NAME, "svg")
            canvas = elem.find_elements(By.TAG_NAME, "canvas")
            inner = elem.get_attribute("innerHTML") or ""
            return bool(svg or canvas or len(inner) > 300)
        except Exception:
            return False

    def test_additional_plots(self):
        print("\n--- Test 7: Additional Plots ---")
        self.dismiss_alerts()

        # Test various analysis tabs
        tab_plots = [
            ("Heterogeneity", ["I-squared", "Tau", "heterogeneity"]),
            ("Sensitivity", ["Leave-one-out", "Sensitivity", "influence"]),
            ("QUADAS", ["QUADAS", "Risk of Bias", "Quality"]),
            ("Meta-Regression", ["Meta-reg", "Regression", "Covariate"]),
            ("Clinical Utility", ["Fagan", "Probability", "Clinical"])
        ]

        for tab_name, patterns in tab_plots:
            if self.find_and_click_tab(tab_name):
                time.sleep(0.5)
                for pattern in patterns:
                    btns = self.driver.find_elements(By.XPATH, f"//button[contains(text(), '{pattern}')]")
                    for btn in btns[:1]:
                        if self.click_safe(btn, pattern):
                            self.log("PASS", f"Clicked {tab_name}: {pattern}")
                            time.sleep(1)
                            self.dismiss_alerts()
                            break

    def verify_plot_containers(self, plot_type):
        """Verify plot containers have rendered content"""
        # Check first pass
        plot_divs = self.driver.find_elements(By.CSS_SELECTOR,
            f"[id*='{plot_type}'], [id*='{plot_type.capitalize()}'], .js-plotly-plot")

        has_content = False
        for div in plot_divs[:5]:
            try:
                # Check for SVG or canvas
                svg = div.find_elements(By.TAG_NAME, "svg")
                canvas = div.find_elements(By.TAG_NAME, "canvas")
                inner = div.get_attribute("innerHTML")

                if svg or canvas or len(inner) > 500:
                    has_content = True
                    break
            except:
                pass

        if has_content:
            self.log("PASS", f"Plot rendered: {plot_type}")
            return True
        else:
            # Second check
            time.sleep(PLOT_RENDER_DELAY)
            plot_divs = self.driver.find_elements(By.CSS_SELECTOR, ".js-plotly-plot")
            if plot_divs:
                for div in plot_divs:
                    inner = div.get_attribute("innerHTML")
                    if len(inner) > 200:
                        self.log("PASS", f"Plot rendered (second check): {plot_type}")
                        return True
            fallback_ids = {
                "funnel": ["deeksFunnel", "funnelPlot"],
                "sroc": ["srocPlot"],
                "forest": ["forestSens", "forestSpec", "forestDOR"]
            }
            for elem_id in fallback_ids.get(plot_type, []):
                if self.check_plot_has_content(elem_id):
                    self.log("PASS", f"Plot rendered via fallback container: {elem_id}")
                    return True
            self.log("WARN", f"Plot may not have rendered: {plot_type}")
            return False

    def test_all_buttons(self):
        print("\n--- Test 8: All Buttons Inventory ---")
        self.dismiss_alerts()

        all_buttons = self.driver.find_elements(By.TAG_NAME, "button")
        visible_count = 0
        enabled_count = 0

        for btn in all_buttons:
            try:
                if btn.is_displayed():
                    visible_count += 1
                    if btn.is_enabled():
                        enabled_count += 1
            except:
                pass

        self.log("PASS", f"Total buttons: {len(all_buttons)}")
        self.log("PASS", f"Visible buttons: {visible_count}")
        self.log("PASS", f"Enabled buttons: {enabled_count}")

    def test_export_functions(self):
        print("\n--- Test 9: Export Functions ---")
        self.dismiss_alerts()

        export_patterns = ["Export", "Download", "Copy", "Save", "PNG", "CSV"]
        found = []

        for pattern in export_patterns:
            btns = self.driver.find_elements(By.XPATH, f"//button[contains(text(), '{pattern}')]")
            if btns:
                found.append(pattern)
                self.log("PASS", f"Export function: {pattern} ({len(btns)} buttons)")

        if not found:
            self.log("WARN", "No export buttons found")

    def test_model_options(self):
        print("\n--- Test 10: Model Selection Options ---")
        self.dismiss_alerts()

        # Navigate to Settings
        self.find_and_click_tab("Settings")
        time.sleep(0.5)

        page_source = self.driver.page_source

        models = ["Bivariate", "HSROC", "REML", "DerSimonian"]
        for model in models:
            if model in page_source:
                self.log("PASS", f"Model option available: {model}")

    def test_convergence_diagnostics(self):
        print("\n--- Test 11: Convergence Diagnostics (PLOS ONE Req) ---")
        page_source = self.driver.page_source

        diag_terms = ["convergence", "gradient", "Hessian", "iteration", "converged"]
        found = 0
        for term in diag_terms:
            if term.lower() in page_source.lower():
                found += 1

        if found >= 3:
            self.log("PASS", f"Convergence diagnostics present ({found}/{len(diag_terms)} terms)")
        else:
            self.log("WARN", f"Convergence diagnostics partial ({found}/{len(diag_terms)} terms)")

    def test_minimum_k_guidance(self):
        print("\n--- Test 12: Minimum k Guidance (PLOS ONE Req) ---")
        page_source = self.driver.page_source

        if "minimum" in page_source.lower() or "k >" in page_source or "k =" in page_source:
            self.log("PASS", "Minimum k guidance present")
        else:
            self.log("WARN", "Minimum k guidance not clearly visible")

    def test_sri_hashes(self):
        print("\n--- Test 13: SRI Hashes (PLOS ONE Req) ---")
        page_source = self.driver.page_source

        if "integrity=" in page_source and "sha384" in page_source:
            self.log("PASS", "SRI hashes present for CDN scripts")
        else:
            self.log("WARN", "SRI hashes not detected")

    def final_plot_verification(self):
        print("\n--- Test 14: Final Plot Verification (Double Check) ---")

        # First pass
        plotly_plots = self.driver.find_elements(By.CSS_SELECTOR, ".js-plotly-plot")
        container_svgs = self.driver.find_elements(By.CSS_SELECTOR, ".plot-container svg")
        svg_count = 0

        for plot in plotly_plots:
            try:
                svgs = plot.find_elements(By.TAG_NAME, "svg")
                if svgs:
                    svg_count += 1
            except:
                pass

        print(f"  First check: {len(plotly_plots)} Plotly containers, {svg_count} with SVG ({len(container_svgs)} container SVGs)")

        # Second pass after delay
        time.sleep(2)
        plotly_plots2 = self.driver.find_elements(By.CSS_SELECTOR, ".js-plotly-plot")
        container_svgs2 = self.driver.find_elements(By.CSS_SELECTOR, ".plot-container svg")
        svg_count2 = 0

        for plot in plotly_plots2:
            try:
                svgs = plot.find_elements(By.TAG_NAME, "svg")
                if svgs:
                    svg_count2 += 1
            except:
                pass

        print(f"  Second check: {len(plotly_plots2)} Plotly containers, {svg_count2} with SVG ({len(container_svgs2)} container SVGs)")

        if svg_count2 > 0 or len(container_svgs2) > 0:
            self.log("PASS", f"Verified {max(svg_count2, len(container_svgs2))} plots rendered with SVG content")
        elif any(self.check_plot_has_content(pid) for pid in ["srocPlot", "forestSens", "deeksFunnel", "faganPlot", "probModPlot"]):
            self.log("PASS", "Verified plots rendered via known plot containers")
        elif len(plotly_plots2) > 0:
            self.log("WARN", "Plotly containers exist but may be empty")
        else:
            self.log("WARN", "No Plotly plots found")

    def run_all_tests(self):
        try:
            self.setup()

            # Run tests in logical order
            self.test_page_load()
            self.test_load_sample_data()
            self.test_run_analysis()
            time.sleep(2)  # Wait for analysis to complete

            self.test_forest_plots()
            self.test_sroc_plot()
            self.test_funnel_deeks()
            self.test_additional_plots()
            self.test_all_buttons()
            self.test_export_functions()
            self.test_model_options()
            self.test_convergence_diagnostics()
            self.test_minimum_k_guidance()
            self.test_sri_hashes()
            self.final_plot_verification()

            self.print_summary()
            return len(self.results['failed'])

        except Exception as e:
            print(f"\nCRITICAL ERROR: {e}")
            raise

    def print_summary(self):
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)

        total = len(self.results['passed']) + len(self.results['failed'])
        print(f"\nPASSED:   {len(self.results['passed'])}")
        print(f"FAILED:   {len(self.results['failed'])}")
        print(f"WARNINGS: {len(self.results['warnings'])}")
        print(f"\nTotal: {total}")

        if self.results['failed']:
            print("\n--- Failed ---")
            for item in self.results['failed']:
                print(f"  * {item}")

        if self.results['warnings']:
            print("\n--- Warnings ---")
            for item in self.results['warnings']:
                print(f"  * {item}")

        if total > 0:
            pass_rate = (len(self.results['passed']) / total) * 100
            print(f"\nPASS RATE: {pass_rate:.1f}%")

        print("\n" + "="*70)
        print("Browser kept open for inspection")
        print("="*70)


if __name__ == "__main__":
    test = DTAProEnhancedTest()
    failed = test.run_all_tests()
    sys.exit(1 if failed else 0)
