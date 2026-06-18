'use strict';

/**
 * App: Global SPA router, profile/settings screen, eco score calculation,
 * badge system, PDF report export, and UI utilities (modal, toast).
 * @namespace
 */
const App = {

  /** Currently active route name */
  currentRoute: '',

  /** Toast notification display duration in milliseconds */
  TOAST_DURATION: 2500,

  /** Toast fade-out animation duration in milliseconds */
  TOAST_FADE_MS: 300,

  /** Eco score boundaries for footprint-to-score mapping */
  ECO_SCORE: { MAX_SCORE: 100, MIN_SCORE: 5, LOW_FOOTPRINT: 0.5, HIGH_FOOTPRINT: 10 },

  /** Badge thresholds for quiz-based badge checks (kg CO2/yr) */
  BADGE_THRESHOLDS: { TRANSPORT: 500, FOOD: 800, ENERGY: 500 },

  /** Routes that show the bottom navigation bar */
  NAV_ROUTES: ['dashboard', 'log', 'tips', 'profile'],

  /** Maps route names to their render functions */
  screens: {
    welcome:   () => Quiz.renderWelcome(),
    quiz:      () => Quiz.render(),
    dashboard: () => Dashboard.render(),
    log:       () => Logger.render(),
    tips:      () => Tips.render(),
    profile:   () => App.renderProfile()
  },

  /**
   * Bootstraps the app: wires events and directs to the correct initial route.
   */
  init() {
    window.addEventListener('hashchange', () => this.route());

    document.getElementById('bottom-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (btn && btn.dataset.route) window.location.hash = btn.dataset.route;
    });

    const desktopNav = document.querySelector('.desktop-nav');
    if (desktopNav) {
      desktopNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.desktop-nav-btn');
        if (btn && btn.dataset.route) window.location.hash = btn.dataset.route;
      });
    }

    const profile = EcoStorage.getProfile();
    const quizDone = profile && profile.quizAnswers;
    const hash = window.location.hash;

    if (!hash) {
      window.location.hash = quizDone ? 'dashboard' : 'welcome';
    } else {
      this.route();
    }
  },

  /**
   * Resolves the current hash, updates nav visibility and active state, then renders.
   */
  route() {
    const hash = window.location.hash.slice(1) || 'welcome';
    this.currentRoute = hash;

    const nav = document.getElementById('bottom-nav');
    if (this.NAV_ROUTES.includes(hash)) {
      nav.classList.remove('hidden');
    } else {
      nav.classList.add('hidden');
    }

    this._updateHeader(hash);
    this._updateNavActive(hash);

    if (this.screens[hash]) {
      this.screens[hash]();
    } else {
      window.location.hash = 'welcome';
    }
  },

  /**
   * Updates the top header visibility and stat display based on current route.
   * @param {string} hash - Current route hash
   */
  _updateHeader(hash) {
    const topHeader = document.getElementById('top-header');
    if (topHeader) {
      topHeader.hidden = (hash === 'welcome');
    }

    const headerStat = document.getElementById('header-stat');
    if (headerStat && hash !== 'welcome') {
      const profile = EcoStorage.getProfile();
      const streak = EcoStorage.getStreak();
      if (streak > 0) {
        headerStat.textContent = `\u{1F525} ${streak} day streak`;
      } else if (profile && profile.baselineFootprint != null) {
        headerStat.textContent = `${profile.baselineFootprint}t CO\u2082/yr`;
      } else if (profile && profile.quizAnswers) {
        const fp = EcoData.calculateBaselineFootprint(profile.quizAnswers);
        headerStat.textContent = `${fp}t CO\u2082/yr`;
      }
    }
  },

  /**
   * Updates the active state on both bottom and desktop navigation buttons.
   * @param {string} hash - Current route hash
   */
  _updateNavActive(hash) {
    document.querySelectorAll('.nav-btn, .desktop-nav-btn').forEach(btn => {
      if (btn.dataset.route === hash) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });
  },

  /**
   * Renders the full profile/settings page including eco score, badges, and settings controls.
   */
  renderProfile() {
    const main = document.getElementById('main-content');
    const profile = EcoStorage.getProfile();
    const streak = EcoStorage.getStreak();
    const tipsProgress = EcoStorage.getTipsProgress();
    const completedTips = tipsProgress.completedTips ? tipsProgress.completedTips.length : 0;
    const totalLogs = EcoStorage.getLogs().length;

    let footprint = 0;
    if (profile && profile.quizAnswers) {
      footprint = EcoData.calculateBaselineFootprint(profile.quizAnswers);
    }
    const score = this.calculateEcoScore(footprint);
    const userName = (profile && profile.name) ? profile.name : 'Eco Warrior';
    const initial = userName.charAt(0).toUpperCase();
    const earnedCount = EcoData.badges.filter(b => this.hasBadge(b.id, profile)).length;

    main.innerHTML = `
      <div class="screen-profile" aria-label="Profile and settings">
        <h1 class="screen-title">Profile</h1>
        ${this._buildProfileHero(userName, initial, footprint, score)}
        ${this._buildProfileStats(streak, completedTips, totalLogs, earnedCount)}
        ${this._buildBadgesSection(profile, earnedCount)}
        ${this._buildSettingsSection(userName)}
      </div>`;

    this._bindProfileEvents();
  },

  /**
   * Builds the profile hero card with avatar, name, and eco score ring.
   * @param {string} userName - Display name
   * @param {string} initial - First character of name
   * @param {number} footprint - Annual footprint in tonnes
   * @param {number} score - Eco score 0-100
   * @returns {string} Hero card HTML string
   */
  _buildProfileHero(userName, initial, footprint, score) {
    const ringHTML = EcoData.buildSVGRing({
      radius: 34, strokeWidth: 6, ratio: score / 100, stroke: 'white',
      trackStroke: 'rgba(255,255,255,0.25)', size: 80,
      ariaLabel: `Eco score: ${score}`,
      centerText: `${score}`, subText: 'Eco Score',
      textFill: 'white', subFill: 'rgba(255,255,255,0.8)',
      fontSize: 18, subFontSize: 8
    });

    return `<div class="profile-hero">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-hero-info">
        <h2 class="profile-hero-name">${userName}</h2>
        <p class="profile-hero-sub">${footprint}t CO\u2082/yr footprint</p>
      </div>
      <div class="profile-hero-score">${ringHTML}</div>
    </div>`;
  },

  /**
   * Builds the stats row HTML showing streak, tips, entries, and badges counts.
   * @param {number} streak - Current day streak
   * @param {number} completedTips - Number of tips completed
   * @param {number} totalLogs - Total number of log entries
   * @param {number} earnedCount - Number of badges earned
   * @returns {string} Stats row HTML string
   */
  _buildProfileStats(streak, completedTips, totalLogs, earnedCount) {
    return `<div class="profile-stats">
      <div class="profile-stat-item"><span class="profile-stat-num">${streak}</span><span class="profile-stat-label">Day Streak</span></div>
      <div class="profile-stat-item"><span class="profile-stat-num">${completedTips}</span><span class="profile-stat-label">Tips Done</span></div>
      <div class="profile-stat-item"><span class="profile-stat-num">${totalLogs}</span><span class="profile-stat-label">Entries</span></div>
      <div class="profile-stat-item"><span class="profile-stat-num">${earnedCount}</span><span class="profile-stat-label">Badges</span></div>
    </div>`;
  },

  /**
   * Builds the badges section HTML with earned/locked states.
   * @param {Object} profile - User profile object
   * @param {number} earnedCount - Number of badges earned
   * @returns {string} Badges section HTML string
   */
  _buildBadgesSection(profile, earnedCount) {
    const badgesHTML = EcoData.badges.map(badge => {
      const earned = this.hasBadge(badge.id, profile);
      const cls = earned ? 'earned' : 'locked';
      const label = earned ? `${badge.name} \u2014 earned` : `${badge.name} \u2014 locked`;
      const statusIcon = earned
        ? '<span class="profile-badge-check" aria-hidden="true">&#10003;</span>'
        : '<span class="profile-badge-lock" aria-hidden="true">&#128274;</span>';

      return `<div class="profile-badge ${cls}" aria-label="${label}" title="${badge.description}">
        <div class="profile-badge-icon">${badge.icon}</div>
        <div class="profile-badge-info">
          <span class="profile-badge-name">${badge.name}</span>
          <span class="profile-badge-desc">${badge.description}</span>
        </div>
        ${statusIcon}
      </div>`;
    }).join('');

    return `<div class="card mt-16">
      <div class="profile-section-header">
        <h2 class="card-title" style="margin-bottom:0;">Badges</h2>
        <span class="badge-co2">${earnedCount}/${EcoData.badges.length} earned</span>
      </div>
      <div class="profile-badges-list" aria-live="polite">${badgesHTML}</div>
    </div>`;
  },

  /**
   * Builds the settings section HTML with name input, quiz retake, export, reset, and logout.
   * @param {string} userName - Current display name
   * @returns {string} Settings section HTML string
   */
  _buildSettingsSection(userName) {
    const escapedName = userName ? userName.replace(/"/g, '&quot;') : '';

    return `<div class="card mt-16">
      <h2 class="card-title">Settings</h2>
      <div class="settings-list">
        <div class="form-group">
          <label class="form-label" for="profile-name-input">Your Name</label>
          <div class="profile-name-row">
            <input id="profile-name-input" class="form-input" type="text" maxlength="60"
              placeholder="Enter your name" value="${escapedName}" aria-label="Your name"/>
            <button id="btn-save-name" class="btn btn-primary" type="button" aria-label="Save name">Save</button>
          </div>
        </div>
        <button id="btn-retake-quiz" class="btn btn-outline btn-block mt-16" type="button"
          aria-label="Retake the carbon footprint quiz">Retake Quiz</button>
        <button id="btn-export" class="btn btn-outline btn-block mt-16" type="button"
          aria-label="Download your carbon footprint report as PDF">Download Report (PDF)</button>
        <button id="btn-reset-data" class="btn btn-outline btn-block mt-16" type="button"
          style="color:var(--color-warning);border-color:var(--color-warning);"
          aria-label="Reset logs and tips data">Reset Data</button>
        <button id="btn-logout" class="btn btn-danger btn-block mt-16" type="button"
          aria-label="Logout and clear all data">Logout</button>
      </div>
    </div>`;
  },

  /**
   * Binds all event listeners for the profile/settings page.
   */
  _bindProfileEvents() {
    document.getElementById('btn-save-name').addEventListener('click', () => {
      const input = document.getElementById('profile-name-input');
      const newName = input.value.trim();
      const stored = EcoStorage.getProfile() || {};
      stored.name = EcoStorage.sanitizeString(newName);
      EcoStorage.saveProfile(stored);
      this.showToast('Name saved!');
    });

    document.getElementById('btn-retake-quiz').addEventListener('click', () => {
      window.location.hash = 'quiz';
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      this.exportPDFReport();
    });

    document.getElementById('btn-reset-data').addEventListener('click', () => {
      this.showModal(
        'Reset Data?',
        'This will clear all your logged activities and tips progress. Your profile and quiz answers will be kept.',
        'Reset', 'Cancel',
        () => {
          EcoStorage.resetData();
          this.showToast('Data reset! Profile kept.');
          this.renderProfile();
        }
      );
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      this.showModal(
        'Logout?',
        'This will delete all your data including profile, logs, and quiz answers. You will need to start over.',
        'Logout', 'Cancel',
        () => {
          EcoStorage.resetAll();
          window.location.hash = 'welcome';
        },
        true
      );
    });
  },

  /**
   * Generates a styled HTML report in a new window for print-to-PDF.
   */
  exportPDFReport() {
    const profile = EcoStorage.getProfile();
    if (!profile || !profile.quizAnswers) {
      this.showToast('Complete the quiz first!', 'error');
      return;
    }

    const qa = profile.quizAnswers;
    const userName = profile.name || 'Eco Warrior';
    const footprint = EcoData.calculateBaselineFootprint(qa);
    const score = this.calculateEcoScore(footprint);
    const streak = EcoStorage.getStreak();
    const logs = EcoStorage.getLogs();
    const tipsProgress = EcoStorage.getTipsProgress();
    const completedTips = tipsProgress.completedTips ? tipsProgress.completedTips.length : 0;
    const breakdown = Dashboard.getCategoryBreakdown(profile);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const scoreLabel = score >= EcoData.SCORE_THRESHOLDS.GOOD ? 'Excellent'
      : score >= EcoData.SCORE_THRESHOLDS.MODERATE ? 'Moderate' : 'Needs Improvement';

    const html = this._buildPDFHTML({ userName, footprint, score, scoreLabel, streak, logs, completedTips, breakdown, today, qa });

    const win = window.open('', '_blank');
    if (!win) {
      this.showToast('Please allow popups to download the report.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  },

  /**
   * Builds the complete PDF report HTML document.
   * @param {Object} data - Report data containing all fields needed for the PDF
   * @returns {string} Complete HTML document string for the report
   */
  _buildPDFHTML(data) {
    const indiaAvg = EcoData.benchmarks.india.value;
    const globalAvg = EcoData.benchmarks.global.value;
    const vsIndia = data.footprint <= indiaAvg ? 'Below' : 'Above';
    const vsGlobal = data.footprint <= globalAvg ? 'Below' : 'Above';

    const breakdownRows = data.breakdown.map(cat =>
      `<tr>
        <td style="padding:8px 12px;">${EcoData.categoryIcons[cat.key] || ''} ${cat.label}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:600;">${Math.round(cat.value)} kg</td>
        <td style="padding:8px 12px;text-align:right;">${cat.percentage}%</td>
      </tr>`
    ).join('');

    const { qa } = data;
    const transportLabel = EcoData.emissionFactors.transport[qa.transport]?.label || qa.transport;
    const foodLabel = EcoData.emissionFactors.food[qa.food]?.label || qa.food;
    const energyLabel = EcoData.emissionFactors.energy[qa.energy]?.label || qa.energy;
    const shoppingLabel = EcoData.emissionFactors.shopping[qa.shopping]?.label || qa.shopping;

    const recentLogs = data.logs.slice(0, 10);
    const logsRows = recentLogs.map(log => {
      const actData = EcoData.emissionFactors[log.category]?.[log.activity];
      const actLabel = actData ? actData.label : log.activity;
      return `<tr>
        <td style="padding:6px 12px;">${log.date}</td>
        <td style="padding:6px 12px;">${EcoData.categoryIcons[log.category] || ''} ${actLabel}</td>
        <td style="padding:6px 12px;text-align:right;">${log.quantity} ${log.unit}</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;">${(log.co2Kg || 0).toFixed(2)} kg</td>
      </tr>`;
    }).join('');

    const earnedBadges = EcoData.badges.filter(b => this.hasBadge(b.id, EcoStorage.getProfile()));
    const badgesHTML = earnedBadges.length > 0
      ? earnedBadges.map(b =>
        `<span style="display:inline-block;background:#d4edda;border-radius:20px;padding:6px 14px;margin:4px;font-size:13px;">${b.icon} ${b.name}</span>`
      ).join('')
      : '<p style="color:#6C757D;">No badges earned yet. Keep going!</p>';

    const topCategory = data.breakdown[0];
    const categoryTips = EcoData.tips.filter(t => t.category === topCategory.key).slice(0, 3);
    const tipsHTML = categoryTips.map(t =>
      `<li style="margin-bottom:8px;"><strong>${t.title}</strong> \u2014 ${t.description} <em>(${t.savings})</em></li>`
    ).join('');

    const indiaColor = data.footprint <= indiaAvg ? '#d4edda' : '#ffeeba';
    const globalColor = data.footprint <= globalAvg ? '#d4edda' : '#ffeeba';

    const recentLogsSection = recentLogs.length > 0
      ? `<h2>Recent Activity Log</h2>
        <table><thead><tr><th>Date</th><th>Activity</th><th style="text-align:right;">Qty</th><th style="text-align:right;">CO&#8322;</th></tr></thead>
        <tbody>${logsRows}</tbody></table>`
      : '';

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
      <title>EcoTrack Report - ${data.userName}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;color:#1A1A2E;max-width:800px;margin:0 auto;padding:40px 30px;line-height:1.6;}
        .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #2D6A4F;}
        .header h1{color:#2D6A4F;font-size:28px;margin:0;}
        .header p{color:#6C757D;margin:4px 0;}
        .score-box{text-align:center;background:linear-gradient(135deg,#1B5E3F,#2D6A4F,#40916C);color:white;border-radius:16px;padding:30px;margin:24px 0;}
        .score-num{font-size:64px;font-weight:800;line-height:1;}
        .score-label{font-size:18px;opacity:0.9;margin-top:4px;}
        .stats-row{display:flex;gap:12px;margin:20px 0;}
        .stat-box{flex:1;text-align:center;background:#F0F7F4;border-radius:10px;padding:16px 8px;}
        .stat-num{display:block;font-size:24px;font-weight:800;color:#2D6A4F;}
        .stat-lbl{display:block;font-size:11px;color:#6C757D;margin-top:2px;}
        h2{color:#2D6A4F;font-size:20px;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e0e0e0;}
        table{width:100%;border-collapse:collapse;margin:12px 0;}
        thead th{background:#2D6A4F;color:white;padding:10px 12px;text-align:left;font-size:13px;}
        tbody tr:nth-child(even){background:#F0F7F4;}
        tbody td{font-size:13px;}
        .compare-row{display:flex;gap:16px;margin:12px 0;}
        .compare-item{flex:1;padding:14px;border-radius:10px;text-align:center;}
        .footer{text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #e0e0e0;color:#6C757D;font-size:12px;}
        @media print{body{padding:20px;}}
      </style></head><body>
      <div class="header">
        <h1>EcoTrack Carbon Footprint Report</h1>
        <p><strong>${data.userName}</strong> &bull; Generated on ${data.today}</p>
      </div>
      <div class="score-box">
        <div class="score-num">${data.score}<span style="font-size:24px;">/100</span></div>
        <div class="score-label">Eco Score &mdash; ${data.scoreLabel}</div>
        <p style="margin-top:12px;font-size:32px;font-weight:700;">${data.footprint} tonnes CO&#8322;/year</p>
      </div>
      <div class="stats-row">
        <div class="stat-box"><span class="stat-num">${data.streak}</span><span class="stat-lbl">Day Streak</span></div>
        <div class="stat-box"><span class="stat-num">${data.completedTips}</span><span class="stat-lbl">Tips Done</span></div>
        <div class="stat-box"><span class="stat-num">${data.logs.length}</span><span class="stat-lbl">Total Entries</span></div>
        <div class="stat-box"><span class="stat-num">${earnedBadges.length}</span><span class="stat-lbl">Badges</span></div>
      </div>
      <h2>How You Compare</h2>
      <div class="compare-row">
        <div class="compare-item" style="background:${indiaColor};">
          <p style="font-size:13px;margin:0;color:#6C757D;">vs India Average</p>
          <p style="font-size:22px;font-weight:700;margin:4px 0;">${vsIndia}</p>
          <p style="font-size:12px;margin:0;">India avg: ${indiaAvg}t CO&#8322;/yr</p>
        </div>
        <div class="compare-item" style="background:${globalColor};">
          <p style="font-size:13px;margin:0;color:#6C757D;">vs Global Average</p>
          <p style="font-size:22px;font-weight:700;margin:4px 0;">${vsGlobal}</p>
          <p style="font-size:12px;margin:0;">Global avg: ${globalAvg}t CO&#8322;/yr</p>
        </div>
      </div>
      <h2>Emission Breakdown by Category</h2>
      <table><thead><tr><th>Category</th><th style="text-align:right;">Emissions</th><th style="text-align:right;">Share</th></tr></thead>
      <tbody>${breakdownRows}</tbody></table>
      <h2>Your Lifestyle Choices</h2>
      <table><thead><tr><th>Category</th><th style="text-align:right;">Your Choice</th></tr></thead><tbody>
        <tr><td style="padding:8px 12px;">Transport</td><td style="padding:8px 12px;text-align:right;">${transportLabel} (${qa.dailyKm || 0} km/day)</td></tr>
        <tr style="background:#F0F7F4;"><td style="padding:8px 12px;">Food & Diet</td><td style="padding:8px 12px;text-align:right;">${foodLabel}</td></tr>
        <tr><td style="padding:8px 12px;">Home Energy</td><td style="padding:8px 12px;text-align:right;">${energyLabel} (${qa.monthlyKwh || 0} kWh/mo)</td></tr>
        <tr style="background:#F0F7F4;"><td style="padding:8px 12px;">Shopping</td><td style="padding:8px 12px;text-align:right;">${shoppingLabel}</td></tr>
        <tr><td style="padding:8px 12px;">Flights</td><td style="padding:8px 12px;text-align:right;">${qa.flightsPerYear || 0} domestic, ${qa.intlFlightsPerYear || 0} international/yr</td></tr>
      </tbody></table>
      <h2>Badges Earned</h2>
      ${badgesHTML}
      <h2>Top Recommendations for You</h2>
      <p style="color:#6C757D;font-size:13px;">Based on your highest category: <strong>${topCategory.label}</strong></p>
      <ol style="padding-left:20px;">${tipsHTML}</ol>
      ${recentLogsSection}
      <div class="footer">
        <p>Generated by <strong>EcoTrack</strong> &mdash; Understand, Track & Reduce Your Carbon Footprint</p>
        <p>Data sources: EPA, DEFRA, IPCC AR6, WRI India, ICAO, IEA, Our World in Data</p>
      </div>
    </body></html>`;
  },

  /**
   * Converts a footprint in tonnes CO2 to a 0-100 eco score where lower emissions = higher score.
   * @param {number} footprintTonnes - Annual carbon footprint in tonnes CO2
   * @returns {number} Eco score between 5 and 100
   */
  calculateEcoScore(footprintTonnes) {
    const { MAX_SCORE, MIN_SCORE, LOW_FOOTPRINT, HIGH_FOOTPRINT } = this.ECO_SCORE;
    if (footprintTonnes <= LOW_FOOTPRINT) return MAX_SCORE;
    if (footprintTonnes >= HIGH_FOOTPRINT) return MIN_SCORE;
    const score = Math.round(MAX_SCORE - (footprintTonnes / HIGH_FOOTPRINT) * (MAX_SCORE - MIN_SCORE));
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  },

  /**
   * Returns true if the user has earned a specific badge based on their profile and activity data.
   * @param {string} badgeId - The badge identifier to check
   * @param {Object|null} profile - User profile object (may be null for non-quiz badges)
   * @returns {boolean} Whether the badge has been earned
   */
  hasBadge(badgeId, profile) {
    const ef = EcoData.emissionFactors;
    const qa = profile?.quizAnswers || null;
    const streak = EcoStorage.getStreak();
    const tips = EcoStorage.getTipsProgress();
    const completedTips = tips.completedTips ? tips.completedTips.length : 0;
    const totalLogs = EcoStorage.getLogs().length;

    if (badgeId === 'badge_commuter' && qa) {
      const factor = ef.transport[qa.transport]?.factor || 0;
      return (factor * (qa.dailyKm || 0) * EcoData.DAYS_PER_YEAR) < this.BADGE_THRESHOLDS.TRANSPORT;
    }
    if (badgeId === 'badge_eater' && qa) {
      const factor = ef.food[qa.food]?.factor || 0;
      return (factor * EcoData.DAYS_PER_YEAR) < this.BADGE_THRESHOLDS.FOOD;
    }
    if (badgeId === 'badge_saver' && qa) {
      const factor = ef.energy[qa.energy]?.factor || 0;
      return (factor * (qa.monthlyKwh || 0) * EcoData.MONTHS_PER_YEAR) < this.BADGE_THRESHOLDS.ENERGY;
    }
    if (badgeId === 'badge_shopper' && qa) {
      return qa.shopping === 'minimal';
    }
    if (badgeId === 'badge_leader' && qa) {
      return EcoData.calculateBaselineFootprint(qa) < EcoData.FOOTPRINT_THRESHOLDS.INDIA_AVG;
    }

    if (badgeId === 'badge_streak3') return streak >= 3;
    if (badgeId === 'badge_streak7') return streak >= 7;
    if (badgeId === 'badge_streak30') return streak >= 30;

    if (badgeId === 'badge_tips5') return completedTips >= 5;
    if (badgeId === 'badge_tips15') return completedTips >= 15;

    if (badgeId === 'badge_logger10') return totalLogs >= 10;
    if (badgeId === 'badge_logger50') return totalLogs >= 50;

    return false;
  },

  /**
   * Shows a custom confirmation modal with title, message, and confirm/cancel actions.
   * @param {string} title - Modal title text
   * @param {string} message - Modal body message
   * @param {string} confirmText - Text for the confirm button
   * @param {string} cancelText - Text for the cancel button
   * @param {Function} onConfirm - Callback invoked when confirm is clicked
   * @param {boolean} [isDanger=false] - Whether to style the confirm button as dangerous
   */
  showModal(title, message, confirmText, cancelText, onConfirm, isDanger) {
    const btnClass = isDanger ? 'btn-danger' : 'btn-primary';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-card">
      <h2 class="modal-title">${title}</h2>
      <p class="modal-desc">${message}</p>
      <div class="modal-actions">
        <button class="btn ${btnClass}" id="modal-confirm-btn" type="button">${confirmText}</button>
        <button class="btn btn-outline" id="modal-cancel-btn" type="button">${cancelText}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    const removeOverlay = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };

    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      removeOverlay();
      if (onConfirm) onConfirm();
    });
    document.getElementById('modal-cancel-btn').addEventListener('click', removeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });
  },

  /**
   * Creates and displays a temporary toast notification, then removes it after TOAST_DURATION ms.
   * @param {string} message - Toast message text
   * @param {string} [type='success'] - Toast type: 'success' or 'error'
   */
  showToast(message, type) {
    const toastType = type || 'success';
    const toast = document.createElement('div');
    toast.className = `toast toast-${toastType}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, this.TOAST_FADE_MS);
    }, this.TOAST_DURATION);
  }
};

/** Initialize the app when the DOM is fully loaded */
document.addEventListener('DOMContentLoaded', () => {
  if (!window.__ECOTRACK_TEST_MODE__) App.init();
});
