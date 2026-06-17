// EcoData: Central data module for emission factors, benchmarks, tips, and badges
const EcoData = {

  // Emission factors grouped by category with source citations
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

  // Reference benchmarks for comparison
  benchmarks: {
    india:  { value: 1.9, unit: 'tonnes CO2/year', source: 'World Bank',        label: 'Average Indian' },
    global: { value: 4.7, unit: 'tonnes CO2/year', source: 'Our World in Data', label: 'Global Average' }
  },

  // Icons for each emission category
  categoryIcons: {
    transport: '🚗',
    food:      '🍽️',
    energy:    '⚡',
    shopping:  '🛍️',
    lifestyle: '🎯'
  },

  // Human-readable labels for each emission category
  categoryLabels: {
    transport: 'Transport',
    food:      'Food & Diet',
    energy:    'Home Energy',
    shopping:  'Shopping',
    lifestyle: 'Lifestyle'
  },

  // Calculates emission in kg CO2 for a given category, activity, and quantity
  calculateEmission(category, activity, quantity) {
    const cat = this.emissionFactors[category];
    if (!cat) return 0;
    const act = cat[activity];
    if (!act) return 0;
    return Math.round(act.factor * quantity * 100) / 100;
  },

  // Calculates annual carbon footprint in tonnes CO2 from quiz answers
  calculateBaselineFootprint(quizAnswers) {
    const ef = this.emissionFactors;

    const transportFactor = ef.transport[quizAnswers.transport]
      ? ef.transport[quizAnswers.transport].factor
      : 0;
    const transportKg = transportFactor * (quizAnswers.dailyKm || 0) * 365;

    const foodFactor = ef.food[quizAnswers.food]
      ? ef.food[quizAnswers.food].factor
      : 0;
    const foodKg = foodFactor * 365;

    const energyFactor = ef.energy[quizAnswers.energy]
      ? ef.energy[quizAnswers.energy].factor
      : 0;
    const energyKg = energyFactor * (quizAnswers.monthlyKwh || 0) * 12;

    const shoppingFactor = ef.shopping[quizAnswers.shopping]
      ? ef.shopping[quizAnswers.shopping].factor
      : 0;
    const shoppingKg = shoppingFactor * 1000;

    const flightKg = ef.lifestyle.flight.factor * (quizAnswers.flightsPerYear || 0);
    const intlFlightKg = ef.lifestyle.intlFlight.factor * (quizAnswers.intlFlightsPerYear || 0);
    const streamingKg = ef.lifestyle.streaming.factor * (quizAnswers.streamingHours || 0) * 365;
    const lifestyleKg = flightKg + intlFlightKg + streamingKg;

    const totalKg = transportKg + foodKg + energyKg + shoppingKg + lifestyleKg;
    return Math.round(totalKg / 100) / 10;
  },

  // Actionable tips for reducing carbon footprint across all categories
  tips: [
    {
      id: 'tip_transport_1',
      category: 'transport',
      title: 'Switch to Public Transit',
      savings: 'Up to 2.4 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'high',
      description: 'Replace daily car commutes with buses or metro to drastically cut transport emissions.'
    },
    {
      id: 'tip_transport_2',
      category: 'transport',
      title: 'Cycle Short Distances',
      savings: 'Up to 0.5 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'Use a bicycle for trips under 5 km instead of driving or taking a cab.'
    },
    {
      id: 'tip_transport_3',
      category: 'transport',
      title: 'Carpool to Work',
      savings: 'Up to 1.2 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'high',
      description: 'Share rides with colleagues or neighbours to halve your per-person transport emissions.'
    },
    {
      id: 'tip_transport_4',
      category: 'transport',
      title: 'Work from Home When Possible',
      savings: 'Up to 1.0 tonne CO2/year',
      difficulty: 'medium',
      impact: 'high',
      description: 'Even two remote days per week meaningfully reduces commute-related emissions.'
    },
    {
      id: 'tip_transport_5',
      category: 'transport',
      title: 'Maintain Proper Tyre Pressure',
      savings: 'Up to 0.1 tonne CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'Correctly inflated tyres improve fuel efficiency by up to 3%, lowering emissions.'
    },
    {
      id: 'tip_food_1',
      category: 'food',
      title: 'Reduce Red Meat Intake',
      savings: 'Up to 0.5 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'high',
      description: 'Cutting beef and lamb even two days per week significantly lowers your food footprint.'
    },
    {
      id: 'tip_food_2',
      category: 'food',
      title: 'Try Meatless Mondays',
      savings: 'Up to 0.2 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'One plant-based day per week is an easy first step toward a lower-emission diet.'
    },
    {
      id: 'tip_food_3',
      category: 'food',
      title: 'Buy Local and Seasonal Produce',
      savings: 'Up to 0.1 tonne CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'Local seasonal food requires less transport and cold storage, cutting supply-chain emissions.'
    },
    {
      id: 'tip_food_4',
      category: 'food',
      title: 'Reduce Food Waste',
      savings: 'Up to 0.3 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'medium',
      description: 'Plan meals and use leftovers to prevent food rotting in landfill and emitting methane.'
    },
    {
      id: 'tip_food_5',
      category: 'food',
      title: 'Shift to Plant-Based Proteins',
      savings: 'Up to 0.4 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'high',
      description: 'Replacing meat with legumes, tofu, or nuts can cut dietary emissions by up to 50%.'
    },
    {
      id: 'tip_energy_1',
      category: 'energy',
      title: 'Switch to LED Lighting',
      savings: 'Up to 0.1 tonne CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'LED bulbs use 75% less energy than incandescent bulbs and last much longer.'
    },
    {
      id: 'tip_energy_2',
      category: 'energy',
      title: 'Install Solar Panels',
      savings: 'Up to 1.5 tonnes CO2/year',
      difficulty: 'hard',
      impact: 'high',
      description: 'Rooftop solar can cover 60–80% of household electricity needs in sunny regions.'
    },
    {
      id: 'tip_energy_3',
      category: 'energy',
      title: 'Use a Programmable Thermostat',
      savings: 'Up to 0.3 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'Automatically adjusting temperature during sleep and away hours saves significant energy.'
    },
    {
      id: 'tip_energy_4',
      category: 'energy',
      title: 'Unplug Devices on Standby',
      savings: 'Up to 0.08 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'Standby power can account for 10% of home electricity use; unplug devices when idle.'
    },
    {
      id: 'tip_energy_5',
      category: 'energy',
      title: 'Upgrade to Energy-Efficient Appliances',
      savings: 'Up to 0.5 tonnes CO2/year',
      difficulty: 'hard',
      impact: 'high',
      description: 'BEE 5-star rated appliances can use 40–60% less electricity than older models.'
    },
    {
      id: 'tip_shopping_1',
      category: 'shopping',
      title: 'Buy Second-Hand Clothing',
      savings: 'Up to 0.4 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'Thrift shopping extends garment life and avoids the high emissions of textile production.'
    },
    {
      id: 'tip_shopping_2',
      category: 'shopping',
      title: 'Repair Instead of Replace',
      savings: 'Up to 0.3 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'medium',
      description: 'Repairing electronics and clothing prevents manufacturing emissions of new products.'
    },
    {
      id: 'tip_shopping_3',
      category: 'shopping',
      title: 'Choose Products with Less Packaging',
      savings: 'Up to 0.1 tonne CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'Opt for bulk bins, refills, and minimal-packaging brands to cut waste-related emissions.'
    },
    {
      id: 'tip_shopping_4',
      category: 'shopping',
      title: 'Borrow or Rent Infrequently Used Items',
      savings: 'Up to 0.2 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'Borrowing tools, party equipment, or seasonal items avoids unnecessary production.'
    },
    {
      id: 'tip_shopping_5',
      category: 'shopping',
      title: 'Support Sustainable Brands',
      savings: 'Up to 0.5 tonnes CO2/year',
      difficulty: 'medium',
      impact: 'high',
      description: 'Choosing certified sustainable products drives market demand for lower-carbon goods.'
    },
    {
      id: 'tip_lifestyle_1',
      category: 'lifestyle',
      title: 'Replace a Domestic Flight with Train',
      savings: 'Up to 0.25 tonnes CO2/trip',
      difficulty: 'medium',
      impact: 'high',
      description: 'Train travel emits 80–90% less CO2 per km than domestic aviation.'
    },
    {
      id: 'tip_lifestyle_2',
      category: 'lifestyle',
      title: 'Offset Unavoidable Flights',
      savings: 'Variable',
      difficulty: 'easy',
      impact: 'medium',
      description: 'Use verified carbon offset programmes (Gold Standard or VCS) for flights you cannot avoid.'
    },
    {
      id: 'tip_lifestyle_3',
      category: 'lifestyle',
      title: 'Reduce Streaming Resolution',
      savings: 'Up to 0.01 tonne CO2/year',
      difficulty: 'easy',
      impact: 'low',
      description: 'Streaming at 1080p instead of 4K can cut video-streaming data centre energy by up to 86%.'
    },
    {
      id: 'tip_lifestyle_4',
      category: 'lifestyle',
      title: 'Plant Trees or Support Reforestation',
      savings: 'Up to 0.2 tonnes CO2/year',
      difficulty: 'easy',
      impact: 'medium',
      description: 'A mature tree absorbs roughly 22 kg CO2/year; participating in drives multiplies this impact.'
    },
    {
      id: 'tip_lifestyle_5',
      category: 'lifestyle',
      title: 'Use Video Calls Instead of Business Travel',
      savings: 'Up to 1.0 tonne CO2/year',
      difficulty: 'easy',
      impact: 'high',
      description: 'Virtual meetings eliminate inter-city travel emissions with minimal productivity loss.'
    }
  ],

  // Achievement badges awarded for hitting sustainability milestones
  badges: [
    {
      id: 'badge_commuter',
      name: 'Green Commuter',
      icon: '🚲',
      description: 'Transport emissions below 500 kg/yr',
      type: 'quiz'
    },
    {
      id: 'badge_eater',
      name: 'Eco Eater',
      icon: '🥗',
      description: 'Food emissions below 800 kg/yr',
      type: 'quiz'
    },
    {
      id: 'badge_saver',
      name: 'Energy Saver',
      icon: '💡',
      description: 'Energy emissions below 500 kg/yr',
      type: 'quiz'
    },
    {
      id: 'badge_shopper',
      name: 'Conscious Shopper',
      icon: '♻️',
      description: 'Minimal shopping footprint',
      type: 'quiz'
    },
    {
      id: 'badge_leader',
      name: 'Eco Leader',
      icon: '🌍',
      description: 'Total footprint below India avg',
      type: 'quiz'
    },
    {
      id: 'badge_streak3',
      name: '3-Day Streak',
      icon: '🔥',
      description: 'Log activities 3 days in a row',
      type: 'streak'
    },
    {
      id: 'badge_streak7',
      name: 'Week Warrior',
      icon: '⚡',
      description: 'Log activities 7 days in a row',
      type: 'streak'
    },
    {
      id: 'badge_streak30',
      name: 'Monthly Champion',
      icon: '🏆',
      description: 'Log activities 30 days in a row',
      type: 'streak'
    },
    {
      id: 'badge_tips5',
      name: 'Tip Explorer',
      icon: '🌱',
      description: 'Complete 5 eco tips',
      type: 'tips'
    },
    {
      id: 'badge_tips15',
      name: 'Tip Master',
      icon: '🌳',
      description: 'Complete 15 eco tips',
      type: 'tips'
    },
    {
      id: 'badge_logger10',
      name: 'Logger Pro',
      icon: '📊',
      description: 'Log 10 activities total',
      type: 'activity'
    },
    {
      id: 'badge_logger50',
      name: 'Data Champion',
      icon: '📈',
      description: 'Log 50 activities total',
      type: 'activity'
    }
  ]
};
