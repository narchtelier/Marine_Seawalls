import React from 'react';
import { Info } from 'lucide-react';

export const PARAM_DEFINITIONS = {
  morphologyType: {
    title: 'Dominant Archetype',
    description: 'Primary biological growth strategy: Branching (Acropora), Brain (Diploria meandroid), Massive (Porites boulder), or Table (Montipora fronds).',
  },
  branchingFactor: {
    title: 'Branching Factor (Bifurcation)',
    description: 'Controls 3D space-colonization apical split probability and branch density. Higher values create complex arborization.',
  },
  rugosity: {
    title: 'Surface Rugosity (Beta Slope)',
    description: 'Calculates high-frequency aragonite crystal micro-relief and texture irregularity derived from Fourier spectral power slope.',
  },
  caliceDensity: {
    title: 'Corallite Calice Pore Density',
    description: 'Spatial frequency of radial skeletal calices housing living polyp tentacles and S1/S2 septocostae micro-structures.',
  },
  meanderingFreq: {
    title: 'Meandroid Sinuosity & Valleys',
    description: 'Turing Gray-Scott reaction-diffusion wave frequency determining labyrinthine ridge and valley spacing.',
  },
  fractalDimension: {
    title: 'Fractal Dimension D (Tortuosity)',
    description: 'Scale-invariant complexity index (D ∈ [1.1, 2.0]). Quantifies surface tortuosity and habitat refugia area.',
  },
  growthScale: {
    title: 'Colony Growth Scale',
    description: 'Volumetric isometric scaling factor representing specimen maturation stage.',
  },
  primaryColor: {
    title: 'Primary Albedo',
    description: 'Dominant spectral color of the underlying calcium carbonate (CaCO3) aragonite skeleton matrix.',
  },
  tentacleGlow: {
    title: 'Polyp Fluorescence',
    description: 'Bioluminescent GFP/RFP spectral emission emitted by symbiotic zooxanthellae dinoflagellates.',
  },
  substrateType: {
    title: 'Substrate Foundation',
    description: 'Eco-engineering base attachment geometry for hydrodynamic shear stress dissipation on marine seawall modules.',
  },
  latentVector: {
    title: 'Deep Latent Activations (16D)',
    description: 'Continuous latent space embeddings extracted via MobileNetV3 deep convolutional neural network representing morphometric features.',
  },
};

export default function ParamInfo({ paramKey, title, description }) {
  const def = PARAM_DEFINITIONS[paramKey] || {
    title: title || 'Parameter Info',
    description: description || 'Morphological synthesis parameter.',
  };

  return (
    <span className="param-info-trigger" title="">
      <Info size={10} />
      <span className="param-info-popover nodrag nopan">
        <div className="param-info-title">{def.title}</div>
        <div>{def.description}</div>
      </span>
    </span>
  );
}
