// App: Global SPA router and profile/settings screen
const App = {

  // Currently active route name
  currentRoute: '',

  // Maps route names to their render functions
  screens: {
    welcome:   function() { Quiz.renderWelcome(); },
    quiz:      function() { Quiz.render(); },
    dashboard: function() { Dashboard.render(); },
    log:       function() { Logger.render(); },
    tips:      function() { Tips.render(); },
    profile:   function() { App.renderProfile(); }
  },

  // Bootstraps the app: wires events and directs to the correct initial route
  init() {
    window.addEventListener('hashchange', function() { App.route(); });

    document.getElementById('bottom-nav').addEventListener('click', function(e) {
      const btn = e.target.closest('.nav-btn');
      if (btn) {
        const route = btn.getAttribute('data-route');
        if (route) window.location.hash = route;
      }
    });

    // Desktop nav click handler
    var desktopNav = document.querySelector('.desktop-nav');
    if (desktopNav) {
      desktopNav.addEventListener('click', function(e) {
        var btn = e.target.closest('.desktop-nav-btn');
        if (btn) {
          var route = btn.getAttribute('data-route');
          if (route) window.location.hash = route;
        }
      });
    }

    const profile = EcoStorage.getProfile();
    const quizDone = profile && profile.quizAnswers;
    const hash = window.location.hash;

    if (!hash) {
      window.location.hash = quizDone ? 'dashboard' : 'welcome';
    } else {
      App.route();
    }
  },

  // Resolves the current hash, updates nav visibility and active state, then renders
  route() {
    const hash = window.location.hash.slice(1) || 'welcome';
    App.currentRoute = hash;

    const nav = document.getElementById('bottom-nav');
    const mainRoutes = ['dashboard', 'log', 'tips', 'profile'];

    if (mainRoutes.includes(hash)) {
      nav.classList.remove('hidden');
    } else {
      nav.classList.add('hidden');
    }

    const topHeader = document.getElementById('top-header');
    if (topHeader) {
      if (hash === 'welcome') {
        topHeader.hidden = true;
      } else {
        topHeader.hidden = false;
      }
    }

    const headerStat = document.getElementById('header-stat');
    if (headerStat && hash !== 'welcome') {
      const profile = EcoStorage.getProfile();
      const streak = EcoStorage.getStreak();
      if (streak > 0) {
        headerStat.textContent = '🔥 ' + streak + ' day streak';
      } else if (profile && profile.baselineFootprint != null) {
        headerStat.textContent = profile.baselineFootprint + 't CO₂/yr';
      } else if (profile && profile.quizAnswers) {
        var fp = EcoData.calculateBaselineFootprint(profile.quizAnswers);
        headerStat.textContent = fp + 't CO₂/yr';
      }
    }

    document.querySelectorAll('.nav-btn, .desktop-nav-btn').forEach(function(btn) {
      if (btn.getAttribute('data-route') === hash) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });

    if (App.screens[hash]) {
      App.screens[hash]();
    } else {
      window.location.hash = 'welcome';
    }
  },

  // Renders the full profile/settings page including eco score, badges, and settings controls
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
    const score = App.calculateEcoScore(footprint);

    let scoreColor;
    if (score >= 70) scoreColor = '#40916C';
    else if (score >= 40) scoreColor = '#F4A261';
    else scoreColor = '#E63946';

    const circumference = 2 * Math.PI * 38;
    const dashOffset = circumference - (score / 100) * circumference;

    const userName = (profile && profile.name) ? profile.name : 'Eco Warrior';
    const initial = userName.charAt(0).toUpperCase();

    // Build badges HTML with new system
    const earnedCount = EcoData.badges.filter(function(b) { return App.hasBadge(b.id, profile); }).length;

    const badgesHTML = EcoData.badges.map(function(badge) {
      const earned = App.hasBadge(badge.id, profile);
      const cls = earned ? 'earned' : 'locked';
      const label = earned ? badge.name + ' — earned' : badge.name + ' — locked';
      return '<div class="profile-badge ' + cls + '" aria-label="' + label + '" title="' + badge.description + '">'
        + '<div class="profile-badge-icon">' + badge.icon + '</div>'
        + '<div class="profile-badge-info">'
        + '<span class="profile-badge-name">' + badge.name + '</span>'
        + '<span class="profile-badge-desc">' + badge.description + '</span>'
        + '</div>'
        + (earned ? '<span class="profile-badge-check" aria-hidden="true">&#10003;</span>' : '<span class="profile-badge-lock" aria-hidden="true">&#128274;</span>')
        + '</div>';
    }).join('');

    main.innerHTML = '<div class="screen-profile" aria-label="Profile and settings">'

      + '<h1 class="screen-title">Profile</h1>'

      // Hero card with avatar + score
      + '<div class="profile-hero">'
      + '<div class="profile-avatar">' + initial + '</div>'
      + '<div class="profile-hero-info">'
      + '<h2 class="profile-hero-name">' + userName + '</h2>'
      + '<p class="profile-hero-sub">' + footprint + 't CO\u2082/yr footprint</p>'
      + '</div>'
      + '<div class="profile-hero-score">'
      + '<svg role="img" aria-label="Eco score: ' + score + '" width="80" height="80" viewBox="0 0 80 80">'
      + '<circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="6"/>'
      + '<circle cx="40" cy="40" r="34" fill="none"'
      + ' stroke="white"'
      + ' stroke-width="6"'
      + ' stroke-dasharray="' + (2 * Math.PI * 34).toFixed(2) + '"'
      + ' stroke-dashoffset="' + ((2 * Math.PI * 34) - (score / 100) * (2 * Math.PI * 34)).toFixed(2) + '"'
      + ' stroke-linecap="round"'
      + ' transform="rotate(-90 40 40)"/>'
      + '<text x="40" y="38" text-anchor="middle" font-size="18" font-weight="800" fill="white">' + score + '</text>'
      + '<text x="40" y="50" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.8)">Eco Score</text>'
      + '</svg>'
      + '</div>'
      + '</div>'

      // Stats row
      + '<div class="profile-stats">'
      + '<div class="profile-stat-item">'
      + '<span class="profile-stat-num">' + streak + '</span>'
      + '<span class="profile-stat-label">Day Streak</span>'
      + '</div>'
      + '<div class="profile-stat-item">'
      + '<span class="profile-stat-num">' + completedTips + '</span>'
      + '<span class="profile-stat-label">Tips Done</span>'
      + '</div>'
      + '<div class="profile-stat-item">'
      + '<span class="profile-stat-num">' + totalLogs + '</span>'
      + '<span class="profile-stat-label">Entries</span>'
      + '</div>'
      + '<div class="profile-stat-item">'
      + '<span class="profile-stat-num">' + earnedCount + '</span>'
      + '<span class="profile-stat-label">Badges</span>'
      + '</div>'
      + '</div>'

      // Badges section
      + '<div class="card mt-16">'
      + '<div class="profile-section-header">'
      + '<h2 class="card-title" style="margin-bottom:0;">Badges</h2>'
      + '<span class="badge-co2">' + earnedCount + '/' + EcoData.badges.length + ' earned</span>'
      + '</div>'
      + '<div class="profile-badges-list" aria-live="polite">' + badgesHTML + '</div>'
      + '</div>'

      // Settings section
      + '<div class="card mt-16">'
      + '<h2 class="card-title">Settings</h2>'
      + '<div class="settings-list">'

      + '<div class="form-group">'
      + '<label class="form-label" for="profile-name-input">Your Name</label>'
      + '<div class="profile-name-row">'
      + '<input id="profile-name-input" class="form-input" type="text" maxlength="60"'
      + ' placeholder="Enter your name" value="' + (userName ? userName.replace(/"/g, '&quot;') : '') + '"'
      + ' aria-label="Your name"/>'
      + '<button id="btn-save-name" class="btn btn-primary" type="button" aria-label="Save name">Save</button>'
      + '</div>'
      + '</div>'

      + '<button id="btn-retake-quiz" class="btn btn-outline btn-block mt-16" type="button"'
      + ' aria-label="Retake the carbon footprint quiz">Retake Quiz</button>'

      + '<button id="btn-export" class="btn btn-outline btn-block mt-16" type="button"'
      + ' aria-label="Download your carbon footprint report as PDF">Download Report (PDF)</button>'

      + '<button id="btn-reset-data" class="btn btn-outline btn-block mt-16" type="button"'
      + ' style="color:var(--color-warning);border-color:var(--color-warning);"'
      + ' aria-label="Reset logs and tips data">Reset Data</button>'

      + '<button id="btn-logout" class="btn btn-danger btn-block mt-16" type="button"'
      + ' aria-label="Logout and clear all data">Logout</button>'

      + '</div>'
      + '</div>'

      + '</div>';

    // Save name handler
    document.getElementById('btn-save-name').addEventListener('click', function() {
      const input = document.getElementById('profile-name-input');
      const newName = input.value.trim();
      const stored = EcoStorage.getProfile() || {};
      stored.name = EcoStorage.sanitizeString(newName);
      EcoStorage.saveProfile(stored);
      App.showToast('Name saved!');
    });

    // Retake quiz handler
    document.getElementById('btn-retake-quiz').addEventListener('click', function() {
      window.location.hash = 'quiz';
    });

    // Export PDF report
    document.getElementById('btn-export').addEventListener('click', function() {
      App.exportPDFReport();
    });

    // Reset Data — clears logs+tips but keeps profile
    document.getElementById('btn-reset-data').addEventListener('click', function() {
      App.showModal(
        'Reset Data?',
        'This will clear all your logged activities and tips progress. Your profile and quiz answers will be kept.',
        'Reset',
        'Cancel',
        function() {
          EcoStorage.resetData();
          App.showToast('Data reset! Profile kept.');
          App.renderProfile();
        }
      );
    });

    // Logout — clears everything
    document.getElementById('btn-logout').addEventListener('click', function() {
      App.showModal(
        'Logout?',
        'This will delete all your data including profile, logs, and quiz answers. You will need to start over.',
        'Logout',
        'Cancel',
        function() {
          EcoStorage.resetAll();
          window.location.hash = 'welcome';
        },
        true
      );
    });
  },

  // Generates a styled HTML report in a new window for print-to-PDF
  exportPDFReport() {
    const profile = EcoStorage.getProfile();
    if (!profile || !profile.quizAnswers) {
      App.showToast('Complete the quiz first!', 'error');
      return;
    }

    const qa = profile.quizAnswers;
    const userName = profile.name || 'Eco Warrior';
    const footprint = EcoData.calculateBaselineFootprint(qa);
    const score = App.calculateEcoScore(footprint);
    const streak = EcoStorage.getStreak();
    const logs = EcoStorage.getLogs();
    const tipsProgress = EcoStorage.getTipsProgress();
    const completedTips = tipsProgress.completedTips ? tipsProgress.completedTips.length : 0;
    const breakdown = Dashboard.getCategoryBreakdown(profile);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Score color
    var scoreColor = score >= 70 ? '#40916C' : score >= 40 ? '#F4A261' : '#E63946';
    var scoreLabel = score >= 70 ? 'Excellent' : score >= 40 ? 'Moderate' : 'Needs Improvement';

    // Comparison
    var indiaAvg = EcoData.benchmarks.india.value;
    var globalAvg = EcoData.benchmarks.global.value;
    var vsIndia = footprint <= indiaAvg ? 'Below' : 'Above';
    var vsGlobal = footprint <= globalAvg ? 'Below' : 'Above';

    // Breakdown rows
    var breakdownRows = breakdown.map(function(cat) {
      return '<tr>'
        + '<td style="padding:8px 12px;">' + (EcoData.categoryIcons[cat.key] || '') + ' ' + cat.label + '</td>'
        + '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + Math.round(cat.value) + ' kg</td>'
        + '<td style="padding:8px 12px;text-align:right;">' + cat.percentage + '%</td>'
        + '</tr>';
    }).join('');

    // Quiz answers readable
    var transportLabel = EcoData.emissionFactors.transport[qa.transport] ? EcoData.emissionFactors.transport[qa.transport].label : qa.transport;
    var foodLabel = EcoData.emissionFactors.food[qa.food] ? EcoData.emissionFactors.food[qa.food].label : qa.food;
    var energyLabel = EcoData.emissionFactors.energy[qa.energy] ? EcoData.emissionFactors.energy[qa.energy].label : qa.energy;
    var shoppingLabel = EcoData.emissionFactors.shopping[qa.shopping] ? EcoData.emissionFactors.shopping[qa.shopping].label : qa.shopping;

    // Recent logs (last 10)
    var recentLogs = logs.slice(0, 10);
    var logsRows = recentLogs.map(function(log) {
      var actData = EcoData.emissionFactors[log.category] && EcoData.emissionFactors[log.category][log.activity];
      var actLabel = actData ? actData.label : log.activity;
      return '<tr>'
        + '<td style="padding:6px 12px;">' + log.date + '</td>'
        + '<td style="padding:6px 12px;">' + (EcoData.categoryIcons[log.category] || '') + ' ' + actLabel + '</td>'
        + '<td style="padding:6px 12px;text-align:right;">' + log.quantity + ' ' + log.unit + '</td>'
        + '<td style="padding:6px 12px;text-align:right;font-weight:600;">' + (log.co2Kg || 0).toFixed(2) + ' kg</td>'
        + '</tr>';
    }).join('');

    // Badges earned
    var earnedBadges = EcoData.badges.filter(function(b) { return App.hasBadge(b.id, profile); });
    var badgesHTML = earnedBadges.length > 0
      ? earnedBadges.map(function(b) {
        return '<span style="display:inline-block;background:#d4edda;border-radius:20px;padding:6px 14px;margin:4px;font-size:13px;">'
          + b.icon + ' ' + b.name + '</span>';
      }).join('')
      : '<p style="color:#6C757D;">No badges earned yet. Keep going!</p>';

    // Tips suggestions based on highest category
    var topCategory = breakdown[0];
    var categoryTips = EcoData.tips.filter(function(t) { return t.category === topCategory.key; }).slice(0, 3);
    var tipsHTML = categoryTips.map(function(t) {
      return '<li style="margin-bottom:8px;"><strong>' + t.title + '</strong> — ' + t.description + ' <em>(' + t.savings + ')</em></li>';
    }).join('');

    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
      + '<title>EcoTrack Report - ' + userName + '</title>'
      + '<style>'
      + 'body{font-family:system-ui,-apple-system,sans-serif;color:#1A1A2E;max-width:800px;margin:0 auto;padding:40px 30px;line-height:1.6;}'
      + '.header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #2D6A4F;}'
      + '.header h1{color:#2D6A4F;font-size:28px;margin:0;}'
      + '.header p{color:#6C757D;margin:4px 0;}'
      + '.score-box{text-align:center;background:linear-gradient(135deg,#1B5E3F,#2D6A4F,#40916C);color:white;border-radius:16px;padding:30px;margin:24px 0;}'
      + '.score-num{font-size:64px;font-weight:800;line-height:1;}'
      + '.score-label{font-size:18px;opacity:0.9;margin-top:4px;}'
      + '.stats-row{display:flex;gap:12px;margin:20px 0;}'
      + '.stat-box{flex:1;text-align:center;background:#F0F7F4;border-radius:10px;padding:16px 8px;}'
      + '.stat-num{display:block;font-size:24px;font-weight:800;color:#2D6A4F;}'
      + '.stat-lbl{display:block;font-size:11px;color:#6C757D;margin-top:2px;}'
      + 'h2{color:#2D6A4F;font-size:20px;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e0e0e0;}'
      + 'table{width:100%;border-collapse:collapse;margin:12px 0;}'
      + 'thead th{background:#2D6A4F;color:white;padding:10px 12px;text-align:left;font-size:13px;}'
      + 'tbody tr:nth-child(even){background:#F0F7F4;}'
      + 'tbody td{font-size:13px;}'
      + '.compare-row{display:flex;gap:16px;margin:12px 0;}'
      + '.compare-item{flex:1;padding:14px;border-radius:10px;text-align:center;}'
      + '.footer{text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #e0e0e0;color:#6C757D;font-size:12px;}'
      + '@media print{body{padding:20px;}}'
      + '</style></head><body>'

      // Header
      + '<div class="header">'
      + '<h1>EcoTrack Carbon Footprint Report</h1>'
      + '<p><strong>' + userName + '</strong> &bull; Generated on ' + today + '</p>'
      + '</div>'

      // Eco Score
      + '<div class="score-box">'
      + '<div class="score-num">' + score + '<span style="font-size:24px;">/100</span></div>'
      + '<div class="score-label">Eco Score &mdash; ' + scoreLabel + '</div>'
      + '<p style="margin-top:12px;font-size:32px;font-weight:700;">' + footprint + ' tonnes CO&#8322;/year</p>'
      + '</div>'

      // Stats
      + '<div class="stats-row">'
      + '<div class="stat-box"><span class="stat-num">' + streak + '</span><span class="stat-lbl">Day Streak</span></div>'
      + '<div class="stat-box"><span class="stat-num">' + completedTips + '</span><span class="stat-lbl">Tips Done</span></div>'
      + '<div class="stat-box"><span class="stat-num">' + logs.length + '</span><span class="stat-lbl">Total Entries</span></div>'
      + '<div class="stat-box"><span class="stat-num">' + earnedBadges.length + '</span><span class="stat-lbl">Badges</span></div>'
      + '</div>'

      // Comparison
      + '<h2>How You Compare</h2>'
      + '<div class="compare-row">'
      + '<div class="compare-item" style="background:' + (footprint <= indiaAvg ? '#d4edda' : '#ffeeba') + ';">'
      + '<p style="font-size:13px;margin:0;color:#6C757D;">vs India Average</p>'
      + '<p style="font-size:22px;font-weight:700;margin:4px 0;">' + vsIndia + '</p>'
      + '<p style="font-size:12px;margin:0;">India avg: ' + indiaAvg + 't CO&#8322;/yr</p>'
      + '</div>'
      + '<div class="compare-item" style="background:' + (footprint <= globalAvg ? '#d4edda' : '#ffeeba') + ';">'
      + '<p style="font-size:13px;margin:0;color:#6C757D;">vs Global Average</p>'
      + '<p style="font-size:22px;font-weight:700;margin:4px 0;">' + vsGlobal + '</p>'
      + '<p style="font-size:12px;margin:0;">Global avg: ' + globalAvg + 't CO&#8322;/yr</p>'
      + '</div>'
      + '</div>'

      // Category Breakdown
      + '<h2>Emission Breakdown by Category</h2>'
      + '<table><thead><tr><th>Category</th><th style="text-align:right;">Emissions</th><th style="text-align:right;">Share</th></tr></thead>'
      + '<tbody>' + breakdownRows + '</tbody></table>'

      // Your Lifestyle
      + '<h2>Your Lifestyle Choices</h2>'
      + '<table><thead><tr><th>Category</th><th style="text-align:right;">Your Choice</th></tr></thead><tbody>'
      + '<tr><td style="padding:8px 12px;">Transport</td><td style="padding:8px 12px;text-align:right;">' + transportLabel + ' (' + (qa.dailyKm || 0) + ' km/day)</td></tr>'
      + '<tr style="background:#F0F7F4;"><td style="padding:8px 12px;">Food & Diet</td><td style="padding:8px 12px;text-align:right;">' + foodLabel + '</td></tr>'
      + '<tr><td style="padding:8px 12px;">Home Energy</td><td style="padding:8px 12px;text-align:right;">' + energyLabel + ' (' + (qa.monthlyKwh || 0) + ' kWh/mo)</td></tr>'
      + '<tr style="background:#F0F7F4;"><td style="padding:8px 12px;">Shopping</td><td style="padding:8px 12px;text-align:right;">' + shoppingLabel + '</td></tr>'
      + '<tr><td style="padding:8px 12px;">Flights</td><td style="padding:8px 12px;text-align:right;">' + (qa.flightsPerYear || 0) + ' domestic, ' + (qa.intlFlightsPerYear || 0) + ' international/yr</td></tr>'
      + '</tbody></table>'

      // Badges
      + '<h2>Badges Earned</h2>'
      + badgesHTML

      // Top Recommendations
      + '<h2>Top Recommendations for You</h2>'
      + '<p style="color:#6C757D;font-size:13px;">Based on your highest category: <strong>' + topCategory.label + '</strong></p>'
      + '<ol style="padding-left:20px;">' + tipsHTML + '</ol>'

      // Recent Activity
      + (recentLogs.length > 0
        ? '<h2>Recent Activity Log</h2>'
          + '<table><thead><tr><th>Date</th><th>Activity</th><th style="text-align:right;">Qty</th><th style="text-align:right;">CO&#8322;</th></tr></thead>'
          + '<tbody>' + logsRows + '</tbody></table>'
        : '')

      // Footer
      + '<div class="footer">'
      + '<p>Generated by <strong>EcoTrack</strong> &mdash; Understand, Track & Reduce Your Carbon Footprint</p>'
      + '<p>Data sources: EPA, DEFRA, IPCC AR6, WRI India, ICAO, IEA, Our World in Data</p>'
      + '</div>'

      + '</body></html>';

    var win = window.open('', '_blank');
    if (!win) {
      App.showToast('Please allow popups to download the report.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(function() { win.print(); }, 400);
  },

  // Converts a footprint in tonnes CO2 to a 0-100 eco score where lower emissions = higher score
  calculateEcoScore(footprintTonnes) {
    if (footprintTonnes <= 0.5) return 100;
    if (footprintTonnes >= 10) return 5;
    const score = Math.round(100 - (footprintTonnes / 10) * 95);
    return Math.max(5, Math.min(100, score));
  },

  // Returns true if the user has earned a specific badge
  hasBadge(badgeId, profile) {
    const ef = EcoData.emissionFactors;
    const qa = (profile && profile.quizAnswers) ? profile.quizAnswers : null;
    const streak = EcoStorage.getStreak();
    const tips = EcoStorage.getTipsProgress();
    const completedTips = tips.completedTips ? tips.completedTips.length : 0;
    const totalLogs = EcoStorage.getLogs().length;

    // Quiz-based badges
    if (badgeId === 'badge_commuter' && qa) {
      const factor = ef.transport[qa.transport] ? ef.transport[qa.transport].factor : 0;
      return (factor * (qa.dailyKm || 0) * 365) < 500;
    }
    if (badgeId === 'badge_eater' && qa) {
      const factor = ef.food[qa.food] ? ef.food[qa.food].factor : 0;
      return (factor * 365) < 800;
    }
    if (badgeId === 'badge_saver' && qa) {
      const factor = ef.energy[qa.energy] ? ef.energy[qa.energy].factor : 0;
      return (factor * (qa.monthlyKwh || 0) * 12) < 500;
    }
    if (badgeId === 'badge_shopper' && qa) {
      return qa.shopping === 'minimal';
    }
    if (badgeId === 'badge_leader' && qa) {
      return EcoData.calculateBaselineFootprint(qa) < 1.9;
    }

    // Streak-based badges
    if (badgeId === 'badge_streak3') return streak >= 3;
    if (badgeId === 'badge_streak7') return streak >= 7;
    if (badgeId === 'badge_streak30') return streak >= 30;

    // Tips-based badges
    if (badgeId === 'badge_tips5') return completedTips >= 5;
    if (badgeId === 'badge_tips15') return completedTips >= 15;

    // Activity-based badges
    if (badgeId === 'badge_logger10') return totalLogs >= 10;
    if (badgeId === 'badge_logger50') return totalLogs >= 50;

    return false;
  },

  // Shows a custom confirmation modal with title, message, and confirm/cancel actions
  showModal(title, message, confirmText, cancelText, onConfirm, isDanger) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-card">'
      + '<h2 class="modal-title">' + title + '</h2>'
      + '<p class="modal-desc">' + message + '</p>'
      + '<div class="modal-actions">'
      + '<button class="btn ' + (isDanger ? 'btn-danger' : 'btn-primary') + '" id="modal-confirm-btn" type="button">' + confirmText + '</button>'
      + '<button class="btn btn-outline" id="modal-cancel-btn" type="button">' + cancelText + '</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    document.getElementById('modal-confirm-btn').addEventListener('click', function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (onConfirm) onConfirm();
    });
    document.getElementById('modal-cancel-btn').addEventListener('click', function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  },

  // Creates and displays a temporary toast notification, then removes it after 2500ms
  showToast(message, type) {
    const toastType = type || 'success';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + toastType;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() { toast.classList.add('show'); }, 10);

    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  if (!window.__ECOTRACK_TEST_MODE__) App.init();
});
