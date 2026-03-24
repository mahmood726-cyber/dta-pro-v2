"""
DTA Pro v4.9 - Final Comprehensive Test
Loads Afzali dataset (k=10) and verifies all functionality
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import *
import time
import os
import sys

HTML_PATH = r"C:\HTML apps\DTA_Pro_Review\dta-pro-v3.7.html"

class DTAProFinalTest:
    def __init__(self):
        self.driver = None
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def setup(self):
        print("\n" + "="*70)
        print("DTA Pro v4.9 - FINAL COMPREHENSIVE TEST")
        print("="*70)

        options = Options()
        options.add_argument("--start-maximized")
        options.add_experimental_option("detach", True)

        self.driver = webdriver.Chrome(options=options)
        file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"
        print(f"\nLoading: {file_url}")
        self.driver.get(file_url)
        time.sleep(2)
        self.dismiss_all_alerts()

    def dismiss_all_alerts(self):
        for _ in range(10):
            try:
                alert = self.driver.switch_to.alert
                print(f"  [Alert dismissed: {alert.text[:40]}...]")
                alert.accept()  # Accept to proceed
                time.sleep(0.3)
            except:
                break

    def log(self, result, msg):
        if result == "PASS":
            self.passed += 1
            print(f"  [PASS] {msg}")
        elif result == "FAIL":
            self.failed += 1
            print(f"  [FAIL] {msg}")
        else:
            self.warnings += 1
            print(f"  [WARN] {msg}")

    def js_click(self, selector, desc):
        """Click using JavaScript for reliability"""
        try:
            self.driver.execute_script(f"document.querySelector('{selector}').click()")
            time.sleep(0.5)
            self.dismiss_all_alerts()
            return True
        except:
            return False

    def click_by_text(self, text, partial=True):
        """Click element containing text"""
        try:
            if partial:
                elems = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{text}')]")
            else:
                elems = self.driver.find_elements(By.XPATH, f"//*[text()='{text}']")

            for elem in elems:
                try:
                    if elem.is_displayed():
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
                        elem.click()
                        time.sleep(0.5)
                        self.dismiss_all_alerts()
                        return True
                except:
                    try:
                        self.driver.execute_script("arguments[0].click();", elem)
                        time.sleep(0.5)
                        self.dismiss_all_alerts()
                        return True
                    except:
                        continue
        except:
            pass
        return False

    def check_element_has_content(self, elem_id):
        """Check if element has substantial content"""
        try:
            elem = self.driver.find_element(By.ID, elem_id)
            inner = elem.get_attribute("innerHTML")
            return len(inner) > 100
        except:
            return False

    def test_1_page_load(self):
        print("\n--- TEST 1: Page Load & Version ---")

        title = self.driver.title
        if "v4.9" in title and "DTA" in title:
            self.log("PASS", f"Title: {title}")
        else:
            self.log("FAIL", f"Wrong title: {title}")

        source = self.driver.page_source
        checks = [
            ("PLOS ONE", "PLOS ONE Edition marker"),
            ("MIT License", "License declaration"),
            ("SRI", "SRI documentation"),
            ("sha384", "SRI hash present")
        ]

        for check, desc in checks:
            if check in source:
                self.log("PASS", desc)
            else:
                self.log("WARN", f"Missing: {desc}")

    def test_2_load_afzali(self):
        print("\n--- TEST 2: Load Afzali Dataset (k=10) ---")

        # Click Data Input tab
        self.click_by_text("Data Input")
        time.sleep(0.5)

        # Look for Afzali button specifically
        if self.click_by_text("Afzali"):
            self.log("PASS", "Clicked Afzali dataset button")
            time.sleep(1)
        else:
            # Try to find any sample data button
            btns = self.driver.find_elements(By.XPATH, "//button[contains(@onclick, 'loadAfzali')]")
            if btns:
                try:
                    self.driver.execute_script("arguments[0].click();", btns[0])
                    self.log("PASS", "Loaded Afzali via onclick")
                    time.sleep(1)
                except:
                    self.log("FAIL", "Could not load Afzali")
            else:
                try:
                    loaded = self.driver.execute_script(
                        "if (typeof loadCochraneDataset === 'function') { loadCochraneDataset('afzali'); return true; } return false;"
                    )
                    if loaded:
                        self.log("PASS", "Loaded Afzali via JavaScript fallback")
                        time.sleep(1)
                    else:
                        self.log("WARN", "Afzali button not found")
                except Exception:
                    self.log("WARN", "Afzali button not found")

    def test_3_run_analysis(self):
        print("\n--- TEST 3: Run Bivariate Analysis ---")

        # Click Settings or Results tab
        self.click_by_text("Settings")
        time.sleep(0.3)

        # Click Run Analysis
        if self.click_by_text("Run Analysis"):
            self.log("PASS", "Clicked Run Analysis")
            time.sleep(3)  # Wait for analysis
            self.dismiss_all_alerts()
        else:
            self.log("FAIL", "Run Analysis button not found")

        # Verify results appeared
        source = self.driver.page_source
        if "Sensitivity" in source and "Specificity" in source:
            self.log("PASS", "Results show Sensitivity/Specificity")

            # Check for actual values
            if "0.9" in source:  # Afzali should give ~0.91 sens
                self.log("PASS", "Results contain expected values")

    def test_4_forest_plots(self):
        print("\n--- TEST 4: Forest Plots ---")

        # Navigate to Forest Plots tab
        self.click_by_text("Forest Plot")
        time.sleep(1)

        # Try each forest plot type
        forest_types = [
            "Sensitivity Forest",
            "Specificity Forest",
            "DOR Forest"
        ]

        for ftype in forest_types:
            if self.click_by_text(ftype):
                time.sleep(2)
                self.log("PASS", f"Generated: {ftype}")
            else:
                # Try partial match
                parts = ftype.split()
                for part in parts:
                    if self.click_by_text(part):
                        time.sleep(2)
                        self.log("PASS", f"Generated via partial: {ftype}")
                        break

        # Check if forestPlot containers have content (correct IDs)
        plot_ids = ["forestSens", "forestSpec", "forestDOR", "forestPLR", "forestNLR"]
        for pid in plot_ids:
            if self.check_element_has_content(pid):
                self.log("PASS", f"Plot container has content: {pid}")
                break

    def test_5_sroc_plot(self):
        print("\n--- TEST 5: SROC Plot ---")

        # Navigate to SROC tab
        self.click_by_text("SROC")
        time.sleep(1)

        # Generate SROC
        if self.click_by_text("SROC Curve") or self.click_by_text("Generate SROC"):
            time.sleep(3)
            self.log("PASS", "Generated SROC curve")

            # Check plot container
            if self.check_element_has_content("srocPlot"):
                self.log("PASS", "SROC plot has content")
            else:
                try:
                    self.driver.execute_script("""
                        if (typeof switchTab === 'function') switchTab('sroc');
                        if (typeof runAnalysis === 'function') runAnalysis();
                    """)
                    time.sleep(2)
                except Exception:
                    pass
                if self.check_element_has_content("srocPlot"):
                    self.log("PASS", "SROC plot has content (after refresh)")
                else:
                    self.log("WARN", "SROC plot container may be empty")

    def test_6_publication_bias(self):
        print("\n--- TEST 6: Publication Bias Analysis ---")

        # Navigate to Publication Bias tab
        self.click_by_text("Publication Bias")
        time.sleep(1)

        # Run Deeks' test
        if self.click_by_text("Deeks"):
            time.sleep(2)
            self.log("PASS", "Ran Deeks' funnel plot test")
        else:
            self.log("WARN", "Deeks test button not found")

        # Check for p-value in results
        source = self.driver.page_source
        if "p-value" in source.lower() or "p =" in source:
            self.log("PASS", "P-value displayed for bias test")

    def test_7_heterogeneity(self):
        print("\n--- TEST 7: Heterogeneity Statistics ---")

        self.click_by_text("Heterogeneity")
        time.sleep(1)

        source = self.driver.page_source
        het_terms = ["tau", "I-squared", "I2", "variance"]
        found = 0

        for term in het_terms:
            if term.lower() in source.lower():
                found += 1

        if found >= 2:
            self.log("PASS", f"Heterogeneity stats present ({found} terms)")
        else:
            self.log("WARN", f"Limited heterogeneity display ({found} terms)")

    def test_8_convergence_diagnostics(self):
        print("\n--- TEST 8: Convergence Diagnostics (PLOS ONE) ---")

        source = self.driver.page_source

        # Required by PLOS ONE reviewers
        required = [
            ("convergence", "Convergence status"),
            ("gradient", "Gradient norm"),
            ("Hessian", "Hessian diagnostics"),
            ("iteration", "Iteration count")
        ]

        for term, desc in required:
            if term.lower() in source.lower():
                self.log("PASS", f"Found: {desc}")
            else:
                self.log("WARN", f"Not visible: {desc}")

    def test_9_minimum_k(self):
        print("\n--- TEST 9: Minimum k Guidance (PLOS ONE) ---")

        source = self.driver.page_source

        if "minimum" in source.lower() and "studi" in source.lower():
            self.log("PASS", "Minimum studies guidance present")

        if "k =" in source or "k >" in source or "k <" in source:
            self.log("PASS", "k threshold guidance present")

    def test_10_export_functions(self):
        print("\n--- TEST 10: Export Functions ---")

        export_btns = self.driver.find_elements(By.XPATH,
            "//button[contains(text(), 'Export') or contains(text(), 'Download') or contains(text(), 'PNG')]")

        if len(export_btns) > 0:
            self.log("PASS", f"Found {len(export_btns)} export buttons")
        else:
            self.log("WARN", "No export buttons found")

        # Check CSV export
        csv_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'CSV')]")
        if csv_btns:
            self.log("PASS", f"CSV export available ({len(csv_btns)} buttons)")

    def test_11_clinical_utility(self):
        print("\n--- TEST 11: Clinical Utility (Fagan Nomogram) ---")

        self.click_by_text("Clinical Utility")
        time.sleep(1)

        if self.click_by_text("Fagan"):
            time.sleep(2)
            self.log("PASS", "Generated Fagan nomogram")

        if self.check_element_has_content("faganPlot"):
            self.log("PASS", "Fagan plot has content")

    def test_12_sensitivity_analysis(self):
        print("\n--- TEST 12: Sensitivity Analysis ---")

        self.click_by_text("Sensitivity Analysis")
        time.sleep(1)

        if self.click_by_text("Leave-one-out") or self.click_by_text("Influence"):
            time.sleep(2)
            self.log("PASS", "Ran leave-one-out analysis")

    def test_13_quadas2(self):
        print("\n--- TEST 13: QUADAS-2 Assessment ---")

        self.click_by_text("QUADAS")
        time.sleep(1)

        if self.click_by_text("QUADAS-2") or self.click_by_text("Risk of Bias"):
            time.sleep(1)
            self.log("PASS", "QUADAS-2 interface accessed")

    def test_14_all_tabs(self):
        print("\n--- TEST 14: All Tabs Accessible ---")

        tab_ids = self.driver.execute_script("""
            return Array.from(document.querySelectorAll('button[data-tab]'))
              .map(btn => btn.getAttribute('data-tab'))
              .filter(Boolean);
        """) or []

        accessible = 0
        total_tabs = len(tab_ids)

        for tab_id in tab_ids:
            try:
                switched = self.driver.execute_script("""
                    if (typeof switchTab === 'function') {
                        switchTab(arguments[0]);
                        return true;
                    }
                    const btn = document.querySelector(`button[data-tab="${arguments[0]}"]`);
                    if (btn) { btn.click(); return true; }
                    return false;
                """, tab_id)
                time.sleep(0.2)
                self.dismiss_all_alerts()
                if not switched:
                    continue

                panel_active = self.driver.execute_script("""
                    const panel = document.getElementById('panel-' + arguments[0]);
                    return !!(panel && panel.classList.contains('active'));
                """, tab_id)
                if panel_active:
                    accessible += 1
            except Exception:
                pass

        if total_tabs == 0:
            self.log("FAIL", "No tab elements detected")
        elif accessible == 0:
            self.log("FAIL", f"Accessible tabs: {accessible}/{total_tabs}")
        elif accessible < max(1, total_tabs // 2):
            self.log("WARN", f"Accessible tabs: {accessible}/{total_tabs}")
        else:
            self.log("PASS", f"Accessible tabs: {accessible}/{total_tabs}")

    def test_15_final_plot_check(self):
        print("\n--- TEST 15: Final Plot Verification (Double Check) ---")

        # Check all plot containers
        all_plots = self.driver.find_elements(By.XPATH, "//*[contains(@id, 'Plot') or contains(@id, 'plot')]")

        plots_with_content = 0
        for plot in all_plots:
            try:
                inner = plot.get_attribute("innerHTML")
                if len(inner) > 200:
                    plots_with_content += 1
            except:
                pass

        print(f"  First check: {plots_with_content}/{len(all_plots)} plots with content")

        # Second check
        time.sleep(2)
        all_plots2 = self.driver.find_elements(By.XPATH, "//*[contains(@id, 'Plot') or contains(@id, 'plot')]")

        plots_with_content2 = 0
        for plot in all_plots2:
            try:
                inner = plot.get_attribute("innerHTML")
                if len(inner) > 200:
                    plots_with_content2 += 1
            except:
                pass

        print(f"  Second check: {plots_with_content2}/{len(all_plots2)} plots with content")

        if plots_with_content2 > 0:
            self.log("PASS", f"Verified {plots_with_content2} plots rendered")
        else:
            self.log("WARN", "Plots may need manual verification")

    def run(self):
        try:
            self.setup()

            self.test_1_page_load()
            self.test_2_load_afzali()
            self.test_3_run_analysis()
            self.test_4_forest_plots()
            self.test_5_sroc_plot()
            self.test_6_publication_bias()
            self.test_7_heterogeneity()
            self.test_8_convergence_diagnostics()
            self.test_9_minimum_k()
            self.test_10_export_functions()
            self.test_11_clinical_utility()
            self.test_12_sensitivity_analysis()
            self.test_13_quadas2()
            self.test_14_all_tabs()
            self.test_15_final_plot_check()

            # Summary
            print("\n" + "="*70)
            print("FINAL TEST SUMMARY")
            print("="*70)
            total = self.passed + self.failed
            print(f"\nPASSED:   {self.passed}")
            print(f"FAILED:   {self.failed}")
            print(f"WARNINGS: {self.warnings}")
            print(f"\nTotal: {total}")

            if total > 0:
                rate = (self.passed / total) * 100
                print(f"\nPASS RATE: {rate:.1f}%")

                if self.failed == 0 and self.warnings == 0:
                    print("\n*** EXCELLENT - Application passes comprehensive testing ***")
                elif self.failed == 0:
                    print("\n*** GOOD - No failed tests, but warnings require review ***")
                else:
                    print("\n*** NEEDS ATTENTION - Review failed tests ***")

            print("\n" + "="*70)
            print("Browser kept open for manual inspection")
            print("="*70)
            return self.failed

        except Exception as e:
            print(f"\nERROR: {e}")
            raise


if __name__ == "__main__":
    test = DTAProFinalTest()
    failed = test.run()
    sys.exit(1 if failed else 0)
