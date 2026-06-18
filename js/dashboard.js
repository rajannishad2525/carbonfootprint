'use strict';

/**
 * Dashboard: Renders the main dashboard with footprint ring, category breakdown,
 * weekly activity chart, and comparison against India/global averages.
 * @namespace
 */
const Dashboard = {

  /** Number of days shown in the weekly chart */
  WEEKLY_CHART_DAYS: 7,

  /** Minimum bar height percentage for empty chart bars */
  MIN_BAR_HEIGHT: 4,

  /** Day name abbreviations */
  DAY_NAMES: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  /** Category bar colors */
  CATEGORY_COLORS: {
    transport: 'var(--color-accent)', food: 'var(--color-warning)',
    energy: 'var(--color-primary)', shopping: 'var(--color-success)',
    lifestyle: 'var(--color-neutral)'
  },

  /**
   * Renders the full dashboard, redirecting to #welcome if setup is incomplete.
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
    const breakdown = this.getCategoryBreakdown(profile);
    const comparison = this.getComparison(footprint);
    const weeklyData = this.getWeeklyData(logs);
    const greeting = this._getGreeting(profile);

    main.innerHTML = `
      <div class="screen-dashboard" aria-label="Your carbon footprint dashboard">
        ${greeting}
        ${this._buildHeroCard(footprint, ecoScore, logs)}
        ${this._buildBreakdownCard(breakdown)}
        ${this._buildWeeklyCard(weeklyData)}
        ${this._buildComparisonCard(comparison)}
      </div>`;
  },

  /**
   * Returns greeting HTML based on time of day.
   * @param {Object} profile - User profile
   * @returns {string} Greeting HTML
   */
  _getGreeting(profile) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const name = (profile.name && profile.name !== 'Eco Warrior') ? `, ${profile.name}` : '';
    return `<p class="dash-greeting">${greeting}${name} \u{1F44B}</p>`;
  },

  /**
   * Builds the hero card with footprint ring, eco score, today's CO2, and streak.
   * @param {number} footprint - Annual footprint in tonnes
   * @param {number} ecoScore - Eco score 0-100
   * @param {Array} logs - All log entries
   * @returns {string} Hero card HTML
   */
  _buildHeroCard(footprint, ecoScore, logs) {
    const ringHTML = EcoData.buildSVGRing({
      radius: 68, strokeWidth: 12,
      ratio: Math.min(footprint / EcoData.FOOTPRINT_THRESHOLDS.MAX_DISPLAY, 1),
      stroke: EcoData.getFootprintColor(footprint),
      trackStroke: '#e8ece9', size: 160,
      ariaLabel: `Annual carbon footprint: ${footprint.toFixed(1)} tonnes CO\u2082/yr`,
      centerText: footprint.toFixed(1), subText: 'tonnes CO\u2082/yr',
      fontSize: 28, subFontSize: 11
    });

    const todayStr = EcoData.todayString();
    const todayTotal = logs.filter(l => l.date === todayStr).reduce((sum, l) => sum + (l.co2Kg || 0), 0);

    return `<div class="dash-hero">
      <div class="dash-hero-ring">${ringHTML}</div>
      <div class="dash-hero-stats">
        <div class="dash-stat-item">
          <span class="dash-stat-value" style="color:${EcoData.getScoreColor(ecoScore)}">${ecoScore}</span>
          <span class="dash-stat-label">Eco Score</span>
        </div>
        <div class="dash-stat-item">
          <span class="dash-stat-value">${todayTotal.toFixed(1)}</span>
          <span class="dash-stat-label">kg CO\u2082 today</span>
        </div>
        <div class="dash-stat-item">
          <span class="dash-stat-value">${EcoStorage.getStreak()}</span>
          <span class="dash-stat-label">day streak \u{1F525}</span>
        </div>
      </div>
    </div>`;
  },

  /**
   * Builds the category breakdown card.
   * @param {Array} breakdown - Category breakdown data
   * @returns {string} HTML string
   */
  _buildBreakdownCard(breakdown) {
    const bars = breakdown.map(cat => `
      <li role="listitem" class="category-bar-item">
        <div class="category-bar-header">
          <span><span aria-hidden="true">${EcoData.categoryIcons[cat.key]}</span> ${cat.label} (${cat.percentage}%)</span>
          <span>${Math.round(cat.value)} kg CO\u2082/yr</span>
        </div>
        <div class="bar-track" role="presentation">
          <div class="bar-fill" style="width:${cat.percentage}%;background:${cat.color};" aria-hidden="true"></div>
        </div>
      </li>`).join('');

    return `<div class="card mt-16">
      <h2 class="card-title">Category Breakdown</h2>
      <ul role="list" class="category-bars">${bars}</ul>
    </div>`;
  },

  /**
   * Builds the weekly activity chart card.
   * @param {Array} weeklyData - Weekly data array
   * @returns {string} HTML string
   */
  _buildWeeklyCard(weeklyData) {
    const bars = weeklyData.map(day => `
      <div class="chart-bar-col">
        <div class="chart-bar" style="height:${day.height}%;background:var(--color-primary);" aria-hidden="true"></div>
        <span class="chart-label">${day.label}</span>
      </div>`).join('');

    return `<div class="card mt-16">
      <h2 class="card-title">Weekly Activity</h2>
      <div class="weekly-chart" role="img" aria-label="Bar chart of CO2 logged over the last 7 days">
        <div class="chart-bars">${bars}</div>
      </div>
    </div>`;
  },

  /**
   * Builds the comparison card.
   * @param {Array} comparison - Comparison data
   * @returns {string} HTML string
   */
  _buildComparisonCard(comparison) {
    const items = comparison.map(item => {
      const barColor = item.status === 'Below' ? 'var(--color-success)' : 'var(--color-danger)';
      return `<li role="listitem" class="comparison-item">
        <div class="comparison-header">
          <span>${item.label} (${item.benchmark}t)</span>
          <span class="badge ${item.badgeClass}">${item.status}</span>
        </div>
        <div class="bar-track" role="presentation">
          <div class="bar-fill" style="width:${item.yourWidth}%;background:${barColor};" aria-hidden="true"></div>
        </div>
      </li>`;
    }).join('');

    return `<div class="card mt-16">
      <h2 class="card-title">How You Compare</h2>
      <ul role="list" class="comparison-list">${items}</ul>
    </div>`;
  },

  /**
   * Calculates annual kg CO2 for each category, sorted highest first.
   * @param {Object} profile - User profile with quizAnswers
   * @returns {Array<Object>} Sorted category breakdown
   */
  getCategoryBreakdown(profile) {
    const qa = profile.quizAnswers;
    const { DAYS_PER_YEAR, MONTHS_PER_YEAR, KG_PER_TONNE } = EcoData;

    const categories = [
      { key: 'transport', label: EcoData.categoryLabels.transport, value: EcoData.getFactor('transport', qa.transport) * (qa.dailyKm || 0) * DAYS_PER_YEAR, color: this.CATEGORY_COLORS.transport },
      { key: 'food', label: EcoData.categoryLabels.food, value: EcoData.getFactor('food', qa.food) * DAYS_PER_YEAR, color: this.CATEGORY_COLORS.food },
      { key: 'energy', label: EcoData.categoryLabels.energy, value: EcoData.getFactor('energy', qa.energy) * (qa.monthlyKwh || 0) * MONTHS_PER_YEAR, color: this.CATEGORY_COLORS.energy },
      { key: 'shopping', label: EcoData.categoryLabels.shopping, value: EcoData.getFactor('shopping', qa.shopping) * KG_PER_TONNE, color: this.CATEGORY_COLORS.shopping },
      { key: 'lifestyle', label: EcoData.categoryLabels.lifestyle, value: EcoData.emissionFactors.lifestyle.flight.factor * (qa.flightsPerYear || 0) + EcoData.emissionFactors.lifestyle.streaming.factor * (qa.streamingHours || 0) * DAYS_PER_YEAR, color: this.CATEGORY_COLORS.lifestyle }
    ];

    categories.sort((a, b) => b.value - a.value);
    const total = categories.reduce((sum, c) => sum + c.value, 0);

    return categories.map(cat => ({
      ...cat,
      percentage: total > 0 ? Math.round((cat.value / total) * 100) : 0
    }));
  },

  /**
   * Returns comparison data vs India and Global averages.
   * @param {number} footprint - User's annual footprint in tonnes
   * @returns {Array<Object>} Comparison items
   */
  getComparison(footprint) {
    return [
      { label: 'India Average', benchmark: EcoData.benchmarks.india.value },
      { label: 'Global Average', benchmark: EcoData.benchmarks.global.value }
    ].map(b => {
      const status = footprint <= b.benchmark ? 'Below' : 'Above';
      const maxWidth = Math.max(footprint, b.benchmark) * 1.2;
      return {
        label: b.label, benchmark: b.benchmark, status,
        badgeClass: status === 'Below' ? 'badge-easy' : 'badge-hard',
        yourWidth: Math.min(Math.round((footprint / maxWidth) * 100), 100)
      };
    });
  },

  /**
   * Builds array of last 7 days with CO2 values and bar heights.
   * @param {Array} logs - All log entries
   * @returns {Array<Object>} Weekly data
   */
  getWeeklyData(logs) {
    const today = new Date();
    const week = [];

    for (let i = this.WEEKLY_CHART_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const value = logs.filter(l => l.date === dateStr).reduce((sum, l) => sum + (l.co2Kg || 0), 0);
      week.push({ label: this.DAY_NAMES[d.getDay()], value, date: dateStr, height: 0 });
    }

    const maxVal = Math.max(...week.map(d => d.value));
    return week.map(d => ({
      ...d,
      height: maxVal > 0 ? Math.round((d.value / maxVal) * 100) : this.MIN_BAR_HEIGHT
    }));
  }
};
