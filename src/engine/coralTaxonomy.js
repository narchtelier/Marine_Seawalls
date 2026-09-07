// Database of biological hard coral species and intelligent taxonomy parser

function createSvgDataUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const CORAL_SPECIES_PRESETS = [
  {
    name: 'Acropora Cervicornis (Staghorn Coral)',
    commonName: 'Staghorn Coral',
    archetype: 'branching',
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.92,
      rugosity: 0.65,
      caliceDensity: 0.45,
      meanderingFreq: 0.15,
      fractalDimension: 1.88,
      fidelity: 1.0,
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      tentacleGlow: '#7dd3fc',
    },
    description: 'Fast-growing Caribbean arborescent coral with delicate antler-like branching.',
    svgColor: '#0ea5e9'
  },
  {
    name: 'Acropora Palmata (Elkhorn Coral)',
    commonName: 'Elkhorn Coral',
    archetype: 'branching',
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.76,
      rugosity: 0.78,
      caliceDensity: 0.55,
      meanderingFreq: 0.20,
      fractalDimension: 1.74,
      fidelity: 1.0,
      primaryColor: '#d97706',
      secondaryColor: '#f59e0b',
      tentacleGlow: '#fde047',
    },
    description: 'Robust, flattened antler branches built to withstand high-energy breaking waves.',
    svgColor: '#d97706'
  },
  {
    name: 'Diploria Labyrinthiformis (Grooved Brain Coral)',
    commonName: 'Grooved Brain Coral',
    archetype: 'brain',
    features: {
      morphologyType: 'brain',
      branchingFactor: 0.05,
      rugosity: 0.94,
      caliceDensity: 0.25,
      meanderingFreq: 0.92,
      fractalDimension: 1.72,
      fidelity: 1.0,
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      tentacleGlow: '#6ee7b7',
    },
    description: 'Meandroid colony with deep parallelambulacral grooves and continuous valleys.',
    svgColor: '#10b981'
  },
  {
    name: 'Porites Lobata (Lobe / Boulder Coral)',
    commonName: 'Boulder Coral',
    archetype: 'massive',
    features: {
      morphologyType: 'massive',
      branchingFactor: 0.10,
      rugosity: 0.82,
      caliceDensity: 0.95,
      meanderingFreq: 0.20,
      fractalDimension: 1.48,
      fidelity: 1.0,
      primaryColor: '#eab308',
      secondaryColor: '#ca8a04',
      tentacleGlow: '#fef08a',
    },
    description: 'Centuries-old massive boulder coral forming the structural bedrock of Pacific reefs.',
    svgColor: '#eab308'
  },
  {
    name: 'Turbinaria Mesenterina (Pagoda Table Coral)',
    commonName: 'Pagoda Table Coral',
    archetype: 'table',
    features: {
      morphologyType: 'table',
      branchingFactor: 0.38,
      rugosity: 0.62,
      caliceDensity: 0.68,
      meanderingFreq: 0.45,
      fractalDimension: 1.62,
      fidelity: 1.0,
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      tentacleGlow: '#f472b6',
    },
    description: 'Horizontal tiered platforms with corrugated ruffled margins.',
    svgColor: '#a855f7'
  },
  {
    name: 'Pocillopora Damicornis (Cauliflower Coral)',
    commonName: 'Cauliflower Coral',
    archetype: 'branching',
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.84,
      rugosity: 0.88,
      caliceDensity: 0.72,
      meanderingFreq: 0.25,
      fractalDimension: 1.80,
      fidelity: 1.0,
      primaryColor: '#f43f5e',
      secondaryColor: '#fb7185',
      tentacleGlow: '#fecdd3',
    },
    description: 'Compact verrucose clusters resembling cauliflower florets.',
    svgColor: '#f43f5e'
  },
  {
    name: 'Tubastraea Coccinea (Orange Sun Coral)',
    commonName: 'Orange Cup Coral',
    archetype: 'massive',
    features: {
      morphologyType: 'massive',
      branchingFactor: 0.40,
      rugosity: 0.85,
      caliceDensity: 0.82,
      meanderingFreq: 0.30,
      fractalDimension: 1.66,
      fidelity: 1.0,
      primaryColor: '#ea580c',
      secondaryColor: '#f97316',
      tentacleGlow: '#fed7aa',
    },
    description: 'Ahermatypic non-zooxanthellate coral with prominent bright orange corallites.',
    svgColor: '#ea580c'
  },
  {
    name: 'Dendrogyra Cylindrus (Pillar Coral)',
    commonName: 'Pillar Coral',
    archetype: 'branching',
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.60,
      rugosity: 0.70,
      caliceDensity: 0.50,
      meanderingFreq: 0.35,
      fractalDimension: 1.90,
      fidelity: 1.0,
      primaryColor: '#78716c',
      secondaryColor: '#a8a29e',
      tentacleGlow: '#e7e5e4',
    },
    description: 'Majestic vertical spires emerging from encrusting base.',
    svgColor: '#78716c'
  },
  {
    name: 'Favites Halicora (Honeycomb Star Coral)',
    commonName: 'Honeycomb Star Coral',
    archetype: 'massive',
    features: {
      morphologyType: 'massive',
      branchingFactor: 0.15,
      rugosity: 0.88,
      caliceDensity: 0.88,
      meanderingFreq: 0.40,
      fractalDimension: 1.55,
      fidelity: 1.0,
      primaryColor: '#14b8a6',
      secondaryColor: '#0d9488',
      tentacleGlow: '#99f6e4',
    },
    description: 'Massive cerioid corallites sharing common polygonal walls in honeycomb geometry.',
    svgColor: '#14b8a6'
  },
  {
    name: 'Seriatopora Hystrix (Bird\'s Nest Coral)',
    commonName: 'Bird\'s Nest Coral',
    archetype: 'branching',
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.95,
      rugosity: 0.60,
      caliceDensity: 0.40,
      meanderingFreq: 0.18,
      fractalDimension: 1.92,
      fidelity: 1.0,
      primaryColor: '#ec4899',
      secondaryColor: '#f472b6',
      tentacleGlow: '#fbcfe8',
    },
    description: 'Delicate needle-thin branches tightly interlaced in high-porosity matrix.',
    svgColor: '#ec4899'
  }
];

