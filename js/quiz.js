'use strict';

/**
 * Quiz: 5-step onboarding quiz for collecting user lifestyle data and calculating CO2 baseline.
 * Each step collects category-specific data with real-time footprint estimation.
 * @namespace
 */
const Quiz = {

  /** Tracks the currently visible quiz step index (0-based) */
  currentStep: 0,

  /** Maximum footprint value used for ring normalization (tonnes CO2) */
  MAX_RING_FOOTPRINT: 10,

  /** Default answers for all quiz categories */
  answers: {
    transport: { mode: 'car', dailyKm: 10 },
    food: { dietType: 'mixed' },
    energy: { source: 'grid', monthlyKwh: 100 },
    shopping: { level: 'moderate' },
    lifestyle: { flightsPerYear: 1, intlFlightsPerYear: 0 }
  },

  /** Ordered array of step definitions describing each quiz page's fields */
  steps: [
    {
      key: 'transport',
      title: 'How do you get around?',
      icon: '\u{1F697}',
      info: 'Transport is one of the biggest sources of CO\u2082. Petrol and diesel vehicles burn fossil fuels, releasing carbon directly into the atmosphere. A single car commuter can emit over 2 tonnes CO\u2082/year \u2014 switching to public transit, cycling, or EVs can cut this by 50\u201390%.',
      fields: [
        { type: 'select', name: 'mode', label: 'Primary transport mode', options() { return Object.keys(EcoData.emissionFactors.transport).map(k => ({ value: k, label: EcoData.emissionFactors.transport[k].label })); } },
        { type: 'number', name: 'dailyKm', label: 'Daily distance (km)', min: 0, max: 500, placeholder: 'e.g. 10' }
      ]
    },
    {
      key: 'food',
      title: 'What is your diet like?',
      icon: '\u{1F37D}\uFE0F',
      info: 'Food production accounts for ~26% of global greenhouse gas emissions. Meat (especially beef & lamb) requires massive land, water, and feed \u2014 producing 10\u201350x more CO\u2082 than plant-based foods. Even small diet shifts can save hundreds of kg CO\u2082 per year.',
      fields: [
        { type: 'select', name: 'dietType', label: 'Diet type', options() { return Object.keys(EcoData.emissionFactors.food).map(k => ({ value: k, label: EcoData.emissionFactors.food[k].label })); } }
      ]
    },
    {
      key: 'energy',
      title: 'How do you power your home?',
      icon: '\u26A1',
      info: 'India\'s electricity grid relies heavily on coal, emitting ~0.82 kg CO\u2082 per kWh. Your AC, fridge, lights, and appliances all add up. Switching to solar, wind, or energy-efficient appliances can drastically reduce your home energy footprint.',
      fields: [
        { type: 'select', name: 'source', label: 'Energy source', options() { return Object.keys(EcoData.emissionFactors.energy).map(k => ({ value: k, label: EcoData.emissionFactors.energy[k].label })); } },
        { type: 'number', name: 'monthlyKwh', label: 'Monthly electricity use (kWh)', min: 0, max: 5000, placeholder: 'e.g. 100' }
      ]
    },
    {
      key: 'shopping',
      title: 'How much do you shop?',
      icon: '\u{1F6CD}\uFE0F',
      info: 'Every product you buy has a hidden carbon cost \u2014 from raw materials, manufacturing, shipping, to packaging. Fast fashion alone produces 10% of global emissions. Buying less, choosing second-hand, and repairing items can save 0.5\u20132 tonnes CO\u2082/year.',
      fields: [
        { type: 'select', name: 'level', label: 'Shopping level', options() { return Object.keys(EcoData.emissionFactors.shopping).map(k => ({ value: k, label: EcoData.emissionFactors.shopping[k].label })); } }
      ]
    },
    {
      key: 'lifestyle',
      title: 'Tell us about your lifestyle',
      icon: '\u{1F3AF}',
      info: 'A single domestic flight emits ~255 kg CO\u2082, and an international flight over 1,100 kg \u2014 equivalent to months of driving. Air travel is the fastest way to grow your carbon footprint. Choosing trains or video calls can make a huge difference.',
      fields: [
        { type: 'number', name: 'flightsPerYear', label: 'Domestic flights per year', min: 0, max: 100, placeholder: 'e.g. 1' },
        { type: 'number', name: 'intlFlightsPerYear', label: 'International flights per year', min: 0, max: 50, placeholder: 'e.g. 0' }
      ]
    }
  ],

  /**
   * Flattens nested answers into the flat structure expected by calculateBaselineFootprint.
   * @returns {Object} Flat quiz answers object
   */
  _flattenAnswers() {
    return {
      transport: this.answers.transport.mode,
      dailyKm: this.answers.transport.dailyKm,
      food: this.answers.food.dietType,
      energy: this.answers.energy.source,
      monthlyKwh: this.answers.energy.monthlyKwh,
      shopping: this.answers.shopping.level,
      flightsPerYear: this.answers.lifestyle.flightsPerYear,
      intlFlightsPerYear: this.answers.lifestyle.intlFlightsPerYear,
      streamingHours: 0
    };
  },

  /**
   * Returns the comparison text for a given footprint estimate.
   * @param {number} estimate - Estimated annual footprint in tonnes CO2
   * @returns {string} Comparison string with emoji indicator
   */
  _getComparisonText(estimate) {
    const { INDIA_AVG, GLOBAL_AVG } = EcoData.FOOTPRINT_THRESHOLDS;
    if (estimate <= INDIA_AVG) return `\u2705 Below India avg (${INDIA_AVG}t)`;
    if (estimate <= GLOBAL_AVG) return `\u26A0\uFE0F Above India avg (${INDIA_AVG}t)`;
    return `\u{1F534} Above global avg (${GLOBAL_AVG}t)`;
  },

  /**
   * Renders the welcome splash screen and wires the Get Started button.
   */
  renderWelcome() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <section class="screen-welcome" aria-label="Welcome to EcoTrack">
        <div class="welcome-logo" aria-hidden="true">\u{1F33F}</div>
        <h1 class="welcome-title">EcoTrack</h1>
        <p class="welcome-subtitle">Understand, track, and reduce your carbon footprint with personalized insights.</p>
        <p class="welcome-hint">Takes 2 minutes \u2022 No sign-up needed</p>
        <button class="btn btn-primary btn-block" id="btn-get-started" style="max-width:280px;">Get Started</button>
      </section>`;

    document.getElementById('btn-get-started').addEventListener('click', () => {
      Quiz.currentStep = 0;
      window.location.hash = 'quiz';
    });
  },

  /**
   * Renders the current quiz step with progress bar, fields, CO2 estimate, and navigation.
   */
  render() {
    const main = document.getElementById('main-content');
    const step = this.steps[this.currentStep];
    const total = this.steps.length;
    const progressPct = Math.round(((this.currentStep + 1) / total) * 100);
    const estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());
    const estimateColor = EcoData.getFootprintColor(estimate);
    const ringRatio = Math.min(estimate / this.MAX_RING_FOOTPRINT, 1);

    const fieldsHTML = step.fields.map(field => this.renderField(field, step.key)).join('');
    const isLast = this.currentStep === total - 1;

    const ringHTML = EcoData.buildSVGRing({
      radius: 42, strokeWidth: 6, ratio: ringRatio, stroke: estimateColor,
      trackStroke: '#eee', size: 100,
      ariaLabel: `${estimate} tonnes CO2 per year`,
      centerText: `${estimate}`, subText: 'tonnes CO\u2082/yr', fontSize: 18, subFontSize: 9
    });

    const backBtn = this.currentStep > 0
      ? `<button class="btn btn-outline" id="btn-back" type="button" aria-label="Go back to previous step">Back</button>`
      : '';

    main.innerHTML = `
      <section class="quiz-container" aria-label="Onboarding quiz">
        <div class="quiz-header">
          <p class="quiz-step-label">Step ${this.currentStep + 1} of ${total}</p>
          <div class="quiz-progress" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"
            aria-label="Quiz progress: step ${this.currentStep + 1} of ${total}">
            <div class="quiz-progress-bar" style="width:${progressPct}%"></div>
          </div>
        </div>
        <div class="quiz-layout">
          <div class="quiz-form-col">
            <div class="card">
              <div class="quiz-step-icon quiz-icon-${step.key}" aria-hidden="true">${step.icon}</div>
              <h2 class="quiz-step-title">${step.title}</h2>
              <div class="quiz-fields">${fieldsHTML}</div>
            </div>
          </div>
          <div class="quiz-side-col">
            <div class="quiz-estimate-card card" aria-live="polite">
              <div class="quiz-estimate-icon" aria-hidden="true">\u{1F30D}</div>
              <p class="quiz-estimate-label">Your estimated footprint</p>
              <div class="quiz-estimate-ring">${ringHTML}</div>
              <p class="quiz-estimate-compare" id="quiz-estimate-value">${this._getComparisonText(estimate)}</p>
            </div>
            <div class="quiz-actions">
              ${backBtn}
              <button class="btn btn-primary" id="btn-next" type="button"
                aria-label="${isLast ? 'Finish quiz and see results' : 'Go to next step'}">
                ${isLast ? 'See Results' : 'Next'}
              </button>
            </div>
          </div>
        </div>
        <div class="quiz-info-block"><span class="quiz-info-icon" aria-hidden="true">\u{1F4A1}</span> ${step.info}</div>
      </section>`;

    this._bindFieldEvents(step);
    this._bindNavEvents();
  },

  /**
   * Binds back/next navigation button events.
   */
  _bindNavEvents() {
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        Quiz.currentStep--;
        Quiz.render();
      });
    }

    document.getElementById('btn-next').addEventListener('click', () => {
      if (Quiz.currentStep === Quiz.steps.length - 1) {
        Quiz.finishQuiz();
      } else {
        Quiz.currentStep++;
        Quiz.render();
      }
    });
  },

  /**
   * Returns HTML string for a single form field (select or number).
   * @param {Object} field - Field definition object
   * @param {string} stepKey - The step's category key
   * @returns {string} HTML string for the form field
   */
  renderField(field, stepKey) {
    const fieldId = `quiz-field-${stepKey}-${field.name}`;
    const currentVal = this.answers[stepKey][field.name];

    if (field.type === 'select') {
      const options = field.options();
      let currentLabel = '';
      const optsHTML = options.map(opt => {
        const active = opt.value === currentVal ? ' active' : '';
        if (opt.value === currentVal) currentLabel = opt.label;
        return `<div class="csel-option${active}" data-value="${opt.value}" role="option" tabindex="0">${opt.label}</div>`;
      }).join('');

      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <div class="csel" id="${fieldId}" data-step-key="${stepKey}" data-field-name="${field.name}">
          <button type="button" class="csel-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="${field.label}">
            <span class="csel-value">${currentLabel}</span>
            <span class="csel-arrow" aria-hidden="true">\u25BE</span>
          </button>
          <div class="csel-dropdown" role="listbox">${optsHTML}</div>
        </div>
      </div>`;
    }

    return `<div class="form-group">
      <label class="form-label" for="${fieldId}">${field.label}</label>
      <input id="${fieldId}" name="${field.name}" type="number" class="form-input"
        aria-label="${field.label}" min="${field.min}" max="${field.max}"
        placeholder="${field.placeholder}" value="${currentVal}"
        data-step-key="${stepKey}" data-field-name="${field.name}">
    </div>`;
  },

  /**
   * Attaches input/change listeners to all fields in the current step.
   * @param {Object} step - The current step definition object
   */
  _bindFieldEvents(step) {
    document.querySelectorAll(`input[data-step-key="${step.key}"]`).forEach(el => {
      el.addEventListener('input', () => {
        Quiz.updateAnswer(el.dataset.stepKey, el.dataset.fieldName, parseFloat(el.value) || 0);
      });
    });

    document.querySelectorAll(`.csel[data-step-key="${step.key}"]`).forEach(csel => {
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
        csel.querySelector('.csel-value').textContent = opt.textContent;
        dropdown.querySelectorAll('.csel-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        csel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        Quiz.updateAnswer(csel.dataset.stepKey, csel.dataset.fieldName, opt.dataset.value);
      });

      dropdown.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const focused = document.activeElement;
          if (focused && focused.classList.contains('csel-option')) focused.click();
        } else if (e.key === 'Escape') {
          csel.classList.remove('open');
          trigger.focus();
        }
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.csel.open').forEach(c => {
        c.classList.remove('open');
        c.querySelector('.csel-trigger').setAttribute('aria-expanded', 'false');
      });
    });
  },

  /**
   * Updates a specific answer field and refreshes the live CO2 estimate display.
   * @param {string} stepKey - The step's category key
   * @param {string} fieldName - The field name within the step
   * @param {*} value - The new value for the field
   */
  updateAnswer(stepKey, fieldName, value) {
    this.answers[stepKey][fieldName] = value;
    const estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());

    const ringTexts = document.querySelectorAll('.quiz-estimate-ring text');
    if (ringTexts.length >= 1) ringTexts[0].textContent = estimate;

    const ringCircles = document.querySelectorAll('.quiz-estimate-ring circle');
    if (ringCircles.length >= 2) {
      const color = EcoData.getFootprintColor(estimate);
      const circ = 2 * Math.PI * 42;
      const ratio = Math.min(estimate / this.MAX_RING_FOOTPRINT, 1);
      ringCircles[1].setAttribute('stroke', color);
      ringCircles[1].setAttribute('stroke-dasharray', `${ratio * circ} ${circ}`);
    }

    const compareEl = document.getElementById('quiz-estimate-value');
    if (compareEl) compareEl.textContent = this._getComparisonText(estimate);
  },

  /**
   * Saves quiz results; asks name only on first run, skips name modal on retake.
   */
  finishQuiz() {
    const baseline = EcoData.calculateBaselineFootprint(this._flattenAnswers());
    const flatAnswers = this._flattenAnswers();
    const existingProfile = EcoStorage.getProfile();

    if (existingProfile && existingProfile.name) {
      EcoStorage.saveProfile(Object.assign({}, existingProfile, {
        quizAnswers: flatAnswers,
        baselineFootprint: baseline,
        updatedAt: new Date().toISOString()
      }));
      App.showToast('Quiz updated!');
      window.location.hash = 'dashboard';
      return;
    }

    this._showNameModal(flatAnswers, baseline);
  },

  /**
   * Displays the name input modal for first-time quiz completion.
   * @param {Object} flatAnswers - Flattened quiz answers
   * @param {number} baseline - Calculated baseline footprint in tonnes CO2
   */
  _showNameModal(flatAnswers, baseline) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-icon" aria-hidden="true">\u{1F33F}</div>
        <h2 class="modal-title">Almost there!</h2>
        <p class="modal-desc">What should we call you?</p>
        <input id="modal-name-input" class="form-input" type="text" maxlength="60"
          placeholder="e.g. Rajan" autofocus aria-label="Your name"/>
        <div class="modal-actions">
          <button class="btn btn-primary" id="modal-btn-save" type="button">Let's Go!</button>
          <button class="btn btn-outline" id="modal-btn-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    setTimeout(() => document.getElementById('modal-name-input').focus(), 50);

    const saveAndGo = (name) => {
      EcoStorage.saveProfile({
        name: name || 'Eco Warrior',
        quizAnswers: flatAnswers,
        baselineFootprint: baseline,
        createdAt: new Date().toISOString()
      });
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      window.location.hash = 'dashboard';
    };

    document.getElementById('modal-btn-save').addEventListener('click', () => {
      saveAndGo(document.getElementById('modal-name-input').value.trim());
    });
    document.getElementById('modal-btn-skip').addEventListener('click', () => saveAndGo(''));
    document.getElementById('modal-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveAndGo(e.target.value.trim());
    });
  }
};
