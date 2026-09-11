export const CRO_TYPES = {
  ORIGINAL: 'Original CRO',
  CRO_SL: 'CRO-SL',
  MEMETIC: 'Memetic CRO',
  CCRO_QL: 'CCRO-QL'
};

export const CRO_DESCRIPTIONS = {
  [CRO_TYPES.ORIGINAL]: 'Single-layered uniform grid using fixed broadcast spawning, brooding, and predation rates. Standard discrete/continuous benchmark problems.',
  [CRO_TYPES.CRO_SL]: 'Multi-substrate grid with distinct mathematical operators per layer running simultaneously. Large-scale, complex global optimization.',
  [CRO_TYPES.MEMETIC]: 'Integrates local search adjustments on larvae before they settle. Hyperparameter tuning and neural network optimization.',
  [CRO_TYPES.CCRO_QL]: 'Uses Reinforcement Learning (Q-learning) to self-adjust operator rates in a confined boundary. Heavily restricted engineering systems (e.g., reservoir routing).'
};

export function analyzeOptimalCRO(features) {
  if (!features) return CRO_TYPES.ORIGINAL;
  
  const { morphologyType, branchingFactor = 0.5, rugosity = 0.5, fractalDimension = 1.5 } = features;
  
  // High rugosity and massive/brain shape -> CRO-SL
  if (morphologyType === 'massive' || morphologyType === 'brain' || rugosity > 0.7) {
    return CRO_TYPES.CRO_SL;
  }
  
  // High fractal dimension or branching -> Memetic CRO
  if (morphologyType === 'branching' || fractalDimension > 1.7) {
    return CRO_TYPES.MEMETIC;
  }
  
  // Table or low complexity/compact -> CCRO-QL
  if (morphologyType === 'table' || (branchingFactor < 0.3 && rugosity < 0.4)) {
    return CRO_TYPES.CCRO_QL;
  }
  
  return CRO_TYPES.ORIGINAL;
}
