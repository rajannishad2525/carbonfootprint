// TestRunner: Lightweight browser-based test runner with assertion helpers
const TestRunner = {

  results: [],
  passCount: 0,
  failCount: 0,

  // Asserts that two values are strictly equal using ===
  assertEqual(actual, expected, message) {
    if (actual === expected) {
      this._record(true, message);
    } else {
      this._record(false, message, 'Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
  },

  // Asserts that a value is strictly true
  assertTrue(value, message) {
    if (value === true) {
      this._record(true, message);
    } else {
      this._record(false, message, 'Expected true, got ' + JSON.stringify(value));
    }
  },

  // Asserts that a value is strictly false
  assertFalse(value, message) {
    if (value === false) {
      this._record(true, message);
    } else {
      this._record(false, message, 'Expected false, got ' + JSON.stringify(value));
    }
  },

  // Asserts that calling fn() throws any error (or one whose message contains expectedMsg)
  assertThrows(fn, message, expectedMsg) {
    try {
      fn();
      this._record(false, message, 'Expected an error to be thrown but none was.');
    } catch (e) {
      if (expectedMsg && e.message.indexOf(expectedMsg) === -1) {
        this._record(false, message, 'Error thrown but message did not match. Got: ' + e.message);
      } else {
        this._record(true, message);
      }
    }
  },

  // Asserts that actual is within tolerance of expected (for floating-point comparisons)
  assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) <= tolerance) {
      this._record(true, message);
    } else {
      this._record(false, message,
        'Expected ' + expected + ' ± ' + tolerance + ', got ' + actual);
    }
  },

  // Records a single test result in the results array and increments the appropriate counter
  _record(passed, name, errorMessage) {
    this.results.push({ passed: passed, name: name, error: errorMessage || null });
    if (passed) {
      this.passCount++;
    } else {
      this.failCount++;
    }
  },

  // Runs all defined tests and renders results to the DOM
  run() {
    this._runAllTests();
    this._renderResults();
  },

  // Contains all test cases grouped by module
  _runAllTests() {

    // ─── DATA MODULE TESTS ───────────────────────────────────────────────────

    // Test 1: Car emission factor exists and is positive
    this.assertTrue(
      EcoData.emissionFactors.transport.car.factor > 0,
      'Car emission factor exists and is positive'
    );

    // Test 2: Bike emission factor is zero
    this.assertEqual(
      EcoData.emissionFactors.transport.bike.factor,
      0,
      'Bike emission factor is zero'
    );

    // Test 3: Walk emission factor is zero
    this.assertEqual(
      EcoData.emissionFactors.transport.walk.factor,
      0,
      'Walk emission factor is zero'
    );

    // Test 4: All emission factors have source citations
    let allHaveSources = true;
    const categories = Object.keys(EcoData.emissionFactors);
    for (let c = 0; c < categories.length; c++) {
      const activities = Object.values(EcoData.emissionFactors[categories[c]]);
      for (let a = 0; a < activities.length; a++) {
        if (!activities[a].source || typeof activities[a].source !== 'string' || activities[a].source.trim() === '') {
          allHaveSources = false;
        }
      }
    }
    this.assertTrue(allHaveSources, 'All emission factors have source citations');

    // Test 5: calculateEmission for car over 10 km returns ~1.74
    this.assertClose(
      EcoData.calculateEmission('transport', 'car', 10),
      1.74,
      0.001,
      'calculateEmission("transport","car",10) ≈ 1.74'
    );

    // Test 6: calculateEmission for bike over 50 km returns 0
    this.assertEqual(
      EcoData.calculateEmission('transport', 'bike', 50),
      0,
      'calculateEmission("transport","bike",50) = 0'
    );

    // Test 7: calculateEmission with invalid category returns 0
    this.assertEqual(
      EcoData.calculateEmission('rocket', 'apollo', 100),
      0,
      'calculateEmission with invalid category returns 0'
    );

    // Test 8: calculateBaselineFootprint returns a number
    const sampleAnswers = {
      transport: 'car',
      dailyKm: 20,
      food: 'mixed',
      energy: 'grid',
      monthlyKwh: 150,
      shopping: 'moderate',
      lifestyle: 'mixed',
      flightsPerYear: 2,
      streamingHours: 2
    };
    this.assertTrue(
      typeof EcoData.calculateBaselineFootprint(sampleAnswers) === 'number',
      'calculateBaselineFootprint returns a number'
    );

    // Test 9: calculateBaselineFootprint with known inputs falls within expected range
    const knownAnswers = {
      transport: 'car',
      dailyKm: 10,
      food: 'vegan',
      energy: 'solar',
      monthlyKwh: 100,
      shopping: 'minimal',
      flightsPerYear: 0,
      streamingHours: 1
    };
    const footprint = EcoData.calculateBaselineFootprint(knownAnswers);
    this.assertTrue(
      footprint >= 0.5 && footprint <= 5,
      'calculateBaselineFootprint with known inputs is in expected range (0.5 – 5 tonnes)'
    );

    // Test 10: All tips have required fields
    const requiredTipFields = ['id', 'category', 'title', 'savings', 'difficulty', 'impact', 'description'];
    let allTipsValid = true;
    for (let t = 0; t < EcoData.tips.length; t++) {
      const tip = EcoData.tips[t];
      for (let f = 0; f < requiredTipFields.length; f++) {
        if (!tip[requiredTipFields[f]]) {
          allTipsValid = false;
        }
      }
    }
    this.assertTrue(allTipsValid, 'All tips have required fields (id, category, title, savings, difficulty, impact, description)');

    // ─── STORAGE MODULE TESTS ────────────────────────────────────────────────

    EcoStorage.resetAll();

    // Test 11: saveProfile + getProfile round-trips correctly
    const testProfile = { name: 'Alice', quizAnswers: { transport: 'car', food: 'mixed', energy: 'grid', shopping: 'moderate', lifestyle: 'mixed' } };
    EcoStorage.saveProfile(testProfile);
    const retrieved = EcoStorage.getProfile();
    this.assertTrue(
      retrieved !== null && retrieved.name === 'Alice',
      'saveProfile + getProfile round-trips name correctly'
    );

    // Test 12: addLog + getLogs works
    EcoStorage.resetAll();
    EcoStorage.addLog({ category: 'transport', quantity: 10, date: '2025-06-17' });
    const logs = EcoStorage.getLogs();
    this.assertTrue(
      logs.length === 1 && logs[0].category === 'transport',
      'addLog + getLogs stores and retrieves one log'
    );

    // Test 13: deleteLog removes the entry
    const logId = logs[0].id;
    EcoStorage.deleteLog(logId);
    const logsAfterDelete = EcoStorage.getLogs();
    this.assertEqual(
      logsAfterDelete.length,
      0,
      'deleteLog removes the targeted entry'
    );

    // Test 14: sanitizeString escapes HTML tags to prevent XSS
    const xssInput = '<script>alert("xss")</script>';
    const sanitized = EcoStorage.sanitizeString(xssInput);
    this.assertTrue(
      sanitized.indexOf('<script>') === -1,
      'sanitizeString escapes <script> tags from XSS payload'
    );

    // Test 15: validateImportData rejects null
    this.assertFalse(
      EcoStorage.validateImportData(null),
      'validateImportData rejects null'
    );

    // Test 16: validateImportData rejects invalid structure (missing quizAnswers keys)
    const badData = {
      profile: { quizAnswers: { transport: 'car' } },
      logs: [],
      tips: {}
    };
    this.assertFalse(
      EcoStorage.validateImportData(badData),
      'validateImportData rejects data missing required quizAnswers categories'
    );

    // Test 17: validateImportData accepts valid data
    const goodData = {
      profile: {
        name: 'Bob',
        quizAnswers: {
          transport: 'bus',
          food: 'vegan',
          energy: 'solar',
          shopping: 'minimal',
          lifestyle: 'low'
        }
      },
      logs: [],
      tips: { completedTips: [], dismissedTips: [], lastUpdated: '' }
    };
    this.assertTrue(
      EcoStorage.validateImportData(goodData),
      'validateImportData accepts a correctly structured import payload'
    );

    // Test 18: exportData returns correct structure
    EcoStorage.resetAll();
    const exported = EcoStorage.exportData();
    this.assertTrue(
      typeof exported === 'object' &&
      'profile'    in exported &&
      'logs'       in exported &&
      'tips'       in exported &&
      'exportedAt' in exported &&
      exported.version === '1.0',
      'exportData returns object with profile, logs, tips, exportedAt, and version 1.0'
    );

    // Test 19: addLog rejects negative quantity
    EcoStorage.resetAll();
    this.assertThrows(
      function() { EcoStorage.addLog({ category: 'transport', quantity: -5, date: '2025-06-17' }); },
      'addLog rejects negative quantity'
    );

    // ─── SCORING ENGINE TESTS ─────────────────────────────────────────────

    // Test: calculateEcoScore returns 0-100
    this.assertTrue(
      App.calculateEcoScore(2.0) >= 0 && App.calculateEcoScore(2.0) <= 100,
      'EcoScore: returns value between 0 and 100'
    );

    // Test: very low footprint gets max score
    this.assertEqual(
      App.calculateEcoScore(0.5), 100,
      'EcoScore: very low footprint = 100'
    );

    // Test: lower footprint = higher score
    this.assertTrue(
      App.calculateEcoScore(1.9) > App.calculateEcoScore(4.7),
      'EcoScore: lower footprint gives higher score'
    );

    // Test: getCategoryBreakdown returns 5 categories
    var mockProfile = {
      quizAnswers: {
        transport: 'car',
        dailyKm: 20,
        food: 'mixed',
        energy: 'grid',
        monthlyKwh: 150,
        shopping: 'moderate',
        flightsPerYear: 2,
        streamingHours: 3
      },
      baselineFootprint: 4.2
    };

    var breakdown = Dashboard.getCategoryBreakdown(mockProfile);
    this.assertEqual(breakdown.length, 5, 'CategoryBreakdown: returns 5 categories');

    // Test: percentages are valid
    this.assertTrue(
      breakdown.every(function(c) { return c.percentage >= 0 && c.percentage <= 100; }),
      'CategoryBreakdown: all percentages between 0-100'
    );

    // Test: percentages sum to approximately 100
    var totalPct = breakdown.reduce(function(sum, c) { return sum + c.percentage; }, 0);
    this.assertClose(totalPct, 100, 5, 'CategoryBreakdown: percentages sum to ~100');

    // Test: Badge check - heavy car commuter should NOT earn Green Commuter
    this.assertFalse(
      App.hasBadge('badge_commuter', mockProfile),
      'Badge: 20km/day car commuter does not earn Green Commuter'
    );

    // Test: Low footprint profile earns badges
    var lowFpProfile = {
      quizAnswers: {
        transport: 'bike',
        dailyKm: 5,
        food: 'vegan',
        energy: 'solar',
        monthlyKwh: 50,
        shopping: 'minimal',
        flightsPerYear: 0,
        streamingHours: 1
      },
      baselineFootprint: 0.8
    };

    this.assertTrue(
      App.hasBadge('badge_commuter', lowFpProfile),
      'Badge: bike commuter earns Green Commuter'
    );

    this.assertTrue(
      App.hasBadge('badge_leader', lowFpProfile),
      'Badge: 0.8t footprint earns Lifestyle Leader'
    );

    // Test: Streak with no logs
    localStorage.removeItem('eco_logs');
    this.assertEqual(EcoStorage.getStreak(), 0, 'Streak: zero when no logs');

    // Test: resetData clears logs and tips but keeps profile
    EcoStorage.resetAll();
    EcoStorage.saveProfile({ name: 'TestUser', quizAnswers: { transport: 'car', food: 'mixed', energy: 'grid', shopping: 'moderate' } });
    EcoStorage.addLog({ category: 'transport', quantity: 5, date: '2025-06-17' });
    EcoStorage.completeTip('tip_transport_1');
    EcoStorage.resetData();
    var profileAfterReset = EcoStorage.getProfile();
    this.assertTrue(
      profileAfterReset !== null && profileAfterReset.name === 'TestUser',
      'resetData: profile is preserved after data reset'
    );
    this.assertEqual(EcoStorage.getLogs().length, 0, 'resetData: logs are cleared');
    this.assertEqual(EcoStorage.getTipsProgress().completedTips.length, 0, 'resetData: tips progress is cleared');

    // Test: getLogsByDate filters correctly
    EcoStorage.resetAll();
    EcoStorage.addLog({ category: 'transport', quantity: 10, date: '2025-06-17' });
    EcoStorage.addLog({ category: 'food', quantity: 1, date: '2025-06-18' });
    this.assertEqual(EcoStorage.getLogsByDate('2025-06-17').length, 1, 'getLogsByDate: returns logs for specific date');
    this.assertEqual(EcoStorage.getLogsByDate('2025-06-19').length, 0, 'getLogsByDate: returns empty for date with no logs');

    // Test: Streak badge with 3-day streak
    EcoStorage.resetAll();
    var today = new Date();
    for (var si = 0; si < 3; si++) {
      var d = new Date(today);
      d.setDate(today.getDate() - si);
      EcoStorage.addLog({ category: 'transport', quantity: 5, date: d.toISOString().slice(0, 10) });
    }
    this.assertTrue(App.hasBadge('badge_streak3', null), 'Badge: 3-day streak earns 3-Day Streak badge');
    this.assertFalse(App.hasBadge('badge_streak7', null), 'Badge: 3-day streak does not earn Week Warrior');

    // Test: Tips badge earned with 5 completed tips
    EcoStorage.resetAll();
    for (var ti = 1; ti <= 5; ti++) {
      EcoStorage.completeTip('tip_test_' + ti);
    }
    this.assertTrue(App.hasBadge('badge_tips5', null), 'Badge: 5 completed tips earns Tip Explorer');
    this.assertFalse(App.hasBadge('badge_tips15', null), 'Badge: 5 tips does not earn Tip Master');

    // Test: Activity badge earned with 10 logs
    EcoStorage.resetAll();
    for (var li = 0; li < 10; li++) {
      EcoStorage.addLog({ category: 'transport', quantity: 5, date: '2025-06-17' });
    }
    this.assertTrue(App.hasBadge('badge_logger10', null), 'Badge: 10 logs earns Logger Pro');
    this.assertFalse(App.hasBadge('badge_logger50', null), 'Badge: 10 logs does not earn Data Champion');

    // Test: All badges have required fields
    var badgeFields = ['id', 'name', 'icon', 'description', 'type'];
    var allBadgesValid = EcoData.badges.every(function(b) {
      return badgeFields.every(function(f) { return b[f] && typeof b[f] === 'string'; });
    });
    this.assertTrue(allBadgesValid, 'All badges have required fields (id, name, icon, description, type)');

    // Cleanup localStorage after all tests
    EcoStorage.resetAll();
  },

  // Renders test results and summary counts into the DOM
  _renderResults() {
    const total = this.passCount + this.failCount;
    document.getElementById('count-total').textContent = total;
    document.getElementById('count-pass').textContent  = this.passCount;
    document.getElementById('count-fail').textContent  = this.failCount;

    const container = document.getElementById('results');
    container.innerHTML = '';

    for (let i = 0; i < this.results.length; i++) {
      const r = this.results[i];
      const item = document.createElement('div');
      item.className = 'test-item ' + (r.passed ? 'pass' : 'fail');

      const badge = document.createElement('span');
      badge.className = 'test-badge ' + (r.passed ? 'pass' : 'fail');
      badge.textContent = r.passed ? 'PASS' : 'FAIL';

      const info = document.createElement('div');
      info.className = 'test-info';

      const name = document.createElement('div');
      name.className = 'test-name';
      name.textContent = (i + 1) + '. ' + r.name;
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
    }
  }
};

// Run all tests when the script loads
TestRunner.run();
