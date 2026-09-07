import { DEFAULT_CORAL_PRESETS } from './defaultCorals';

/**
 * Computes a 10x10 Self-Organizing Map (SOM) latent morphospace matrix from input extractors.
 * @param {Array} extractors - Array of feature extractor data objects { specimenName, features }
 * @returns {Array} 10x10 matrix of cell data objects containing morphometrics and eco-metrics
 */
export function generateSOMGrid(extractors = []) {
  const gridSize = 10;
  const grid = [];

  // Define 4 corner anchors from available extractors (fallback to defaults if less than 4)
  const defaultFeatures = DEFAULT_CORAL_PRESETS[0].features;
  
  const tl = extractors[0]?.features || defaultFeatures;
  const tr = extractors[1]?.features || tl;
  const bl = extractors[2]?.features || tl;
  const br = extractors[3]?.features || (extractors[2] ? extractors[1]?.features || tl : tl);

  for (let j = 0; j < gridSize; j++) { // y-axis (v)
    const row = [];
    const v = j / (gridSize - 1); // 0.0 to 1.0

    for (let i = 0; i < gridSize; i++) { // x-axis (u)
      const u = i / (gridSize - 1); // 0.0 to 1.0

      // Bilinear interpolation weights
      const wTL = (1 - u) * (1 - v);
      const wTR = u * (1 - v);
      const wBL = (1 - u) * v;
      const wBR = u * v;

      // Interpolate parameters
      const params = {
        branchingFactor: tl.branchingFactor * wTL + tr.branchingFactor * wTR + bl.branchingFactor * wBL + br.branchingFactor * wBR,
        rugosity: tl.rugosity * wTL + tr.rugosity * wTR + bl.rugosity * wBL + br.rugosity * wBR,
        caliceDensity: tl.caliceDensity * wTL + tr.caliceDensity * wTR + bl.caliceDensity * wBL + br.caliceDensity * wBR,
        meanderingFreq: tl.meanderingFreq * wTL + tr.meanderingFreq * wTR + bl.meanderingFreq * wBL + br.meanderingFreq * wBR,
        fractalDimension: (tl.fractalDimension || 1.6) * wTL + (tr.fractalDimension || 1.6) * wTR + (bl.fractalDimension || 1.6) * wBL + (br.fractalDimension || 1.6) * wBR,
        // Inherit non-numeric properties from the most dominant anchor in this cell
        morphologyType: determineDominantMorphology([
          { f: tl, w: wTL }, { f: tr, w: wTR }, { f: bl, w: wBL }, { f: br, w: wBR }
        ]),
        primaryColor: tl.primaryColor, // Simplify for grid visualization
        secondaryColor: tl.secondaryColor,
        tentacleGlow: tl.tentacleGlow,
        growthScale: 1.0,
      };

      // Compute Eco-Metrics
      const metrics = computeEcoMetrics(params);

      row.push({
        x: i,
        y: j,
        u,
        v,
        parameters: params,
        metrics,
      });
    }
    grid.push(row);
  }

  return grid;
}

function determineDominantMorphology(anchors) {
  let maxW = -1;
  let dominantType = 'branching';
  for (const anchor of anchors) {
    if (anchor.w > maxW) {
      maxW = anchor.w;
      dominantType = anchor.f.morphologyType || 'branching';
    }
  }
  return dominantType;
}

/**
 * Computes ecological and biomechanical metrics based on coral morphometrics.
 * @param {Object} p - Morphometric parameters
 * @returns {Object} Metric scores [0.0 - 1.0]
 */
function computeEcoMetrics(p) {
  // 1. Hydrodynamic Shear Dissipation (tau_diss)
  // Highly branched and rugose corals dissipate wave energy better.
  const tau_diss = Math.min(1.0, (p.branchingFactor * 0.5) + (p.rugosity * 0.3) + ((p.fractalDimension - 1.0) * 0.2));

  // 2. Larval Settlement Suitability (sigma_rec)
  // Larvae prefer moderate rugosity and calice density (too high/sharp is bad, too flat is bad).
  const optimalRugosity = 0.6;
  const rugoPenalty = Math.abs(p.rugosity - optimalRugosity);
  const sigma_rec = Math.max(0.0, 1.0 - (rugoPenalty * 1.5) + (p.caliceDensity * 0.2));

  // 3. Structural Void Ratio / Porosity (Phi)
  // Higher branching = more porous. Massive = low porosity (dense).
  const phi = Math.min(1.0, p.branchingFactor * 0.8 + (p.fractalDimension - 1.0) * 0.2);

  // 4. Eco-Engineering Fitness Index (J_eco)
  // A balanced Pareto score prioritizing high dissipation and settlement, with moderate porosity for structural integrity.
  // We penalize extreme porosity because highly branching corals are fragile in high-wave energy.
  const structuralIntegrity = 1.0 - phi; 
  const j_eco = (tau_diss * 0.4) + (sigma_rec * 0.4) + (structuralIntegrity * 0.2);

  return {
    tau_diss: Math.max(0, Math.min(1, tau_diss)),
    sigma_rec: Math.max(0, Math.min(1, sigma_rec)),
    phi: Math.max(0, Math.min(1, phi)),
    j_eco: Math.max(0, Math.min(1, j_eco))
  };
}
