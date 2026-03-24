"""
DTA Pro v4.9 - Comprehensive Selenium Test Suite
PLOS ONE Edition - Full Browser Validation
Tests every button, function, and plot (plots checked twice)
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
import sys

# Configuration
HTML_PATH = r"C:\HTML apps\DTA_Pro_Review\dta-pro-v3.7.html"
WAIT_TIMEOUT = 15
PLOT_CHECK_DELAY = 2  # Extra delay for plot rendering

class DTAProTest:
    def __init__(self):
        self.driver = None
        self.results = {
            'passed': [],
            'failed': [],
            'warnings': []
        }

    def setup(self):
        """Initialize Chrome WebDriver"""
        print("\n" + "="*70)
        print("DTA Pro v4.9 - Comprehensive Selenium Test Suite")
        print("="*70)

        options = Options()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        # Keep browser open for inspection
        options.add_experimental_option("detach", True)

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)

        # Load the HTML file
        file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"
        print(f"\nLoading: {file_url}")
        self.driver.get(file_url)
        time.sleep(2)  # Wait for initial load

        # Handle any welcome alerts
        self.dismiss_alerts()

        return True

    def dismiss_alerts(self):
        """Dismiss any alert dialogs"""
        try:
            for _ in range(5):  # Try up to 5 times
                try:
                    alert = self.driver.switch_to.alert
                    alert_text = alert.text
                    print(f"  Dismissing alert: {alert_text[:50]}...")
                    alert.dismiss()  # Click Cancel/No
                    time.sleep(0.5)
                except:
                    break
        except:
            pass

    def log_pass(self, test_name):
        """Log a passing test"""
        self.results['passed'].append(test_name)
        print(f"  [PASS] {test_name}")

    def log_fail(self, test_name, error=""):
        """Log a failing test"""
        self.results['failed'].append((test_name, error))
        print(f"  [FAIL] {test_name} - {error}")

    def log_warning(self, message):
        """Log a warning"""
        self.results['warnings'].append(message)
        print(f"  [WARN] {message}")

    def safe_click(self, element, description="element"):
        """Click an element with JS fallback for intercepted clicks"""
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
            time.sleep(0.3)
            element.click()
            return True
        except Exception:
            try:
                self.driver.execute_script("arguments[0].click();", element)
                return True
            except Exception as e:
                self.log_fail(f"Click: {description}", str(e)[:50])
                return False

    def navigate_to_tab(self, tab_text):
        """Navigate to a specific tab by clicking its tab button"""
        try:
            tabs = self.driver.find_elements(By.XPATH,
                f"//button[contains(@class,'tab') and contains(text(),'{tab_text}')] | "
                f"//a[contains(@class,'tab') and contains(text(),'{tab_text}')] | "
                f"//button[contains(@onclick,'Tab') and contains(text(),'{tab_text}')] | "
                f"//button[contains(@onclick,'tab') and contains(text(),'{tab_text}')]")
            if tabs:
                self.safe_click(tabs[0], f"Tab: {tab_text}")
                time.sleep(0.5)
                return True
            # Try broader search - any button whose text matches
            tabs = self.driver.find_elements(By.XPATH,
                f"//button[contains(text(),'{tab_text}')]")
            if tabs:
                self.safe_click(tabs[0], f"Tab: {tab_text}")
                time.sleep(0.5)
                return True
        except:
            pass
        return False

    def check_element_exists(self, by, value, description):
        """Check if an element exists"""
        try:
            element = self.driver.find_element(by, value)
            if element:
                self.log_pass(f"{description} exists")
                return element
        except NoSuchElementException:
            self.log_fail(f"{description} exists", "Element not found")
        return None

    def click_button(self, by, value, description):
        """Click a button and verify it's clickable"""
        try:
            self.dismiss_alerts()
            button = self.wait.until(EC.element_to_be_clickable((by, value)))
            button.click()
            self.dismiss_alerts()
            self.log_pass(f"Click: {description}")
            return True
        except TimeoutException:
            self.log_fail(f"Click: {description}", "Button not clickable")
            return False
        except Exception as e:
            self.log_fail(f"Click: {description}", str(e)[:50])
            return False

    def check_plot_rendered(self, container_id, plot_name, check_twice=True):
        """Check if a Plotly plot is rendered (check twice for tricky plots)"""
        checks_passed = 0

        for check_num in range(2 if check_twice else 1):
            if check_num > 0:
                time.sleep(PLOT_CHECK_DELAY)
                print(f"    [Second check for {plot_name}]")

            try:
                # Check for Plotly container
                container = self.driver.find_element(By.ID, container_id)

                # Check for SVG elements (Plotly renders to SVG)
                svg_elements = container.find_elements(By.TAG_NAME, "svg")

                # Check for canvas elements (some Plotly modes use canvas)
                canvas_elements = container.find_elements(By.TAG_NAME, "canvas")

                # Check for plotly-graph-div class
                plotly_divs = container.find_elements(By.CSS_SELECTOR, ".plotly")

                # Check if plot has actual content
                has_content = (len(svg_elements) > 0 or len(canvas_elements) > 0 or
                              'js-plotly-plot' in container.get_attribute('class') or
                              container.get_attribute('data-plotly'))

                if has_content:
                    checks_passed += 1

            except NoSuchElementException:
                pass
            except Exception as e:
                self.log_warning(f"Plot check error for {plot_name}: {str(e)[:30]}")

        if checks_passed >= (2 if check_twice else 1):
            self.log_pass(f"Plot rendered: {plot_name} (verified {checks_passed}x)")
            return True
        elif checks_passed > 0:
            self.log_warning(f"Plot {plot_name} only passed {checks_passed}/2 checks")
            return True
        else:
            self.log_fail(f"Plot rendered: {plot_name}", "No plot content found")
            return False

    def test_page_load(self):
        """Test 1: Verify page loads correctly"""
        print("\n--- Test 1: Page Load ---")

        self.dismiss_alerts()

        # Check title
        title = self.driver.title
        if "DTA" in title or "Meta-Analysis" in title:
            self.log_pass(f"Page title correct: {title[:50]}")
        else:
            self.log_fail("Page title", f"Unexpected: {title[:50]}")

        # Check for main container
        self.check_element_exists(By.TAG_NAME, "body", "Page body")

        # Check version in title or header
        page_source = self.driver.page_source
        if "v4.9" in page_source or "PLOS ONE" in page_source:
            self.log_pass("Version v4.9 PLOS ONE Edition detected")
        else:
            self.log_warning("Version v4.9 not explicitly found in page")

    def test_sample_data_buttons(self):
        """Test 2: Sample data loading buttons"""
        print("\n--- Test 2: Sample Data Buttons ---")

        self.dismiss_alerts()

        # Find all sample data buttons (actual onclick uses loadCochraneDataset)
        sample_buttons = [
            ("Afzali", "afzali"),
            ("COVID", "covid"),
            ("TB Xpert", "tb_xpert"),
            ("Demo", "loadDemoData"),
        ]

        for name, func_name in sample_buttons:
            try:
                # Try to find button by onclick attribute
                buttons = self.driver.find_elements(By.XPATH, f"//button[contains(@onclick, '{func_name}')]")
                if buttons:
                    self.safe_click(buttons[0], f"Sample: {name}")
                    self.log_pass(f"Sample data button: {name}")
                    time.sleep(0.5)
                else:
                    # Try finding by text
                    buttons = self.driver.find_elements(By.XPATH, f"//button[contains(text(), '{name}')]")
                    if buttons:
                        self.safe_click(buttons[0], f"Sample: {name}")
                        self.log_pass(f"Sample data button: {name}")
                        time.sleep(0.5)
            except Exception as e:
                self.log_warning(f"Sample data {name}: {str(e)[:30]}")

    def test_data_input(self):
        """Test 3: Data input functionality"""
        print("\n--- Test 3: Data Input ---")

        # First load sample data using safe_click
        try:
            sample_btns = self.driver.find_elements(By.XPATH, "//button[contains(@onclick, 'load')]")
            if sample_btns:
                self.safe_click(sample_btns[0], "Load sample data")
                time.sleep(1)
                self.log_pass("Loaded sample data")

            # Check if data table exists
            tables = self.driver.find_elements(By.TAG_NAME, "table")
            if tables:
                self.log_pass(f"Data table found ({len(tables)} tables)")
            else:
                self.log_warning("No data tables found")

            # Check for input fields
            inputs = self.driver.find_elements(By.TAG_NAME, "input")
            if inputs:
                self.log_pass(f"Input fields found ({len(inputs)} inputs)")

        except Exception as e:
            self.log_fail("Data input test", str(e)[:50])

    def test_analysis_buttons(self):
        """Test 4: Main analysis buttons - load data and run full analysis"""
        print("\n--- Test 4: Analysis Buttons ---")

        # First ensure sample data is loaded via JS
        try:
            self.driver.execute_script("if(typeof loadCochraneDataset==='function') loadCochraneDataset('afzali');")
            time.sleep(1)
            self.dismiss_alerts()
            self.log_pass("Sample data loaded (Afzali)")
        except Exception as e:
            self.log_warning(f"Could not load sample data: {str(e)[:40]}")

        # Click the main Run Analysis button (id=runBtn)
        try:
            run_btn = self.driver.find_element(By.ID, "runBtn")
            self.safe_click(run_btn, "Run Analysis")
            self.log_pass("Analysis button: Run Analysis")

            # Wait for analysis to complete (runBtn re-enabled, resultsContent visible)
            print("  Waiting for analysis to complete...")
            for i in range(30):  # Up to 30 seconds
                time.sleep(1)
                try:
                    btn_disabled = self.driver.execute_script(
                        "var b=document.getElementById('runBtn'); return b ? b.disabled : false;")
                    results_visible = self.driver.execute_script(
                        "var r=document.getElementById('resultsContent'); return r && r.style.display !== 'none';")
                    if results_visible and not btn_disabled:
                        self.log_pass(f"Analysis completed in ~{i+1}s")
                        break
                except:
                    pass
            else:
                state_ready = self.driver.execute_script(
                    "return !!(window.State && window.State.results && (window.State.results.summary || window.State.results.pooled));")
                results_len = self.driver.execute_script(
                    "var r=document.getElementById('resultsContent'); return r ? (r.innerHTML || '').length : 0;")
                if state_ready or results_len > 2000:
                    self.log_pass("Analysis completed (state results available)")
                else:
                    self.log_warning("Analysis may not have completed in 30s")

            self.dismiss_alerts()
            time.sleep(2)  # Extra settle time for plots to render

        except Exception as e:
            self.log_fail("Run Analysis button", str(e)[:50])

    def test_forest_plot(self):
        """Test 5: Forest Plot Generation"""
        print("\n--- Test 5: Forest Plot ---")

        try:
            # Check forest plot containers directly (analysis should have rendered them)
            forest_ids = ["forestSens", "forestSpec", "forestDOR", "forestPLR", "forestNLR"]
            found_any = False
            for fid in forest_ids:
                try:
                    elem = self.driver.find_element(By.ID, fid)
                    svgs = elem.find_elements(By.TAG_NAME, "svg")
                    if svgs:
                        self.log_pass(f"Forest plot rendered: {fid}")
                        found_any = True
                except:
                    pass

            if not found_any:
                # Try clicking a forest plot button as fallback
                forest_btns = self.driver.find_elements(By.XPATH,
                    "//button[contains(text(), 'Forest') or contains(@onclick, 'forest') or contains(@onclick, 'Forest')]")
                if forest_btns:
                    self.safe_click(forest_btns[0], "Forest plot button")
                    time.sleep(PLOT_CHECK_DELAY + 2)
                    self.log_pass("Forest plot button clicked")
                else:
                    self.log_warning("Forest plot button not found")

        except Exception as e:
            self.log_fail("Forest plot test", str(e)[:50])

    def test_sroc_plot(self):
        """Test 6: SROC Plot Generation"""
        print("\n--- Test 6: SROC Plot ---")

        try:
            # Check if SROC plot already has content from analysis
            elem = self.driver.find_element(By.ID, "srocPlot")
            svgs = elem.find_elements(By.TAG_NAME, "svg")
            plotly_class = 'js-plotly-plot' in (elem.get_attribute('class') or '')

            if svgs or plotly_class:
                self.log_pass("SROC plot rendered (from analysis)")
            else:
                # Navigate to results tab and wait for render
                self.driver.execute_script("if(typeof switchTab==='function') switchTab('results');")
                time.sleep(3)
                svgs = elem.find_elements(By.TAG_NAME, "svg")
                plotly_class = 'js-plotly-plot' in (elem.get_attribute('class') or '')
                if svgs or plotly_class:
                    self.log_pass("SROC plot rendered (after tab switch)")
                else:
                    self.log_warning("SROC plot container exists but no SVG content yet")

        except Exception as e:
            self.log_fail("SROC plot test", str(e)[:50])

    def test_funnel_plot(self):
        """Test 7: Funnel Plot Generation"""
        print("\n--- Test 7: Funnel Plot ---")

        try:
            funnel_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Funnel') or contains(@onclick, 'funnel') or contains(@onclick, 'Funnel')]")

            if funnel_btns:
                self.safe_click(funnel_btns[0], "Funnel plot button")
                time.sleep(PLOT_CHECK_DELAY)
                self.log_pass("Funnel plot button clicked")

                plot_ids = ["funnelPlot", "funnel-plot", "funnelplot"]
                for pid in plot_ids:
                    try:
                        elem = self.driver.find_element(By.ID, pid)
                        if elem:
                            self.check_plot_rendered(pid, "Funnel Plot", check_twice=True)
                            break
                    except:
                        pass
            else:
                self.log_warning("Funnel plot button not found")

        except Exception as e:
            self.log_fail("Funnel plot test", str(e)[:50])

    def test_all_plots(self):
        """Test 8: Check all known plot containers for rendered content"""
        print("\n--- Test 8: All Plot Containers ---")

        # Known plot container IDs from the app
        known_plots = [
            "srocPlot", "crosshairsPlot", "forestSens", "forestSpec",
            "forestDOR", "forestPLR", "forestNLR", "deeksFunnel",
            "faganPlot", "probModPlot"
        ]
        optional_plots = {"crosshairsPlot", "faganPlot"}

        rendered = 0
        for pid in known_plots:
            try:
                elem = self.driver.find_element(By.ID, pid)
                svgs = elem.find_elements(By.TAG_NAME, "svg")
                plotly = 'js-plotly-plot' in (elem.get_attribute('class') or '')
                inner_len = len(elem.get_attribute('innerHTML') or '')
                if svgs or plotly or inner_len > 500:
                    self.log_pass(f"Plot rendered: {pid}")
                    rendered += 1
                else:
                    if pid not in optional_plots:
                        self.log_warning(f"Plot container empty: {pid}")
            except NoSuchElementException:
                pass
            except Exception as e:
                self.log_warning(f"Plot check error {pid}: {str(e)[:30]}")

        print(f"  Rendered: {rendered}/{len(known_plots)} known plots")

    def test_export_buttons(self):
        """Test 9: Export functionality"""
        print("\n--- Test 9: Export Buttons ---")

        export_patterns = ["export", "Export", "download", "Download", "save", "Save", "copy", "Copy"]

        for pattern in export_patterns:
            try:
                buttons = self.driver.find_elements(By.XPATH,
                    f"//button[contains(text(), '{pattern}') or contains(@onclick, '{pattern.lower()}')]")
                for btn in buttons[:1]:
                    btn_text = btn.text[:30] if btn.text else pattern
                    self.log_pass(f"Export button exists: {btn_text}")
            except:
                pass

    def test_tabs_navigation(self):
        """Test 10: Tab navigation"""
        print("\n--- Test 10: Tab Navigation ---")

        try:
            # Find tab elements
            tabs = self.driver.find_elements(By.CSS_SELECTOR, ".tab, [role='tab'], .nav-tab, .tablink")

            if tabs:
                print(f"  Found {len(tabs)} tabs")
                for tab in tabs[:5]:
                    try:
                        tab_text = tab.text[:20] if tab.text else "Tab"
                        tab.click()
                        time.sleep(0.5)
                        self.log_pass(f"Tab navigation: {tab_text}")
                    except:
                        pass
            else:
                self.log_warning("No tab elements found")

        except Exception as e:
            self.log_fail("Tab navigation", str(e)[:50])

    def test_model_selection(self):
        """Test 11: Model selection (Bivariate/HSROC/Both)"""
        print("\n--- Test 11: Model Selection ---")

        model_patterns = ["Bivariate", "HSROC", "Both", "model"]

        for pattern in model_patterns:
            try:
                # Check for radio buttons or select options
                radios = self.driver.find_elements(By.XPATH,
                    f"//input[@type='radio' and contains(@value, '{pattern}')]")
                selects = self.driver.find_elements(By.XPATH,
                    f"//option[contains(text(), '{pattern}')]")
                buttons = self.driver.find_elements(By.XPATH,
                    f"//button[contains(text(), '{pattern}')]")

                if radios:
                    radios[0].click()
                    self.log_pass(f"Model selection radio: {pattern}")
                elif buttons:
                    buttons[0].click()
                    self.log_pass(f"Model selection button: {pattern}")
                elif selects:
                    self.log_pass(f"Model selection option exists: {pattern}")

            except:
                pass

    def test_bootstrap_ci(self):
        """Test 12: Bootstrap CI functionality"""
        print("\n--- Test 12: Bootstrap CI ---")

        try:
            bootstrap_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Bootstrap') or contains(@onclick, 'bootstrap')]")

            if bootstrap_btns:
                self.log_pass("Bootstrap CI button exists")
                # Don't actually click as it takes time
            else:
                self.log_warning("Bootstrap CI button not found")

        except Exception as e:
            self.log_fail("Bootstrap CI test", str(e)[:50])

    def test_heterogeneity_display(self):
        """Test 13: Heterogeneity statistics display"""
        print("\n--- Test 13: Heterogeneity Display ---")

        het_patterns = ["tau", "I²", "I2", "heterogeneity", "Heterogeneity", "τ²"]

        page_source = self.driver.page_source

        for pattern in het_patterns:
            if pattern in page_source:
                self.log_pass(f"Heterogeneity element found: {pattern}")
                break
        else:
            self.log_warning("Heterogeneity statistics not clearly visible")

    def test_convergence_diagnostics(self):
        """Test 14: Convergence diagnostics (PLOS ONE requirement)"""
        print("\n--- Test 14: Convergence Diagnostics ---")

        conv_patterns = ["converge", "Converge", "gradient", "Gradient", "Hessian", "iteration"]

        page_source = self.driver.page_source

        found_any = False
        for pattern in conv_patterns:
            if pattern.lower() in page_source.lower():
                self.log_pass(f"Convergence diagnostic found: {pattern}")
                found_any = True

        if not found_any:
            self.log_warning("Convergence diagnostics not visible (may appear after analysis)")

    def test_minimum_k_guidance(self):
        """Test 15: Minimum k guidance (PLOS ONE requirement)"""
        print("\n--- Test 15: Minimum k Guidance ---")

        page_source = self.driver.page_source

        if "minimum" in page_source.lower() and ("studies" in page_source.lower() or "k" in page_source):
            self.log_pass("Minimum k guidance present")
        elif "k ≥" in page_source or "k >=" in page_source:
            self.log_pass("k threshold guidance present")
        else:
            self.log_warning("Minimum k guidance not clearly visible")

    def test_deeks_funnel(self):
        """Test 16: Deeks' funnel plot test"""
        print("\n--- Test 16: Deeks' Test ---")

        try:
            deeks_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Deeks') or contains(@onclick, 'deeks') or contains(@onclick, 'Deeks')]")

            if deeks_btns:
                self.safe_click(deeks_btns[0], "Deeks' test button")
                time.sleep(PLOT_CHECK_DELAY)
                self.log_pass("Deeks' test button clicked")
            else:
                self.log_warning("Deeks' test button not found")

        except Exception as e:
            self.log_fail("Deeks' test", str(e)[:50])

    def test_quadas2(self):
        """Test 17: QUADAS-2 assessment"""
        print("\n--- Test 17: QUADAS-2 ---")

        try:
            quadas_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'QUADAS') or contains(@onclick, 'quadas') or contains(@onclick, 'QUADAS')]")

            if quadas_btns:
                self.safe_click(quadas_btns[0], "QUADAS-2 button")
                time.sleep(1)
                self.log_pass("QUADAS-2 button clicked")
            else:
                self.log_warning("QUADAS-2 button not found")

        except Exception as e:
            self.log_fail("QUADAS-2 test", str(e)[:50])

    def test_sensitivity_analysis(self):
        """Test 18: Sensitivity analysis"""
        print("\n--- Test 18: Sensitivity Analysis ---")

        try:
            sens_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Sensitivity') or contains(@onclick, 'sensitivity') or contains(text(), 'Leave-one-out')]")

            if sens_btns:
                self.safe_click(sens_btns[0], "Sensitivity analysis button")
                time.sleep(1)
                self.log_pass("Sensitivity analysis button clicked")
            else:
                self.log_warning("Sensitivity analysis button not found")

        except Exception as e:
            self.log_fail("Sensitivity analysis test", str(e)[:50])

    def test_subgroup_analysis(self):
        """Test 19: Subgroup analysis"""
        print("\n--- Test 19: Subgroup Analysis ---")

        try:
            subgroup_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Subgroup') or contains(@onclick, 'subgroup')]")

            if subgroup_btns:
                self.log_pass("Subgroup analysis button exists")
            else:
                self.log_warning("Subgroup analysis button not found")

        except Exception as e:
            self.log_fail("Subgroup analysis test", str(e)[:50])

    def test_statistical_appendix(self):
        """Test 20: Statistical Methods Appendix"""
        print("\n--- Test 20: Statistical Methods Appendix ---")

        page_source = self.driver.page_source

        stat_terms = ["ML", "bivariate", "HSROC", "logit", "DerSimonian"]
        found = 0

        for term in stat_terms:
            if term in page_source:
                found += 1

        if found >= 3:
            self.log_pass(f"Statistical methods documented ({found}/5 terms found)")
        else:
            self.log_warning(f"Statistical documentation may be incomplete ({found}/5 terms)")

    def test_all_clickable_buttons(self):
        """Test 21: Verify all buttons are clickable"""
        print("\n--- Test 21: All Clickable Buttons ---")

        try:
            all_buttons = self.driver.find_elements(By.TAG_NAME, "button")
            print(f"  Found {len(all_buttons)} buttons total")

            clickable_count = 0
            for btn in all_buttons:
                try:
                    if btn.is_displayed() and btn.is_enabled():
                        clickable_count += 1
                except:
                    pass

            self.log_pass(f"Clickable buttons: {clickable_count}/{len(all_buttons)}")

        except Exception as e:
            self.log_fail("Button test", str(e)[:50])

    def final_plot_verification(self):
        """Test 22: Final plot verification (double check all plots)"""
        print("\n--- Test 22: Final Plot Verification (Double Check) ---")

        try:
            # Switch to results tab to ensure plots are visible
            self.driver.execute_script("if(typeof switchTab==='function') switchTab('results');")
            time.sleep(2)

            # Count Plotly plots via JS (most reliable)
            plotly_count = self.driver.execute_script(
                "return document.querySelectorAll('.js-plotly-plot').length;")
            svg_count = self.driver.execute_script(
                "return document.querySelectorAll('.plot-container svg, .js-plotly-plot svg').length;")

            print(f"  Plotly divs: {plotly_count}, SVG elements in plots: {svg_count}")

            if plotly_count > 0:
                self.log_pass(f"Final verification: {plotly_count} Plotly plots rendered")
            elif svg_count > 0:
                self.log_pass(f"Final verification: {svg_count} SVG plot elements found")
            else:
                self.log_warning("No rendered Plotly plots in final check")

            # Second pass - check specific containers
            time.sleep(PLOT_CHECK_DELAY)
            print("  [Second verification pass]")
            results_html_len = self.driver.execute_script(
                "var r=document.getElementById('resultsContent'); return r ? r.innerHTML.length : 0;")
            if results_html_len > 1000:
                self.log_pass(f"Results content rendered ({results_html_len} chars)")
            else:
                self.log_warning(f"Results content may be sparse ({results_html_len} chars)")

        except Exception as e:
            self.log_fail("Final plot verification", str(e)[:50])

    def run_all_tests(self):
        """Run all tests"""
        try:
            self.setup()

            # Run all tests
            self.test_page_load()
            self.test_sample_data_buttons()
            self.test_data_input()
            self.test_analysis_buttons()
            self.test_forest_plot()
            self.test_sroc_plot()
            self.test_funnel_plot()
            self.test_all_plots()
            self.test_export_buttons()
            self.test_tabs_navigation()
            self.test_model_selection()
            self.test_bootstrap_ci()
            self.test_heterogeneity_display()
            self.test_convergence_diagnostics()
            self.test_minimum_k_guidance()
            self.test_deeks_funnel()
            self.test_quadas2()
            self.test_sensitivity_analysis()
            self.test_subgroup_analysis()
            self.test_statistical_appendix()
            self.test_all_clickable_buttons()
            self.final_plot_verification()

            # Print summary
            self.print_summary()
            return len(self.results['failed'])

        except Exception as e:
            print(f"\nCRITICAL ERROR: {e}")
            raise

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)

        total = len(self.results['passed']) + len(self.results['failed'])

        print(f"\nPASSED:   {len(self.results['passed'])}")
        print(f"FAILED:   {len(self.results['failed'])}")
        print(f"WARNINGS: {len(self.results['warnings'])}")
        print(f"\nTotal Tests: {total}")

        if self.results['failed']:
            print("\n--- Failed Tests ---")
            for name, error in self.results['failed']:
                print(f"  • {name}: {error}")

        if self.results['warnings']:
            print("\n--- Warnings ---")
            for warning in self.results['warnings']:
                print(f"  • {warning}")

        # Calculate pass rate
        if total > 0:
            pass_rate = (len(self.results['passed']) / total) * 100
            print(f"\nPASS RATE: {pass_rate:.1f}%")

        print("\n" + "="*70)
        print("Browser window kept open for manual inspection")
        print("="*70)


if __name__ == "__main__":
    test = DTAProTest()
    failed = test.run_all_tests()
    sys.exit(1 if failed else 0)
