// Quiz: 5-step onboarding quiz for collecting user lifestyle data and calculating CO2 baseline
const Quiz = {

  // Tracks the currently visible quiz step index (0-based)
  currentStep: 0,

  // Default answers for all quiz categories, used as initial state and reset target
  answers: {
    transport: { mode: 'car', dailyKm: 10 },
    food: { dietType: 'mixed' },
    energy: { source: 'grid', monthlyKwh: 100 },
    shopping: { level: 'moderate' },
    lifestyle: { flightsPerYear: 1, intlFlightsPerYear: 0 }
  },

  // Ordered array of step definitions describing each quiz page's fields
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

  // Flattens nested answers into the flat structure expected by EcoData.calculateBaselineFootprint
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

  // Renders the welcome splash screen and wires the Get Started button
  renderWelcome: function() {
    var main = document.getElementById('main-content');
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

  // Renders the current quiz step with progress bar, fields, CO2 estimate, and navigation buttons
  render: function() {
    var main = document.getElementById('main-content');
    var step = this.steps[this.currentStep];
    var total = this.steps.length;
    var progressPct = Math.round(((this.currentStep + 1) / total) * 100);
    var estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());

    var fieldsHTML = step.fields.map(function(field) {
      return Quiz.renderField(field, step.key);
    }).join('');

    var backBtn = '';
    if (this.currentStep > 0) {
      backBtn = '<button class="btn btn-outline" id="btn-back" type="button"'
        + ' aria-label="Go back to previous step">Back</button>';
    }

    var nextLabel = this.currentStep === total - 1 ? 'See Results' : 'Next';
    var nextBtn = '<button class="btn btn-primary" id="btn-next" type="button"'
      + ' aria-label="' + (this.currentStep === total - 1 ? 'Finish quiz and see results' : 'Go to next step') + '">'
      + nextLabel + '</button>';

    // Determine estimate color based on value
    var estimateColor = estimate <= 1.9 ? 'var(--color-success)' : estimate <= 4.7 ? 'var(--color-warning)' : 'var(--color-danger)';

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
      + '<div class="quiz-estimate-ring">'
      + '<svg viewBox="0 0 100 100" width="90" height="90" role="img" aria-label="' + estimate + ' tonnes CO2 per year">'
      + '<circle cx="50" cy="50" r="42" fill="none" stroke="#eee" stroke-width="6"/>'
      + '<circle cx="50" cy="50" r="42" fill="none" stroke="' + estimateColor + '"'
      + ' stroke-width="6" stroke-dasharray="' + Math.min(estimate / 10, 1) * 264 + ' 264"'
      + ' stroke-linecap="round" transform="rotate(-90 50 50)"/>'
      + '<text x="50" y="46" text-anchor="middle" font-size="18" font-weight="bold" fill="var(--color-text)">' + estimate + '</text>'
      + '<text x="50" y="62" text-anchor="middle" font-size="9" fill="var(--color-neutral)">tonnes CO₂/yr</text>'
      + '</svg>'
      + '</div>'
      + '<p class="quiz-estimate-compare" id="quiz-estimate-value">'
      + (estimate <= 1.9 ? '✅ Below India avg (1.9t)' : estimate <= 4.7 ? '⚠️ Above India avg (1.9t)' : '🔴 Above global avg (4.7t)')
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

  // Returns HTML string for a single form field (select or number) pre-filled with current answer
  renderField: function(field, stepKey) {
    var fieldId = 'quiz-field-' + stepKey + '-' + field.name;
    var currentVal = this.answers[stepKey][field.name];

    if (field.type === 'select') {
      var options = field.options();
      var currentLabel = '';
      var opts = options.map(function(opt) {
        var active = opt.value === currentVal ? ' active' : '';
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

  // Attaches input/change listeners to all fields in the current step for real-time updates
  _bindFieldEvents: function(step) {
    // Bind number inputs
    var inputs = document.querySelectorAll('input[data-step-key="' + step.key + '"]');
    inputs.forEach(function(el) {
      el.addEventListener('input', function() {
        Quiz.updateAnswer(el.getAttribute('data-step-key'), el.getAttribute('data-field-name'), parseFloat(el.value) || 0);
      });
    });

    // Bind custom dropdowns
    var csels = document.querySelectorAll('.csel[data-step-key="' + step.key + '"]');
    csels.forEach(function(csel) {
      var trigger = csel.querySelector('.csel-trigger');
      var dropdown = csel.querySelector('.csel-dropdown');

      // Toggle dropdown
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = csel.classList.contains('open');
        // Close all others first
        document.querySelectorAll('.csel.open').forEach(function(c) { c.classList.remove('open'); });
        if (!isOpen) csel.classList.add('open');
        trigger.setAttribute('aria-expanded', !isOpen);
      });

      // Select option
      dropdown.addEventListener('click', function(e) {
        var opt = e.target.closest('.csel-option');
        if (!opt) return;
        var val = opt.getAttribute('data-value');
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
          var focused = document.activeElement;
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

  // Updates a specific answer field and refreshes the live CO2 estimate display
  updateAnswer: function(stepKey, fieldName, value) {
    this.answers[stepKey][fieldName] = value;
    var estimate = EcoData.calculateBaselineFootprint(this._flattenAnswers());

    // Update ring SVG text
    var ringTexts = document.querySelectorAll('.quiz-estimate-ring text');
    if (ringTexts.length >= 1) ringTexts[0].textContent = estimate;

    // Update ring stroke
    var ringCircle = document.querySelectorAll('.quiz-estimate-ring circle');
    if (ringCircle.length >= 2) {
      var color = estimate <= 1.9 ? 'var(--color-success)' : estimate <= 4.7 ? 'var(--color-warning)' : 'var(--color-danger)';
      ringCircle[1].setAttribute('stroke', color);
      ringCircle[1].setAttribute('stroke-dasharray', Math.min(estimate / 10, 1) * 264 + ' 264');
    }

    // Update comparison text
    var el = document.getElementById('quiz-estimate-value');
    if (el) {
      el.textContent = estimate <= 1.9 ? '✅ Below India avg (1.9t)' : estimate <= 4.7 ? '⚠️ Above India avg (1.9t)' : '🔴 Above global avg (4.7t)';
    }
  },

  // Saves quiz results; asks name only on first run, skips name modal on retake
  finishQuiz: function() {
    var baseline = EcoData.calculateBaselineFootprint(this._flattenAnswers());
    var flatAnswers = this._flattenAnswers();
    var existingProfile = EcoStorage.getProfile();

    // If retaking quiz, keep existing name and just update answers
    if (existingProfile && existingProfile.name) {
      var updated = Object.assign({}, existingProfile, {
        quizAnswers: flatAnswers,
        baselineFootprint: baseline,
        updatedAt: new Date().toISOString()
      });
      EcoStorage.saveProfile(updated);
      App.showToast('Quiz updated!');
      window.location.hash = 'dashboard';
      return;
    }

    // First time — ask for name
    var overlay = document.createElement('div');
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
      var profile = {
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
