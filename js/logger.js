'use strict';

/**
 * Logger: Activity logging screen with form, today's log, and recent history.
 * Provides custom dropdowns, dynamic unit hints, and CO2 preview.
 * @namespace
 */
const Logger = {

  /** Number of recent days to display in history section */
  RECENT_DAYS_COUNT: 6,

  /** Unit label mappings for form display */
  UNIT_LABELS: {
    'kgCO2/km': 'in km', 'kgCO2/day': 'in days', 'kgCO2/kWh': 'in kWh',
    'tonneCO2/year': 'in months', 'kgCO2/flight': 'flights', 'kgCO2/hour': 'in hours'
  },

  /** Short unit suffix mappings */
  UNIT_SHORTS: {
    'kgCO2/km': 'km', 'kgCO2/day': 'days', 'kgCO2/kWh': 'kWh',
    'tonneCO2/year': 'months', 'kgCO2/flight': 'flights', 'kgCO2/hour': 'hours'
  },

  /** Help text mappings for units */
  UNIT_HELPS: {
    'kgCO2/km': 'Enter distance travelled in kilometers (e.g. 15 km to office)',
    'kgCO2/day': 'Enter number of days with this diet (e.g. 1 for today)',
    'kgCO2/kWh': 'Enter electricity used in kWh (check your meter or bill)',
    'tonneCO2/year': 'Enter months of shopping at this level (e.g. 1)',
    'kgCO2/flight': 'Enter number of flights taken (e.g. 1)',
    'kgCO2/hour': 'Enter hours of streaming/usage (e.g. 3)'
  },

  /**
   * Renders the full activity logger screen.
   */
  render() {
    const main = document.getElementById('main-content');
    const todayStr = EcoData.todayString();
    const allLogs = EcoStorage.getLogs();
    const todayLogs = allLogs.filter(l => l.date === todayStr);
    const todayTotal = todayLogs.reduce((sum, l) => sum + (l.co2Kg || 0), 0);

    const firstCat = Object.keys(EcoData.emissionFactors)[0];
    const firstActs = EcoData.emissionFactors[firstCat];
    const firstActKey = Object.keys(firstActs)[0];
    const firstFactor = firstActs[firstActKey];

    const catOpts = Object.keys(EcoData.emissionFactors).map(cat => ({
      value: cat,
      label: `${EcoData.categoryIcons[cat]} ${EcoData.categoryLabels[cat]}`
    }));

    const actOpts = Object.keys(firstActs).map(key => ({
      value: key, label: firstActs[key].label
    }));

    const todayItemsHTML = todayLogs.length > 0
      ? todayLogs.map(log => this.renderLogItem(log)).join('')
      : '<p class="text-muted" style="padding:12px 0;">No activities logged today.</p>';

    const recentHTML = this.renderRecentDays(allLogs, todayStr);

    main.innerHTML = `
      <div class="screen-logger" aria-label="Activity logger">
        <h1 class="screen-title">Log Activity</h1>
        <div class="log-hero">
          <div class="log-hero-left">
            <span class="log-hero-value">${todayTotal.toFixed(1)}</span>
            <span class="log-hero-unit">kg CO\u2082 today</span>
          </div>
          <div class="log-hero-right">
            <span class="log-hero-count">${todayLogs.length}</span>
            <span class="log-hero-unit">entries</span>
          </div>
        </div>
        <div class="card mt-16">
          <h2 class="card-title">New Entry</h2>
          <div class="log-form-grid">
            <div class="form-group">
              <label class="form-label">Category</label>
              ${this.buildCustomSelect('log-category', catOpts, firstCat, 'Select category')}
            </div>
            <div class="form-group">
              <label class="form-label">Activity</label>
              ${this.buildCustomSelect('log-activity', actOpts, firstActKey, 'Select activity')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="log-quantity">Quantity
              <span id="log-unit-badge" class="log-unit-badge">${this.getUnitLabel(firstFactor.unit)}</span>
            </label>
            <div class="log-qty-wrap">
              <input id="log-quantity" class="form-input" type="number" min="0" step="0.1"
                aria-label="Enter quantity" placeholder="e.g. 10"/>
              <span class="log-qty-suffix" id="log-unit-suffix">${this.getUnitShort(firstFactor.unit)}</span>
            </div>
            <p id="log-unit-hint" class="log-unit-hint">${this.getUnitHelp(firstFactor.unit)}</p>
          </div>
          <div class="log-preview-card" aria-live="polite" id="log-preview">
            <p class="text-muted">Enter a quantity to see CO\u2082 estimate</p>
          </div>
          <button id="btn-add-entry" class="btn btn-accent btn-block mt-16" type="button"
            aria-label="Add activity entry">Add Entry</button>
        </div>
        <div class="card mt-16">
          <div class="log-section-header">
            <h2 class="card-title" style="margin-bottom:0;">Today's Log</h2>
            <span class="badge-co2">${todayTotal.toFixed(2)} kg CO\u2082</span>
          </div>
          <div role="list" id="today-log-list">${todayItemsHTML}</div>
        </div>
        ${recentHTML ? `<div class="card mt-16"><h2 class="card-title">Recent Days</h2>${recentHTML}</div>` : ''}
      </div>`;

    this._bindFormEvents(main);
  },

  /**
   * Binds all event listeners for the logger form.
   * @param {HTMLElement} main - The main content container
   */
  _bindFormEvents(main) {
    this.bindCustomSelect('log-category', () => this.updateActivities());
    this.bindCustomSelect('log-activity', () => this.updatePreview());

    document.getElementById('log-quantity').addEventListener('input', () => this.updatePreview());
    document.getElementById('btn-add-entry').addEventListener('click', () => this.addEntry());

    document.addEventListener('click', () => {
      document.querySelectorAll('.csel.open').forEach(c => {
        c.classList.remove('open');
        c.querySelector('.csel-trigger').setAttribute('aria-expanded', 'false');
      });
    });

    main.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.log-delete-btn');
      if (!deleteBtn) return;
      const logId = deleteBtn.dataset.logId;
      if (!logId) return;
      App.showModal('Delete Entry?', 'Are you sure you want to remove this activity log?',
        'Delete', 'Cancel',
        () => { EcoStorage.deleteLog(logId); Logger.render(); },
        true
      );
    });
  },

  /**
   * Repopulates the activity dropdown based on the currently selected category.
   */
  updateActivities() {
    const catCsel = document.getElementById('log-category');
    if (!catCsel) return;
    const category = catCsel.dataset.value;
    const activities = EcoData.emissionFactors[category];
    if (!activities) return;

    const actKeys = Object.keys(activities);
    const options = actKeys.map(k => ({ value: k, label: activities[k].label }));

    const actWrap = document.getElementById('log-activity');
    if (actWrap) {
      const temp = document.createElement('div');
      temp.innerHTML = this.buildCustomSelect('log-activity', options, actKeys[0], 'Select activity');
      actWrap.parentNode.replaceChild(temp.firstChild, actWrap);
      this.bindCustomSelect('log-activity', () => this.updatePreview());
    }
    this.updatePreview();
  },

  /**
   * Updates the live CO2 preview and unit hint based on current selections.
   */
  updatePreview() {
    const categoryEl = document.getElementById('log-category');
    const activityEl = document.getElementById('log-activity');
    const quantityEl = document.getElementById('log-quantity');
    const previewEl = document.getElementById('log-preview');
    if (!categoryEl || !activityEl || !quantityEl || !previewEl) return;

    const category = categoryEl.dataset.value;
    const activity = activityEl.dataset.value;
    const quantity = parseFloat(quantityEl.value) || 0;
    const catData = EcoData.emissionFactors[category];
    const factor = catData ? catData[activity] : null;

    if (factor) {
      const badge = document.getElementById('log-unit-badge');
      const suffix = document.getElementById('log-unit-suffix');
      const hint = document.getElementById('log-unit-hint');
      if (hint) hint.textContent = this.getUnitHelp(factor.unit);
      if (badge) badge.textContent = this.getUnitLabel(factor.unit);
      if (suffix) suffix.textContent = this.getUnitShort(factor.unit);
    }

    if (quantity <= 0 || !factor) {
      previewEl.innerHTML = '<p class="text-muted">Enter a quantity to see CO\u2082 estimate</p>';
      return;
    }

    const co2 = EcoData.calculateEmission(category, activity, quantity);
    previewEl.innerHTML = `<p class="text-muted">Estimated emission</p>
      <p class="log-preview-value">${co2.toFixed(2)} kg CO\u2082</p>`;
  },

  /**
   * Validates input, calculates emission, saves the log entry, and re-renders.
   */
  addEntry() {
    const categoryEl = document.getElementById('log-category');
    const activityEl = document.getElementById('log-activity');
    const quantityEl = document.getElementById('log-quantity');
    if (!categoryEl || !activityEl || !quantityEl) return;

    const category = categoryEl.dataset.value;
    const activity = activityEl.dataset.value;
    const quantity = parseFloat(quantityEl.value);

    if (!quantity || quantity <= 0) {
      App.showToast('Please enter a quantity greater than 0.', 'error');
      return;
    }

    const catData = EcoData.emissionFactors[category];
    const factor = catData ? catData[activity] : null;
    if (!factor) {
      App.showToast('Invalid activity selected.', 'error');
      return;
    }

    const co2Kg = EcoData.calculateEmission(category, activity, quantity);
    EcoStorage.addLog({
      date: EcoData.todayString(), category, activity, quantity,
      unit: factor.unit, co2Kg, source: factor.source
    });
    App.showToast(`Logged ${co2Kg.toFixed(2)} kg CO\u2082!`);
    this.render();
  },

  /**
   * Returns the HTML string for a single log entry row.
   * @param {Object} log - Log entry object
   * @returns {string} HTML string for the log item
   */
  renderLogItem(log) {
    const icon = EcoData.categoryIcons[log.category] || '';
    const catData = EcoData.emissionFactors[log.category];
    const actLabel = (catData && catData[log.activity]) ? catData[log.activity].label : log.activity;
    const co2Display = log.co2Kg !== undefined ? log.co2Kg.toFixed(2) : '0.00';

    return `<div class="log-item" role="listitem">
      <div class="log-item-left">
        <span class="log-item-icon" aria-hidden="true">${icon}</span>
        <div>
          <p class="log-item-title">${actLabel}</p>
          <p class="text-muted" style="font-size:var(--font-size-small);">${log.quantity} ${log.unit}</p>
        </div>
      </div>
      <div class="log-item-right">
        <span class="log-item-co2">${co2Display} kg</span>
        <button class="log-delete-btn" data-log-id="${log.id}" type="button" aria-label="Delete entry">&#x2715;</button>
      </div>
    </div>`;
  },

  /**
   * Renders grouped log entries for the last N days excluding today.
   * @param {Array} logs - All log entries
   * @param {string} todayStr - Today's date in YYYY-MM-DD format
   * @returns {string} HTML string for the recent days section
   */
  renderRecentDays(logs, todayStr) {
    let html = '';
    for (let i = 1; i <= this.RECENT_DAYS_COUNT; i++) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = logs.filter(l => l.date === dateStr);
      if (dayLogs.length === 0) continue;

      const dayTotal = dayLogs.reduce((sum, l) => sum + (l.co2Kg || 0), 0);
      const label = new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      html += `<div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <p style="font-weight:600;font-size:var(--font-size-small);">${label}</p>
          <span class="badge-co2" style="font-size:var(--font-size-small);">${dayTotal.toFixed(2)} kg CO\u2082</span>
        </div>
        <div role="list">${dayLogs.map(log => this.renderLogItem(log)).join('')}</div>
      </div>`;
    }
    return html;
  },

  /**
   * Builds HTML for a custom dropdown.
   * @param {string} id - Element id
   * @param {Array} options - Array of {value, label} objects
   * @param {string} activeValue - Currently selected value
   * @param {string} ariaLabel - Accessible label
   * @returns {string} HTML string for the custom select
   */
  buildCustomSelect(id, options, activeValue, ariaLabel) {
    let activeLabel = '';
    const optsHTML = options.map(opt => {
      const cls = opt.value === activeValue ? ' active' : '';
      if (opt.value === activeValue) activeLabel = opt.label;
      return `<div class="csel-option${cls}" data-value="${opt.value}" role="option" tabindex="0">${opt.label}</div>`;
    }).join('');

    return `<div class="csel" id="${id}" data-value="${activeValue}">
      <button type="button" class="csel-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="${ariaLabel}">
        <span class="csel-value">${activeLabel}</span>
        <span class="csel-arrow" aria-hidden="true">\u25BE</span>
      </button>
      <div class="csel-dropdown" role="listbox">${optsHTML}</div>
    </div>`;
  },

  /**
   * Binds open/close and selection events on a custom dropdown.
   * @param {string} id - Element id
   * @param {Function} onChange - Callback on selection
   */
  bindCustomSelect(id, onChange) {
    const csel = document.getElementById(id);
    if (!csel) return;
    const trigger = csel.querySelector('.csel-trigger');
    const dropdown = csel.querySelector('.csel-dropdown');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = csel.classList.contains('open');
      document.querySelectorAll('.csel.open').forEach(c => c.classList.remove('open'));
      if (!isOpen) csel.classList.add('open');
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.csel-option');
      if (!opt) return;
      csel.dataset.value = opt.dataset.value;
      csel.querySelector('.csel-value').textContent = opt.textContent;
      dropdown.querySelectorAll('.csel-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      csel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (onChange) onChange();
    });
  },

  /**
   * Returns a user-friendly label for the unit.
   * @param {string} unit - Raw unit string
   * @returns {string} Human-readable label
   */
  getUnitLabel(unit) { return this.UNIT_LABELS[unit] || unit; },

  /**
   * Returns a short suffix for the unit.
   * @param {string} unit - Raw unit string
   * @returns {string} Short suffix
   */
  getUnitShort(unit) { return this.UNIT_SHORTS[unit] || ''; },

  /**
   * Returns contextual help text for the unit.
   * @param {string} unit - Raw unit string
   * @returns {string} Help text
   */
  getUnitHelp(unit) { return this.UNIT_HELPS[unit] || 'Enter quantity'; }
};
