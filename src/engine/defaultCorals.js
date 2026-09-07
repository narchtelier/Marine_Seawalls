// Procedural SVG-based high-detail coral references for zero-asset offline reliability

function createSvgDataUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

// Generate realistic synthetic coral reference images
export const DEFAULT_CORAL_PRESETS = [
  {
    id: 'coral-branching-acropora',
    name: 'Acropora Cervicornis (Staghorn)',
    type: 'branching',
    description: 'Arborescent hard coral with cylindrical branches, high axial corallite growth and radial budding.',
    previewUrl: createSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <radialGradient id="bg1" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#0e3a53"/>
            <stop offset="100%" stop-color="#061826"/>
          </radialGradient>
          <linearGradient id="coralBranch" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="60%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#bae6fd"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg1)"/>
        <!-- Branching Skeleton -->
        <g stroke="url(#coralBranch)" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">
          <path d="M 150 280 Q 150 210 150 170" stroke-width="26"/>
          <!-- Left Main Branch -->
          <path d="M 150 210 Q 110 180 90 120" stroke-width="18"/>
          <path d="M 115 165 Q 65 145 50 90" stroke-width="12"/>
          <path d="M 90 120 Q 80 80 85 45" stroke-width="10"/>
          <path d="M 90 120 Q 120 90 125 55" stroke-width="11"/>
          <!-- Right Main Branch -->
          <path d="M 150 190 Q 195 160 215 110" stroke-width="18"/>
          <path d="M 180 150 Q 235 130 250 80" stroke-width="12"/>
          <path d="M 215 110 Q 210 70 205 40" stroke-width="11"/>
          <path d="M 215 110 Q 245 85 255 50" stroke-width="10"/>
          <!-- Center Top Branch -->
          <path d="M 150 170 Q 145 120 150 70" stroke-width="16"/>
          <path d="M 150 120 Q 170 95 175 60" stroke-width="10"/>
          <path d="M 150 70 Q 145 45 150 30" stroke-width="9"/>
        </g>
        <!-- Radial Polyp Calices -->
        <g fill="#e0f2fe" opacity="0.85">
          <circle cx="150" cy="30" r="4"/>
          <circle cx="85" cy="45" r="4"/>
          <circle cx="125" cy="55" r="4"/>
          <circle cx="205" cy="40" r="4"/>
          <circle cx="255" cy="50" r="4"/>
          <circle cx="50" cy="90" r="3.5"/>
          <circle cx="250" cy="80" r="3.5"/>
          <circle cx="175" cy="60" r="3.5"/>
          <circle cx="140" cy="140" r="3"/>
          <circle cx="160" cy="150" r="3"/>
          <circle cx="105" cy="135" r="3"/>
          <circle cx="195" cy="130" r="3"/>
        </g>
      </svg>
    `),
    features: {
      morphologyType: 'branching',
      branchingFactor: 0.88,
      rugosity: 0.62,
      caliceDensity: 0.45,
      meanderingFreq: 0.15,
      fractalDimension: 1.82,
      axialDominance: 0.85,
      colorPalette: ['#0284c7', '#38bdf8', '#bae6fd', '#0369a1', '#f0f9ff'],
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      tentacleGlow: '#7dd3fc',
    }
  },
  {
    id: 'coral-brain-platygyra',
    name: 'Platygyra Daedalea (Brain Coral)',
    type: 'brain',
    description: 'Meandroid colony with deep continuous valleys and winding septothecal walls.',
    previewUrl: createSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <radialGradient id="bg2" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#14362b"/>
            <stop offset="100%" stop-color="#061a14"/>
          </radialGradient>
          <filter id="emboss">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#022c22"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg2)"/>
        <!-- Meandroid Valley Ridges -->
        <g stroke="#10b981" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.9" filter="url(#emboss)">
          <ellipse cx="150" cy="150" rx="110" ry="105" stroke="#059669" stroke-width="18"/>
          <path d="M 80 120 C 100 80, 130 90, 140 130 C 150 170, 120 200, 150 220 C 180 240, 210 210, 220 170" />
          <path d="M 100 160 C 80 180, 90 220, 120 220 C 140 220, 140 180, 170 170 C 200 160, 230 190, 210 230" />
          <path d="M 110 90 C 140 70, 180 80, 180 110 C 180 140, 210 130, 220 100 C 230 70, 190 60, 160 65" />
          <path d="M 65 140 C 60 110, 80 80, 110 70" />
          <path d="M 160 130 C 180 130, 190 150, 170 165 C 150 180, 160 200, 180 200" />
        </g>
        <g stroke="#34d399" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8">
          <path d="M 80 120 C 100 80, 130 90, 140 130 C 150 170, 120 200, 150 220" />
          <path d="M 110 90 C 140 70, 180 80, 180 110 C 180 140, 210 130, 220 100" />
        </g>
      </svg>
    `),
    features: {
      morphologyType: 'brain',
      branchingFactor: 0.08,
      rugosity: 0.92,
      caliceDensity: 0.28,
      meanderingFreq: 0.88,
      fractalDimension: 1.68,
      axialDominance: 0.12,
      colorPalette: ['#059669', '#10b981', '#34d399', '#064e3b', '#a7f3d0'],
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      tentacleGlow: '#6ee7b7',
    }
  },
  {
    id: 'coral-massive-porites',
    name: 'Porites Lutea (Massive Coral)',
    type: 'massive',
    description: 'Hemispherical massive boulder coral covered uniformly with microscopic closely-packed calices.',
    previewUrl: createSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <radialGradient id="bg3" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#1c0b02"/>
          </radialGradient>
          <radialGradient id="boulder" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="50%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#78350f"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg3)"/>
        <!-- Massive Boulder Base -->
        <circle cx="150" cy="150" r="105" fill="url(#boulder)"/>
        <!-- Densely packed calice stippling -->
        <g fill="#451a03" opacity="0.6">
          <circle cx="130" cy="120" r="3.5"/><circle cx="150" cy="115" r="3.5"/><circle cx="170" cy="125" r="3.5"/>
          <circle cx="120" cy="140" r="3.5"/><circle cx="140" cy="145" r="3.5"/><circle cx="165" cy="145" r="3.5"/><circle cx="185" cy="140" r="3.5"/>
          <circle cx="110" cy="165" r="3.5"/><circle cx="135" cy="170" r="3.5"/><circle cx="160" cy="170" r="3.5"/><circle cx="185" cy="165" r="3.5"/>
          <circle cx="130" cy="195" r="3.5"/><circle cx="155" cy="195" r="3.5"/><circle cx="175" cy="190" r="3.5"/>
          <circle cx="95" cy="145" r="3"/><circle cx="205" cy="150" r="3"/><circle cx="150" cy="85" r="3"/>
        </g>
      </svg>
    `),
    features: {
      morphologyType: 'massive',
      branchingFactor: 0.12,
      rugosity: 0.74,
      caliceDensity: 0.92,
      meanderingFreq: 0.22,
      fractalDimension: 1.45,
      axialDominance: 0.05,
      colorPalette: ['#d97706', '#f59e0b', '#fde047', '#78350f', '#fef3c7'],
      primaryColor: '#f59e0b',
      secondaryColor: '#d97706',
      tentacleGlow: '#fde68a',
    }
  },
  {
    id: 'coral-table-turbinaria',
    name: 'Turbinaria Mesenterina (Pagoda Table)',
    type: 'table',
    description: 'Tiered horizontal fronds and flabelliform plates engineered to intercept ambient sunlight and downwelling current.',
    previewUrl: createSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <radialGradient id="bg4" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#311042"/>
            <stop offset="100%" stop-color="#14061a"/>
          </radialGradient>
          <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899"/>
            <stop offset="70%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#4c1d95"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg4)"/>
        <!-- Pedestal -->
        <path d="M 140 260 L 160 260 L 155 200 L 145 200 Z" fill="#6d28d9"/>
        <!-- Lower Tier Shelf -->
        <ellipse cx="150" cy="205" rx="100" ry="32" fill="url(#plateGrad)" opacity="0.9"/>
        <ellipse cx="150" cy="200" rx="96" ry="28" fill="#4c1d95" opacity="0.6"/>
        <!-- Middle Tier Shelf -->
        <ellipse cx="140" cy="155" rx="85" ry="26" fill="url(#plateGrad)"/>
        <ellipse cx="140" cy="150" rx="80" ry="22" fill="#581c87" opacity="0.6"/>
        <!-- Top Tier Shelf -->
        <ellipse cx="155" cy="105" rx="65" ry="20" fill="url(#plateGrad)"/>
        <!-- Edge Frills -->
        <path d="M 55 205 Q 65 215 75 205 Q 85 215 95 205 Q 105 215 115 205 Q 125 215 135 205" stroke="#f472b6" stroke-width="3" fill="none"/>
      </svg>
    `),
    features: {
      morphologyType: 'table',
      branchingFactor: 0.35,
      rugosity: 0.58,
      caliceDensity: 0.65,
      meanderingFreq: 0.42,
      fractalDimension: 1.58,
      axialDominance: 0.40,
      colorPalette: ['#8b5cf6', '#a855f7', '#ec4899', '#581c87', '#fdf2f8'],
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      tentacleGlow: '#f472b6',
    }
  }
];
