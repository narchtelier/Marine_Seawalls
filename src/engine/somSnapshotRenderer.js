/**
 * High-Performance Procedural Morphology Snapshot Renderer for SOM Latent Morphospace
 * Generates lit, depth-shaded 2.5D visual morphology snapshots of the interpolated coral specimens
 * without WebGL overhead or CPU-intensive marching tetrahedra.
 */

/**
 * Draws a single SOM cell snapshot onto a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - Target x coordinate on canvas
 * @param {number} y - Target y coordinate on canvas
 * @param {number} width - Target cell width
 * @param {number} height - Target cell height
 * @param {Object} cell - SOM cell data { u, v, weightA, weightB, parameters, metrics }
 * @param {string} displayMode - 'snapshots' | 'heatmap' | 'hybrid'
 * @param {string} heatmapMode - 'j_eco' | 'tau_diss' | 'sigma_rec' | 'phi'
 * @param {boolean} isSelected - Whether this cell is currently selected
 * @param {boolean} isHovered - Whether this cell is hovered
 */
export function drawSOMCellSnapshot(
  ctx,
  x,
  y,
  width,
  height,
  cell,
  displayMode = 'snapshots',
  heatmapMode = 'j_eco',
  isSelected = false,
  isHovered = false
) {
  if (!cell || !cell.parameters) return;

  const { u, v, weightA, weightB, parameters, metrics } = cell;
  const padding = 2;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // 1. Base Background
  const metricVal = metrics && metrics[heatmapMode] !== undefined ? metrics[heatmapMode] : 0.5;
  const heatColor = getMetricColor(metricVal, heatmapMode);

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + padding, y + padding, innerW, innerH, 4);
  ctx.clip();

  if (displayMode === 'heatmap') {
    // Pure Heatmap Mode
    ctx.fillStyle = heatColor;
    ctx.fillRect(x, y, width, height);

    // Subtle dark gradient overlay
    const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, innerW * 0.7);
    bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, width, height);
  } else {
    // Snapshots or Hybrid Mode Background
    if (displayMode === 'hybrid') {
      ctx.fillStyle = blendHexOpacity(heatColor, 0.35);
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = 'rgba(7, 15, 30, 0.65)';
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(x, y, width, height);
    }

    // Grid cell depth gradient
    const cellGrad = ctx.createLinearGradient(x, y, x, y + height);
    cellGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    cellGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = cellGrad;
    ctx.fillRect(x, y, width, height);

    // 2. Render Procedural Morphology Snapshot
    renderMorphologySilhouette(ctx, cx, cy + innerH * 0.08, innerW * 0.82, innerH * 0.82, {
      u,
      v,
      weightA,
      weightB,
      branching: parameters.branchingFactor || 0.1,
      rugosity: parameters.rugosity || 0.8,
      caliceDensity: parameters.caliceDensity || 0.4,
      meandering: parameters.meanderingFreq || 0.7,
      colorA: parameters.primaryColor || '#10b981',
      colorB: parameters.secondaryColor || '#0ea5e9',
      displayMode,
      heatColor,
    });
  }

  // 3. Selection and Hover Overlays
  if (isSelected) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fillRect(x, y, width, height);
  } else if (isHovered) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, width, height);
  }

  ctx.restore();

  // 4. Border stroke
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + padding, y + padding, innerW, innerH, 4);

  if (isSelected) {
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Corner accent dots
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + padding, y + padding, 2.5, 2.5);
    ctx.fillRect(x + padding + innerW - 2.5, y + padding, 2.5, 2.5);
    ctx.fillRect(x + padding, y + padding + innerH - 2.5, 2.5, 2.5);
    ctx.fillRect(x + padding + innerW - 2.5, y + padding + innerH - 2.5, 2.5, 2.5);
  } else if (isHovered) {
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 5;
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Procedurally draws the lit 2.5D morphology silhouette of the coral hybrid.
 */
function renderMorphologySilhouette(ctx, cx, cy, w, h, props) {
  const { u, v, branching, rugosity, caliceDensity, meandering, colorA, colorB, displayMode, heatColor } = props;

  // Blended primary color between Specimen A (emerald/green) and Specimen B (cyan/azure)
  const grad = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);

  if (displayMode === 'hybrid') {
    grad.addColorStop(0, colorA);
    grad.addColorStop(0.5, heatColor);
    grad.addColorStop(1, colorB);
  } else {
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
  }

  ctx.save();

  // Interpolation logic:
  // u close to 0: Massive mound / hemispherical brain coral with meandering sulci
  // u close to 1: High branching staghorn / dendroid arborization
  // u in between: Hybrid sub-massive with emerging vertical branches
  const moundRatio = 1.0 - Math.min(1.0, u * 1.25);
  const branchRatio = Math.max(0, (u - 0.25) / 0.75);

  const baseRadiusX = (w * 0.42) * (0.85 + moundRatio * 0.3);
  const baseRadiusY = (h * 0.38) * (0.75 + moundRatio * 0.25);

  // Draw mound / base mass
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.05, baseRadiusX, baseRadiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Branching structures emerging upwards
  if (branchRatio > 0.05) {
    const branchCount = Math.round(2 + branchRatio * 4);
    const branchHeight = h * 0.52 * branchRatio * (0.8 + rugosity * 0.3);
    const branchWidth = (w * 0.14) * (1.2 - branchRatio * 0.4);

    for (let b = 0; b < branchCount; b++) {
      const spread = (b / (branchCount - 1 || 1) - 0.5) * 2.0; // -1 to 1
      const bx = cx + spread * (baseRadiusX * 0.75);
      const by = cy + h * 0.05;
      const tipX = bx + spread * (w * 0.12);
      const tipY = cy - branchHeight * (0.85 + Math.cos(spread * 2) * 0.25);

      ctx.beginPath();
      ctx.moveTo(bx - branchWidth / 2, by);
      ctx.quadraticCurveTo(bx - branchWidth * 0.3, (by + tipY) / 2, tipX - branchWidth * 0.35, tipY);
      ctx.arc(tipX, tipY, branchWidth * 0.35, Math.PI, 0);
      ctx.quadraticCurveTo(bx + branchWidth * 0.3, (by + tipY) / 2, bx + branchWidth / 2, by);
      ctx.closePath();

      // Branch gradient with tip lighting
      const bGrad = ctx.createLinearGradient(bx, by, tipX, tipY);
      bGrad.addColorStop(0, colorA);
      bGrad.addColorStop(0.8, colorB);
      bGrad.addColorStop(1, '#e0f2fe'); // Illuminated calcifying tip
      ctx.fillStyle = bGrad;
      ctx.fill();
    }
  }

  // Meandering sulci / gyri grooves for brain coral influence (moundRatio > 0.15)
  if (moundRatio > 0.15) {
    const sulciCount = Math.round(3 + moundRatio * 4);
    ctx.strokeStyle = 'rgba(2, 44, 34, 0.55)';
    ctx.lineWidth = Math.max(1, 1.6 * (1.0 - branchRatio * 0.5));
    ctx.lineCap = 'round';

    for (let s = 0; s < sulciCount; s++) {
      const sy = cy - baseRadiusY * 0.6 + (s / (sulciCount - 1 || 1)) * baseRadiusY * 1.2;
      const rowW = Math.sqrt(Math.max(0, 1 - Math.pow((sy - (cy + h * 0.05)) / baseRadiusY, 2))) * baseRadiusX * 0.85;

      if (rowW > 3) {
        ctx.beginPath();
        const startX = cx - rowW;
        const endX = cx + rowW;
        ctx.moveTo(startX, sy);
        const midX = cx + Math.sin(s * 2.5 + v * 3) * (rowW * 0.3);
        const midY = sy + Math.cos(s * 1.8 + u * 2) * 3;
        ctx.quadraticCurveTo(midX, midY, endX, sy);
        ctx.stroke();
      }
    }
  }

  // Surface calice / corallite pore micro-stipples (porosity along v-axis)
  const poreCount = Math.round(6 + caliceDensity * 12 * (0.5 + v * 0.5));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let p = 0; p < poreCount; p++) {
    const angle = (p * 137.5) * (Math.PI / 180);
    const rad = Math.sqrt(p / poreCount) * (baseRadiusX * 0.7);
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * (rad * 0.7);
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  // Top rim specular highlight
  const specGrad = ctx.createRadialGradient(cx - baseRadiusX * 0.3, cy - baseRadiusY * 0.3, 1, cx, cy, baseRadiusX);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  specGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.05, baseRadiusX, baseRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Returns color hex for a given eco-metric score.
 */
export function getMetricColor(val = 0.5, mode = 'j_eco') {
  const clamped = Math.max(0, Math.min(1, val));
  if (mode === 'j_eco') {
    // Emerald to cyan
    const h = 155 + clamped * 45;
    return `hsl(${h}, 85%, ${35 + clamped * 25}%)`;
  } else if (mode === 'tau_diss') {
    // Amber to orange
    const h = 30 + clamped * 35;
    return `hsl(${h}, 90%, ${40 + clamped * 22}%)`;
  } else if (mode === 'sigma_rec') {
    // Teal to sky blue
    const h = 185 + clamped * 35;
    return `hsl(${h}, 85%, ${38 + clamped * 25}%)`;
  } else {
    // Porosity: Indigo to violet
    const h = 265 + clamped * 35;
    return `hsl(${h}, 80%, ${40 + clamped * 25}%)`;
  }
}

function roundRect(ctx, x, y, width, height, radius = 4) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function blendHexOpacity(color, opacity) {
  if (color.startsWith('hsl')) {
    return color.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
  }
  return color;
}
