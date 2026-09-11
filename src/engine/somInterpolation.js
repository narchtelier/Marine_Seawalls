import { DEFAULT_CORAL_PRESETS } from './defaultCorals';

/**
 * Computes a 10x10 Self-Organizing Map (SOM) latent morphospace matrix truly derived from input specimen feature extractors.
 * @param {Array} extractors - Array of feature extractor data objects { specimenName, features }
 * @returns {Array} 10x10 matrix of cell data objects containing morphometrics and eco-metrics
 */
export function generateSOMGrid(inputData = []) {
  const gridSize = 10;
  const grid = [];

  // Parse input specimens from synthesizer or direct anchors
  let specA = null;
  let specB = null;

  if (Array.isArray(inputData) && inputData.length >= 2) {
    specA = inputData[0];
    specB = inputData[1];
  } else if (inputData?.specimens && inputData.specimens.length >= 2) {
    specA = inputData.specimens[0];
    specB = inputData.specimens[1];
  } else if (Array.isArray(inputData) && inputData.length === 1) {
    specA = inputData[0];
    specB = { name: 'Acropora Reference', features: DEFAULT_CORAL_PRESETS[0].features };
  } else {
    specA = { name: 'Platygyra Brain', features: DEFAULT_CORAL_PRESETS[1].features };
    specB = { name: 'Acropora Staghorn', features: DEFAULT_CORAL_PRESETS[0].features };
  }

  const fA = specA.features || specA.parameters || DEFAULT_CORAL_PRESETS[1].features;
  const fB = specB.features || specB.parameters || DEFAULT_CORAL_PRESETS[0].features;

  for (let j = 0; j < gridSize; j++) { // y-axis (v): Structural Density / Porosity variation
    const row = [];
    const v = j / (gridSize - 1); // 0.0 to 1.0

    for (let i = 0; i < gridSize; i++) { // x-axis (u): Specimen A (0) to Specimen B (1)
      const u = i / (gridSize - 1); // 0.0 to 1.0

      // Weights for Specimen A and Specimen B
      const weightA = 1.0 - u;
      const weightB = u;

      // Base interpolation between input geometries
      const baseBranch = (fA.branchingFactor || 0.1) * weightA + (fB.branchingFactor || 0.85) * weightB;
      const baseRugo = (fA.rugosity || 0.9) * weightA + (fB.rugosity || 0.6) * weightB;
      const baseCalice = (fA.caliceDensity || 0.3) * weightA + (fB.caliceDensity || 0.5) * weightB;
      const baseMeander = (fA.meanderingFreq || 0.85) * weightA + (fB.meanderingFreq || 0.15) * weightB;
      const baseFrac = (fA.fractalDimension || 1.68) * weightA + (fB.fractalDimension || 1.82) * weightB;

      // Latent SOM axis modulation (v-axis adjusts rugosity & fine micro-porosity)
      const rugosity = Math.min(1.0, Math.max(0.1, baseRugo * (0.8 + v * 0.4)));
      const branchingFactor = Math.min(1.0, Math.max(0.05, baseBranch));
      const caliceDensity = Math.min(1.0, Math.max(0.1, baseCalice * (0.85 + (1 - v) * 0.3)));
      const meanderingFreq = Math.min(1.0, Math.max(0.05, baseMeander));
      const fractalDimension = parseFloat((baseFrac + (v - 0.5) * 0.15).toFixed(2));

      // Color interpolation across the morphospace
      const colA = fA.primaryColor || '#10b981';
      const colB = fB.primaryColor || '#0ea5e9';
      const primaryColor = u < 0.35 ? colA : u > 0.65 ? colB : '#14b8a6';

      const secA = fA.secondaryColor || '#059669';
      const secB = fB.secondaryColor || '#38bdf8';
      const secondaryColor = u < 0.5 ? secA : secB;

      const tentA = fA.tentacleGlow || '#6ee7b7';
      const tentB = fB.tentacleGlow || '#7dd3fc';
      const tentacleGlow = u < 0.5 ? tentA : tentB;

      // Morphology classification
      let morphologyType = 'hybrid';
      if (u < 0.25) morphologyType = fA.morphologyType || 'brain';
      else if (u > 0.75) morphologyType = fB.morphologyType || 'branching';
      else morphologyType = 'hybrid_mound_branch';

      const params = {
        branchingFactor: parseFloat(branchingFactor.toFixed(3)),
        rugosity: parseFloat(rugosity.toFixed(3)),
        caliceDensity: parseFloat(caliceDensity.toFixed(3)),
        meanderingFreq: parseFloat(meanderingFreq.toFixed(3)),
        fractalDimension,
        morphologyType,
        primaryColor,
        secondaryColor,
        tentacleGlow,
        weightA: parseFloat(weightA.toFixed(3)),
        weightB: parseFloat(weightB.toFixed(3)),
        growthScale: 1.0,
        specimenAName: specA.name || 'Specimen A',
        specimenBName: specB.name || 'Specimen B',
      };

      // Compute Eco-Metrics
      const metrics = computeEcoMetrics(params);

      row.push({
        x: i,
        y: j,
        u,
        v,
        weightA,
        weightB,
        parameters: params,
        metrics,
      });
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Computes ecological and biomechanical metrics based on coral morphometrics.
 * @param {Object} p - Morphometric parameters
 * @returns {Object} Metric scores [0.0 - 1.0]
 */
function computeEcoMetrics(p) {
  const tau_diss = Math.min(1.0, (p.branchingFactor * 0.5) + (p.rugosity * 0.3) + ((p.fractalDimension - 1.0) * 0.2));
  const optimalRugosity = 0.6;
  const rugoPenalty = Math.abs(p.rugosity - optimalRugosity);
  const sigma_rec = Math.max(0.0, 1.0 - (rugoPenalty * 1.5) + (p.caliceDensity * 0.2));
  const phi = Math.min(1.0, p.branchingFactor * 0.8 + (p.fractalDimension - 1.0) * 0.2);
  const structuralIntegrity = 1.0 - phi; 
  const j_eco = (tau_diss * 0.4) + (sigma_rec * 0.4) + (structuralIntegrity * 0.2);

  return {
    tau_diss: Math.max(0, Math.min(1, tau_diss)),
    sigma_rec: Math.max(0, Math.min(1, sigma_rec)),
    phi: Math.max(0, Math.min(1, phi)),
    j_eco: Math.max(0, Math.min(1, j_eco))
  };
}
