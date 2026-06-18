'use strict';

/**
 * EcoData: Central data module for emission factors, benchmarks, tips, and badges.
 * All emission factors are sourced from peer-reviewed research and government publications.
 * @namespace
 */
const EcoData = {

  // ─── CONSTANTS ──────────────────────────────────────────────────────────────

  /** Scoring thresholds for eco score color coding */
  SCORE_THRESHOLDS: { GOOD: 70, MODERATE: 40 },

  /** Footprint thresholds (tonnes CO2/yr) for comparison badges */
  FOOTPRINT_THRESHOLDS: { INDIA_AVG: 1.9, GLOBAL_AVG: 4.7, MAX_DISPLAY: 12 },

  /** Days in a year, used for annualizing daily emission factors */
  DAYS_PER_YEAR: 365,

  /** Months in a year, used for annualizing monthly energy usage */
  MONTHS_PER_YEAR: 12,

  /** Conversion factor from tonnes to kg */
  KG_PER_TONNE: 1000,

  // ─── EMISSION FACTORS ───────────────────────────────────────────────────────

  /** Emission factors grouped by category with source citations */
  emissionFactors: {
    transport: {
      car:        { factor: 0.174,  unit: 'kgCO2/km', source: 'EPA 2024',           label: 'Car (Petrol)' },
      carDiesel:  { factor: 0.130,  unit: 'kgCO2/km', source: 'DEFRA 2023',         label: 'Car (Diesel)' },
      carCNG:     { factor: 0.130,  unit: 'kgCO2/km', source: 'IPCC AR6',           label: 'Car (CNG)' },
      electricCar:{ factor: 0.047,  unit: 'kgCO2/km', source: 'CATF/CEA 2022',      label: 'Electric Car' },
      motorbike:  { factor: 0.092,  unit: 'kgCO2/km', source: 'WRI India 2015',     label: 'Motorbike/Scooter' },
      electricBike:{ factor: 0.031, unit: 'kgCO2/km', source: 'CATF India 2022',    label: 'Electric Two-Wheeler' },
      auto:       { factor: 0.060,  unit: 'kgCO2/km', source: 'WRI India 2015',     label: 'Auto-Rickshaw' },
      bus:        { factor: 0.089,  unit: 'kgCO2/km', source: 'DEFRA 2023',         label: 'Bus' },
      metro:      { factor: 0.041,  unit: 'kgCO2/km', source: 'IPCC AR6',           label: 'Metro/Train' },
      carpool:    { factor: 0.087,  unit: 'kgCO2/km', source: 'EPA 2024 (÷2)',      label: 'Carpool (2 people)' },
      bike:       { factor: 0,      unit: 'kgCO2/km', source: 'IPCC',               label: 'Bicycle' },
      walk:       { factor: 0,      unit: 'kgCO2/km', source: 'IPCC',               label: 'Walking' }
    },
    food: {
      heavyMeat:   { factor: 3.3, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Heavy Meat (Daily)' },
      mediumMeat:  { factor: 2.8, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Medium Meat (3-4x/wk)' },
      mixed:       { factor: 2.5, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Mixed / Balanced' },
      pescatarian: { factor: 2.0, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Pescatarian (Fish)' },
      vegetarian:  { factor: 1.7, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Vegetarian' },
      vegan:       { factor: 1.5, unit: 'kgCO2/day', source: 'Our World in Data', label: 'Vegan' }
    },
    energy: {
      grid:       { factor: 0.82,  unit: 'kgCO2/kWh', source: 'CEA India 2023',      label: 'Grid (Coal-heavy)' },
      gridGas:    { factor: 0.45,  unit: 'kgCO2/kWh', source: 'EIA 2023',            label: 'Grid (Gas-based)' },
      solar:      { factor: 0.05,  unit: 'kgCO2/kWh', source: 'IPCC AR6',            label: 'Rooftop Solar' },
      solarGrid:  { factor: 0.35,  unit: 'kgCO2/kWh', source: 'Estimated blend',     label: 'Solar + Grid Mix' },
      wind:       { factor: 0.012, unit: 'kgCO2/kWh', source: 'IPCC AR6',            label: 'Wind Energy' },
      mixed:      { factor: 0.45,  unit: 'kgCO2/kWh', source: 'Estimated blend',     label: 'Mixed Renewable' },
      diesel:     { factor: 0.95,  unit: 'kgCO2/kWh', source: 'IPCC AR6',            label: 'Diesel Generator' },
      biomass:    { factor: 0.23,  unit: 'kgCO2/kWh', source: 'IPCC AR6',            label: 'Biomass / Wood' }
    },
    shopping: {
      minimal:  { factor: 0.5, unit: 'tonneCO2/year', source: 'WRAP UK', label: 'Minimal' },
      moderate: { factor: 1.2, unit: 'tonneCO2/year', source: 'WRAP UK', label: 'Moderate' },
      heavy:    { factor: 2.0, unit: 'tonneCO2/year', source: 'WRAP UK', label: 'Heavy' }
    },
    lifestyle: {
      flight:        { factor: 255,   unit: 'kgCO2/flight', source: 'ICAO Calculator',  label: 'Domestic Flight' },
      intlFlight:    { factor: 1100,  unit: 'kgCO2/flight', source: 'ICAO Calculator',  label: 'International Flight' },
      streaming:     { factor: 0.036, unit: 'kgCO2/hour',   source: 'IEA 2023',         label: 'Video Streaming' }
    }
  },

  /** Reference benchmarks for comparison */
  benchmarks: {
    india:  { value: 1.9, unit: 'tonnes CO2/year', source: 'World Bank',        label: 'Average Indian' },
    global: { value: 4.7, unit: 'tonnes CO2/year', source: 'Our World in Data', label: 'Global Average' }
  },

  /** Icons for each emission category */
  categoryIcons: {
    transport: '\u{1F697}',
    food:      '\u{1F37D}\uFE0F',
    energy:    '\u26A1',
    shopping:  '\u{1F6CD}\uFE0F',
    lifestyle: '\u{1F3AF}'
  },

  /** Human-readable labels for each emission category */
  categoryLabels: {
    transport: 'Transport',
    food:      'Food & Diet',
    energy:    'Home Energy',
    shopping:  'Shopping',
    lifestyle: 'Lifestyle'
  },

  /**
   * Safely retrieves the emission factor for a category and activity key.
   * @param {string} category - Category key
   * @param {string} activityKey - Activity key within that category
   * @returns {number} The emission factor, or 0 if not found
   */
  getFactor(category, activityKey) {
    const cat = this.emissionFactors[category];
    if (!cat || !cat[activityKey]) return 0;
    return cat[activityKey].factor;
  },

  /**
   * Returns the semantic color CSS variable for a given footprint value.
   * @param {number} footprint - Annual footprint in tonnes CO2
   * @returns {string} CSS color variable string
   */
  getFootprintColor(footprint) {
    if (footprint <= this.FOOTPRINT_THRESHOLDS.INDIA_AVG) return 'var(--color-success)';
    if (footprint <= this.FOOTPRINT_THRESHOLDS.GLOBAL_AVG) return 'var(--color-warning)';
    return 'var(--color-danger)';
  },

  /**
   * Returns the semantic color CSS variable for a given eco score.
   * @param {number} score - Eco score between 0 and 100
   * @returns {string} CSS color variable string
   */
  getScoreColor(score) {
    if (score >= this.SCORE_THRESHOLDS.GOOD) return 'var(--color-success)';
    if (score >= this.SCORE_THRESHOLDS.MODERATE) return 'var(--color-warning)';
    return 'var(--color-danger)';
  },

  /**
   * Returns the hex color for a given eco score (used in profile and PDF).
   * @param {number} score - Eco score between 0 and 100
   * @returns {string} Hex color string
   */
  getScoreHex(score) {
    if (score >= this.SCORE_THRESHOLDS.GOOD) return '#40916C';
    if (score >= this.SCORE_THRESHOLDS.MODERATE) return '#F4A261';
    return '#E63946';
  },

  /**
   * Returns today's date as a YYYY-MM-DD string.
   * @returns {string} ISO date string (first 10 chars)
   */
  todayString() {
    return new Date().toISOString().slice(0, 10);
  },

  /**
   * Builds an SVG progress ring element as an HTML string.
   * @param {Object} opts - Ring configuration
   * @param {number} opts.radius - Circle radius in SVG units
   * @param {number} opts.strokeWidth - Stroke width in SVG units
   * @param {number} opts.ratio - Fill ratio between 0 and 1
   * @param {string} opts.stroke - Stroke color (CSS value)
   * @param {string} opts.trackStroke - Track circle stroke color
   * @param {number} opts.size - SVG width/height in pixels
   * @param {string} opts.ariaLabel - Accessible label for the ring
   * @param {string} opts.centerText - Main text in the center
   * @param {string} opts.subText - Smaller text below center
   * @param {string} [opts.textFill] - Fill color for center text
   * @param {string} [opts.subFill] - Fill color for sub text
   * @param {number} [opts.fontSize] - Font size for center text
   * @param {number} [opts.subFontSize] - Font size for sub text
   * @returns {string} SVG element as HTML string
   */
  buildSVGRing(opts) {
    const cx = opts.size / 2;
    const cy = opts.size / 2;
    const circ = 2 * Math.PI * opts.radius;
    const offset = circ - opts.ratio * circ;
    const tFill = opts.textFill || 'var(--color-text)';
    const sFill = opts.subFill || 'var(--color-neutral)';
    const fSize = opts.fontSize || 18;
    const sfSize = opts.subFontSize || 9;

    return `<svg role="img" aria-label="${opts.ariaLabel}" width="${opts.size}" height="${opts.size}" viewBox="0 0 ${opts.size} ${opts.size}">
      <circle cx="${cx}" cy="${cy}" r="${opts.radius}" fill="none" stroke="${opts.trackStroke}" stroke-width="${opts.strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${opts.radius}" fill="none"
        stroke="${opts.stroke}" stroke-width="${opts.strokeWidth}"
        stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="${fSize}" font-weight="800" fill="${tFill}">${opts.centerText}</text>
      <text x="${cx}" y="${cy + sfSize + 3}" text-anchor="middle" font-size="${sfSize}" fill="${sFill}">${opts.subText}</text>
    </svg>`;
  },

  /**
   * Calculates emission in kg CO2 for a given category, activity, and quantity.
   * @param {string} category - Emission category key (e.g. 'transport')
   * @param {string} activity - Activity key within the category (e.g. 'car')
   * @param {number} quantity - Amount of the activity performed
   * @returns {number} Emission in kg CO2, rounded to 2 decimal places
   */
  calculateEmission(category, activity, quantity) {
    const factor = this.getFactor(category, activity);
    return Math.round(factor * quantity * 100) / 100;
  },

  /**
   * Calculates annual carbon footprint in tonnes CO2 from quiz answers.
   * @param {Object} qa - Flattened quiz answers object
   * @returns {number} Annual footprint in tonnes CO2, rounded to 1 decimal place
   */
  calculateBaselineFootprint(qa) {
    const transportKg = this.getFactor('transport', qa.transport) * (qa.dailyKm || 0) * this.DAYS_PER_YEAR;
    const foodKg = this.getFactor('food', qa.food) * this.DAYS_PER_YEAR;
    const energyKg = this.getFactor('energy', qa.energy) * (qa.monthlyKwh || 0) * this.MONTHS_PER_YEAR;
    const shoppingKg = this.getFactor('shopping', qa.shopping) * this.KG_PER_TONNE;
    const flightKg = this.emissionFactors.lifestyle.flight.factor * (qa.flightsPerYear || 0);
    const intlFlightKg = this.emissionFactors.lifestyle.intlFlight.factor * (qa.intlFlightsPerYear || 0);
    const streamingKg = this.emissionFactors.lifestyle.streaming.factor * (qa.streamingHours || 0) * this.DAYS_PER_YEAR;

    const totalKg = transportKg + foodKg + energyKg + shoppingKg + flightKg + intlFlightKg + streamingKg;
    return Math.round(totalKg / 100) / 10;
  },

  /** Actionable tips for reducing carbon footprint across all categories */
  tips: [
    { id: 'tip_transport_1', category: 'transport', title: 'Switch to Public Transit', savings: 'Up to 2.4 tonnes CO2/year', difficulty: 'medium', impact: 'high', description: 'Replace daily car commutes with buses or metro to drastically cut transport emissions.' },
    { id: 'tip_transport_2', category: 'transport', title: 'Cycle Short Distances', savings: 'Up to 0.5 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'Use a bicycle for trips under 5 km instead of driving or taking a cab.' },
    { id: 'tip_transport_3', category: 'transport', title: 'Carpool to Work', savings: 'Up to 1.2 tonnes CO2/year', difficulty: 'easy', impact: 'high', description: 'Share rides with colleagues or neighbours to halve your per-person transport emissions.' },
    { id: 'tip_transport_4', category: 'transport', title: 'Work from Home When Possible', savings: 'Up to 1.0 tonne CO2/year', difficulty: 'medium', impact: 'high', description: 'Even two remote days per week meaningfully reduces commute-related emissions.' },
    { id: 'tip_transport_5', category: 'transport', title: 'Maintain Proper Tyre Pressure', savings: 'Up to 0.1 tonne CO2/year', difficulty: 'easy', impact: 'low', description: 'Correctly inflated tyres improve fuel efficiency by up to 3%, lowering emissions.' },
    { id: 'tip_food_1', category: 'food', title: 'Reduce Red Meat Intake', savings: 'Up to 0.5 tonnes CO2/year', difficulty: 'medium', impact: 'high', description: 'Cutting beef and lamb even two days per week significantly lowers your food footprint.' },
    { id: 'tip_food_2', category: 'food', title: 'Try Meatless Mondays', savings: 'Up to 0.2 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'One plant-based day per week is an easy first step toward a lower-emission diet.' },
    { id: 'tip_food_3', category: 'food', title: 'Buy Local and Seasonal Produce', savings: 'Up to 0.1 tonne CO2/year', difficulty: 'easy', impact: 'low', description: 'Local seasonal food requires less transport and cold storage, cutting supply-chain emissions.' },
    { id: 'tip_food_4', category: 'food', title: 'Reduce Food Waste', savings: 'Up to 0.3 tonnes CO2/year', difficulty: 'medium', impact: 'medium', description: 'Plan meals and use leftovers to prevent food rotting in landfill and emitting methane.' },
    { id: 'tip_food_5', category: 'food', title: 'Shift to Plant-Based Proteins', savings: 'Up to 0.4 tonnes CO2/year', difficulty: 'medium', impact: 'high', description: 'Replacing meat with legumes, tofu, or nuts can cut dietary emissions by up to 50%.' },
    { id: 'tip_energy_1', category: 'energy', title: 'Switch to LED Lighting', savings: 'Up to 0.1 tonne CO2/year', difficulty: 'easy', impact: 'low', description: 'LED bulbs use 75% less energy than incandescent bulbs and last much longer.' },
    { id: 'tip_energy_2', category: 'energy', title: 'Install Solar Panels', savings: 'Up to 1.5 tonnes CO2/year', difficulty: 'hard', impact: 'high', description: 'Rooftop solar can cover 60\u201380% of household electricity needs in sunny regions.' },
    { id: 'tip_energy_3', category: 'energy', title: 'Use a Programmable Thermostat', savings: 'Up to 0.3 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'Automatically adjusting temperature during sleep and away hours saves significant energy.' },
    { id: 'tip_energy_4', category: 'energy', title: 'Unplug Devices on Standby', savings: 'Up to 0.08 tonnes CO2/year', difficulty: 'easy', impact: 'low', description: 'Standby power can account for 10% of home electricity use; unplug devices when idle.' },
    { id: 'tip_energy_5', category: 'energy', title: 'Upgrade to Energy-Efficient Appliances', savings: 'Up to 0.5 tonnes CO2/year', difficulty: 'hard', impact: 'high', description: 'BEE 5-star rated appliances can use 40\u201360% less electricity than older models.' },
    { id: 'tip_shopping_1', category: 'shopping', title: 'Buy Second-Hand Clothing', savings: 'Up to 0.4 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'Thrift shopping extends garment life and avoids the high emissions of textile production.' },
    { id: 'tip_shopping_2', category: 'shopping', title: 'Repair Instead of Replace', savings: 'Up to 0.3 tonnes CO2/year', difficulty: 'medium', impact: 'medium', description: 'Repairing electronics and clothing prevents manufacturing emissions of new products.' },
    { id: 'tip_shopping_3', category: 'shopping', title: 'Choose Products with Less Packaging', savings: 'Up to 0.1 tonne CO2/year', difficulty: 'easy', impact: 'low', description: 'Opt for bulk bins, refills, and minimal-packaging brands to cut waste-related emissions.' },
    { id: 'tip_shopping_4', category: 'shopping', title: 'Borrow or Rent Infrequently Used Items', savings: 'Up to 0.2 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'Borrowing tools, party equipment, or seasonal items avoids unnecessary production.' },
    { id: 'tip_shopping_5', category: 'shopping', title: 'Support Sustainable Brands', savings: 'Up to 0.5 tonnes CO2/year', difficulty: 'medium', impact: 'high', description: 'Choosing certified sustainable products drives market demand for lower-carbon goods.' },
    { id: 'tip_lifestyle_1', category: 'lifestyle', title: 'Replace a Domestic Flight with Train', savings: 'Up to 0.25 tonnes CO2/trip', difficulty: 'medium', impact: 'high', description: 'Train travel emits 80\u201390% less CO2 per km than domestic aviation.' },
    { id: 'tip_lifestyle_2', category: 'lifestyle', title: 'Offset Unavoidable Flights', savings: 'Variable', difficulty: 'easy', impact: 'medium', description: 'Use verified carbon offset programmes (Gold Standard or VCS) for flights you cannot avoid.' },
    { id: 'tip_lifestyle_3', category: 'lifestyle', title: 'Reduce Streaming Resolution', savings: 'Up to 0.01 tonne CO2/year', difficulty: 'easy', impact: 'low', description: 'Streaming at 1080p instead of 4K can cut video-streaming data centre energy by up to 86%.' },
    { id: 'tip_lifestyle_4', category: 'lifestyle', title: 'Plant Trees or Support Reforestation', savings: 'Up to 0.2 tonnes CO2/year', difficulty: 'easy', impact: 'medium', description: 'A mature tree absorbs roughly 22 kg CO2/year; participating in drives multiplies this impact.' },
    { id: 'tip_lifestyle_5', category: 'lifestyle', title: 'Use Video Calls Instead of Business Travel', savings: 'Up to 1.0 tonne CO2/year', difficulty: 'easy', impact: 'high', description: 'Virtual meetings eliminate inter-city travel emissions with minimal productivity loss.' }
  ],

  /** Achievement badges awarded for hitting sustainability milestones */
  badges: [
    { id: 'badge_commuter', name: 'Green Commuter', icon: '\u{1F6B2}', description: 'Transport emissions below 500 kg/yr', type: 'quiz' },
    { id: 'badge_eater', name: 'Eco Eater', icon: '\u{1F957}', description: 'Food emissions below 800 kg/yr', type: 'quiz' },
    { id: 'badge_saver', name: 'Energy Saver', icon: '\u{1F4A1}', description: 'Energy emissions below 500 kg/yr', type: 'quiz' },
    { id: 'badge_shopper', name: 'Conscious Shopper', icon: '\u267B\uFE0F', description: 'Minimal shopping footprint', type: 'quiz' },
    { id: 'badge_leader', name: 'Eco Leader', icon: '\u{1F30D}', description: 'Total footprint below India avg', type: 'quiz' },
    { id: 'badge_streak3', name: '3-Day Streak', icon: '\u{1F525}', description: 'Log activities 3 days in a row', type: 'streak' },
    { id: 'badge_streak7', name: 'Week Warrior', icon: '\u26A1', description: 'Log activities 7 days in a row', type: 'streak' },
    { id: 'badge_streak30', name: 'Monthly Champion', icon: '\u{1F3C6}', description: 'Log activities 30 days in a row', type: 'streak' },
    { id: 'badge_tips5', name: 'Tip Explorer', icon: '\u{1F331}', description: 'Complete 5 eco tips', type: 'tips' },
    { id: 'badge_tips15', name: 'Tip Master', icon: '\u{1F333}', description: 'Complete 15 eco tips', type: 'tips' },
    { id: 'badge_logger10', name: 'Logger Pro', icon: '\u{1F4CA}', description: 'Log 10 activities total', type: 'activity' },
    { id: 'badge_logger50', name: 'Data Champion', icon: '\u{1F4C8}', description: 'Log 50 activities total', type: 'activity' }
  ]
};
