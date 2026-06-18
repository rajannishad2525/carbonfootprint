'use strict';

/**
 * TestRunner: Lightweight browser-based test runner with assertion helpers.
 * Runs all unit tests automatically on load and renders results to the DOM.
 * @namespace
 */
const TestRunner = {

  /** Stores individual test results */
  results: [],

  /** Count of passed tests */
  passCount: 0,

  /** Count of failed tests */
  failCount: 0,

  /**
   * Asserts that two values are strictly equal using ===.
   * @param {*} actual - The actual value
   * @param {*} expected - The expected value
   * @param {string} message - Test description
   */
  assertEqual(actual, expected, message) {
    if (actual === expected) {
      this._record(true, message);
    } else {
      this._record(false, message, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },

  /**
   * Asserts that a value is strictly true.
   * @param {*} value - The value to check
   * @param {string} message - Test description
   */
  assertTrue(value, message) {
    if (value === true) {
      this._record(true, message);
    } else {
      this._record(false, message, `Expected true, got ${JSON.stringify(value)}`);
    }
  },

  /**
   * Asserts that a value is strictly false.
   * @param {*} value - The value to check
   * @param {string} message - Test description
   */
  assertFalse(value, message) {
    if (value === false) {
      this._record(true, message);
    } else {
      this._record(false, message, `Expected false, got ${JSON.stringify(value)}`);
    }
  },

  /**
   * Asserts that calling fn() throws any error (or one whose message contains expectedMsg).
   * @param {Function} fn - Function expected to throw
   * @param {string} message - Test description
   * @param {string} [expectedMsg] - Optional substring to match in error message
   */
  assertThrows(fn, message, expectedMsg) {
    try {
      fn();
      this._record(false, message, 'Expected an error to be thrown but none was.');
    } catch (e) {
      if (expectedMsg && !e.message.includes(expectedMsg)) {
        this._record(false, message, `Error thrown but message did not match. Got: ${e.message}`);
      } else {
        this._record(true, message);
      }
    }
  },

  /**
   * Asserts that actual is within tolerance of expected (for floating-point comparisons).
   * @param {number} actual - The actual numeric value
   * @param {number} expected - The expected numeric value
   * @param {number} tolerance - Acceptable deviation
   * @param {string} message - Test description
   */
  assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) <= tolerance) {
      this._record(true, message);
    } else {
      this._record(false, message, `Expected ${expected} \u00B1 ${tolerance}, got ${actual}`);
    }
  },

  /**
   * Records a single test result in the results array and increments the appropriate counter.
   * @param {boolean} passed - Whether the test passed
   * @param {string} name - Test name/description
   * @param {string|null} [errorMessage] - Error details if failed
   */
  _record(passed, name, errorMessage) {
    this.results.push({ passed, name, error: errorMessage || null });
    if (passed) {
      this.passCount++;
    } else {
      this.failCount++;
    }
  },

  /**
   * Runs all defined tests and renders results to the DOM.
   */
  run() {
    this._runAllTests();
    this._renderResults();
  },

  /**
   * Contains all test cases grouped by module.
   */
  _runAllTests() {

    // ─── DATA MODULE TESTS ───────────────────────────────────────────────────

    this.assertTrue(
      EcoData.emissionFactors.transport.car.factor > 0,
      'Car emission factor exists and is positive'
    );

    this.assertEqual(
      EcoData.emissionFactors.transport.bike.factor, 0,
      'Bike emission factor is zero'
    );

    this.assertEqual(
      EcoData.emissionFactors.transport.walk.factor, 0,
      'Walk emission factor is zero'
    );

    let allHaveSources = true;
    for (const category of Object.keys(EcoData.emissionFactors)) {
      for (const activity of Object.values(EcoData.emissionFactors[category])) {
        if (!activity.source || typeof activity.source !== 'string' || activity.source.trim() === '') {
          allHaveSources = false;
        }
      }
    }
    this.assertTrue(allHaveSources, 'All emission factors have source citations');

    this.assertClose(
      EcoData.calculateEmission('transport', 'car', 10), 1.74, 0.001,
      'calculateEmission("transport","car",10) \u2248 1.74'
    );

    this.assertEqual(
      EcoData.calculateEmission('transport', 'bike', 50), 0,
      'calculateEmission("transport","bike",50) = 0'
    );

    this.assertEqual(
      EcoData.calculateEmission('rocket', 'apollo', 100), 0,
      'calculateEmission with invalid category returns 0'
    );

    const sampleAnswers = {
      transport: 'car', dailyKm: 20, food: 'mixed', energy: 'grid',
      monthlyKwh: 150, shopping: 'moderate', lifestyle: 'mixed',
      flightsPerYear: 2, streamingHours: 2
    };
    this.assertTrue(
      typeof EcoData.calculateBaselineFootprint(sampleAnswers) === 'number',
      'calculateBaselineFootprint returns a number'
    );

    const knownAnswers = {
      transport: 'car', dailyKm: 10, food: 'vegan', energy: 'solar',
      monthlyKwh: 100, shopping: 'minimal', flightsPerYear: 0, streamingHours: 1
    };
    const footprint = EcoData.calculateBaselineFootprint(knownAnswers);
    this.assertTrue(
      footprint >= 0.5 && footprint <= 5,
      'calculateBaselineFootprint with known inputs is in expected range (0.5 \u2013 5 tonnes)'
    );

    const requiredTipFields = ['id', 'category', 'title', 'savings', 'difficulty', 'impact', 'description'];
    const allTipsValid = EcoData.tips.every(tip =>
      requiredTipFields.every(f => tip[f])
    );
    this.assertTrue(allTipsValid, 'All tips have required fields (id, category, title, savings, difficulty, impact, description)');

    // ─── STORAGE MODULE TESTS ────────────────────────────────────────────────

    EcoStorage.resetAll();

    const testProfile = { name: 'Alice', quizAnswers: { transport: 'car', food: 'mixed', energy: 'grid', shopping: 'moderate', lifestyle: 'mixed' } };
    EcoStorage.saveProfile(testProfile);
    const retrieved = EcoStorage.getProfile();
    this.assertTrue(
      retrieved !== null && retrieved.name === 'Alice',
      'saveProfile + getProfile round-trips name correctly'
    );

    EcoStorage.resetAll();
    EcoStorage.addLog({ category: 'transport', quantity: 10, date: '2025-06-17' });
    const logs = EcoStorage.getLogs();
    this.assertTrue(
      logs.length === 1 && logs[0].category === 'transport',
      'addLog + getLogs stores and retrieves one log'
    );

    const logId = logs[0].id;
    EcoStorage.deleteLog(logId);
    const logsAfterDelete = EcoStorage.getLogs();
    this.assertEqual(logsAfterDelete.length, 0, 'deleteLog removes the targeted entry');

    const xssInput = '<script>alert("xss")</script>';
    const sanitized = EcoStorage.sanitizeString(xssInput);
    this.assertTrue(
      !sanitized.includes('<script>'),
      'sanitizeString escapes <script> tags from XSS payload'
    );

    this.assertFalse(EcoStorage.validateImportData(null), 'validateImportData rejects null');

    const badData = { profile: { quizAnswers: { transport: 'car' } }, logs: [], tips: {} };
    this.assertFalse(
      EcoStorage.validateImportData(badData),
      'validateImportData rejects data missing required quizAnswers categories'
    );

    const goodData = {
      profile: { name: 'Bob', quizAnswers: { transport: 'bus', food: 'vegan', energy: 'solar', shopping: 'minimal', lifestyle: 'low' } },
      logs: [],
      tips: { completedTips: [], dismissedTips: [], lastUpdated: '' }
    };
    this.assertTrue(
      EcoStorage.validateImportData(goodData),
      'validateImportData accepts a correctly structured import payload'
    );

    EcoStorage.resetAll();
    const exported = EcoStorage.exportData();
    this.assertTrue(
      typeof exported === 'object' && 'profile' in exported && 'logs' in exported &&
      'tips' in exported && 'exportedAt' in exported && exported.version === '1.0',
      'exportData returns object with profile, logs, tips, exportedAt, and version 1.0'
    );

    EcoStorage.resetAll();
    this.assertThrows(
      () => EcoStorage.addLog({ category: 'transport', quantity: -5, date: '2025-06-17' }),
      'addLog rejects negative quantity'
    );

    // ─── SCORING ENGINE TESTS ─────────────────────────────────────────────

    this.assertTrue(
      App.calculateEcoScore(2.0) >= 0 && App.calculateEcoScore(2.0) <= 100,
      'EcoScore: returns value between 0 and 100'
    );

    this.assertEqual(App.calculateEcoScore(0.5), 100, 'EcoScore: very low footprint = 100');

    this.assertTrue(
      App.calculateEcoScore(1.9) > App.calculateEcoScore(4.7),
      'EcoScore: lower footprint gives higher score'
    );

    const mockProfile = {
      quizAnswers: {
        transport: 'car', dailyKm: 20, food: 'mixed', energy: 'grid',
        monthlyKwh: 150, shopping: 'moderate', flightsPerYear: 2, streamingHours: 3
      },
      baselineFootprint: 4.2
    };

    const breakdown = Dashboard.getCategoryBreakdown(mockProfile);
    this.assertEqual(breakdown.length, 5, 'CategoryBreakdown: returns 5 categories');

    this.assertTrue(
      breakdown.every(c => c.percentage >= 0 && c.percentage <= 100),
      'CategoryBreakdown: all percentages between 0-100'
    );

    const totalPct = breakdown.reduce((sum, c) => sum + c.percentage, 0);
    this.assertClose(totalPct, 100, 5, 'CategoryBreakdown: percentages sum to ~100');

    this.assertFalse(
      App.hasBadge('badge_commuter', mockProfile),
      'Badge: 20km/day car commuter does not earn Green Commuter'
    );

    const lowFpProfile = {
      quizAnswers: {
        transport: 'bike', dailyKm: 5, food: 'vegan', energy: 'solar',
        monthlyKwh: 50, shopping: 'minimal', flightsPerYear: 0, streamingHours: 1
      },
      baselineFootprint: 0.8
    };

    this.assertTrue(App.hasBadge('badge_commuter', lowFpProfile), 'Badge: bike commuter earns Green Commuter');
    this.assertTrue(App.hasBadge('badge_leader', lowFpProfile), 'Badge: 0.8t footprint earns Lifestyle Leader');

    localStorage.removeItem('eco_logs');
    this.assertEqual(EcoStorage.getStreak(), 0, 'Streak: zero when no logs');

    EcoStorage.resetAll();
    EcoStorage.saveProfile({ name: 'TestUser', quizAnswers: { transport: 'car', food: 'mixed', energy: 'grid', shopping: 'moderate' } });
    EcoStorage.addLog({ category: 'transport', quantity: 5, date: '2025-06-17' });
    EcoStorage.completeTip('tip_transport_1');
    EcoStorage.resetData();
    const profileAfterReset = EcoStorage.getProfile();
    this.assertTrue(
      profileAfterReset !== null && profileAfterReset.name === 'TestUser',
      'resetData: profile is preserved after data reset'
    );
    this.assertEqual(EcoStorage.getLogs().length, 0, 'resetData: logs are cleared');
    this.assertEqual(EcoStorage.getTipsProgress().completedTips.length, 0, 'resetData: tips progress is cleared');

    EcoStorage.resetAll();
    EcoStorage.addLog({ category: 'transport', quantity: 10, date: '2025-06-17' });
    EcoStorage.addLog({ category: 'food', quantity: 1, date: '2025-06-18' });
    this.assertEqual(EcoStorage.getLogsByDate('2025-06-17').length, 1, 'getLogsByDate: returns logs for specific date');
    this.assertEqual(EcoStorage.getLogsByDate('2025-06-19').length, 0, 'getLogsByDate: returns empty for date with no logs');

    EcoStorage.resetAll();
    const today = new Date();
    for (let si = 0; si < 3; si++) {
      const d = new Date(today);
      d.setDate(today.getDate() - si);
      EcoStorage.addLog({ category: 'transport', quantity: 5, date: d.toISOString().slice(0, 10) });
    }
    this.assertTrue(App.hasBadge('badge_streak3', null), 'Badge: 3-day streak earns 3-Day Streak badge');
    this.assertFalse(App.hasBadge('badge_streak7', null), 'Badge: 3-day streak does not earn Week Warrior');

    EcoStorage.resetAll();
    for (let ti = 1; ti <= 5; ti++) {
      EcoStorage.completeTip(`tip_test_${ti}`);
    }
    this.assertTrue(App.hasBadge('badge_tips5', null), 'Badge: 5 completed tips earns Tip Explorer');
    this.assertFalse(App.hasBadge('badge_tips15', null), 'Badge: 5 tips does not earn Tip Master');

    EcoStorage.resetAll();
    for (let li = 0; li < 10; li++) {
      EcoStorage.addLog({ category: 'transport', quantity: 5, date: '2025-06-17' });
    }
    this.assertTrue(App.hasBadge('badge_logger10', null), 'Badge: 10 logs earns Logger Pro');
    this.assertFalse(App.hasBadge('badge_logger50', null), 'Badge: 10 logs does not earn Data Champion');

    const badgeFields = ['id', 'name', 'icon', 'description', 'type'];
    const allBadgesValid = EcoData.badges.every(b =>
      badgeFields.every(f => b[f] && typeof b[f] === 'string')
    );
    this.assertTrue(allBadgesValid, 'All badges have required fields (id, name, icon, description, type)');

    const testRing = EcoData.buildSVGRing({
      radius: 40, strokeWidth: 6, ratio: 0.5, stroke: 'green',
      trackStroke: '#eee', size: 100, ariaLabel: 'Test ring',
      centerText: '50', subText: 'test'
    });
    this.assertTrue(
      testRing.includes('<svg') && testRing.includes('</svg>'),
      'buildSVGRing: returns valid SVG string'
    );

    this.assertEqual(EcoData.getFootprintColor(1.0), 'var(--color-success)', 'getFootprintColor: low footprint returns success color');
    this.assertEqual(EcoData.getFootprintColor(3.0), 'var(--color-warning)', 'getFootprintColor: medium footprint returns warning color');
    this.assertEqual(EcoData.getFootprintColor(6.0), 'var(--color-danger)', 'getFootprintColor: high footprint returns danger color');

    EcoStorage.resetAll();
  },

  /**
   * Renders test results and summary counts into the DOM.
   */
  _renderResults() {
    const total = this.passCount + this.failCount;
    document.getElementById('count-total').textContent = total;
    document.getElementById('count-pass').textContent = this.passCount;
    document.getElementById('count-fail').textContent = this.failCount;

    const container = document.getElementById('results');
    container.innerHTML = '';

    this.results.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = `test-item ${r.passed ? 'pass' : 'fail'}`;

      const badge = document.createElement('span');
      badge.className = `test-badge ${r.passed ? 'pass' : 'fail'}`;
      badge.textContent = r.passed ? 'PASS' : 'FAIL';

      const info = document.createElement('div');
      info.className = 'test-info';

      const name = document.createElement('div');
      name.className = 'test-name';
      name.textContent = `${i + 1}. ${r.name}`;
      info.appendChild(name);

      if (!r.passed && r.error) {
        const err = document.createElement('div');
        err.className = 'test-error';
        err.textContent = r.error;
        info.appendChild(err);
      }

      item.appendChild(badge);
      item.appendChild(info);
      container.appendChild(item);
    });
  }
};

TestRunner.run();
