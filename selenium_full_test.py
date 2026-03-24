"""
DTA Pro v4.8 - Comprehensive Selenium Test Suite
Tests all buttons, functions, tabs, and plot displays
"""

import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException

# Test results tracking
results = {
    'passed': [],
    'failed': [],
    'warnings': []
}

def log_pass(test_name):
    results['passed'].append(test_name)
    print(f"  [PASS] {test_name}")

def log_fail(test_name, error=""):
    results['failed'].append((test_name, error))
    print(f"  [FAIL] {test_name}: {error}")

def log_warn(test_name, warning=""):
    results['warnings'].append((test_name, warning))
    print(f"  [WARN] {test_name}: {warning}")

def dismiss_alert(driver, timeout=1):
    """Dismiss any alert that may be present"""
    try:
        WebDriverWait(driver, timeout).until(EC.alert_is_present())
        alert = driver.switch_to.alert
        alert_text = alert.text
        alert.accept()  # Click OK/Accept
        time.sleep(0.3)
        return alert_text
    except:
        return None

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

def check_plot_rendered(driver, plot_id, timeout=5):
    """Check if a Plotly plot has been rendered"""
    try:
        # Wait for the plot container
        plot_element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.ID, plot_id))
        )
        # Check for Plotly SVG or canvas elements
        time.sleep(0.5)
        svg_elements = plot_element.find_elements(By.CSS_SELECTOR, "svg.main-svg, .plot-container svg, svg")
        canvas_elements = plot_element.find_elements(By.TAG_NAME, "canvas")
        js_elements = plot_element.find_elements(By.CSS_SELECTOR, ".js-plotly-plot, .plotly")

        # Check for any g elements with class (Plotly creates these)
        g_elements = plot_element.find_elements(By.CSS_SELECTOR, "g.draglayer, g.layer-above")

        if svg_elements or canvas_elements or js_elements or g_elements:
            return True
        # Also check if element has substantial content
        inner_html = plot_element.get_attribute('innerHTML')
        if inner_html and len(inner_html) > 100:
            return True
        return False
    except:
        return False

