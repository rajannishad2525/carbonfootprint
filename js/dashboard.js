/**
 * Dashboard: Renders the main dashboard screen with footprint ring, category breakdown,
 * weekly activity chart, and comparison against India/global averages.
 * @namespace
 */
const Dashboard = {

  /** Number of days shown in the weekly activity chart */
  WEEKLY_CHART_DAYS: 7,

  /** Minimum bar height percentage for empty chart bars */
  MIN_BAR_HEIGHT: 4,

  /** Day name abbreviations for the weekly chart */
  DAY_NAMES: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  /** Category bar colors mapped by emission category */
  CATEGORY_COLORS: {
    transport: 'var(--color-accent)',
    food:      'var(--color-warning)',
    energy:    'var(--color-primary)',
    shopping:  'var(--color-success)',
    lifestyle: 'var(--color-neutral)'
  },

  /**
   * Renders the full dashboard into #main-content, redirecting to #welcome if setup is incomplete.
   */
  render() {
    const main = document.getElementById('main-content');
    const profile = EcoStorage.getProfile();

    if (!profile || !profile.quizAnswers) {
      window.location.hash = 'welcome';
      return;
    }

    const logs = EcoStorage.getLogs();
    const footprint = EcoData.calculateBaselineFootprint(profile.quizAnswers);
    const ecoScore = App.calculateEcoScore(footprint);
    const breakdown = Dashboard.getCategoryBreakdown(profile);
    const comparison = Dashboard.getComparison(footprint);
    const weeklyData = Dashboard.getWeeklyData(logs);

    main.innerHTML = '<div class="screen-dashboard" aria-label="Your carbon footprint dashboard">'
      + Dashboard._buildGreeting(profile)
      + Dashboard._buildHeroCard(footprint, ecoScore, logs)
      + Dashboard._buildBreakdownCard(breakdown)
      + Dashboard._buildWeeklyCard(weeklyData)
      + Dashboard._buildComparisonCard(comparison)
      + '</div>';
  },

  /**
   * Builds the time-based greeting HTML.
   * @param {Object} profile - User profile object
   * @returns {string} Greeting HTML string
   */
  _buildGreeting(profile) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const userName = (profile.name && profile.name !== 'Eco Warrior') ? ', ' + profile.name : '';
    return '<p class="dash-greeting">' + greeting + userName + ' 👋</p>';
  },

  /**
   * Builds the hero card with footprint ring, eco score, today's CO2, and streak.
   * @param {number} footprint - Annual footprint in tonnes CO2
   * @param {number} ecoScore - Eco score 0-100
   * @param {Array} logs - All log entries
   * @returns {string} Hero card HTML string
   */
  _buildHeroCard(footprint, ecoScore, logs) {
    const circleColor = EcoData.getFootprintColor(footprint);
    const maxFootprint = EcoData.FOOTPRINT_THRESHOLDS.MAX_DISPLAY;
    const ratio = Math.min(footprint / maxFootprint, 1);
    const footprintLabel = footprint.toFixed(1) + ' tonnes CO\u2082/yr';

    const ringHTML = EcoData.buildSVGRing({
      radius: 68, strokeWidth: 12, ratio: ratio, stroke: circleColor,
      trackStroke: '#e8ece9', size: 160,
      ariaLabel: 'Annual carbon footprint: ' + footprintLabel,
      centerText: footprint.toFixed(1), subText: 'tonnes CO\u2082/yr',
      fontSize: 28, subFontSize: 11
    });

    const scoreColor = EcoData.getScoreColor(ecoScore);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTotal = logs.filter(function(l) { return l.date === todayStr; })
      .reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);

    return '<div class="dash-hero">'
      + '<div class="dash-hero-ring">' + ringHTML + '</div>'
      + '<div class="dash-hero-stats">'
      + '<div class="dash-stat-item">'
      + '<span class="dash-stat-value" style="color:' + scoreColor + '">' + ecoScore + '</span>'
      + '<span class="dash-stat-label">Eco Score</span>'
      + '</div>'
      + '<div class="dash-stat-item">'
      + '<span class="dash-stat-value">' + todayTotal.toFixed(1) + '</span>'
      + '<span class="dash-stat-label">kg CO\u2082 today</span>'
      + '</div>'
      + '<div class="dash-stat-item">'
      + '<span class="dash-stat-value">' + EcoStorage.getStreak() + '</span>'
      + '<span class="dash-stat-label">day streak 🔥</span>'
      + '</div>'
      + '</div>'
      + '</div>';
  },

  /**
   * Builds the category breakdown card HTML.
   * @param {Array} breakdown - Category breakdown array from getCategoryBreakdown
   * @returns {string} Breakdown card HTML string
   */
  _buildBreakdownCard(breakdown) {
    const barsHTML = breakdown.map(function(cat) {
      return '<li role="listitem" class="category-bar-item">'
        + '<div class="category-bar-header">'
        + '<span><span aria-hidden="true">' + EcoData.categoryIcons[cat.key] + '</span> ' + cat.label + ' (' + cat.percentage + '%)</span>'
        + '<span>' + Math.round(cat.value) + ' kg CO\u2082/yr</span>'
        + '</div>'
        + '<div class="bar-track" role="presentation">'
        + '<div class="bar-fill" style="width:' + cat.percentage + '%;background:' + cat.color + ';" aria-hidden="true"></div>'
        + '</div>'
        + '</li>';
    }).join('');

    return '<div class="card mt-16">'
      + '<h2 class="card-title">Category Breakdown</h2>'
      + '<ul role="list" class="category-bars">' + barsHTML + '</ul>'
      + '</div>';
  },

  /**
   * Builds the weekly activity chart card HTML.
   * @param {Array} weeklyData - Weekly data array from getWeeklyData
   * @returns {string} Weekly chart card HTML string
   */
  _buildWeeklyCard(weeklyData) {
    const barsHTML = weeklyData.map(function(day) {
      return '<div class="chart-bar-col">'
        + '<div class="chart-bar" style="height:' + day.height + '%;background:var(--color-primary);" aria-hidden="true"></div>'
        + '<span class="chart-label">' + day.label + '</span>'
        + '</div>';
    }).join('');

    return '<div class="card mt-16">'
      + '<h2 class="card-title">Weekly Activity</h2>'
      + '<div class="weekly-chart" role="img" aria-label="Bar chart of CO2 logged over the last 7 days">'
      + '<div class="chart-bars">' + barsHTML + '</div>'
      + '</div>'
      + '</div>';
  },

  /**
   * Builds the comparison card HTML.
   * @param {Array} comparison - Comparison data array from getComparison
   * @returns {string} Comparison card HTML string
   */
  _buildComparisonCard(comparison) {
    const itemsHTML = comparison.map(function(item) {
      const barColor = item.status === 'Below' ? 'var(--color-success)' : 'var(--color-danger)';
      return '<li role="listitem" class="comparison-item">'
        + '<div class="comparison-header">'
        + '<span>' + item.label + ' (' + item.benchmark + 't)</span>'
        + '<span class="badge ' + item.badgeClass + '">' + item.status + '</span>'
        + '</div>'
        + '<div class="bar-track" role="presentation">'
        + '<div class="bar-fill" style="width:' + item.yourWidth + '%;background:' + barColor + ';" aria-hidden="true"></div>'
        + '</div>'
        + '</li>';
    }).join('');

    return '<div class="card mt-16">'
      + '<h2 class="card-title">How You Compare</h2>'
      + '<ul role="list" class="comparison-list">' + itemsHTML + '</ul>'
      + '</div>';
  },

  /**
   * Calculates annual kg CO2 for each of the 5 categories from saved quiz answers, sorted highest first.
   * @param {Object} profile - User profile with quizAnswers
   * @returns {Array<Object>} Sorted array of category objects with key, label, value, color, percentage
   */
  getCategoryBreakdown(profile) {
    const qa = profile.quizAnswers;
    const ef = EcoData.emissionFactors;

    const transportFactor = ef.transport[qa.transport] ? ef.transport[qa.transport].factor : 0;
    const transportKg = transportFactor * (qa.dailyKm || 0) * EcoData.DAYS_PER_YEAR;

    const foodFactor = ef.food[qa.food] ? ef.food[qa.food].factor : 0;
    const foodKg = foodFactor * EcoData.DAYS_PER_YEAR;

    const energyFactor = ef.energy[qa.energy] ? ef.energy[qa.energy].factor : 0;
    const energyKg = energyFactor * (qa.monthlyKwh || 0) * EcoData.MONTHS_PER_YEAR;

    const shoppingFactor = ef.shopping[qa.shopping] ? ef.shopping[qa.shopping].factor : 0;
    const shoppingKg = shoppingFactor * EcoData.KG_PER_TONNE;

    const flightKg = ef.lifestyle.flight.factor * (qa.flightsPerYear || 0);
    const streamingKg = ef.lifestyle.streaming.factor * (qa.streamingHours || 0) * EcoData.DAYS_PER_YEAR;
    const lifestyleKg = flightKg + streamingKg;

    const categories = [
      { key: 'transport', label: EcoData.categoryLabels.transport, value: transportKg, color: this.CATEGORY_COLORS.transport },
      { key: 'food',      label: EcoData.categoryLabels.food,      value: foodKg,      color: this.CATEGORY_COLORS.food },
      { key: 'energy',    label: EcoData.categoryLabels.energy,    value: energyKg,    color: this.CATEGORY_COLORS.energy },
      { key: 'shopping',  label: EcoData.categoryLabels.shopping,  value: shoppingKg,  color: this.CATEGORY_COLORS.shopping },
      { key: 'lifestyle', label: EcoData.categoryLabels.lifestyle, value: lifestyleKg, color: this.CATEGORY_COLORS.lifestyle }
    ];

    categories.sort(function(a, b) { return b.value - a.value; });

    const total = categories.reduce(function(sum, c) { return sum + c.value; }, 0);

    return categories.map(function(cat) {
      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
      return Object.assign({}, cat, { percentage: pct });
    });
  },

  /**
   * Returns comparison data showing the user's footprint relative to India and Global averages.
   * @param {number} footprint - User's annual footprint in tonnes CO2
   * @returns {Array<Object>} Comparison items with label, benchmark, yourWidth, status, badgeClass
   */
  getComparison(footprint) {
    const benchmarks = [
      { label: 'India Average',  benchmark: EcoData.benchmarks.india.value },
      { label: 'Global Average', benchmark: EcoData.benchmarks.global.value }
    ];

    return benchmarks.map(function(b) {
      const status = footprint <= b.benchmark ? 'Below' : 'Above';
      const badgeClass = status === 'Below' ? 'badge-easy' : 'badge-hard';
      const maxWidth = Math.max(footprint, b.benchmark) * 1.2;
      const yourWidth = Math.min(Math.round((footprint / maxWidth) * 100), 100);
      return { label: b.label, benchmark: b.benchmark, yourWidth: yourWidth, status: status, badgeClass: badgeClass };
    });
  },

  /**
   * Builds an array of the last 7 days with summed CO2 values and bar heights proportional to the max.
   * @param {Array} logs - All log entries
   * @returns {Array<Object>} Weekly data with label, value, date, height for each day
   */
  getWeeklyData(logs) {
    const today = new Date();
    const week = [];

    for (let i = this.WEEKLY_CHART_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = this.DAY_NAMES[d.getDay()];
      const value = logs
        .filter(function(l) { return l.date === dateStr; })
        .reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);
      week.push({ label: label, value: value, date: dateStr, height: 0 });
    }

    const maxVal = Math.max.apply(null, week.map(function(d) { return d.value; }));

    return week.map(function(d) {
      return Object.assign({}, d, { height: maxVal > 0 ? Math.round((d.value / maxVal) * 100) : Dashboard.MIN_BAR_HEIGHT });
    });
  }
};
