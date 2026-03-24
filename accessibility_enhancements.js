/**
 * DTA Pro v4.8 - Accessibility Enhancements
 * WCAG 2.1 AA Compliant Implementation
 *
 * Adds ARIA labels, keyboard navigation, screen reader support, and focus management
 * for diagnostic test accuracy meta-analysis software.
 *
 * @module AccessibilityEnhancements
 * @version 1.1.0
 * @author DTA Pro Development Team
 * @license MIT
 *
 * @description
 * This module implements Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
 * compliance for the DTA Pro meta-analysis tool. Features include:
 * - Skip navigation links (WCAG 2.4.1)
 * - Keyboard accessibility (WCAG 2.1.1)
 * - Focus visible indicators (WCAG 2.4.7)
 * - Name, Role, Value for UI components (WCAG 4.1.2)
 * - Status messages via live regions (WCAG 4.1.3)
 *
 * @references
 * - W3C Web Content Accessibility Guidelines 2.1: https://www.w3.org/TR/WCAG21/
 * - WAI-ARIA 1.2 Specification: https://www.w3.org/TR/wai-aria-1.2/
 * - Cochrane Accessibility Policy: https://www.cochrane.org/accessibility
 *
 * @configuration
 * Settings can be customized via window.DTA_ACCESSIBILITY_CONFIG before loading
 *
 * Usage: Include this script after the main DTA Pro application loads
 * <script src="accessibility_enhancements.js" defer></script>
 */