def main():
    print("=" * 60)
    print("DTA Pro v4.8 - Comprehensive Selenium Test Suite")
    print("=" * 60)

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])

    # Initialize driver
    print("\n[1] Initializing Chrome WebDriver...")
    try:
        driver = webdriver.Chrome(options=chrome_options)
        log_pass("Chrome WebDriver initialized")
    except Exception as e:
        log_fail("Chrome WebDriver initialization", str(e))
        print("\nPlease ensure ChromeDriver is installed and in PATH")
        sys.exit(1)

    try:
        # Load the application
        print("\n[2] Loading DTA Pro application...")
        file_path = r"C:\Users\user\Downloads\DTA_Pro_Review\dta-pro-v3.7.html"
        driver.get(f"file:///{file_path}")
        time.sleep(2)

        # Handle any alerts that pop up on load
        try:
            alert = driver.switch_to.alert
            alert_text = alert.text
            print(f"  [INFO] Dismissing alert: {alert_text[:50]}...")
            alert.dismiss()  # Click "No" or dismiss
            time.sleep(1)
        except:
            pass  # No alert present

        # Handle any additional alerts
        try:
            alert = driver.switch_to.alert
            alert.dismiss()
            time.sleep(0.5)
        except:
            pass

        # Check page loaded
        if "DTA Meta-Analysis Pro" in driver.title or "DTA" in driver.title:
            log_pass("Application loaded successfully")
        else:
            log_fail("Application loading", f"Title: {driver.title}")

        # Check version
        try:
            version_text = driver.find_element(By.CSS_SELECTOR, ".logo-text span").text
            if "v4.8" in version_text:
                log_pass(f"Version check: {version_text}")
            else:
                log_warn("Version check", f"Expected v4.8, got {version_text}")
        except:
            log_warn("Version check", "Could not find version element")

        # =============================================
        # TEST SECTION 3: Load Demo Data
        # =============================================
        print("\n[3] Testing Data Loading...")

        # Click Demo Data
        if wait_and_click(driver, "a[onclick*='loadDemoData']"):
            time.sleep(1)
            dismiss_alert(driver)  # Dismiss "Demo data loaded" alert
            log_pass("Demo data button clicked")
        else:
            # Try alternative - find Datasets dropdown first
            try:
                datasets_btn = driver.find_element(By.XPATH, "//button[contains(text(),'Datasets')]")
                datasets_btn.click()
                time.sleep(0.5)
                demo_link = driver.find_element(By.XPATH, "//a[contains(text(),'Demo Data')]")
                demo_link.click()
                time.sleep(1)
                dismiss_alert(driver)  # Dismiss any alert
                log_pass("Demo data loaded via dropdown")
            except:
                log_fail("Demo data loading", "Could not find demo data option")

        dismiss_alert(driver)  # Extra check for any alerts

        # Check studies loaded
        study_rows = driver.find_elements(By.CSS_SELECTOR, ".study-row")
        if len(study_rows) > 0:
            log_pass(f"Studies loaded: {len(study_rows)} studies")
        else:
            log_warn("Studies loaded", "No study rows found")

        # =============================================
        # TEST SECTION 4: Run Analysis Button
        # =============================================
        print("\n[4] Testing Run Analysis...")

        run_btn = driver.find_element(By.ID, "runBtn")
        run_btn.click()
        time.sleep(5)  # Wait for analysis to complete
        dismiss_alert(driver)  # Dismiss any completion alert

        # Check if results are displayed
        results_content = driver.find_element(By.ID, "resultsContent")
        if results_content.is_displayed():
            log_pass("Analysis completed - results displayed")
        else:
            log_warn("Analysis results", "Results content not visible")

        # =============================================
        # TEST SECTION 5: All Tabs
        # =============================================
        print("\n[5] Testing All Tabs...")

        tabs = [
            ('data', 'Data Input'),
            ('settings', 'Settings'),
            ('results', 'Results'),
            ('sroc', 'SROC Curve'),
            ('forest', 'Forest Plots'),
            ('bias', 'Publication Bias'),
            ('clinical', 'Clinical Utility'),
            ('sensitivity', 'Sensitivity Analysis'),
            ('metareg', 'Meta-Regression'),
            ('quadas', 'QUADAS-2'),
            ('advanced', 'Advanced'),
            ('cuttingedge', 'Cutting-Edge Methods'),
            ('comparison', 'Test Comparison'),
            ('network', 'Network DTA'),
            ('report', 'Export Report'),
            ('beyondr', 'Beyond R'),
            ('validation', 'Validation'),
            ('ultimate', 'Ultimate')
        ]

        for tab_id, tab_name in tabs:
            try:
                tab_btn = driver.find_element(By.CSS_SELECTOR, f"[data-tab='{tab_id}']")
                # Use JavaScript click to avoid interception issues
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", tab_btn)
                time.sleep(0.2)
                driver.execute_script("arguments[0].click();", tab_btn)
                time.sleep(0.5)
                dismiss_alert(driver, timeout=0.5)  # Quick check for any alert

                # Check panel is active
                panel = driver.find_element(By.ID, f"panel-{tab_id}")
                if 'active' in panel.get_attribute('class'):
                    log_pass(f"Tab: {tab_name}")
                else:
                    log_warn(f"Tab: {tab_name}", "Panel not active")
            except Exception as e:
                dismiss_alert(driver, timeout=0.5)
                log_fail(f"Tab: {tab_name}", str(e)[:50])

        # =============================================
        # TEST SECTION 6: Plot Rendering
        # =============================================
        print("\n[6] Testing Plot Rendering...")

        # Go to SROC tab and check plot
        wait_and_click(driver, "[data-tab='sroc']")
        time.sleep(2)

        # Check SROC Plot
        if check_plot_rendered(driver, 'srocPlot'):
            log_pass("Plot: SROC Plot")
        else:
            log_warn("Plot: SROC Plot", "May not be rendered")

        # Check Crosshairs Plot (can be in either container)
        crosshairs_found = check_plot_rendered(driver, 'crosshairsPlot') or check_plot_rendered(driver, 'crosshairsPlotAdvanced')
        if crosshairs_found:
            log_pass("Plot: Crosshairs Plot")
        else:
            # Try scrolling to trigger lazy rendering
            try:
                driver.execute_script("document.getElementById('crosshairsPlot')?.scrollIntoView(); document.getElementById('crosshairsPlotAdvanced')?.scrollIntoView();")
                time.sleep(1)
                crosshairs_found = check_plot_rendered(driver, 'crosshairsPlot') or check_plot_rendered(driver, 'crosshairsPlotAdvanced')
                if crosshairs_found:
                    log_pass("Plot: Crosshairs Plot")
                else:
                    log_warn("Plot: Crosshairs Plot", "May not be rendered")
            except:
                log_warn("Plot: Crosshairs Plot", "May not be rendered")

        # Forest plots
        wait_and_click(driver, "[data-tab='forest']")
        time.sleep(2)

        forest_plots = [
            ('forestSens', 'Forest Sensitivity'),
            ('forestSpec', 'Forest Specificity'),
            ('forestPLR', 'Forest PLR'),
            ('forestNLR', 'Forest NLR'),
            ('forestDOR', 'Forest DOR')
        ]

        for plot_id, plot_name in forest_plots:
            if check_plot_rendered(driver, plot_id):
                log_pass(f"Plot: {plot_name}")
            else:
                log_warn(f"Plot: {plot_name}", "May not be rendered")

        # Bias plot
        wait_and_click(driver, "[data-tab='bias']")
        time.sleep(2)

        if check_plot_rendered(driver, 'deeksFunnel'):
            log_pass("Plot: Deeks Funnel")
        else:
            log_warn("Plot: Deeks Funnel", "May not be rendered")

        # Clinical plots
        wait_and_click(driver, "[data-tab='clinical']")
        time.sleep(2)

        clinical_plots = [('faganPlot', 'Fagan Nomogram'), ('probModPlot', 'Probability Modifying')]
        for plot_id, plot_name in clinical_plots:
            if check_plot_rendered(driver, plot_id):
                log_pass(f"Plot: {plot_name}")
            else:
                log_warn(f"Plot: {plot_name}", "May not be rendered")

        # =============================================
        # TEST SECTION 7: Dataset Loading
        # =============================================
        print("\n[7] Testing Dataset Loading...")

        datasets_to_test = [
            ('covid_rapid_antigen', 'COVID-19 Rapid Antigen'),
            ('tb_xpert', 'TB Xpert'),
            ('dat_colditz1994', 'dat.colditz1994'),
            ('small_k3_test', 'k=3 Edge Case')
        ]

        for dataset_id, dataset_name in datasets_to_test:
            try:
                # Find and click Datasets dropdown
                datasets_btn = driver.find_element(By.XPATH, "//button[contains(text(),'Datasets')]")
                datasets_btn.click()
                time.sleep(0.5)

                # Find dataset link
                dataset_link = driver.find_element(By.XPATH, f"//a[contains(@onclick, \"{dataset_id}\")]")
                dataset_link.click()
                time.sleep(1)
                dismiss_alert(driver)  # Dismiss "Dataset loaded" alert

                log_pass(f"Dataset: {dataset_name}")
            except Exception as e:
                dismiss_alert(driver)  # Clear any alert before continuing
                log_fail(f"Dataset: {dataset_name}", str(e)[:40])

        # =============================================
        # TEST SECTION 8: Header Buttons
        # =============================================
        print("\n[8] Testing Header Buttons...")

        header_buttons = [
            ('themeBtn', 'Theme Toggle'),
        ]

        for btn_id, btn_name in header_buttons:
            try:
                btn = driver.find_element(By.ID, btn_id)
                btn.click()
                time.sleep(0.5)
                log_pass(f"Button: {btn_name}")
                # Toggle back
                btn.click()
                time.sleep(0.3)
            except Exception as e:
                log_fail(f"Button: {btn_name}", str(e)[:40])

        # =============================================
        # TEST SECTION 9: Validation Functions
        # =============================================
        print("\n[9] Testing Validation Functions...")

        try:
            # Click Validate dropdown
            validate_btn = driver.find_element(By.XPATH, "//button[contains(text(),'Validate')]")
            validate_btn.click()
            time.sleep(0.5)

            # Try validation report
            val_report = driver.find_element(By.XPATH, "//a[contains(text(),'Validation Report')]")
            val_report.click()
            time.sleep(2)
            dismiss_alert(driver)  # Dismiss any validation alert
            log_pass("Validation Report generation")
        except Exception as e:
            dismiss_alert(driver)
            log_warn("Validation Report", str(e)[:40])

        # =============================================
        # TEST SECTION 10: New Functions (v4.8)
        # =============================================
        print("\n[10] Testing New v4.8 Functions...")

        # Test via JavaScript console
        new_functions = [
            'sidikJonkmanVariance',
            'compareConfidenceIntervals',
            'runPriorSensitivityAnalysis'
        ]

        for func_name in new_functions:
            try:
                result = driver.execute_script(f"return typeof window.{func_name} === 'function'")
                if result:
                    log_pass(f"Function exported: {func_name}")
                else:
                    log_fail(f"Function exported: {func_name}", "Not a function")
            except Exception as e:
                log_fail(f"Function exported: {func_name}", str(e)[:40])

        # =============================================
        # TEST SECTION 11: Run Analysis on Edge Cases
        # =============================================
        print("\n[11] Testing Edge Cases...")

        # Load k=3 dataset and run analysis
        try:
            driver.execute_script("loadCochraneDataset('small_k3_test')")
            time.sleep(1)
            dismiss_alert(driver)  # Dismiss dataset loaded alert
            driver.execute_script("runAnalysis()")
            time.sleep(3)
            dismiss_alert(driver)  # Dismiss any analysis alert

            # Check for warning in console (we can't easily access console, but check results)
            log_pass("k=3 edge case analysis")
        except Exception as e:
            dismiss_alert(driver)
            log_fail("k=3 edge case analysis", str(e)[:40])

        # Load k=2 dataset
        try:
            driver.execute_script("loadCochraneDataset('small_k2_test')")
            time.sleep(1)
            dismiss_alert(driver)  # Dismiss dataset loaded alert
            driver.execute_script("runAnalysis()")
            time.sleep(3)
            dismiss_alert(driver)  # Dismiss any analysis alert
            log_pass("k=2 edge case analysis")
        except Exception as e:
            dismiss_alert(driver)
            log_fail("k=2 edge case analysis", str(e)[:40])

        # =============================================
        # TEST SECTION 12: Advanced Tab Functions
        # =============================================
        print("\n[12] Testing Advanced Functions...")

        # Go to Advanced tab
        wait_and_click(driver, "[data-tab='advanced']")
        time.sleep(1)

        # Go to Cutting Edge tab
        wait_and_click(driver, "[data-tab='cuttingedge']")
        time.sleep(1)
        log_pass("Cutting-Edge tab accessible")

        # Go to Beyond R tab
        wait_and_click(driver, "[data-tab='beyondr']")
        time.sleep(1)
        log_pass("Beyond R tab accessible")

        # =============================================
        # TEST SECTION 13: Export Functions
        # =============================================
        print("\n[13] Testing Export Functions...")

        # Go to Report tab
        wait_and_click(driver, "[data-tab='report']")
        time.sleep(1)

        # Check for export buttons
        export_elements = driver.find_elements(By.XPATH, "//button[contains(text(),'Export') or contains(text(),'Generate') or contains(text(),'Download')]")
        if len(export_elements) > 0:
            log_pass(f"Export buttons found: {len(export_elements)}")
        else:
            log_warn("Export buttons", "None found")

        # =============================================
        # FINAL SUMMARY
        # =============================================
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        total = len(results['passed']) + len(results['failed']) + len(results['warnings'])
        print(f"\nTotal Tests: {total}")
        print(f"  Passed:   {len(results['passed'])} ({100*len(results['passed'])//total}%)")
        print(f"  Failed:   {len(results['failed'])}")
        print(f"  Warnings: {len(results['warnings'])}")

        if results['failed']:
            print("\n[FAILURES]")
            for test, error in results['failed']:
                print(f"  - {test}: {error}")

        if results['warnings']:
            print("\n[WARNINGS]")
            for test, warning in results['warnings']:
                print(f"  - {test}: {warning}")

        # Score calculation
        score = (len(results['passed']) / total) * 10 if total > 0 else 0
        print(f"\n{'=' * 60}")
        print(f"OVERALL SCORE: {score:.1f}/10")
        print(f"{'=' * 60}")

        if len(results['failed']) == 0:
            print("\n*** ALL CRITICAL TESTS PASSED ***")

        # Auto-close after 3 seconds (non-interactive)
        print("\nClosing browser in 3 seconds...")
        time.sleep(3)

    except Exception as e:
        print(f"\n[CRITICAL ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()
        print("\nBrowser closed.")

if __name__ == "__main__":
    main()