function generateSpecimenSvg(name, primaryColor, archetype) {
  return createSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#0a192f"/>
          <stop offset="100%" stop-color="#020813"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="150" cy="150" r="90" fill="${primaryColor}" opacity="0.85" filter="drop-shadow(0 0 15px ${primaryColor})"/>
      <text x="150" y="155" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">${archetype.toUpperCase()}</text>
      <text x="150" y="270" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">${name.substring(0, 32)}</text>
    </svg>
  `);
}

/**
 * Parses any coral reef or species name and derives biologically accurate morphological parameters
 */
export function parseCoralReefTaxonomy(inputName, requestedFidelity = 1.0) {
  if (!inputName || inputName.trim() === '') {
    return CORAL_SPECIES_PRESETS[0];
  }

  const cleanName = inputName.trim();
  const lower = cleanName.toLowerCase();

  // 1. Direct match with preset
  const directMatch = CORAL_SPECIES_PRESETS.find(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.commonName.toLowerCase().includes(lower) ||
      lower.includes(p.commonName.toLowerCase())
  );

  if (directMatch) {
    return {
      ...directMatch,
      features: {
        ...directMatch.features,
        fidelity: requestedFidelity,
      },
      previewUrl: generateSpecimenSvg(directMatch.name, directMatch.features.primaryColor, directMatch.features.morphologyType)
    };
  }

  // 2. Intelligent Keyword & Semantic Morphometric Parser
  let archetype = 'branching';
  let branching = 0.75;
  let rugosity = 0.65;
  let calice = 0.50;
  let meander = 0.20;
  let fractal = 1.70;
  let pColor = '#0ea5e9';
  let sColor = '#0284c7';
  let glow = '#38bdf8';

  if (lower.match(/brain|diploria|platygyra|maze|meand|pseudodiploria/)) {
    archetype = 'brain';
    branching = 0.06;
    rugosity = 0.92;
    calice = 0.30;
    meander = 0.90;
    fractal = 1.72;
    pColor = '#10b981';
    sColor = '#059669';
    glow = '#6ee7b7';
  } else if (lower.match(/massive|boulder|porites|lobe|mound|ball|rock|base|star|favites/)) {
    archetype = 'massive';
    branching = 0.12;
    rugosity = 0.82;
    calice = 0.92;
    meander = 0.25;
    fractal = 1.50;
    pColor = '#f59e0b';
    sColor = '#d97706';
    glow = '#fde68a';
  } else if (lower.match(/table|plate|turbinaria|montipora|shelf|flat|foliose|disc|pagoda/)) {
    archetype = 'table';
    branching = 0.40;
    rugosity = 0.60;
    calice = 0.65;
    meander = 0.45;
    fractal = 1.62;
    pColor = '#a855f7';
    sColor = '#ec4899';
    glow = '#f472b6';
  } else if (lower.match(/staghorn|acropora|branch|antler|tree|bush|spire|pillar|bird|nest/)) {
    archetype = 'branching';
    branching = 0.92;
    rugosity = 0.65;
    calice = 0.45;
    meander = 0.15;
    fractal = 1.86;
    pColor = '#0ea5e9';
    sColor = '#0284c7';
    glow = '#7dd3fc';
  }

  // Color keywords
  if (lower.includes('orange') || lower.includes('sun') || lower.includes('fire')) {
    pColor = '#ea580c';
    sColor = '#f97316';
    glow = '#fed7aa';
  } else if (lower.includes('pink') || lower.includes('rose') || lower.includes('magenta')) {
    pColor = '#ec4899';
    sColor = '#f472b6';
    glow = '#fbcfe8';
  } else if (lower.includes('blue') || lower.includes('cyan') || lower.includes('ocean')) {
    pColor = '#06b6d4';
    sColor = '#0284c7';
    glow = '#38bdf8';
  } else if (lower.includes('emerald') || lower.includes('green') || lower.includes('jade')) {
    pColor = '#10b981';
    sColor = '#059669';
    glow = '#6ee7b7';
  }

  return {
    name: cleanName,
    commonName: cleanName,
    archetype,
    description: `User-specified reef specimen: ${cleanName} (${archetype} macro-phenotype).`,
    features: {
      morphologyType: archetype,
      branchingFactor: branching,
      rugosity: rugosity,
      caliceDensity: calice,
      meanderingFreq: meander,
      fractalDimension: fractal,
      fidelity: requestedFidelity,
      primaryColor: pColor,
      secondaryColor: sColor,
      tentacleGlow: glow,
    },
    previewUrl: generateSpecimenSvg(cleanName, pColor, archetype),
  };
}