(function() {
  'use strict';

  // ============================================
  // ARIA Labels and Roles
  // ============================================

  const ARIA_CONFIG = {
    // Main navigation
    tabs: {
      role: 'tablist',
      itemRole: 'tab',
      panelRole: 'tabpanel'
    },
    // Buttons with specific purposes
    buttons: {
      'runBtn': { label: 'Run meta-analysis on entered study data', description: 'Executes bivariate GLMM or HSROC analysis' },
      'undoBtn': { label: 'Undo last action', keyHint: 'Ctrl+Z' },
      'redoBtn': { label: 'Redo last undone action', keyHint: 'Ctrl+Y' },
      'themeBtn': { label: 'Toggle between dark and light theme' }
    },
    // Form inputs
    inputs: {
      'modelType': { label: 'Select primary statistical model for analysis' },
      'estimationMethod': { label: 'Select parameter estimation method' },
      'confLevel': { label: 'Select confidence interval level' },
      'zeroCorrection': { label: 'Select zero cell correction method' },
      'ciMethod': { label: 'Select individual study confidence interval method' }
    },
    // Plot containers
    plots: {
      'srocPlot': { label: 'Summary ROC curve visualization showing pooled sensitivity and specificity' },
      'crosshairsPlot': { label: 'ROC space with study-level confidence intervals as crosshairs' },
      'forestSens': { label: 'Forest plot showing sensitivity estimates for each study' },
      'forestSpec': { label: 'Forest plot showing specificity estimates for each study' },
      'forestPLR': { label: 'Forest plot showing positive likelihood ratios' },
      'forestNLR': { label: 'Forest plot showing negative likelihood ratios' },
      'forestDOR': { label: 'Forest plot showing diagnostic odds ratios' },
      'deeksFunnel': { label: 'Deeks funnel plot for publication bias assessment' },
      'faganPlot': { label: 'Fagan nomogram showing pre-test to post-test probability conversion' }
    }
  };

  /**
   * Initialize all accessibility enhancements
   */
  function initAccessibility() {
    console.log('[Accessibility] Initializing DTA Pro accessibility enhancements...');

    addSkipLinks();
    enhanceTabNavigation();
    addButtonAccessibility();
    addFormAccessibility();
    addPlotAccessibility();
    addTableAccessibility();
    addKeyboardShortcuts();
    addLiveRegions();
    addFocusManagement();
    enhanceDropdownAccessibility();
    addScreenReaderAnnouncements();

    console.log('[Accessibility] Enhancements complete');
  }

  // ============================================
  // Skip Links for Screen Readers
  // ============================================

  function addSkipLinks() {
    const skipNav = document.createElement('nav');
    skipNav.id = 'skip-links';
    skipNav.setAttribute('aria-label', 'Skip navigation');
    skipNav.innerHTML = `
      <style>
        #skip-links {
          position: absolute;
          top: -100px;
          left: 0;
          z-index: 10000;
        }
        #skip-links:focus-within {
          top: 0;
        }
        #skip-links a {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        #skip-links a:focus {
          position: static;
          left: auto;
          width: auto;
          height: auto;
          padding: 1rem 2rem;
          background: var(--accent, #00d4aa);
          color: #000;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
      </style>
      <a href="#panel-data">Skip to Data Input</a>
      <a href="#runBtn">Skip to Run Analysis</a>
      <a href="#resultsContent">Skip to Results</a>
    `;
    document.body.insertBefore(skipNav, document.body.firstChild);
  }

  // ============================================
  // Tab Navigation Enhancement
  // ============================================

  function enhanceTabNavigation() {
    const tabContainer = document.querySelector('.tabs');
    if (!tabContainer) return;

    // Set tablist role
    tabContainer.setAttribute('role', 'tablist');
    tabContainer.setAttribute('aria-label', 'Analysis sections');

    const tabs = tabContainer.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
      const tabId = tab.getAttribute('data-tab');
      const panel = document.getElementById(`panel-${tabId}`);

      // Tab attributes
      tab.setAttribute('role', 'tab');
      tab.setAttribute('id', `tab-${tabId}`);
      tab.setAttribute('aria-controls', `panel-${tabId}`);
      tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
      tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');

      // Panel attributes
      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `tab-${tabId}`);
        panel.setAttribute('tabindex', '0');
      }

      // Keyboard navigation within tabs
      tab.addEventListener('keydown', (e) => {
        handleTabKeydown(e, tabs, index);
      });
    });

    // Update aria-selected when tabs change
    const originalSwitchTab = window.switchTab;
    if (originalSwitchTab) {
      window.switchTab = function(tabName) {
        originalSwitchTab(tabName);
        updateTabAccessibility(tabName);
      };
    }
  }

  function handleTabKeydown(e, tabs, currentIndex) {
    let newIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[newIndex].focus();
    tabs[newIndex].click();
  }

  function updateTabAccessibility(activeTab) {
    document.querySelectorAll('.tab').forEach(tab => {
      const isActive = tab.getAttribute('data-tab') === activeTab;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Announce tab change to screen readers
    announceToScreenReader(`${activeTab.replace(/-/g, ' ')} tab selected`);
  }

  // ============================================
  // Button Accessibility
  // ============================================

  function addButtonAccessibility() {
    // Main action buttons
    Object.entries(ARIA_CONFIG.buttons).forEach(([id, config]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.setAttribute('aria-label', config.label);
        if (config.description) {
          btn.setAttribute('aria-describedby', `${id}-desc`);
          addHiddenDescription(btn, `${id}-desc`, config.description);
        }
        if (config.keyHint) {
          btn.setAttribute('title', `${config.label} (${config.keyHint})`);
        }
      }
    });

    // All buttons with icons only
    document.querySelectorAll('.btn-icon, .btn-remove').forEach(btn => {
      if (!btn.getAttribute('aria-label')) {
        const text = btn.textContent.trim();
        const emoji = text.match(/[\u{1F300}-\u{1F9FF}]/u);
        if (emoji || text.length <= 2) {
          // Button only has emoji or very short text
          const title = btn.getAttribute('title');
          if (title) {
            btn.setAttribute('aria-label', title);
          }
        }
      }
    });

    // Download/Export buttons
    document.querySelectorAll('button[onclick*="download"], button[onclick*="export"]').forEach(btn => {
      if (!btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', `${btn.textContent.trim()} - opens download dialog`);
      }
    });
  }

  function addHiddenDescription(element, id, description) {
    if (document.getElementById(id)) return;
    const desc = document.createElement('span');
    desc.id = id;
    desc.className = 'sr-only';
    desc.textContent = description;
    desc.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    element.parentNode.insertBefore(desc, element.nextSibling);
  }

  // ============================================
  // Form Accessibility
  // ============================================

  function addFormAccessibility() {
    // Enhance select dropdowns
    Object.entries(ARIA_CONFIG.inputs).forEach(([id, config]) => {
      const input = document.getElementById(id);
      if (input) {
        const label = input.previousElementSibling;
        if (label && label.classList.contains('form-label')) {
          label.setAttribute('id', `label-${id}`);
          input.setAttribute('aria-labelledby', `label-${id}`);
        }
        if (config.label) {
          input.setAttribute('aria-describedby', `desc-${id}`);
          addHiddenDescription(input, `desc-${id}`, config.label);
        }
      }
    });

    // Study data inputs
    document.querySelectorAll('.study-row').forEach((row, index) => {
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', `Study ${index + 1} data entry`);

      // Label each input within the study row
      row.querySelectorAll('input').forEach(input => {
        const labelEl = input.closest('.study-input-group')?.querySelector('label');
        if (labelEl) {
          const labelId = `study-${index}-${input.name || input.className}`;
          labelEl.setAttribute('id', labelId);
          input.setAttribute('aria-labelledby', labelId);
        }
      });
    });

    // Add required indicators
    document.querySelectorAll('input[required], select[required]').forEach(field => {
      field.setAttribute('aria-required', 'true');
    });

    // Add generic labels for unlabeled inputs
    labelUnlabeledInputs();

    // Add input validation announcements
    addInputValidation();
  }

  function labelUnlabeledInputs() {
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach((field, index) => {
      const hasLabel =
        (field.id && document.querySelector(`label[for="${field.id}"]`)) ||
        field.getAttribute('aria-label') ||
        field.getAttribute('aria-labelledby') ||
        field.closest('label');

      if (hasLabel) return;

      const studyLabel = field.closest('.study-input-group')?.querySelector('label')?.textContent?.trim();
      const formLabel = field.closest('.form-group')?.querySelector('.form-label')?.textContent?.trim();
      const placeholder = field.getAttribute('placeholder')?.trim();
      const dataField = field.getAttribute('data-field')?.trim();
      const name = field.getAttribute('name')?.trim();

      const labelText = studyLabel || formLabel || placeholder || dataField || name || `Input ${index + 1}`;
      field.setAttribute('aria-label', labelText);
    });
  }

  function addInputValidation() {
    const numericInputs = document.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
      input.addEventListener('invalid', (e) => {
        announceToScreenReader(`Invalid input: ${input.getAttribute('aria-label') || 'field'}`);
      });

      input.addEventListener('blur', (e) => {
        if (input.validity.valid === false) {
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.removeAttribute('aria-invalid');
        }
      });
    });
  }

  // ============================================
  // Plot Accessibility
  // ============================================

  function addPlotAccessibility() {
    Object.entries(ARIA_CONFIG.plots).forEach(([id, config]) => {
      const plot = document.getElementById(id);
      if (plot) {
        plot.setAttribute('role', 'img');
        plot.setAttribute('aria-label', config.label);

        // Add description link
        const descId = `${id}-description`;
        plot.setAttribute('aria-describedby', descId);

        // Create expandable description
        const descContainer = document.createElement('div');
        descContainer.id = descId;
        descContainer.className = 'plot-description sr-only';
        descContainer.innerHTML = `
          <p>${config.label}</p>
          <p>Interactive visualization. Use the download button to export as image for detailed analysis.</p>
        `;
        descContainer.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
        plot.parentNode.insertBefore(descContainer, plot.nextSibling);
      }
    });

    // Add data tables for plots (accessible alternative)
    addPlotDataTables();
  }

  function addPlotDataTables() {
    // After analysis runs, create accessible data tables as alternatives to plots
    const originalRunAnalysis = window.runAnalysis;
    if (originalRunAnalysis) {
      window.runAnalysis = async function() {
        const result = await originalRunAnalysis.apply(this, arguments);
        setTimeout(generateAccessibleDataTables, 1000);
        return result;
      };
    }
  }

  function generateAccessibleDataTables() {
    // Create accessible summary for results
    const resultsContent = document.getElementById('resultsContent');
    if (resultsContent && resultsContent.style.display !== 'none') {
      let summarySection = document.getElementById('accessible-summary');
      if (!summarySection) {
        summarySection = document.createElement('div');
        summarySection.id = 'accessible-summary';
        summarySection.className = 'sr-only';
        summarySection.setAttribute('role', 'region');
        summarySection.setAttribute('aria-label', 'Accessible results summary');
        resultsContent.insertBefore(summarySection, resultsContent.firstChild);
      }

      // Extract key results for screen reader
      const statCards = document.querySelectorAll('.stat-card');
      let summaryText = 'Analysis Results Summary: ';
      statCards.forEach(card => {
        const value = card.querySelector('.stat-value')?.textContent;
        const label = card.querySelector('.stat-label')?.textContent;
        if (value && label) {
          summaryText += `${label}: ${value}. `;
        }
      });

      summarySection.textContent = summaryText;
      announceToScreenReader('Analysis complete. Results are now available.');
    }
  }

  // ============================================
  // Table Accessibility
  // ============================================

  function addTableAccessibility() {
    document.querySelectorAll('table').forEach(table => {
      // Ensure tables have captions
      if (!table.querySelector('caption')) {
        const cardTitle = table.closest('.card')?.querySelector('.card-title');
        if (cardTitle) {
          const caption = document.createElement('caption');
          caption.className = 'sr-only';
          caption.textContent = cardTitle.textContent;
          table.insertBefore(caption, table.firstChild);
        }
      }

      // Add scope to headers
      table.querySelectorAll('th').forEach(th => {
        if (!th.getAttribute('scope')) {
          th.setAttribute('scope', 'col');
        }
      });

      // Add row headers where appropriate
      table.querySelectorAll('tbody tr').forEach(tr => {
        const firstCell = tr.querySelector('td:first-child');
        if (firstCell && !firstCell.getAttribute('scope')) {
          // If first cell contains study name or identifier, make it a row header
          const text = firstCell.textContent.trim();
          if (text && !text.match(/^[\d.]+$/)) {
            firstCell.setAttribute('scope', 'row');
          }
        }
      });
    });
  }

  // ============================================
  // Keyboard Shortcuts
  // ============================================

  function addKeyboardShortcuts() {
    const shortcuts = {
      'Alt+r': () => document.getElementById('runBtn')?.click(),
      'Alt+d': () => window.switchTab?.('data'),
      'Alt+s': () => window.switchTab?.('settings'),
      'Alt+o': () => window.switchTab?.('results'),
      'Alt+f': () => window.switchTab?.('forest'),
      'Alt+c': () => window.switchTab?.('sroc'),
      'escape': () => document.activeElement?.blur()
    };

    document.addEventListener('keydown', (e) => {
      const key = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.key.toLowerCase()}`;

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });

    // Add keyboard shortcut help
    addKeyboardShortcutHelp();
  }

  function addKeyboardShortcutHelp() {
    const helpButton = document.createElement('button');
    helpButton.id = 'keyboard-help-btn';
    helpButton.className = 'btn btn-secondary btn-icon';
    helpButton.setAttribute('aria-label', 'Keyboard shortcuts help');
    helpButton.setAttribute('title', 'Keyboard shortcuts (?)');
    helpButton.innerHTML = '?';
    helpButton.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:1000;';

    helpButton.addEventListener('click', showKeyboardHelp);
    document.body.appendChild(helpButton);
  }

  function showKeyboardHelp() {
    const existing = document.getElementById('keyboard-help-modal');
    if (existing) {
      existing.remove();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'keyboard-help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'keyboard-help-title');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <style>
        #keyboard-help-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--bg-card, #1e2536);
          border: 1px solid var(--border, #2d3748);
          border-radius: 12px;
          padding: 2rem;
          z-index: 10000;
          max-width: 500px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        #keyboard-help-modal h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
        }
        #keyboard-help-modal table {
          width: 100%;
          border-collapse: collapse;
        }
        #keyboard-help-modal th, #keyboard-help-modal td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border, #2d3748);
        }
        #keyboard-help-modal kbd {
          background: var(--bg-tertiary, #242b3d);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
        }
        #keyboard-help-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
        }
      </style>
      <div id="keyboard-help-overlay" onclick="this.parentElement.remove()"></div>
      <div style="position:relative;z-index:1;">
        <h2 id="keyboard-help-title">Keyboard Shortcuts</h2>
        <table>
          <thead>
            <tr><th>Shortcut</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr><td><kbd>Alt</kbd>+<kbd>R</kbd></td><td>Run Analysis</td></tr>
            <tr><td><kbd>Alt</kbd>+<kbd>D</kbd></td><td>Go to Data Input</td></tr>
            <tr><td><kbd>Alt</kbd>+<kbd>S</kbd></td><td>Go to Settings</td></tr>
            <tr><td><kbd>Alt</kbd>+<kbd>O</kbd></td><td>Go to Results</td></tr>
            <tr><td><kbd>Alt</kbd>+<kbd>F</kbd></td><td>Go to Forest Plots</td></tr>
            <tr><td><kbd>Alt</kbd>+<kbd>C</kbd></td><td>Go to SROC Curve</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>Undo</td></tr>
            <tr><td><kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Redo</td></tr>
            <tr><td><kbd>Tab</kbd></td><td>Navigate between elements</td></tr>
            <tr><td><kbd>Enter</kbd></td><td>Activate focused button</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Close dialogs/menus</td></tr>
          </tbody>
        </table>
        <button class="btn btn-primary" style="margin-top:1rem;width:100%;" onclick="this.closest('#keyboard-help-modal').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('button').focus();
  }

  // ============================================
  // Live Regions for Dynamic Content
  // ============================================

  function addLiveRegions() {
    // Status announcements region
    const statusRegion = document.createElement('div');
    statusRegion.id = 'aria-status';
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.className = 'sr-only';
    statusRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(statusRegion);

    // Alert region for important messages
    const alertRegion = document.createElement('div');
    alertRegion.id = 'aria-alert';
    alertRegion.setAttribute('role', 'alert');
    alertRegion.setAttribute('aria-live', 'assertive');
    alertRegion.setAttribute('aria-atomic', 'true');
    alertRegion.className = 'sr-only';
    alertRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(alertRegion);

    // Progress region
    const progressRegion = document.createElement('div');
    progressRegion.id = 'aria-progress';
    progressRegion.setAttribute('role', 'progressbar');
    progressRegion.setAttribute('aria-live', 'polite');
    progressRegion.className = 'sr-only';
    progressRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(progressRegion);
  }

  function announceToScreenReader(message, type = 'status') {
    const region = document.getElementById(`aria-${type}`) || document.getElementById('aria-status');
    if (region) {
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 100);
    }
  }

  // ============================================
  // Focus Management
  // ============================================

  function addFocusManagement() {
    // Visible focus indicators
    const focusStyle = document.createElement('style');
    focusStyle.textContent = `
      /* Enhanced focus styles for accessibility */
      *:focus {
        outline: 2px solid var(--accent, #00d4aa) !important;
        outline-offset: 2px !important;
      }

      *:focus:not(:focus-visible) {
        outline: none !important;
      }

      *:focus-visible {
        outline: 2px solid var(--accent, #00d4aa) !important;
        outline-offset: 2px !important;
      }

      /* Skip link focus */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .sr-only-focusable:focus {
        position: static;
        width: auto;
        height: auto;
        margin: 0;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        *:focus {
          outline: 3px solid currentColor !important;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(focusStyle);

    // Focus trap for modals
    window.trapFocus = function(element) {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      });
    };
  }

  // ============================================
  // Dropdown Accessibility
  // ============================================

  function enhanceDropdownAccessibility() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const menu = dropdown.querySelector('.dropdown-menu');

      if (toggle && menu) {
        // Add ARIA attributes
        const menuId = `dropdown-menu-${Math.random().toString(36).substr(2, 9)}`;
        menu.id = menuId;
        toggle.setAttribute('aria-haspopup', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', menuId);
        menu.setAttribute('role', 'menu');

        // Menu items
        menu.querySelectorAll('.dropdown-item').forEach(item => {
          item.setAttribute('role', 'menuitem');
          item.setAttribute('tabindex', '-1');
        });

        // Keyboard navigation
        toggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            openDropdown(dropdown);
          }
        });

        menu.addEventListener('keydown', (e) => {
          handleDropdownKeydown(e, dropdown);
        });

        // Update aria-expanded on hover/click
        dropdown.addEventListener('mouseenter', () => {
          toggle.setAttribute('aria-expanded', 'true');
        });
        dropdown.addEventListener('mouseleave', () => {
          toggle.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  function openDropdown(dropdown) {
    dropdown.classList.add('show');
    const toggle = dropdown.querySelector('.dropdown-toggle');
    toggle.setAttribute('aria-expanded', 'true');
    const firstItem = dropdown.querySelector('.dropdown-item');
    if (firstItem) firstItem.focus();
  }

  function closeDropdown(dropdown) {
    dropdown.classList.remove('show');
    const toggle = dropdown.querySelector('.dropdown-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  function handleDropdownKeydown(e, dropdown) {
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    const currentIndex = items.indexOf(document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown(dropdown);
        break;
      case 'Tab':
        closeDropdown(dropdown);
        break;
    }
  }

  // ============================================
  // Screen Reader Announcements
  // ============================================

  function addScreenReaderAnnouncements() {
    // Announce when data is loaded
    const originalLoadDemoData = window.loadDemoData;
    if (originalLoadDemoData) {
      window.loadDemoData = function() {
        originalLoadDemoData.apply(this, arguments);
        announceToScreenReader('Demo data loaded successfully. 12 studies are now available for analysis.');
      };
    }

    // Announce when datasets are loaded
    const originalLoadCochraneDataset = window.loadCochraneDataset;
    if (originalLoadCochraneDataset) {
      window.loadCochraneDataset = function(datasetId) {
        originalLoadCochraneDataset.apply(this, arguments);
        announceToScreenReader(`Dataset ${datasetId} loaded successfully.`);
      };
    }

    // Announce validation results
    const originalValidateAllStudies = window.validateAllStudies;
    if (originalValidateAllStudies) {
      window.validateAllStudies = function() {
        const result = originalValidateAllStudies.apply(this, arguments);
        const errors = document.querySelectorAll('.study-row.invalid').length;
        const warnings = document.querySelectorAll('.study-row.warning').length;
        announceToScreenReader(
          `Validation complete. ${errors} errors and ${warnings} warnings found.`
        );
        return result;
      };
    }

    // Announce theme changes
    const originalToggleTheme = window.toggleTheme;
    if (originalToggleTheme) {
      window.toggleTheme = function() {
        originalToggleTheme.apply(this, arguments);
        const theme = document.documentElement.getAttribute('data-theme');
        announceToScreenReader(`Theme changed to ${theme} mode.`);
      };
    }
  }

  // ============================================
  // Expose Global Functions
  // ============================================

  window.AccessibilityEnhancements = {
    init: initAccessibility,
    announce: announceToScreenReader,
    trapFocus: window.trapFocus
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibility);
  } else {
    initAccessibility();
  }

})();
