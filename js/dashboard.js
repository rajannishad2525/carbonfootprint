// Dashboard: Renders the main dashboard screen with footprint, breakdown, weekly chart, and comparisons
const Dashboard = {

  // Renders the full dashboard into #main-content, redirecting to #welcome if setup is incomplete
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

    const circleColor = footprint <= 1.9 ? 'var(--color-success)' : footprint <= 4.7 ? 'var(--color-warning)' : 'var(--color-danger)';
    const circumference = 2 * Math.PI * 60;
    const maxFootprint = 12;
    const dashOffset = circumference - Math.min(footprint / maxFootprint, 1) * circumference;
    const footprintLabel = footprint.toFixed(1) + ' tonnes CO\u2082/yr';
    const circleAriaLabel = 'Annual carbon footprint: ' + footprintLabel;

    const breakdownHTML = breakdown.map(function(cat) {
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

    const weeklyBarsHTML = weeklyData.map(function(day) {
      return '<div class="chart-bar-col">'
        + '<div class="chart-bar" style="height:' + day.height + '%;background:var(--color-primary);" aria-hidden="true"></div>'
        + '<span class="chart-label">' + day.label + '</span>'
        + '</div>';
    }).join('');

    const comparisonHTML = comparison.map(function(item) {
      return '<li role="listitem" class="comparison-item">'
        + '<div class="comparison-header">'
        + '<span>' + item.label + ' (' + item.benchmark + 't)</span>'
        + '<span class="badge ' + item.badgeClass + '">' + item.status + '</span>'
        + '</div>'
        + '<div class="bar-track" role="presentation">'
        + '<div class="bar-fill" style="width:' + item.yourWidth + '%;background:' + (item.status === 'Below' ? 'var(--color-success)' : 'var(--color-danger)') + ';" aria-hidden="true"></div>'
        + '</div>'
        + '</li>';
    }).join('');

    // Greeting based on time
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    var userName = (profile.name && profile.name !== 'Eco Warrior') ? ', ' + profile.name : '';

    // Eco score color
    var scoreColor = ecoScore >= 70 ? 'var(--color-success)' : ecoScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

    // Today's log total
    var todayStr = new Date().toISOString().slice(0, 10);
    var todayTotal = logs.filter(function(l) { return l.date === todayStr; })
      .reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);

    main.innerHTML = '<div class="screen-dashboard" aria-label="Your carbon footprint dashboard">'

      // Greeting
      + '<p class="dash-greeting">' + greeting + userName + ' 👋</p>'

      // Hero card with footprint ring + eco score
      + '<div class="dash-hero">'
      + '<div class="dash-hero-ring">'
      + '<svg role="img" aria-label="' + circleAriaLabel + '" width="160" height="160" viewBox="0 0 160 160">'
      + '<circle cx="80" cy="80" r="68" fill="none" stroke="#e8ece9" stroke-width="12"/>'
      + '<circle cx="80" cy="80" r="68" fill="none"'
      + ' stroke="' + circleColor + '"'
      + ' stroke-width="12"'
      + ' stroke-dasharray="' + (2 * Math.PI * 68).toFixed(2) + '"'
      + ' stroke-dashoffset="' + ((2 * Math.PI * 68) - Math.min(footprint / maxFootprint, 1) * (2 * Math.PI * 68)).toFixed(2) + '"'
      + ' stroke-linecap="round"'
      + ' transform="rotate(-90 80 80)"/>'
      + '<text x="80" y="72" text-anchor="middle" font-size="28" font-weight="800" fill="var(--color-text)">' + footprint.toFixed(1) + '</text>'
      + '<text x="80" y="92" text-anchor="middle" font-size="11" fill="var(--color-neutral)">tonnes CO\u2082/yr</text>'
      + '</svg>'
      + '</div>'
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
      + '</div>'

      // Category breakdown
      + '<div class="card mt-16">'
      + '<h2 class="card-title">Category Breakdown</h2>'
      + '<ul role="list" class="category-bars">' + breakdownHTML + '</ul>'
      + '</div>'

      // Weekly activity chart
      + '<div class="card mt-16">'
      + '<h2 class="card-title">Weekly Activity</h2>'
      + '<div class="weekly-chart" role="img" aria-label="Bar chart of CO2 logged over the last 7 days">'
      + '<div class="chart-bars">' + weeklyBarsHTML + '</div>'
      + '</div>'
      + '</div>'

      // Comparison
      + '<div class="card mt-16">'
      + '<h2 class="card-title">How You Compare</h2>'
      + '<ul role="list" class="comparison-list">' + comparisonHTML + '</ul>'
      + '</div>'

      + '</div>';
  },

  // Calculates annual kg CO2 for each of the 5 categories from saved quiz answers, sorted highest first
  getCategoryBreakdown(profile) {
    const qa = profile.quizAnswers;
    const ef = EcoData.emissionFactors;

    const transportFactor = ef.transport[qa.transport] ? ef.transport[qa.transport].factor : 0;
    const transportKg = transportFactor * (qa.dailyKm || 0) * 365;

    const foodFactor = ef.food[qa.food] ? ef.food[qa.food].factor : 0;
    const foodKg = foodFactor * 365;

    const energyFactor = ef.energy[qa.energy] ? ef.energy[qa.energy].factor : 0;
    const energyKg = energyFactor * (qa.monthlyKwh || 0) * 12;

    const shoppingFactor = ef.shopping[qa.shopping] ? ef.shopping[qa.shopping].factor : 0;
    const shoppingKg = shoppingFactor * 1000;

    const flightKg = ef.lifestyle.flight.factor * (qa.flightsPerYear || 0);
    const streamingKg = ef.lifestyle.streaming.factor * (qa.streamingHours || 0) * 365;
    const lifestyleKg = flightKg + streamingKg;

    const categories = [
      { key: 'transport', label: EcoData.categoryLabels.transport, value: transportKg, color: 'var(--color-accent)' },
      { key: 'food',      label: EcoData.categoryLabels.food,      value: foodKg,      color: 'var(--color-warning)' },
      { key: 'energy',    label: EcoData.categoryLabels.energy,    value: energyKg,    color: 'var(--color-primary)' },
      { key: 'shopping',  label: EcoData.categoryLabels.shopping,  value: shoppingKg,  color: 'var(--color-success)' },
      { key: 'lifestyle', label: EcoData.categoryLabels.lifestyle, value: lifestyleKg, color: 'var(--color-neutral)' }
    ];

    categories.sort(function(a, b) { return b.value - a.value; });

    const total = categories.reduce(function(sum, c) { return sum + c.value; }, 0);

    return categories.map(function(cat) {
      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
      return Object.assign({}, cat, { percentage: pct });
    });
  },

  // Returns comparison data showing the user's footprint relative to India and Global averages
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

  // Builds an array of the last 7 days with summed CO2 values and bar heights proportional to the max
  getWeeklyData(logs) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const week = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = days[d.getDay()];
      const value = logs
        .filter(function(l) { return l.date === dateStr; })
        .reduce(function(sum, l) { return sum + (l.co2Kg || 0); }, 0);
      week.push({ label: label, value: value, date: dateStr, height: 0 });
    }

    const maxVal = Math.max.apply(null, week.map(function(d) { return d.value; }));

    return week.map(function(d) {
      return Object.assign({}, d, { height: maxVal > 0 ? Math.round((d.value / maxVal) * 100) : 4 });
    });
  }
};
