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
      colonyForm: 'branching',
      branchTapering: 0.85,
      branchAngleMean: 0.78, // ~45 degrees
      caliceDiameter: 1.2, // mm
      caliceSpacing: 3.5, // mm
      septaCount: 12,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      lSystemAxiom: 'F',
      lSystemRules: { 'F': 'F[&F]F[^F][F]' },
      lSystemTheta: 45.0, // Branching angle in degrees
      lSystemStepScale: 0.75, // How much shorter the next branch is
      lSystemRadiusScale: 0.8, // How much thinner the next branch is
      
      // Legacy params for compatibility
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
      colonyForm: 'digitate',
      branchTapering: 0.4, // Thick bases
      branchAngleMean: 0.35, // Broad, almost horizontal
      caliceDiameter: 1.0,
      caliceSpacing: 2.0,
      septaCount: 12,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      lSystemAxiom: 'F',
      lSystemRules: { 'F': 'F[+F][-F]F' }, // Flattened branching
      lSystemTheta: 75.0, // Very wide spreading angles
      lSystemStepScale: 0.85, 
      lSystemRadiusScale: 0.9, 
      
      // Legacy
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
      colonyForm: 'meandroid',
      meanderingWidth: 8.0, 
      caliceDiameter: 6.0,
      caliceSpacing: 6.0,
      septaCount: 24,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      turingFeed: 0.038, // Specific reaction-diffusion F rate
      turingKill: 0.062, // Specific reaction-diffusion k rate
      turingScale: 6.0,  // UV scale for ridges
      turingHeight: 0.4, // Ridge displacement height
      
      // Legacy
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
    description: 'Meandroid colony with deep parallel ambulacral grooves and continuous valleys.',
    svgColor: '#10b981'
  },
  {
    name: 'Pseudodiploria Strigosa (Symmetrical Brain Coral)',
    commonName: 'Symmetrical Brain Coral',
    archetype: 'brain',
    features: {
      morphologyType: 'brain',
      colonyForm: 'meandroid',
      meanderingWidth: 4.0, 
      caliceDiameter: 4.0,
      caliceSpacing: 4.0,
      septaCount: 24,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      turingFeed: 0.025, // Tighter, worm-like ridges
      turingKill: 0.055, 
      turingScale: 12.0, 
      turingHeight: 0.2, 
      
      // Legacy
      branchingFactor: 0.05,
      rugosity: 0.94,
      caliceDensity: 0.25,
      meanderingFreq: 0.92,
      fractalDimension: 1.72,
      fidelity: 1.0,
      primaryColor: '#059669',
      secondaryColor: '#047857',
      tentacleGlow: '#34d399',
    },
    description: 'Tighter, highly regular labyrinthine patterns compared to Diploria.',
    svgColor: '#059669'
  },
  {
    name: 'Porites Lobata (Lobe / Boulder Coral)',
    commonName: 'Boulder Coral',
    archetype: 'massive',
    features: {
      morphologyType: 'massive',
      colonyForm: 'cerioid',
      caliceDiameter: 1.5,
      caliceSpacing: 1.5,
      septaCount: 12,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      cellularFreq: 25.0, // Tightly packed calices
      cellularDepth: 0.06,
      lobeFrequency: 2.5,
      lobeAmplitude: 0.2,
      
      // Legacy
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
      colonyForm: 'foliose',
      caliceDiameter: 2.5,
      caliceSpacing: 4.0,
      septaCount: 12,
      // EXACT MORPHOGENETIC GRAMMAR
      isBiomimetic: true,
      whorlFreq: 8.0,
      whorlAmplitude: 0.3,
      tierDroop: 0.35,
      
      // Legacy
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

  // 1. Direct match with preset (TRUE BIOMIMICRY)
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

  // 2. Intelligent Keyword & Semantic Morphometric Parser (Fallback Approximation)
  let archetype = 'branching';
  let colonyForm = 'branching';
  let caliceDiameter = 1.5;
  let caliceSpacing = 3.0;
  let septaCount = 12;
  
  // Base Legacy Fallbacks
  let features = {
      isBiomimetic: false,
      morphologyType: archetype,
      colonyForm: colonyForm,
      caliceDiameter: caliceDiameter,
      caliceSpacing: caliceSpacing,
      septaCount: septaCount,
      branchTapering: 0.8,
      branchAngleMean: 0.78,
      meanderingWidth: 5.0,
      branchingFactor: 0.75,
      rugosity: 0.65,
      caliceDensity: 0.50,
      meanderingFreq: 0.20,
      fractalDimension: 1.70,
      fidelity: requestedFidelity,
      primaryColor: '#0ea5e9',
      secondaryColor: '#0284c7',
      tentacleGlow: '#38bdf8',
  };

  if (lower.match(/brain|diploria|platygyra|maze|meand|pseudodiploria/)) {
    features.archetype = 'brain';
    features.colonyForm = 'meandroid';
    features.caliceDiameter = 8.0;
    features.caliceSpacing = 8.0;
    features.septaCount = 24;
    features.primaryColor = '#10b981';
    features.secondaryColor = '#059669';
    features.tentacleGlow = '#6ee7b7';
  } else if (lower.match(/massive|boulder|porites|lobe|mound|ball|rock|base|star|favites/)) {
    features.archetype = 'massive';
    features.colonyForm = 'cerioid';
    features.caliceDiameter = 1.2;
    features.caliceSpacing = 1.2;
    features.primaryColor = '#f59e0b';
    features.secondaryColor = '#d97706';
    features.tentacleGlow = '#fde68a';
  } else if (lower.match(/table|plate|turbinaria|montipora|shelf|flat|foliose|disc|pagoda/)) {
    features.archetype = 'table';
    features.colonyForm = 'foliose';
    features.primaryColor = '#a855f7';
    features.secondaryColor = '#ec4899';
    features.tentacleGlow = '#f472b6';
  }

  // Color keywords override
  if (lower.includes('orange') || lower.includes('sun') || lower.includes('fire')) {
    features.primaryColor = '#ea580c';
    features.secondaryColor = '#f97316';
    features.tentacleGlow = '#fed7aa';
  } else if (lower.includes('pink') || lower.includes('rose') || lower.includes('magenta')) {
    features.primaryColor = '#ec4899';
    features.secondaryColor = '#f472b6';
    features.tentacleGlow = '#fbcfe8';
  } else if (lower.includes('blue') || lower.includes('cyan') || lower.includes('ocean')) {
    features.primaryColor = '#06b6d4';
    features.secondaryColor = '#0284c7';
    features.tentacleGlow = '#38bdf8';
  }

  return {
    name: cleanName,
    commonName: cleanName,
    archetype: features.archetype || 'branching',
    description: `Generic phenotype approximation for unknown species: ${cleanName}.`,
    features: features,
    previewUrl: generateSpecimenSvg(cleanName, features.primaryColor, features.archetype || 'branching'),
  };
}
