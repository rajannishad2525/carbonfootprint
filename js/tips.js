// Tips: Renders personalized tips screen with scoring, filtering, and gamification
const Tips = {

  // Renders the full tips screen into #main-content, redirecting to #welcome if no profile
  render() {
    const main = document.getElementById('main-content');
    const profile = EcoStorage.getProfile();

    if (!profile || !profile.quizAnswers) {
      window.location.hash = 'welcome';
      return;
    }

    const progress = EcoStorage.getTipsProgress();
    const completedTips = progress.completedTips || [];
    const totalTips = EcoData.tips.length;
    const completedCount = completedTips.length;
    const rankedTips = Tips.getRankedTips(profile);

    const radius = 34;
    const strokeWidth = 6;
    const circumference = 2 * Math.PI * radius;
    const ratio = totalTips > 0 ? completedCount / totalTips : 0;
    const dashOffset = circumference - ratio * circumference;
    const ringAriaLabel = 'Tips progress: ' + completedCount + ' of ' + totalTips + ' completed';

    const ringHTML = '<div class="tips-progress-ring text-center">'
      + '<svg role="img" aria-label="' + ringAriaLabel + '" width="80" height="80" viewBox="0 0 80 80">'
      + '<circle cx="40" cy="40" r="' + radius + '" fill="none" stroke="#e0e0e0" stroke-width="' + strokeWidth + '"/>'
      + '<circle cx="40" cy="40" r="' + radius + '" fill="none"'
      + ' stroke="var(--color-success)"'
      + ' stroke-width="' + strokeWidth + '"'
      + ' stroke-dasharray="' + circumference.toFixed(2) + '"'
      + ' stroke-dashoffset="' + dashOffset.toFixed(2) + '"'
      + ' stroke-linecap="round"'
      + ' transform="rotate(-90 40 40)"/>'
      + '<text x="40" y="44" text-anchor="middle" font-size="14" font-weight="700" fill="var(--color-success)">'
      + completedCount + '/' + totalTips
      + '</text>'
      + '</svg>'
      + '<p class="mt-8 text-muted" style="font-size:var(--font-size-small);">Tips completed</p>'
      + '</div>';

    const categories = Object.keys(EcoData.categoryIcons);
    const filterBtns = '<button class="filter-btn active" data-category="all" role="tab" aria-selected="true" type="button" aria-label="Show all tips">All</button>'
      + categories.map(function(cat) {
        return '<button class="filter-btn" data-category="' + cat + '" role="tab" aria-selected="false" type="button"'
          + ' aria-label="Filter by ' + EcoData.categoryLabels[cat] + '">'
          + '<span aria-hidden="true">' + EcoData.categoryIcons[cat] + '</span> ' + EcoData.categoryLabels[cat]
          + '</button>';
      }).join('');

    const filterBarHTML = '<div class="tips-filter flex gap-8 mt-16" role="tablist" aria-label="Filter tips by category">'
      + filterBtns
      + '</div>';

    const tipsListHTML = rankedTips.length > 0
      ? rankedTips.map(function(tip) { return Tips.renderTipCard(tip, progress); }).join('')
      : '<p class="text-center mt-16" style="font-size:1.1rem;">All tips completed! Amazing! 🎉</p>';

    // Summary stats
    var remainingCount = rankedTips.length;
    var pctDone = totalTips > 0 ? Math.round((completedCount / totalTips) * 100) : 0;

    main.innerHTML = '<div class="screen-tips" aria-label="Personalized eco tips">'
      + '<h1 class="screen-title">Eco Tips</h1>'

      // Tips hero
      + '<div class="tips-hero">'
      + '<div class="tips-hero-ring">'
      + '<svg role="img" aria-label="' + ringAriaLabel + '" width="90" height="90" viewBox="0 0 90 90">'
      + '<circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="7"/>'
      + '<circle cx="45" cy="45" r="38" fill="none"'
      + ' stroke="var(--color-white)"'
      + ' stroke-width="7"'
      + ' stroke-dasharray="' + (2 * Math.PI * 38).toFixed(2) + '"'
      + ' stroke-dashoffset="' + ((2 * Math.PI * 38) - ratio * (2 * Math.PI * 38)).toFixed(2) + '"'
      + ' stroke-linecap="round"'
      + ' transform="rotate(-90 45 45)"/>'
      + '<text x="45" y="42" text-anchor="middle" font-size="16" font-weight="800" fill="white">' + pctDone + '%</text>'
      + '<text x="45" y="56" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">done</text>'
      + '</svg>'
      + '</div>'
      + '<div class="tips-hero-stats">'
      + '<div class="tips-hero-stat"><span class="tips-hero-num">' + completedCount + '</span> completed</div>'
      + '<div class="tips-hero-stat"><span class="tips-hero-num">' + remainingCount + '</span> remaining</div>'
      + '<div class="tips-hero-stat"><span class="tips-hero-num">' + totalTips + '</span> total tips</div>'
      + '</div>'
      + '</div>'

      + filterBarHTML

      + '<div class="mt-16" role="list" id="tips-list">'
      + tipsListHTML
      + '</div>'

      + '</div>';

    Tips._bindEvents();
  },

  // Returns tips sorted by priority score, excluding completed and dismissed tips
  getRankedTips(profile) {
    const progress = EcoStorage.getTipsProgress();
    const completed = progress.completedTips || [];
    const dismissed = progress.dismissedTips || [];

    const remaining = EcoData.tips.filter(function(tip) {
      return !completed.includes(tip.id) && !dismissed.includes(tip.id);
    });

    const breakdown = Dashboard.getCategoryBreakdown(profile);
    const categoryScores = {};
    breakdown.forEach(function(cat) {
      categoryScores[cat.key] = cat.percentage;
    });

    const impactWeights = { high: 3, medium: 2, low: 1 };

    const scored = remaining.map(function(tip) {
      const catScore = categoryScores[tip.category] || 0;
      const impactWeight = impactWeights[tip.impact] || 1;
      const priority = catScore * impactWeight;
      return Object.assign({}, tip, { priority: priority });
    });

    scored.sort(function(a, b) { return b.priority - a.priority; });
    return scored;
  },

  // Returns the HTML string for a single tip card
  renderTipCard(tip, progress) {
    const icon = EcoData.categoryIcons[tip.category] || '';
    const impactBadgeMap = { high: 'badge-hard', medium: 'badge-medium', low: 'badge-easy' };
    const impactBadgeClass = impactBadgeMap[tip.impact] || 'badge-easy';

    var difficultyColors = { easy: 'var(--color-success)', medium: 'var(--color-warning)', hard: 'var(--color-danger)' };
    var diffColor = difficultyColors[tip.difficulty] || 'var(--color-neutral)';

    return '<div class="tip-card card mt-16" data-category="' + tip.category + '" role="listitem"'
      + ' style="border-left: 3px solid ' + diffColor + ';">'
      + '<div class="tip-header">'
      + '<div class="tip-header-left">'
      + '<span class="tip-category-icon" aria-hidden="true">' + icon + '</span>'
      + '<h3 class="tip-title">' + tip.title + '</h3>'
      + '</div>'
      + '<div class="tip-badges">'
      + '<span class="badge badge-' + tip.difficulty + '">' + tip.difficulty + '</span>'
      + '<span class="badge ' + impactBadgeClass + '">' + tip.impact + '</span>'
      + '</div>'
      + '</div>'
      + '<p class="tip-description">' + tip.description + '</p>'
      + '<div class="tip-footer">'
      + '<span class="tip-savings">💚 ' + tip.savings + '</span>'
      + '<div class="tip-actions">'
      + '<button class="tip-done-btn" data-tip-id="' + tip.id + '" type="button" aria-label="Mark as done">✓ Done</button>'
      + '<button class="tip-dismiss-btn" data-tip-id="' + tip.id + '" type="button" aria-label="Dismiss">✕ Skip</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  },

  // Shows tip cards matching the given category, hides others; 'all' shows every card
  filterTips(category) {
    const cards = document.querySelectorAll('.tip-card');
    cards.forEach(function(card) {
      if (category === 'all' || card.getAttribute('data-category') === category) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  },

  // Wires up filter button clicks and delegated done/dismiss button events
  _bindEvents() {
    const filterBar = document.querySelector('.tips-filter');
    if (filterBar) {
      filterBar.addEventListener('click', function(e) {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterBar.querySelectorAll('.filter-btn').forEach(function(b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        Tips.filterTips(btn.getAttribute('data-category'));
      });
    }

    const tipsList = document.getElementById('tips-list');
    if (tipsList) {
      tipsList.addEventListener('click', function(e) {
        const doneBtn = e.target.closest('.tip-done-btn');
        if (doneBtn) {
          const tipId = doneBtn.getAttribute('data-tip-id');
          EcoStorage.completeTip(tipId);
          App.showToast('Tip marked as done! 🌟');
          Tips.render();
          return;
        }

        const dismissBtn = e.target.closest('.tip-dismiss-btn');
        if (dismissBtn) {
          const tipId = dismissBtn.getAttribute('data-tip-id');
          EcoStorage.dismissTip(tipId);
          Tips.render();
        }
      });
    }
  }
};
