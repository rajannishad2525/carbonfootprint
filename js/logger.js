/**
 * Logger: Activity logging screen with form, today's log, and recent history.
 * Provides custom dropdowns, dynamic unit hints, and CO2 preview.
 * @namespace
 */
const Logger = {

  /** Number of recent days to display in history section */
  RECENT_DAYS_COUNT: 6,

  /**
   * Renders the full activity logger screen including form, today's log, and recent days.
   */
  render() {
    const main = document.getElementById('main-content');
    const todayStr = new Date().toISOString().slice(0, 10);
    const allLogs = EcoStorage.getLogs();
    const todayLogs = allLogs.filter(function(l) { return l.date === todayStr; });
    const todayTotal = todayLogs.reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);

    const firstCategory = Object.keys(EcoData.emissionFactors)[0];
    const firstActivities = EcoData.emissionFactors[firstCategory];
    const firstActivityKey = Object.keys(firstActivities)[0];
    const firstFactor = firstActivities[firstActivityKey];

    const categoryOptions = Object.keys(EcoData.emissionFactors).map(function(cat) {
      return { value: cat, label: EcoData.categoryIcons[cat] + ' ' + EcoData.categoryLabels[cat] };
    });

    const activityOptions = Object.keys(firstActivities).map(function(actKey) {
      return { value: actKey, label: firstActivities[actKey].label };
    });

    const todayItemsHTML = todayLogs.length > 0
      ? todayLogs.map(function(log) { return Logger.renderLogItem(log); }).join('')
      : '<p class="text-muted" style="padding:12px 0;">No activities logged today.</p>';

    const recentHTML = Logger.renderRecentDays(allLogs, todayStr);

    main.innerHTML = '<div class="screen-logger" aria-label="Activity logger">'
      + '<h1 class="screen-title">Log Activity</h1>'
      + Logger._buildHeroHTML(todayTotal, todayLogs.length)
      + Logger._buildFormHTML(categoryOptions, firstCategory, activityOptions, firstActivityKey, firstFactor)
      + Logger._buildTodayLogHTML(todayTotal, todayItemsHTML)
      + (recentHTML ? '<div class="card mt-16"><h2 class="card-title">Recent Days</h2>' + recentHTML + '</div>' : '')
      + '</div>';

    Logger._bindFormEvents(main);
  },

  /**
   * Builds the hero summary section HTML.
   * @param {number} todayTotal - Total CO2 logged today in kg
   * @param {number} entryCount - Number of entries logged today
   * @returns {string} HTML string for the hero section
   */
  _buildHeroHTML(todayTotal, entryCount) {
    return '<div class="log-hero">'
      + '<div class="log-hero-left">'
      + '<span class="log-hero-value">' + todayTotal.toFixed(1) + '</span>'
      + '<span class="log-hero-unit">kg CO\u2082 today</span>'
      + '</div>'
      + '<div class="log-hero-right">'
      + '<span class="log-hero-count">' + entryCount + '</span>'
      + '<span class="log-hero-unit">entries</span>'
      + '</div>'
      + '</div>';
  },

  /**
   * Builds the new entry form card HTML.
   * @param {Array} categoryOptions - Category dropdown options
   * @param {string} firstCategory - Initially selected category key
   * @param {Array} activityOptions - Activity dropdown options
   * @param {string} firstActivityKey - Initially selected activity key
   * @param {Object} firstFactor - Emission factor object for the initial activity
   * @returns {string} HTML string for the form card
   */
  _buildFormHTML(categoryOptions, firstCategory, activityOptions, firstActivityKey, firstFactor) {
    return '<div class="card mt-16">'
      + '<h2 class="card-title">New Entry</h2>'
      + '<div class="log-form-grid">'
      + '<div class="form-group">'
      + '<label class="form-label">Category</label>'
      + Logger.buildCustomSelect('log-category', categoryOptions, firstCategory, 'Select category')
      + '</div>'
      + '<div class="form-group">'
      + '<label class="form-label">Activity</label>'
      + Logger.buildCustomSelect('log-activity', activityOptions, firstActivityKey, 'Select activity')
      + '</div>'
      + '</div>'
      + '<div class="form-group">'
      + '<label class="form-label" for="log-quantity">Quantity <span id="log-unit-badge" class="log-unit-badge">'
      + Logger.getUnitLabel(firstFactor.unit) + '</span></label>'
      + '<div class="log-qty-wrap">'
      + '<input id="log-quantity" class="form-input" type="number" min="0" step="0.1"'
      + ' aria-label="Enter quantity" placeholder="e.g. 10"/>'
      + '<span class="log-qty-suffix" id="log-unit-suffix">' + Logger.getUnitShort(firstFactor.unit) + '</span>'
      + '</div>'
      + '<p id="log-unit-hint" class="log-unit-hint">' + Logger.getUnitHelp(firstFactor.unit) + '</p>'
      + '</div>'
      + '<div class="log-preview-card" aria-live="polite" id="log-preview">'
      + '<p class="text-muted">Enter a quantity to see CO\u2082 estimate</p>'
      + '</div>'
      + '<button id="btn-add-entry" class="btn btn-accent btn-block mt-16" type="button"'
      + ' aria-label="Add activity entry">Add Entry</button>'
      + '</div>';
  },

  /**
   * Builds the today's log section HTML.
   * @param {number} todayTotal - Total CO2 logged today in kg
   * @param {string} todayItemsHTML - Pre-rendered log items HTML
   * @returns {string} HTML string for today's log section
   */
  _buildTodayLogHTML(todayTotal, todayItemsHTML) {
    return '<div class="card mt-16">'
      + '<div class="log-section-header">'
      + '<h2 class="card-title" style="margin-bottom:0;">Today\'s Log</h2>'
      + '<span class="badge-co2">' + todayTotal.toFixed(2) + ' kg CO\u2082</span>'
      + '</div>'
      + '<div role="list" id="today-log-list">' + todayItemsHTML + '</div>'
      + '</div>';
  },

  /**
   * Binds all event listeners for the logger form.
   * @param {HTMLElement} main - The main content container element
   */
  _bindFormEvents(main) {
    Logger.bindCustomSelect('log-category', function() { Logger.updateActivities(); });
    Logger.bindCustomSelect('log-activity', function() { Logger.updatePreview(); });

    document.getElementById('log-quantity').addEventListener('input', function() {
      Logger.updatePreview();
    });

    document.getElementById('btn-add-entry').addEventListener('click', function() {
      Logger.addEntry();
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('.csel.open').forEach(function(c) {
        c.classList.remove('open');
        c.querySelector('.csel-trigger').setAttribute('aria-expanded', 'false');
      });
    });

    main.addEventListener('click', function(e) {
      const deleteBtn = e.target.closest('.log-delete-btn');
      if (!deleteBtn) return;
      const logId = deleteBtn.getAttribute('data-log-id');
      if (!logId) return;
      App.showModal(
        'Delete Entry?',
        'Are you sure you want to remove this activity log?',
        'Delete',
        'Cancel',
        function() {
          EcoStorage.deleteLog(logId);
          Logger.render();
        },
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
    const category = catCsel.getAttribute('data-value');
    const activities = EcoData.emissionFactors[category];
    if (!activities) return;

    const actKeys = Object.keys(activities);
    const firstKey = actKeys[0];
    const options = actKeys.map(function(k) {
      return { value: k, label: activities[k].label };
    });

    const actWrap = document.getElementById('log-activity');
    if (actWrap) {
      const newHTML = Logger.buildCustomSelect('log-activity', options, firstKey, 'Select activity');
      const temp = document.createElement('div');
      temp.innerHTML = newHTML;
      actWrap.parentNode.replaceChild(temp.firstChild, actWrap);
      Logger.bindCustomSelect('log-activity', function() { Logger.updatePreview(); });
    }

    Logger.updatePreview();
  },

  /**
   * Reads current selections and quantity, then updates the live CO2 preview and unit hint.
   */
  updatePreview() {
    const categoryEl = document.getElementById('log-category');
    const activityEl = document.getElementById('log-activity');
    const quantityEl = document.getElementById('log-quantity');
    const previewEl = document.getElementById('log-preview');
    const unitHintEl = document.getElementById('log-unit-hint');
    if (!categoryEl || !activityEl || !quantityEl || !previewEl) return;

    const category = categoryEl.getAttribute('data-value');
    const activity = activityEl.getAttribute('data-value');
    const quantity = parseFloat(quantityEl.value) || 0;

    const factor = EcoData.emissionFactors[category] && EcoData.emissionFactors[category][activity];
    if (factor) {
      const badge = document.getElementById('log-unit-badge');
      const suffix = document.getElementById('log-unit-suffix');
      if (unitHintEl) unitHintEl.textContent = Logger.getUnitHelp(factor.unit);
      if (badge) badge.textContent = Logger.getUnitLabel(factor.unit);
      if (suffix) suffix.textContent = Logger.getUnitShort(factor.unit);
    }

    if (quantity <= 0 || !factor) {
      previewEl.innerHTML = '<p class="text-muted">Enter a quantity to see CO\u2082 estimate</p>';
      return;
    }

    const co2 = EcoData.calculateEmission(category, activity, quantity);
    previewEl.innerHTML = '<p class="text-muted">Estimated emission</p>'
      + '<p class="log-preview-value">' + co2.toFixed(2) + ' kg CO\u2082</p>';
  },

  /**
   * Validates input, calculates emission, saves the log entry, and re-renders the screen.
   */
  addEntry() {
    const categoryEl = document.getElementById('log-category');
    const activityEl = document.getElementById('log-activity');
    const quantityEl = document.getElementById('log-quantity');
    if (!categoryEl || !activityEl || !quantityEl) return;

    const category = categoryEl.getAttribute('data-value');
    const activity = activityEl.getAttribute('data-value');
    const quantity = parseFloat(quantityEl.value);

    if (!quantity || quantity <= 0) {
      App.showToast('Please enter a quantity greater than 0.', 'error');
      return;
    }

    const factor = EcoData.emissionFactors[category] && EcoData.emissionFactors[category][activity];
    if (!factor) {
      App.showToast('Invalid activity selected.', 'error');
      return;
    }

    const co2Kg = EcoData.calculateEmission(category, activity, quantity);
    const todayStr = new Date().toISOString().slice(0, 10);

    EcoStorage.addLog({
      date:     todayStr,
      category: category,
      activity: activity,
      quantity: quantity,
      unit:     factor.unit,
      co2Kg:    co2Kg,
      source:   factor.source
    });

    App.showToast('Logged ' + co2Kg.toFixed(2) + ' kg CO\u2082!');
    Logger.render();
  },

  /**
   * Returns the HTML string for a single log entry row.
   * @param {Object} log - Log entry object
   * @returns {string} HTML string for the log item
   */
  renderLogItem(log) {
    const icon = EcoData.categoryIcons[log.category] || '';
    const activities = EcoData.emissionFactors[log.category];
    const actLabel = (activities && activities[log.activity])
      ? activities[log.activity].label
      : log.activity;

    return '<div class="log-item" role="listitem">'
      + '<div class="log-item-left">'
      + '<span class="log-item-icon" aria-hidden="true">' + icon + '</span>'
      + '<div>'
      + '<p class="log-item-title">' + actLabel + '</p>'
      + '<p class="text-muted" style="font-size:var(--font-size-small);">' + log.quantity + ' ' + log.unit + '</p>'
      + '</div>'
      + '</div>'
      + '<div class="log-item-right">'
      + '<span class="log-item-co2">' + (log.co2Kg !== undefined ? log.co2Kg.toFixed(2) : '0.00') + ' kg</span>'
      + '<button class="log-delete-btn" data-log-id="' + log.id + '" type="button" aria-label="Delete entry">&#x2715;</button>'
      + '</div>'
      + '</div>';
  },

  /**
   * Renders grouped log entries for the last N days excluding today.
   * @param {Array} logs - All log entries
   * @param {string} todayStr - Today's date string in YYYY-MM-DD format
   * @returns {string} HTML string for the recent days section, or empty string
   */
  renderRecentDays(logs, todayStr) {
    const days = [];
    for (let i = 1; i <= this.RECENT_DAYS_COUNT; i++) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    let html = '';
    days.forEach(function(dateStr) {
      const dayLogs = logs.filter(function(l) { return l.date === dateStr; });
      if (dayLogs.length === 0) return;

      const dayTotal = dayLogs.reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);
      const label = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      html += '<div style="margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<p style="font-weight:600;font-size:var(--font-size-small);">' + label + '</p>'
        + '<span class="badge-co2" style="font-size:var(--font-size-small);">' + dayTotal.toFixed(2) + ' kg CO\u2082</span>'
        + '</div>'
        + '<div role="list">'
        + dayLogs.map(function(log) { return Logger.renderLogItem(log); }).join('')
        + '</div>'
        + '</div>';
    });

    return html;
  },

  /**
   * Builds HTML for a custom dropdown (reuses .csel styles from quiz).
   * @param {string} id - Element id for the dropdown
   * @param {Array} options - Array of {value, label} option objects
   * @param {string} activeValue - Currently selected value
   * @param {string} ariaLabel - Accessible label
   * @returns {string} HTML string for the custom select
   */
  buildCustomSelect(id, options, activeValue, ariaLabel) {
    let activeLabel = '';
    const optsHTML = options.map(function(opt) {
      const cls = opt.value === activeValue ? ' active' : '';
      if (opt.value === activeValue) activeLabel = opt.label;
      return '<div class="csel-option' + cls + '" data-value="' + opt.value + '" role="option" tabindex="0">' + opt.label + '</div>';
    }).join('');

    return '<div class="csel" id="' + id + '" data-value="' + activeValue + '">'
      + '<button type="button" class="csel-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="' + ariaLabel + '">'
      + '<span class="csel-value">' + activeLabel + '</span>'
      + '<span class="csel-arrow" aria-hidden="true">▾</span>'
      + '</button>'
      + '<div class="csel-dropdown" role="listbox">' + optsHTML + '</div>'
      + '</div>';
  },

  /**
   * Binds open/close and selection events on a custom dropdown.
   * @param {string} id - Element id of the custom select
   * @param {Function} onChange - Callback invoked when a new option is selected
   */
  bindCustomSelect(id, onChange) {
    const csel = document.getElementById(id);
    if (!csel) return;
    const trigger = csel.querySelector('.csel-trigger');
    const dropdown = csel.querySelector('.csel-dropdown');

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = csel.classList.contains('open');
      document.querySelectorAll('.csel.open').forEach(function(c) { c.classList.remove('open'); });
      if (!isOpen) csel.classList.add('open');
      trigger.setAttribute('aria-expanded', !isOpen);
    });

    dropdown.addEventListener('click', function(e) {
      const opt = e.target.closest('.csel-option');
      if (!opt) return;
      csel.setAttribute('data-value', opt.getAttribute('data-value'));
      csel.querySelector('.csel-value').textContent = opt.textContent;
      dropdown.querySelectorAll('.csel-option').forEach(function(o) { o.classList.remove('active'); });
      opt.classList.add('active');
      csel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (onChange) onChange();
    });
  },

  /**
   * Returns a user-friendly label for the unit (shown as badge).
   * @param {string} unit - Raw unit string from emission factor
   * @returns {string} Human-readable unit label
   */
  getUnitLabel(unit) {
    const map = {
      'kgCO2/km': 'in km', 'kgCO2/day': 'in days', 'kgCO2/kWh': 'in kWh',
      'tonneCO2/year': 'in months', 'kgCO2/flight': 'flights', 'kgCO2/hour': 'in hours'
    };
    return map[unit] || unit;
  },

  /**
   * Returns a short suffix shown inside the input.
   * @param {string} unit - Raw unit string from emission factor
   * @returns {string} Short unit suffix
   */
  getUnitShort(unit) {
    const map = {
      'kgCO2/km': 'km', 'kgCO2/day': 'days', 'kgCO2/kWh': 'kWh',
      'tonneCO2/year': 'months', 'kgCO2/flight': 'flights', 'kgCO2/hour': 'hours'
    };
    return map[unit] || '';
  },

  /**
   * Returns a helpful example text for the user.
   * @param {string} unit - Raw unit string from emission factor
   * @returns {string} Contextual help text for the unit
   */
  getUnitHelp(unit) {
    const map = {
      'kgCO2/km': 'Enter distance travelled in kilometers (e.g. 15 km to office)',
      'kgCO2/day': 'Enter number of days with this diet (e.g. 1 for today)',
      'kgCO2/kWh': 'Enter electricity used in kWh (check your meter or bill)',
      'tonneCO2/year': 'Enter months of shopping at this level (e.g. 1)',
      'kgCO2/flight': 'Enter number of flights taken (e.g. 1)',
      'kgCO2/hour': 'Enter hours of streaming/usage (e.g. 3)'
    };
    return map[unit] || 'Enter quantity';
  }
};
