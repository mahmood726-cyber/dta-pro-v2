"""
DTA Pro v4.9.2 - Verification Test
Tests Afzali dataset loading and all plots
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import os
import sys

HTML_PATH = r"C:\HTML apps\DTA_Pro_Review\dta-pro-v3.7.html"
EXPECTED_VERSION = "v4.9.2"

class VerifyTest:
    def __init__(self):
        self.driver = None
        self.passed = 0
        self.failed = 0

    def setup(self):
        print("\n" + "="*60)
        print("DTA Pro v4.9.2 - Verification Test")
        print("="*60)

        options = Options()
        options.add_argument("--start-maximized")
        options.add_experimental_option("detach", True)

        self.driver = webdriver.Chrome(options=options)
        file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"
        print(f"\nLoading: {file_url}")
        self.driver.get(file_url)
        time.sleep(2)
        self.dismiss_alerts()

    def dismiss_alerts(self):
        for _ in range(10):
            try:
                alert = self.driver.switch_to.alert
                print(f"  [Alert: {alert.text[:40]}...]")
                alert.accept()
                time.sleep(0.3)
            except:
                break

    def log(self, result, msg):
        if result:
            self.passed += 1
            print(f"  [PASS] {msg}")
        else:
            self.failed += 1
            print(f"  [FAIL] {msg}")

    def js_click(self, script):
        try:
            self.driver.execute_script(script)
            time.sleep(0.5)
            self.dismiss_alerts()
            return True
        except Exception as e:
            print(f"    Error: {str(e)[:50]}")
            return False

    def run(self):
        self.setup()

        # Test 1: Check version
        print("\n--- Test 1: Version Check ---")
        title = self.driver.title
        self.log(EXPECTED_VERSION in title, f"Title: {title}")

        source = self.driver.page_source
        self.log("Afzali" in source, "Afzali dataset menu item present")
        self.log("Glas" in source, "Glas dataset menu item present")

        # Test 2: Load Afzali dataset
        print("\n--- Test 2: Load Afzali Dataset ---")
        result = self.js_click("loadCochraneDataset('afzali')")
        self.log(result, "Called loadCochraneDataset('afzali')")
        time.sleep(1)

        # Check studies loaded
        studies = self.driver.find_elements(By.CSS_SELECTOR, ".study-row")
        self.log(len(studies) >= 10, f"Studies loaded: {len(studies)} (expect 10)")

        # Test 3: Run Analysis
        print("\n--- Test 3: Run Analysis ---")
        result = self.js_click("runAnalysis()")
        self.log(result, "Called runAnalysis()")
        time.sleep(3)
        self.dismiss_alerts()

        # Check results
        source = self.driver.page_source
        self.log("0.9" in source, "Results contain sensitivity ~0.9")

        # Test 4: Generate SROC
        print("\n--- Test 4: SROC Plot ---")
        self.js_click("switchTab('sroc')")
        time.sleep(1)

        # Check srocPlot div
        try:
            sroc = self.driver.find_element(By.ID, "srocPlot")
            inner = sroc.get_attribute("innerHTML")
            self.log(len(inner) > 100, f"SROC plot has content ({len(inner)} chars)")
        except:
            self.log(False, "SROC plot div not found")

        # Test 5: Forest Plots
        print("\n--- Test 5: Forest Plots ---")
        self.js_click("switchTab('forest')")
        time.sleep(1)

        # Try to generate forest plot
        self.js_click("document.querySelector('button[onclick*=\"Forest\"]')?.click()")
        time.sleep(2)

        # Check any forest plot (correct IDs: forestSens, forestSpec, forestDOR)
        for pid in ["forestSens", "forestSpec", "forestDOR", "forestPLR", "forestNLR"]:
            try:
                elem = self.driver.find_element(By.ID, pid)
                inner = elem.get_attribute("innerHTML")
                if len(inner) > 100:
                    self.log(True, f"Forest plot rendered: {pid}")
                    break
            except:
                pass
        else:
            self.log(False, "No forest plots found")

        # Test 6: Deeks Funnel
        print("\n--- Test 6: Deeks' Funnel Plot ---")
        self.js_click("switchTab('bias')")
        time.sleep(1)

        self.js_click("document.querySelector('button[onclick*=\"deeks\"]')?.click() || document.querySelector('button[onclick*=\"Deeks\"]')?.click()")
        time.sleep(2)

        try:
            funnel = self.driver.find_element(By.ID, "deeksFunnel")
            inner = funnel.get_attribute("innerHTML")
            self.log(len(inner) > 100, f"Deeks funnel has content ({len(inner)} chars)")
        except:
            self.log(False, "Deeks funnel not found")

        # Test 7: All Plot Containers
        print("\n--- Test 7: All Plot Containers ---")
        plots = self.driver.find_elements(By.XPATH, "//*[contains(@id, 'Plot') or contains(@id, 'plot')]")
        plots_with_content = sum(1 for p in plots if len(p.get_attribute("innerHTML") or "") > 100)
        self.log(plots_with_content > 0, f"Plots with content: {plots_with_content}/{len(plots)}")

        # Second check
        time.sleep(2)
        plots2 = self.driver.find_elements(By.XPATH, "//*[contains(@id, 'Plot') or contains(@id, 'plot')]")
        plots_with_content2 = sum(1 for p in plots2 if len(p.get_attribute("innerHTML") or "") > 100)
        self.log(plots_with_content2 > 0, f"Second check: {plots_with_content2}/{len(plots2)}")

        # Summary
        print("\n" + "="*60)
        print("VERIFICATION SUMMARY")
        print("="*60)
        total = self.passed + self.failed
        print(f"\nPASSED: {self.passed}")
        print(f"FAILED: {self.failed}")
        print(f"TOTAL:  {total}")

        if total > 0:
            rate = (self.passed / total) * 100
            print(f"\nPASS RATE: {rate:.1f}%")

            if rate == 100:
                print("\n*** ALL TESTS PASSED ***")
            elif rate >= 90:
                print("\n*** EXCELLENT ***")

        print("\n" + "="*60)
        return 1 if self.failed > 0 else 0


if __name__ == "__main__":
    test = VerifyTest()
    sys.exit(test.run())
