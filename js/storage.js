/**
 * EcoStorage: Handles all localStorage read/write operations with validation and sanitization.
 * Provides CRUD operations for profiles, activity logs, and tips progress.
 * @namespace
 */
const EcoStorage = {

  /** Keys used to store data in localStorage */
  KEYS: {
    PROFILE: 'eco_profile',
    LOGS:    'eco_logs',
    TIPS:    'eco_tips'
  },

  /** Maximum number of days to check for streak calculation */
  MAX_STREAK_DAYS: 365,

  /**
   * Escapes HTML entities in a string to prevent XSS when rendering user input.
   * @param {string} str - Raw user input string
   * @returns {string} HTML-escaped safe string
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Retrieves the stored user profile, returning null if none exists or data is corrupt.
   * @returns {Object|null} The user profile object, or null
   */
  getProfile() {
    try {
      const raw = localStorage.getItem(this.KEYS.PROFILE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  /**
   * Saves a user profile object to localStorage after sanitizing the name field.
   * @param {Object} profile - Profile object with name and quizAnswers
   */
  saveProfile(profile) {
    const toSave = Object.assign({}, profile);
    if (typeof toSave.name === 'string') {
      toSave.name = this.sanitizeString(toSave.name);
    }
    localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(toSave));
  },

  /**
   * Retrieves all stored activity logs, returning an empty array on error.
   * @returns {Array<Object>} Array of log entry objects
   */
  getLogs() {
    try {
      const raw = localStorage.getItem(this.KEYS.LOGS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  /**
   * Adds a new activity log entry after validating required fields and rejecting non-positive quantities.
   * @param {Object} log - Log entry with category, quantity, and date fields
   * @param {string} log.category - Emission category key
   * @param {number} log.quantity - Positive quantity value
   * @param {string} log.date - Date string in YYYY-MM-DD format
   * @returns {Object} The newly created log entry with generated id
   * @throws {Error} If category is missing or quantity is not a positive number
   */
  addLog(log) {
    if (!log || !log.category) {
      throw new Error('Log must have a category.');
    }
    if (typeof log.quantity !== 'number' || log.quantity <= 0) {
      throw new Error('Log quantity must be a positive number.');
    }
    const newLog = Object.assign({}, log, { id: 'log_' + Date.now() });
    const logs = this.getLogs();
    logs.unshift(newLog);
    localStorage.setItem(this.KEYS.LOGS, JSON.stringify(logs));
    return newLog;
  },

  /**
   * Merges update fields into an existing log entry identified by id.
   * @param {string} id - The log entry's unique identifier
   * @param {Object} updates - Fields to merge into the existing entry
   * @returns {boolean} True if the entry was found and updated, false otherwise
   */
  updateLog(id, updates) {
    const logs = this.getLogs();
    const index = logs.findIndex(function(l) { return l.id === id; });
    if (index === -1) return false;
    logs[index] = Object.assign({}, logs[index], updates, { id: id });
    localStorage.setItem(this.KEYS.LOGS, JSON.stringify(logs));
    return true;
  },

  /**
   * Removes the log entry with the given id from storage.
   * @param {string} id - The log entry's unique identifier
   */
  deleteLog(id) {
    const logs = this.getLogs();
    const filtered = logs.filter(function(l) { return l.id !== id; });
    localStorage.setItem(this.KEYS.LOGS, JSON.stringify(filtered));
  },

  /**
   * Returns all logs recorded on a specific date string.
   * @param {string} date - Date in YYYY-MM-DD format (e.g. '2025-06-17')
   * @returns {Array<Object>} Array of log entries matching the date
   */
  getLogsByDate(date) {
    return this.getLogs().filter(function(l) { return l.date === date; });
  },

  /**
   * Returns all logs belonging to a specific emission category.
   * @param {string} category - Category key (e.g. 'transport', 'food')
   * @returns {Array<Object>} Array of log entries matching the category
   */
  getLogsByCategory(category) {
    return this.getLogs().filter(function(l) { return l.category === category; });
  },

  /**
   * Retrieves tips progress object with completedTips and dismissedTips arrays.
   * @returns {Object} Progress object with completedTips, dismissedTips, and lastUpdated
   */
  getTipsProgress() {
    try {
      const raw = localStorage.getItem(this.KEYS.TIPS);
      if (!raw) return { completedTips: [], dismissedTips: [], lastUpdated: '' };
      return JSON.parse(raw);
    } catch (e) {
      return { completedTips: [], dismissedTips: [], lastUpdated: '' };
    }
  },

  /**
   * Marks a tip as completed by adding its id to the completedTips list if not already present.
   * @param {string} tipId - The tip's unique identifier
   */
  completeTip(tipId) {
    const progress = this.getTipsProgress();
    if (!progress.completedTips.includes(tipId)) {
      progress.completedTips.push(tipId);
      progress.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.KEYS.TIPS, JSON.stringify(progress));
    }
  },

  /**
   * Marks a tip as dismissed by adding its id to the dismissedTips list if not already present.
   * @param {string} tipId - The tip's unique identifier
   */
  dismissTip(tipId) {
    const progress = this.getTipsProgress();
    if (!progress.dismissedTips.includes(tipId)) {
      progress.dismissedTips.push(tipId);
      progress.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.KEYS.TIPS, JSON.stringify(progress));
    }
  },

  /**
   * Bundles all stored data into a single exportable object with metadata.
   * @returns {Object} Export payload with profile, logs, tips, exportedAt, and version
   */
  exportData() {
    return {
      profile:    this.getProfile(),
      logs:       this.getLogs(),
      tips:       this.getTipsProgress(),
      exportedAt: new Date().toISOString(),
      version:    '1.0'
    };
  },

  /**
   * Validates that an import payload has the required structure before accepting it.
   * @param {Object} data - Import payload to validate
   * @returns {boolean} True if the data structure is valid
   */
  validateImportData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.profile || typeof data.profile !== 'object') return false;
    const qa = data.profile.quizAnswers;
    if (!qa || typeof qa !== 'object') return false;
    const requiredCategories = ['transport', 'food', 'energy', 'shopping'];
    for (let i = 0; i < requiredCategories.length; i++) {
      if (!(requiredCategories[i] in qa)) return false;
    }
    if (!Array.isArray(data.logs)) return false;
    if (!data.tips || typeof data.tips !== 'object') return false;
    return true;
  },

  /**
   * Imports validated data into localStorage, throwing an error if validation fails.
   * @param {Object} data - Validated import payload
   * @throws {Error} If the data structure is invalid
   */
  importData(data) {
    if (!this.validateImportData(data)) {
      throw new Error('Invalid import data structure.');
    }
    const profile = Object.assign({}, data.profile);
    if (typeof profile.name === 'string') {
      profile.name = this.sanitizeString(profile.name);
    }
    localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(profile));
    localStorage.setItem(this.KEYS.LOGS,    JSON.stringify(data.logs));
    localStorage.setItem(this.KEYS.TIPS,    JSON.stringify(data.tips));
  },

  /**
   * Clears logs and tips but keeps the user profile intact.
   */
  resetData() {
    localStorage.removeItem(this.KEYS.LOGS);
    localStorage.removeItem(this.KEYS.TIPS);
  },

  /**
   * Removes all EcoData keys from localStorage, fully logging out.
   */
  resetAll() {
    localStorage.removeItem(this.KEYS.PROFILE);
    localStorage.removeItem(this.KEYS.LOGS);
    localStorage.removeItem(this.KEYS.TIPS);
  },

  /**
   * Counts the number of consecutive days ending today that have at least one log entry.
   * @returns {number} Current streak length in days
   */
  getStreak() {
    const logs = this.getLogs();
    if (logs.length === 0) return 0;

    const datesWithLogs = new Set(logs.map(function(l) { return l.date; }));
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < this.MAX_STREAK_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (datesWithLogs.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
};
