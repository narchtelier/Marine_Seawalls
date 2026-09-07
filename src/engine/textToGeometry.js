/**
 * Parses NLP text inputs for morphological, geometrical, spatial, and ecological characteristics
 * and deterministic maps them to procedural 3D coral generation parameters.
 */

export function parseCharacteristicsToParams(texts, currentParams) {
  const params = { ...currentParams };
  
  const morphText = (texts.morphological || '').toLowerCase();
  const geoText = (texts.geometrical || '').toLowerCase();
  const spatialText = (texts.spatial || '').toLowerCase();
  const ecoText = (texts.ecological || '').toLowerCase();

  // 1. Morphological Characteristics
  if (morphText.includes('branching') || morphText.includes('staghorn') || morphText.includes('arborescent')) {
    params.morphologyType = 'branching';
    params.branchingFactor = 0.85;
  } else if (morphText.includes('brain') || morphText.includes('meandroid')) {
    params.morphologyType = 'brain';
    params.branchingFactor = 0.1;
  } else if (morphText.includes('massive') || morphText.includes('boulder')) {
    params.morphologyType = 'massive';
    params.branchingFactor = 0.05;
  } else if (morphText.includes('table') || morphText.includes('plate')) {
    params.morphologyType = 'table';
    params.branchingFactor = 0.6;
  }
  
  if (morphText.includes('high branching') || morphText.includes('dense branches')) {
    params.branchingFactor = 0.95;
  } else if (morphText.includes('low branching') || morphText.includes('sparse branches')) {
    params.branchingFactor = 0.4;
  }

  // 2. Geometrical Characteristics
  if (geoText.includes('high rugosity') || geoText.includes('very rough')) {
    params.rugosity = 0.9;
  } else if (geoText.includes('low rugosity') || geoText.includes('smooth')) {
    params.rugosity = 0.2;
  }
  
  if (geoText.includes('fractal') || geoText.includes('complex')) {
    params.fractalDimension = Math.min(2.0, (params.fractalDimension || 1.7) + 0.2);
  }
  
  if (geoText.includes('large') || geoText.includes('giant')) {
    params.growthScale = 1.5;
  } else if (geoText.includes('small') || geoText.includes('compact')) {
    params.growthScale = 0.6;
  }

  // 3. Spatial Conditions
  if (spatialText.includes('dense pores') || spatialText.includes('high calice density')) {
    params.caliceDensity = 0.9;
  } else if (spatialText.includes('sparse pores') || spatialText.includes('low calice density')) {
    params.caliceDensity = 0.2;
  }
  
  if (spatialText.includes('high sinuosity') || spatialText.includes('winding valleys')) {
    params.meanderingFreq = 0.8;
  } else if (spatialText.includes('straight valleys') || spatialText.includes('low sinuosity')) {
    params.meanderingFreq = 0.2;
  }

  // 4. Ecological Functions
  if (ecoText.includes('bioluminescent') || ecoText.includes('glowing')) {
    params.tentacleGlow = '#00ffcc';
  } else if (ecoText.includes('red fluorescence')) {
    params.tentacleGlow = '#ff0055';
  } else if (ecoText.includes('blue fluorescence')) {
    params.tentacleGlow = '#0077ff';
  }

  // Let's cap values to their sensible ranges
  params.branchingFactor = Math.min(1.0, Math.max(0.02, params.branchingFactor));
  params.rugosity = Math.min(1.0, Math.max(0.1, params.rugosity));
  params.caliceDensity = Math.min(1.0, Math.max(0.0, params.caliceDensity));
  params.meanderingFreq = Math.min(1.0, Math.max(0.05, params.meanderingFreq));
  params.fractalDimension = Math.min(2.0, Math.max(1.1, params.fractalDimension));
  params.growthScale = Math.min(1.8, Math.max(0.5, params.growthScale));

  return params;
}
