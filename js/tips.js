'use strict';

/**
 * Tips: Renders personalized tips screen with scoring engine, category filtering, and gamification.
 * Tips are ranked using priority = categoryScore x impactWeight for maximum personalization.
 * @namespace
 */
const Tips = {

  /** Weight multipliers for tip impact levels used in priority scoring */
  IMPACT_WEIGHTS: { high: 3, medium: 2, low: 1 },

  /** Maps impact levels to badge CSS classes */
  IMPACT_BADGE_MAP: { high: 'badge-hard', medium: 'badge-medium', low: 'badge-easy' },

  /** Maps difficulty levels to semantic colors */
  DIFFICULTY_COLORS: { easy: 'var(--color-success)', medium: 'var(--color-warning)', hard: 'var(--color-danger)' },

  /**
   * Renders the full tips screen into #main-content, redirecting to #welcome if no profile.
   */
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
    const rankedTips = this.getRankedTips(profile);
    const ratio = totalTips > 0 ? completedCount / totalTips : 0;
    const pctDone = totalTips > 0 ? Math.round((completedCount / totalTips) * 100) : 0;

    const heroRingHTML = EcoData.buildSVGRing({
      radius: 38, strokeWidth: 7, ratio, stroke: 'var(--color-white)',
      trackStroke: 'rgba(255,255,255,0.2)', size: 90,
      ariaLabel: `Tips progress: ${completedCount} of ${totalTips} completed`,
      centerText: `${pctDone}%`, subText: 'done',
      textFill: 'white', subFill: 'rgba(255,255,255,0.8)',
      fontSize: 16, subFontSize: 9
    });

    const tipsListHTML = rankedTips.length > 0
      ? rankedTips.map(tip => this.renderTipCard(tip, progress)).join('')
      : '<p class="text-center mt-16" style="font-size:1.1rem;">All tips completed! Amazing! \u{1F389}</p>';

    main.innerHTML = `
      <div class="screen-tips" aria-label="Personalized eco tips">
        <h1 class="screen-title">Eco Tips</h1>
        ${this._buildHeroHTML(heroRingHTML, completedCount, rankedTips.length, totalTips)}
        ${this._buildFilterBar()}
        <div class="mt-16" role="list" id="tips-list">${tipsListHTML}</div>
      </div>`;

    this._bindEvents();
  },

  /**
   * Builds the tips hero section HTML with progress ring and stats.
   * @param {string} ringHTML - Pre-rendered SVG ring HTML
   * @param {number} completedCount - Number of tips completed
   * @param {number} remainingCount - Number of tips remaining
   * @param {number} totalTips - Total number of tips
   * @returns {string} Hero section HTML string
   */
  _buildHeroHTML(ringHTML, completedCount, remainingCount, totalTips) {
    return `<div class="tips-hero">
      <div class="tips-hero-ring">${ringHTML}</div>
      <div class="tips-hero-stats">
        <div class="tips-hero-stat"><span class="tips-hero-num">${completedCount}</span> completed</div>
        <div class="tips-hero-stat"><span class="tips-hero-num">${remainingCount}</span> remaining</div>
        <div class="tips-hero-stat"><span class="tips-hero-num">${totalTips}</span> total tips</div>
      </div>
    </div>`;
  },

  /**
   * Builds the category filter bar HTML.
   * @returns {string} Filter bar HTML string
   */
  _buildFilterBar() {
    const categories = Object.keys(EcoData.categoryIcons);
    const filterBtns = `<button class="filter-btn active" data-category="all" role="tab" aria-selected="true" type="button" aria-label="Show all tips">All</button>`
      + categories.map(cat =>
        `<button class="filter-btn" data-category="${cat}" role="tab" aria-selected="false" type="button"
          aria-label="Filter by ${EcoData.categoryLabels[cat]}">
          <span aria-hidden="true">${EcoData.categoryIcons[cat]}</span> ${EcoData.categoryLabels[cat]}
        </button>`
      ).join('');

    return `<div class="tips-filter flex gap-8 mt-16" role="tablist" aria-label="Filter tips by category">${filterBtns}</div>`;
  },

  /**
   * Returns tips sorted by priority score, excluding completed and dismissed tips.
   * Priority = categoryScore (user's emission %) x impactWeight (high=3, medium=2, low=1).
   * @param {Object} profile - User profile with quizAnswers
   * @returns {Array<Object>} Ranked tips array with added priority field
   */
  getRankedTips(profile) {
    const progress = EcoStorage.getTipsProgress();
    const completed = progress.completedTips || [];
    const dismissed = progress.dismissedTips || [];

    const remaining = EcoData.tips.filter(tip =>
      !completed.includes(tip.id) && !dismissed.includes(tip.id)
    );

    const breakdown = Dashboard.getCategoryBreakdown(profile);
    const categoryScores = {};
    breakdown.forEach(cat => { categoryScores[cat.key] = cat.percentage; });

    const scored = remaining.map(tip => {
      const catScore = categoryScores[tip.category] || 0;
      const impactWeight = this.IMPACT_WEIGHTS[tip.impact] || 1;
      return { ...tip, priority: catScore * impactWeight };
    });

    scored.sort((a, b) => b.priority - a.priority);
    return scored;
  },

  /**
   * Returns the HTML string for a single tip card.
   * @param {Object} tip - Tip object with category, title, description, etc.
   * @param {Object} progress - Tips progress object with completedTips/dismissedTips
   * @returns {string} HTML string for the tip card
   */
  renderTipCard(tip, progress) {
    const icon = EcoData.categoryIcons[tip.category] || '';
    const impactBadgeClass = this.IMPACT_BADGE_MAP[tip.impact] || 'badge-easy';
    const diffColor = this.DIFFICULTY_COLORS[tip.difficulty] || 'var(--color-neutral)';

    return `<div class="tip-card card mt-16" data-category="${tip.category}" role="listitem"
      style="border-left: 3px solid ${diffColor};">
      <div class="tip-header">
        <div class="tip-header-left">
          <span class="tip-category-icon" aria-hidden="true">${icon}</span>
          <h3 class="tip-title">${tip.title}</h3>
        </div>
        <div class="tip-badges">
          <span class="badge badge-${tip.difficulty}">${tip.difficulty}</span>
          <span class="badge ${impactBadgeClass}">${tip.impact}</span>
        </div>
      </div>
      <p class="tip-description">${tip.description}</p>
      <div class="tip-footer">
        <span class="tip-savings">\u{1F49A} ${tip.savings}</span>
        <div class="tip-actions">
          <button class="tip-done-btn" data-tip-id="${tip.id}" type="button" aria-label="Mark as done">\u2713 Done</button>
          <button class="tip-dismiss-btn" data-tip-id="${tip.id}" type="button" aria-label="Dismiss">\u2715 Skip</button>
        </div>
      </div>
    </div>`;
  },

  /**
   * Shows tip cards matching the given category, hides others; 'all' shows every card.
   * @param {string} category - Category key to filter by, or 'all'
   */
  filterTips(category) {
    document.querySelectorAll('.tip-card').forEach(card => {
      card.style.display = (category === 'all' || card.dataset.category === category) ? '' : 'none';
    });
  },

  /**
   * Wires up filter button clicks and delegated done/dismiss button events.
   */
  _bindEvents() {
    const filterBar = document.querySelector('.tips-filter');
    if (filterBar) {
      filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterBar.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.filterTips(btn.dataset.category);
      });
    }

    const tipsList = document.getElementById('tips-list');
    if (tipsList) {
      tipsList.addEventListener('click', (e) => {
        const doneBtn = e.target.closest('.tip-done-btn');
        if (doneBtn) {
          EcoStorage.completeTip(doneBtn.dataset.tipId);
          App.showToast('Tip marked as done! \u{1F31F}');
          this.render();
          return;
        }

        const dismissBtn = e.target.closest('.tip-dismiss-btn');
        if (dismissBtn) {
          EcoStorage.dismissTip(dismissBtn.dataset.tipId);
          this.render();
        }
      });
    }
  }
};
