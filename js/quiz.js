/**
 * Quiz: 5-step onboarding quiz for collecting user lifestyle data and calculating CO2 baseline.
 * Each step collects category-specific data with real-time footprint estimation.
 * @namespace
 */
const Quiz = {

  /** Tracks the currently visible quiz step index (0-based) */
  currentStep: 0,

  /** Default answers for all quiz categories, used as initial state and reset target */
  answers: {
    transport: { mode: 'car', dailyKm: 10 },
    food: { dietType: 'mixed' },
    energy: { source: 'grid', monthlyKwh: 100 },
    shopping: { level: 'moderate' },
    lifestyle: { flightsPerYear: 1, intlFlightsPerYear: 0 }
  },

  /** Maximum footprint value used for ring normalization (tonnes CO2) */
  MAX_RING_FOOTPRINT: 10,

  /** Ordered array of step definitions describing each quiz page's fields */
  steps: [
    {
      key: 'transport',
      title: 'How do you get around?',
      icon: '🚗',
      info: 'Transport is one of the biggest sources of CO₂. Petrol and diesel vehicles burn fossil fuels, releasing carbon directly into the atmosphere. A single car commuter can emit over 2 tonnes CO₂/year — switching to public transit, cycling, or EVs can cut this by 50–90%.',
      fields: [
        {
          type: 'select',
          name: 'mode',
          label: 'Primary transport mode',
          options: function() {
            return Object.keys(EcoData.emissionFactors.transport).map(function(k) {
              return { value: k, label: EcoData.emissionFactors.transport[k].label };
            });
          }
        },
        {
          type: 'number',
          name: 'dailyKm',
          label: 'Daily distance (km)',
          min: 0,
          max: 500,
          placeholder: 'e.g. 10'
        }
      ]
    },
    {
      key: 'food',
      title: 'What is your diet like?',
      icon: '🍽️',
      info: 'Food production accounts for ~26% of global greenhouse gas emissions. Meat (especially beef & lamb) requires massive land, water, and feed — producing 10–50x more CO₂ than plant-based foods. Even small diet shifts can save hundreds of kg CO₂ per year.',
      fields: [
        {
          type: 'select',
          name: 'dietType',
          label: 'Diet type',
          options: function() {
            return Object.keys(EcoData.emissionFactors.food).map(function(k) {
              return { value: k, label: EcoData.emissionFactors.food[k].label };
            });
          }
        }
      ]
    },
    {
      key: 'energy',
      title: 'How do you power your home?',
      icon: '⚡',
      info: 'India\'s electricity grid relies heavily on coal, emitting ~0.82 kg CO₂ per kWh. Your AC, fridge, lights, and appliances all add up. Switching to solar, wind, or energy-efficient appliances can drastically reduce your home energy footprint.',
      fields: [
        {
          type: 'select',
          name: 'source',
          label: 'Energy source',
          options: function() {
            return Object.keys(EcoData.emissionFactors.energy).map(function(k) {
              return { value: k, label: EcoData.emissionFactors.energy[k].label };
            });
          }
        },
        {
          type: 'number',
          name: 'monthlyKwh',
          label: 'Monthly electricity use (kWh)',
          min: 0,
          max: 5000,
          placeholder: 'e.g. 100'
        }
      ]
    },
    {
      key: 'shopping',
      title: 'How much do you shop?',
      icon: '🛍️',
      info: 'Every product you buy has a hidden carbon cost — from raw materials, manufacturing, shipping, to packaging. Fast fashion alone produces 10% of global emissions. Buying less, choosing second-hand, and repairing items can save 0.5–2 tonnes CO₂/year.',
      fields: [
        {
          type: 'select',
          name: 'level',
          label: 'Shopping level',
          options: function() {
            return Object.keys(EcoData.emissionFactors.shopping).map(function(k) {
              return { value: k, label: EcoData.emissionFactors.shopping[k].label };
            });
          }
        }
      ]
    },
    {
      key: 'lifestyle',
      title: 'Tell us about your lifestyle',
      icon: '🎯',
      info: 'A single domestic flight emits ~255 kg CO₂, and an international flight over 1,100 kg — equivalent to months of driving. Air travel is the fastest way to grow your carbon footprint. Choosing trains or video calls can make a huge difference.',
      fields: [
        {
          type: 'number',
          name: 'flightsPerYear',
          label: 'Domestic flights per year',
          min: 0,
          max: 100,
          placeholder: 'e.g. 1'
        },
        {
          type: 'number',
          name: 'intlFlightsPerYear',
          label: 'International flights per year',
          min: 0,
          max: 50,
          placeholder: 'e.g. 0'
        },
      ]
    }
  ],

  /**
   * Flattens nested answers into the flat structure expected by EcoData.calculateBaselineFootprint.
   * @returns {Object} Flat quiz answers object
   */
  _flattenAnswers: function() {
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
   * Renders the welcome splash screen and wires the Get Started button.
   */
  renderWelcome: function() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<section class="screen-welcome" aria-label="Welcome to EcoTrack">'
      + '<div class="welcome-logo" aria-hidden="true">🌿</div>'
      + '<h1 class="welcome-title">EcoTrack</h1>'
      + '<p class="welcome-subtitle">Understand, track, and reduce your carbon footprint with personalized insights.</p>'
      + '<p class="welcome-hint">Takes 2 minutes • No sign-up needed</p>'
      + '<button class="btn btn-primary btn-block" id="btn-get-started" style="max-width:280px;">Get Started</button>'
      + '</section>';

    document.getElementById('btn-get-started').addEventListener('click', function() {
      Quiz.currentStep = 0;
      window.location.hash = 'quiz';
    });
  },

  /**
   * Returns the comparison text for a given footprint estimate.
   * @param {number} estimate - Estimated annual footprint in tonnes CO2
   * @returns {string} Comparison string with emoji indicator
   */
  _getComparisonText: function(estimate) {
    const thresholds = EcoData.FOOTPRINT_THRESHOLDS;
    if (estimate <= thresholds.INDIA_AVG) return '✅ Below India avg (' + thresholds.INDIA_AVG + 't)';
    if (estimate <= thresholds.GLOBAL_AVG) return '⚠️ Above India avg (' + thresholds.INDIA_AVG + 't)';
    return '🔴 Above global avg (' + thresholds.GLOBAL_AVG + 't)';
  },

  /**
   * Renders the current quiz step with progress bar, fields, CO2 estimate, and navigation buttons.
   */
  render: function() {
    const main = document.getElementById('main-content');
    const step = this.steps[this.currentStep];
    const total = this.steps.length;
    const progressPct = Math.round(((this.currentStep + 1) / total) * 100);
    const estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());

    const fieldsHTML = step.fields.map(function(field) {
      return Quiz.renderField(field, step.key);
    }).join('');

    let backBtn = '';
    if (this.currentStep > 0) {
      backBtn = '<button class="btn btn-outline" id="btn-back" type="button"'
        + ' aria-label="Go back to previous step">Back</button>';
    }

    const nextLabel = this.currentStep === total - 1 ? 'See Results' : 'Next';
    const nextAriaLabel = this.currentStep === total - 1 ? 'Finish quiz and see results' : 'Go to next step';
    const nextBtn = '<button class="btn btn-primary" id="btn-next" type="button"'
      + ' aria-label="' + nextAriaLabel + '">' + nextLabel + '</button>';

    const estimateColor = EcoData.getFootprintColor(estimate);
    const ringRatio = Math.min(estimate / this.MAX_RING_FOOTPRINT, 1);

    const ringHTML = EcoData.buildSVGRing({
      radius: 42, strokeWidth: 6, ratio: ringRatio, stroke: estimateColor,
      trackStroke: '#eee', size: 100,
      ariaLabel: estimate + ' tonnes CO2 per year',
      centerText: '' + estimate, subText: 'tonnes CO₂/yr',
      fontSize: 18, subFontSize: 9
    });

    main.innerHTML = '<section class="quiz-container" aria-label="Onboarding quiz">'

      // Progress header
      + '<div class="quiz-header">'
      + '<p class="quiz-step-label">Step ' + (this.currentStep + 1) + ' of ' + total + '</p>'
      + '<div class="quiz-progress" role="progressbar"'
      + ' aria-valuenow="' + progressPct + '" aria-valuemin="0" aria-valuemax="100"'
      + ' aria-label="Quiz progress: step ' + (this.currentStep + 1) + ' of ' + total + '">'
      + '<div class="quiz-progress-bar" style="width:' + progressPct + '%"></div>'
      + '</div>'
      + '</div>'

      // Two-column layout on desktop
      + '<div class="quiz-layout">'

      // Left: form card
      + '<div class="quiz-form-col">'
      + '<div class="card">'
      + '<div class="quiz-step-icon quiz-icon-' + step.key + '" aria-hidden="true">' + step.icon + '</div>'
      + '<h2 class="quiz-step-title">' + step.title + '</h2>'
      + '<div class="quiz-fields">' + fieldsHTML + '</div>'
      + '</div>'
      + '</div>'

      // Right: estimate + actions
      + '<div class="quiz-side-col">'

      // Estimate badge card
      + '<div class="quiz-estimate-card card" aria-live="polite">'
      + '<div class="quiz-estimate-icon" aria-hidden="true">🌍</div>'
      + '<p class="quiz-estimate-label">Your estimated footprint</p>'
      + '<div class="quiz-estimate-ring">' + ringHTML + '</div>'
      + '<p class="quiz-estimate-compare" id="quiz-estimate-value">'
      + this._getComparisonText(estimate)
      + '</p>'
      + '</div>'

      // Action buttons
      + '<div class="quiz-actions">'
      + backBtn
      + nextBtn
      + '</div>'

      + '</div>'
      + '</div>'

      // Info block below both columns
      + '<div class="quiz-info-block"><span class="quiz-info-icon" aria-hidden="true">💡</span> ' + step.info + '</div>'

      + '</section>';

    this._bindFieldEvents(step);

    if (this.currentStep > 0) {
      document.getElementById('btn-back').addEventListener('click', function() {
        Quiz.currentStep--;
        Quiz.render();
      });
    }

    document.getElementById('btn-next').addEventListener('click', function() {
      if (Quiz.currentStep === Quiz.steps.length - 1) {
        Quiz.finishQuiz();
      } else {
        Quiz.currentStep++;
        Quiz.render();
      }
    });
  },

  /**
   * Returns HTML string for a single form field (select or number) pre-filled with current answer.
   * @param {Object} field - Field definition object
   * @param {string} stepKey - The step's category key
   * @returns {string} HTML string for the form field
   */
  renderField: function(field, stepKey) {
    const fieldId = 'quiz-field-' + stepKey + '-' + field.name;
    const currentVal = this.answers[stepKey][field.name];

    if (field.type === 'select') {
      const options = field.options();
      let currentLabel = '';
      const opts = options.map(function(opt) {
        const active = opt.value === currentVal ? ' active' : '';
        if (opt.value === currentVal) currentLabel = opt.label;
        return '<div class="csel-option' + active + '" data-value="' + opt.value + '"'
          + ' role="option" tabindex="0">' + opt.label + '</div>';
      }).join('');
      return '<div class="form-group">'
        + '<label class="form-label">' + field.label + '</label>'
        + '<div class="csel" id="' + fieldId + '"'
        + ' data-step-key="' + stepKey + '" data-field-name="' + field.name + '">'
        + '<button type="button" class="csel-trigger" aria-haspopup="listbox"'
        + ' aria-expanded="false" aria-label="' + field.label + '">'
        + '<span class="csel-value">' + currentLabel + '</span>'
        + '<span class="csel-arrow" aria-hidden="true">▾</span>'
        + '</button>'
        + '<div class="csel-dropdown" role="listbox">' + opts + '</div>'
        + '</div>'
        + '</div>';
    }

    return '<div class="form-group">'
      + '<label class="form-label" for="' + fieldId + '">' + field.label + '</label>'
      + '<input id="' + fieldId + '" name="' + field.name + '" type="number"'
      + ' class="form-input"'
      + ' aria-label="' + field.label + '"'
      + ' min="' + field.min + '"'
      + ' max="' + field.max + '"'
      + ' placeholder="' + field.placeholder + '"'
      + ' value="' + currentVal + '"'
      + ' data-step-key="' + stepKey + '" data-field-name="' + field.name + '">'
      + '</div>';
  },

  /**
   * Attaches input/change listeners to all fields in the current step for real-time updates.
   * @param {Object} step - The current step definition object
   */
  _bindFieldEvents: function(step) {
    // Bind number inputs
    const inputs = document.querySelectorAll('input[data-step-key="' + step.key + '"]');
    inputs.forEach(function(el) {
      el.addEventListener('input', function() {
        Quiz.updateAnswer(el.getAttribute('data-step-key'), el.getAttribute('data-field-name'), parseFloat(el.value) || 0);
      });
    });

    // Bind custom dropdowns
    const csels = document.querySelectorAll('.csel[data-step-key="' + step.key + '"]');
    csels.forEach(function(csel) {
      const trigger = csel.querySelector('.csel-trigger');
      const dropdown = csel.querySelector('.csel-dropdown');

      // Toggle dropdown
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = csel.classList.contains('open');
        document.querySelectorAll('.csel.open').forEach(function(c) { c.classList.remove('open'); });
        if (!isOpen) csel.classList.add('open');
        trigger.setAttribute('aria-expanded', !isOpen);
      });

      // Select option
      dropdown.addEventListener('click', function(e) {
        const opt = e.target.closest('.csel-option');
        if (!opt) return;
        const val = opt.getAttribute('data-value');
        csel.querySelector('.csel-value').textContent = opt.textContent;
        dropdown.querySelectorAll('.csel-option').forEach(function(o) { o.classList.remove('active'); });
        opt.classList.add('active');
        csel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        Quiz.updateAnswer(csel.getAttribute('data-step-key'), csel.getAttribute('data-field-name'), val);
      });

      // Keyboard: Enter/Space to select, Escape to close
      dropdown.addEventListener('keydown', function(e) {
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

    // Close dropdowns on outside click
    document.addEventListener('click', function() {
      document.querySelectorAll('.csel.open').forEach(function(c) {
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
  updateAnswer: function(stepKey, fieldName, value) {
    this.answers[stepKey][fieldName] = value;
    const estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());

    // Update ring SVG text
    const ringTexts = document.querySelectorAll('.quiz-estimate-ring text');
    if (ringTexts.length >= 1) ringTexts[0].textContent = estimate;

    // Update ring stroke color and dash
    const ringCircle = document.querySelectorAll('.quiz-estimate-ring circle');
    if (ringCircle.length >= 2) {
      const color = EcoData.getFootprintColor(estimate);
      const circumference = EcoData.SVG_RING.QUIZ_CIRCUMFERENCE;
      ringCircle[1].setAttribute('stroke', color);
      ringCircle[1].setAttribute('stroke-dasharray', Math.min(estimate / this.MAX_RING_FOOTPRINT, 1) * circumference + ' ' + circumference);
    }

    // Update comparison text
    const el = document.getElementById('quiz-estimate-value');
    if (el) {
      el.textContent = this._getComparisonText(estimate);
    }
  },

  /**
   * Saves quiz results; asks name only on first run, skips name modal on retake.
   */
  finishQuiz: function() {
    const baseline = EcoData.calculateBaselineFootprint(this._flattenAnswers());
    const flatAnswers = this._flattenAnswers();
    const existingProfile = EcoStorage.getProfile();

    // If retaking quiz, keep existing name and just update answers
    if (existingProfile && existingProfile.name) {
      const updated = Object.assign({}, existingProfile, {
        quizAnswers: flatAnswers,
        baselineFootprint: baseline,
        updatedAt: new Date().toISOString()
      });
      EcoStorage.saveProfile(updated);
      App.showToast('Quiz updated!');
      window.location.hash = 'dashboard';
      return;
    }

    // First time — ask for name via modal
    Quiz._showNameModal(flatAnswers, baseline);
  },

  /**
   * Displays the name input modal for first-time quiz completion.
   * @param {Object} flatAnswers - Flattened quiz answers
   * @param {number} baseline - Calculated baseline footprint in tonnes CO2
   */
  _showNameModal: function(flatAnswers, baseline) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-card">'
      + '<div class="modal-icon" aria-hidden="true">🌿</div>'
      + '<h2 class="modal-title">Almost there!</h2>'
      + '<p class="modal-desc">What should we call you?</p>'
      + '<input id="modal-name-input" class="form-input" type="text" maxlength="60"'
      + ' placeholder="e.g. Rajan" autofocus aria-label="Your name"/>'
      + '<div class="modal-actions">'
      + '<button class="btn btn-primary" id="modal-btn-save" type="button">Let\'s Go!</button>'
      + '<button class="btn btn-outline" id="modal-btn-skip" type="button">Skip</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    setTimeout(function() { document.getElementById('modal-name-input').focus(); }, 50);

    function saveAndGo(name) {
      const profile = {
        name: name || 'Eco Warrior',
        quizAnswers: flatAnswers,
        baselineFootprint: baseline,
        createdAt: new Date().toISOString()
      };
      EcoStorage.saveProfile(profile);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      window.location.hash = 'dashboard';
    }

    document.getElementById('modal-btn-save').addEventListener('click', function() {
      saveAndGo(document.getElementById('modal-name-input').value.trim());
    });
    document.getElementById('modal-btn-skip').addEventListener('click', function() {
      saveAndGo('');
    });
    document.getElementById('modal-name-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') saveAndGo(this.value.trim());
    });
  }
};
