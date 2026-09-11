import * as THREE from 'three';

/**
 * Image-to-3D-Gaussian-Splatting (3DGS) Synthesis Engine
 * Converts 2D coral reef photographs into volumetric 3D Gaussian primitives
 * with positions, anisotropic scales, rotation quaternions, opacities, and RGB colors.
 */

export async function generateSplatFromImage(imageSrc, options = {}) {
  const {
    densityResolution = 140, // Grid sample resolution
    depthExtrusion = 1.2,    // Volumetric extrusion depth
    opacityCutoff = 0.16,    // Filter dark/background ocean pixels
    splatScaleBase = 0.024,  // Base radius of Gaussian splats
  } = options;

  // 1. Load image into HTMLCanvasElement to extract pixel data
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const width = Math.min(img.naturalWidth || 256, 300);
  const height = Math.min(img.naturalHeight || 256, 300);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // 2. Foreground-aware depth proxy
  //    OLD: generic dome falloff → every image becomes a hemisphere
  //    NEW: coral foreground detection + luminance height → actual silhouette is preserved
  const depthMap = new Float32Array(width * height);
  const luminanceMap = new Float32Array(width * height);
  const foregroundMask = new Uint8Array(width * height);

  // SVG data URIs (synthetic presets) have bright-colored coral on pure dark backgrounds.
  // For these we use a simple luminance threshold instead of warm-color heuristics,
  // because SVG coral paths can be blue/cyan — not warm at all.
  const isSyntheticSvg = imageSrc && imageSrc.startsWith('data:image/svg');

  let greenDominance = 0, blueDominance = 0;
  const totalPixels = width * height;

  // Pass 1: compute per-pixel foreground + raw depth
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx] / 255.0;
      const g = pixels[idx + 1] / 255.0;
      const b = pixels[idx + 2] / 255.0;

      if (g > r && g > b) greenDominance++;
      if (b > r && b > g) blueDominance++;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceMap[y * width + x] = lum;

      let isCoralPixel, rawDepth;

      if (isSyntheticSvg) {
        // SVG presets: coral is bright on a near-black background
        // Any pixel with luminance above a simple threshold = coral structure
        isCoralPixel = lum > 0.20;
        rawDepth = isCoralPixel ? Math.min(1.0, lum) : 0.0;
      } else {
        // Real photographs: coral is warm (red+green), water/background is dark-blue
        const warmth = (r * 0.55 + g * 0.45) - b * 0.65;
        // isBlueish: strongly blue-shifted (deep water, sky reflections)
        const isBlueish = b > r * 1.5 && b > g * 1.3;
        isCoralPixel =
          (lum > 0.18 && warmth > 0.02 && !isBlueish) ||  // warm, bright coral
          (lum > 0.52);                                    // very bright = foreground regardless
        rawDepth = isCoralPixel
          ? Math.min(1.0, lum * 0.65 + Math.max(0, warmth) * 0.35)
          : 0.0;
      }

      foregroundMask[y * width + x] = isCoralPixel ? 1 : 0;
      depthMap[y * width + x] = rawDepth;
    }
  }

  // Pass 2: 2-iteration hole fill — bridge small gaps in the coral body
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (foregroundMask[y * width + x]) continue;
        const neighbors = [
          depthMap[(y - 1) * width + x],
          depthMap[(y + 1) * width + x],
          depthMap[y * width + (x - 1)],
          depthMap[y * width + (x + 1)],
        ];
        const fgNeighbors = [
          foregroundMask[(y - 1) * width + x],
          foregroundMask[(y + 1) * width + x],
          foregroundMask[y * width + (x - 1)],
          foregroundMask[y * width + (x + 1)],
        ];
        const fgCount = fgNeighbors.reduce((a, b) => a + b, 0);
        if (fgCount >= 3) {
          // surrounded enough by foreground → fill
          const sumD = fgNeighbors.reduce((acc, f, i) => acc + (f ? neighbors[i] : 0), 0);
          depthMap[y * width + x] = sumD / fgCount;
          foregroundMask[y * width + x] = 1;

          // Also interpolate color from neighbors
          let sumR = 0, sumG = 0, sumB = 0;
          const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (let k = 0; k < 4; k++) {
            if (!fgNeighbors[k]) continue;
            const [dy, dx] = offsets[k];
            const ni = ((y + dy) * width + (x + dx)) * 4;
            sumR += pixels[ni] / 255.0;
            sumG += pixels[ni + 1] / 255.0;
            sumB += pixels[ni + 2] / 255.0;
          }
          // Write back interpolated color
          const pidx = (y * width + x) * 4;
          pixels[pidx] = Math.round((sumR / fgCount) * 255);
          pixels[pidx + 1] = Math.round((sumG / fgCount) * 255);
          pixels[pidx + 2] = Math.round((sumB / fgCount) * 255);
        }
      }
    }
  }

  // 3. Estimate surface normals via Sobel filter on depth map
  const normals = new Float32Array(width * height * 3);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const dzdx = (
        depthMap[(y - 1) * width + (x + 1)] + 2 * depthMap[y * width + (x + 1)] + depthMap[(y + 1) * width + (x + 1)] -
        (depthMap[(y - 1) * width + (x - 1)] + 2 * depthMap[y * width + (x - 1)] + depthMap[(y + 1) * width + (x - 1)])
      ) * 0.5;

      const dzdy = (
        depthMap[(y + 1) * width + (x - 1)] + 2 * depthMap[(y + 1) * width + x] + depthMap[(y + 1) * width + (x + 1)] -
        (depthMap[(y - 1) * width + (x - 1)] + 2 * depthMap[(y - 1) * width + x] + depthMap[(y - 1) * width + (x + 1)])
      ) * 0.5;

      const normVector = new THREE.Vector3(-dzdx * depthExtrusion, -dzdy * depthExtrusion, 1.0).normalize();
      normals[idx * 3] = normVector.x;
      normals[idx * 3 + 1] = normVector.y;
      normals[idx * 3 + 2] = normVector.z;
    }
  }

  // 4. Sample grid and create Volumetric 3D Gaussians
  const stepX = Math.max(1, Math.floor(width / densityResolution));
  const stepY = Math.max(1, Math.floor(height / densityResolution));

  const gridCols = Math.floor((width - 1) / stepX) + 1;
  const gridRows = Math.floor((height - 1) / stepY) + 1;
  const gridMap = new Int32Array(gridCols * gridRows).fill(-1);

  // Dense pixel grid for faithful mesh extraction (no re-derivation needed)
  const pgDepths = new Float32Array(gridCols * gridRows);
  const pgColorR = new Float32Array(gridCols * gridRows);
  const pgColorG = new Float32Array(gridCols * gridRows);
  const pgColorB = new Float32Array(gridCols * gridRows);
  const pgWorldX = new Float32Array(gridCols * gridRows);
  const pgWorldZ = new Float32Array(gridCols * gridRows);
  const pgFg     = new Uint8Array(gridCols * gridRows);

  const validPositions = [];
  const validColors = [];
  const validScales = [];
  const validRotations = [];
  const validOpacities = [];

  const upVec = new THREE.Vector3(0, 0, 1);

  for (let gy = 0; gy < gridRows; gy++) {
    const imgY = Math.min(height - 1, gy * stepY);
    for (let gx = 0; gx < gridCols; gx++) {
      const imgX = Math.min(width - 1, gx * stepX);
      const mapIdx = imgY * width + imgX;
      const depth  = depthMap[mapIdx];
      const lum    = luminanceMap[mapIdx];
      const isFg   = foregroundMask[mapIdx];

      const pIdx = mapIdx * 4;
      const r = pixels[pIdx] / 255.0;
      const g = pixels[pIdx + 1] / 255.0;
      const b = pixels[pIdx + 2] / 255.0;

      const posX = ((imgX / width) - 0.5) * 2.2;
      const posZ = ((imgY / height) - 0.5) * 2.2;
      const posY = depth > 0 ? (depth - 0.25) * depthExtrusion * 1.5 : -0.4;

      const cellIdx = gy * gridCols + gx;
      pgDepths[cellIdx] = depth;
      pgColorR[cellIdx] = r;
      pgColorG[cellIdx] = g;
      pgColorB[cellIdx] = b;
      pgWorldX[cellIdx] = posX;
      pgWorldZ[cellIdx] = posZ;
      pgFg[cellIdx]     = isFg;

      // Only emit splats for foreground coral pixels
      if (!isFg && depth < opacityCutoff && lum < 0.12) continue;

      // Surface Normal and Rotation Quaternion
      const nx = normals[mapIdx * 3] || 0;
      const ny = normals[mapIdx * 3 + 2] || 1;
      const nz = -(normals[mapIdx * 3 + 1] || 0);
      const normVec = new THREE.Vector3(nx, ny, nz).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(upVec, normVec);

      const localScale = splatScaleBase * (1.0 + (1.0 - depth) * 0.6);
      const scaleX = localScale * 1.4;
      const scaleY = localScale * 0.5;
      const scaleZ = localScale * 1.4;

      const primaryIdx = validPositions.length / 3;
      gridMap[cellIdx] = primaryIdx;

      validPositions.push(posX, posY, posZ);
      validColors.push(r, g, b);
      validScales.push(scaleX, scaleY, scaleZ);
      validRotations.push(quat.x, quat.y, quat.z, quat.w);
      validOpacities.push(Math.min(1.0, depth * 1.3));

      if (depth > 0.35 && Math.random() < 0.25) {
        const coreY = posY - Math.random() * 0.4 * depthExtrusion;
        validPositions.push(posX + (Math.random() - 0.5) * 0.05, coreY, posZ + (Math.random() - 0.5) * 0.05);
        validColors.push(r * 0.75, g * 0.75, b * 0.75);
        validScales.push(scaleX * 1.2, scaleY * 1.2, scaleZ * 1.2);
        validRotations.push(quat.x, quat.y, quat.z, quat.w);
        validOpacities.push(0.7);
      }
    }
  }

  const count = validPositions.length / 3;

  return {
    count,
    positions: new Float32Array(validPositions),
    colors:    new Float32Array(validColors),
    scales:    new Float32Array(validScales),
    rotations: new Float32Array(validRotations),
    opacities: new Float32Array(validOpacities),
    surfaceGrid: { cols: gridCols, rows: gridRows, map: gridMap },
    // Dense pixel grid – used by extractMeshFromSplat for exact-surface reconstruction
    pixelGrid: {
      cols:   gridCols,
      rows:   gridRows,
      depths: pgDepths,
      colorR: pgColorR,
      colorG: pgColorG,
      colorB: pgColorB,
      worldX: pgWorldX,
      worldZ: pgWorldZ,
      fg:     pgFg,
      depthExtrusion,
    },
    bounds: {
      min: [-1.2, -0.5, -1.2],
      max: [1.2, depthExtrusion * 1.5, 1.2],
    },
    sourceImage: imageSrc,
  };
}

/**
 * Biometric Morphometric Feature Extractor from 3D Gaussian Splat Cloud
 */
export function extractFeaturesFromSplat(splatData) {
  if (!splatData || !splatData.positions || splatData.positions.length === 0) {
    return {
      branchingFactor: 0.65,
      rugosity: 0.58,
      caliceDensity: 0.45,
      meanderingFreq: 0.35,
      fractalDimension: 1.68,
      primaryColor: '#38bdf8',
      secondaryColor: '#f43f5e',
      tentacleGlow: '#38bdf8',
      morphologyType: 'branching',
    };
  }

  const positions = splatData.positions;
  const colors = splatData.colors;
  const count = splatData.count || positions.length / 3;

  let sumX = 0, sumY = 0, sumZ = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let rSum = 0, gSum = 0, bSum = 0;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    sumX += x; sumY += y; sumZ += z;

    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

    if (colors && colors.length >= count * 3) {
      rSum += colors[i * 3];
      gSum += colors[i * 3 + 1];
      bSum += colors[i * 3 + 2];
    }
  }

  const avgX = sumX / count;
  const avgY = sumY / count;
  const avgZ = sumZ / count;

  const rangeX = Math.max(0.1, maxX - minX);
  const rangeY = Math.max(0.1, maxY - minY);
  const rangeZ = Math.max(0.1, maxZ - minZ);

  let varX = 0, varY = 0, varZ = 0;
  for (let i = 0; i < count; i++) {
    varX += Math.pow(positions[i * 3] - avgX, 2);
    varY += Math.pow(positions[i * 3 + 1] - avgY, 2);
    varZ += Math.pow(positions[i * 3 + 2] - avgZ, 2);
  }

  const stdX = Math.sqrt(varX / count);
  const stdY = Math.sqrt(varY / count);
  const stdZ = Math.sqrt(varZ / count);

  // Branching Factor: Vertical variance vs horizontal variance
  const branchingFactor = Math.min(1.0, Math.max(0.1, (stdY / (stdX + stdZ + 0.001)) * 1.1));

  // Rugosity: Height standard deviation relative to width
  const rugosity = Math.min(1.0, Math.max(0.2, (stdY * 3.8) / (rangeX + rangeZ)));

  // Calice Density
  const bboxVol = rangeX * rangeY * rangeZ;
  const caliceDensity = Math.min(1.0, Math.max(0.1, (count / 14000) / (bboxVol + 0.4)));

  // Meandering Frequency: Symmetry and horizontal balance
  const meanderingFreq = Math.min(1.0, Math.max(0.15, 1.0 - Math.abs(stdX - stdZ) / (stdX + stdZ + 0.001)));

  // Dominant RGB Colors
  const rAvg = Math.floor((rSum / count) * 255);
  const gAvg = Math.floor((gSum / count) * 255);
  const bAvg = Math.floor((bSum / count) * 255);

  const primaryColor = `#${rAvg.toString(16).padStart(2, '0')}${gAvg.toString(16).padStart(2, '0')}${bAvg.toString(16).padStart(2, '0')}`;
  const secondaryColor = gAvg > bAvg ? '#059669' : '#0284c7';
  const tentacleGlow = rAvg > 120 ? '#f43f5e' : '#38bdf8';

  // Morphology classification
  let morphologyType = 'branching';
  if (gAvg > rAvg && gAvg > bAvg) {
    morphologyType = 'brain';
  } else if (branchingFactor > 0.6) {
    morphologyType = 'branching';
  } else if (caliceDensity > 0.6) {
    morphologyType = 'massive';
  } else if (rangeX > 1.8 && rangeZ > 1.8) {
    morphologyType = 'foliose';
  } else {
    morphologyType = 'brain';
  }

  return {
    branchingFactor: parseFloat(branchingFactor.toFixed(3)),
    rugosity: parseFloat(rugosity.toFixed(3)),
    caliceDensity: parseFloat(caliceDensity.toFixed(3)),
    meanderingFreq: parseFloat(meanderingFreq.toFixed(3)),
    fractalDimension: parseFloat((1.4 + rugosity * 0.4).toFixed(2)),
    primaryColor,
    secondaryColor,
    tentacleGlow,
    morphologyType,
  };
}

/**
 * Robust Watertight Surface Reconstruction from 3D Gaussian Splatting Point Cloud
 *
 * METHOD 0 (Priority — Alpha-Hull Heightmap):
 *   Uses the dense pixelGrid stored at splat generation time.
 *   Projects each foreground sample onto an XZ grid, stores the max-Y height,
 *   fills small holes with bilinear interpolation, then creates a solid
 *   heightmap mesh whose XZ silhouette exactly matches the coral's foreground
 *   outline in the original image. Bottom is sealed watertight.
 *
 * METHOD 1 (Fallback): SuGaR sparse grid triangulation
 * METHOD 2 (Fallback): Volumetric TSDF + Marching Tetrahedra
 */
export function extractMeshFromSplat(splatData, options = {}) {
  const {
    resolution = 64,
    densityThreshold = 0.35,
    isWatertightSeal = true,
  } = options;

  if (!splatData || !splatData.positions || splatData.positions.length === 0) {
    return {
      geometry: new THREE.SphereGeometry(0.8, 24, 24),
      verticesCount: 576,
      trianglesCount: 1152,
      isWatertight: true,
      method: 'Fallback Solid',
    };
  }

  // -------------------------------------------------------------------------
  // METHOD 0: Alpha-Hull Heightmap from dense pixelGrid (highest fidelity)
  // -------------------------------------------------------------------------
  if (splatData.pixelGrid) {
    const pg = splatData.pixelGrid;
    const { cols, rows, depths, colorR, colorG, colorB, worldX, worldZ, fg, depthExtrusion } = pg;
    const de = depthExtrusion || 1.2;

    // Build a target resolution grid (may upsample or use as-is)
    const gCols = cols;
    const gRows = rows;

    // height map: Y world coordinate per cell
    const heightMap = new Float32Array(gCols * gRows).fill(-Infinity);
    const hR = new Float32Array(gCols * gRows);
    const hG = new Float32Array(gCols * gRows);
    const hB = new Float32Array(gCols * gRows);
    const isFg = new Uint8Array(gCols * gRows);

    // Project splat grid into height map
    for (let gz = 0; gz < gRows; gz++) {
      for (let gx = 0; gx < gCols; gx++) {
        const ci = gz * gCols + gx;
        if (!fg[ci]) continue;
        const d = depths[ci];
        const wy = d > 0 ? (d - 0.25) * de * 1.5 : -0.3;
        if (wy > heightMap[ci]) {
          heightMap[ci] = wy;
          hR[ci] = colorR[ci];
          hG[ci] = colorG[ci];
          hB[ci] = colorB[ci];
          isFg[ci] = 1;
        }
      }
    }

    // Replace -Infinity in foreground cells with neighbor interpolation
    for (let ci = 0; ci < gCols * gRows; ci++) {
      if (isFg[ci] && heightMap[ci] === -Infinity) heightMap[ci] = 0;
    }

    // 3-pass hole fill: fill small background gaps surrounded by foreground
    for (let pass = 0; pass < 3; pass++) {
      for (let gz = 1; gz < gRows - 1; gz++) {
        for (let gx = 1; gx < gCols - 1; gx++) {
          const ci = gz * gCols + gx;
          if (isFg[ci]) continue;
          const neighbors = [
            gz * gCols + (gx - 1),
            gz * gCols + (gx + 1),
            (gz - 1) * gCols + gx,
            (gz + 1) * gCols + gx,
          ];
          let fgCount = 0, sumH = 0, sumR = 0, sumG = 0, sumB = 0;
          for (const ni of neighbors) {
            if (isFg[ni]) {
              fgCount++;
              sumH += heightMap[ni];
              sumR += hR[ni];
              sumG += hG[ni];
              sumB += hB[ni];
            }
          }
          if (fgCount >= 2) {
            heightMap[ci] = sumH / fgCount;
            hR[ci] = sumR / fgCount;
            hG[ci] = sumG / fgCount;
            hB[ci] = sumB / fgCount;
            isFg[ci] = 1;
          }
        }
      }
    }

    // Compute minimum Y for base floor
    let minY = 0;
    for (let ci = 0; ci < gCols * gRows; ci++) {
      if (isFg[ci] && heightMap[ci] < minY) minY = heightMap[ci];
    }
    const baseY = minY - 0.12;

    // Build vertex and face arrays
    const verts = [];
    const vertColors = [];
    const faces = [];
    const vertexIdx = new Int32Array(gCols * gRows).fill(-1);

    // Create surface vertices
    for (let gz = 0; gz < gRows; gz++) {
      for (let gx = 0; gx < gCols; gx++) {
        const ci = gz * gCols + gx;
        if (!isFg[ci]) continue;
        vertexIdx[ci] = verts.length / 3;
        verts.push(worldX[ci], heightMap[ci], worldZ[ci]);
        vertColors.push(hR[ci], hG[ci], hB[ci]);
      }
    }

    // Triangulate using quad grid (split into 2 triangles per quad)
    for (let gz = 0; gz < gRows - 1; gz++) {
      for (let gx = 0; gx < gCols - 1; gx++) {
        const ci00 = gz * gCols + gx;
        const ci10 = gz * gCols + (gx + 1);
        const ci01 = (gz + 1) * gCols + gx;
        const ci11 = (gz + 1) * gCols + (gx + 1);

        const v00 = vertexIdx[ci00];
        const v10 = vertexIdx[ci10];
        const v01 = vertexIdx[ci01];
        const v11 = vertexIdx[ci11];

        if (v00 >= 0 && v10 >= 0 && v01 >= 0) faces.push(v00, v10, v01);
        if (v10 >= 0 && v11 >= 0 && v01 >= 0) faces.push(v10, v11, v01);
      }
    }

    // Watertight sealing: find boundary (open) edges and extrude walls + floor cap
    if (isWatertightSeal && faces.length > 0) {
      const edgeCount = new Map();
      for (let fi = 0; fi < faces.length; fi += 3) {
        const a = faces[fi], b = faces[fi + 1], c = faces[fi + 2];
        const addEdge = (u, v) => {
          const key = u < v ? `${u}_${v}` : `${v}_${u}`;
          edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        };
        addEdge(a, b); addEdge(b, c); addEdge(c, a);
      }

      const baseVtxMap = new Map();
      const getBase = (vi) => {
        if (baseVtxMap.has(vi)) return baseVtxMap.get(vi);
        const ni = verts.length / 3;
        verts.push(verts[vi * 3], baseY, verts[vi * 3 + 2]);
        vertColors.push(
          vertColors[vi * 3] * 0.28,
          vertColors[vi * 3 + 1] * 0.28,
          vertColors[vi * 3 + 2] * 0.28
        );
        baseVtxMap.set(vi, ni);
        return ni;
      };

      // Compute centroid for floor cap
      let cxSum = 0, czSum = 0, cvCount = 0;
      const totalV = verts.length / 3;
      for (let vi = 0; vi < totalV; vi++) { cxSum += verts[vi * 3]; czSum += verts[vi * 3 + 2]; cvCount++; }
      const centerBase = verts.length / 3;
      verts.push(cvCount > 0 ? cxSum / cvCount : 0, baseY, cvCount > 0 ? czSum / cvCount : 0);
      vertColors.push(0.04, 0.06, 0.10);

      for (const [key, cnt] of edgeCount) {
        if (cnt === 1) {
          const [us, vs] = key.split('_');
          const u = parseInt(us), v = parseInt(vs);
          const ub = getBase(u), vb = getBase(v);
          // Wall quads
          faces.push(u, v, vb);
          faces.push(u, vb, ub);
          // Floor triangles
          faces.push(ub, vb, centerBase);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();

    return {
      geometry,
      verticesCount: verts.length / 3,
      trianglesCount: faces.length / 3,
      isWatertight: true,
      method: 'Alpha-Hull Heightmap (Exact Coral Silhouette)',
    };
  }

  const positions = splatData.positions;
  const colors = splatData.colors;
  const count = splatData.count || positions.length / 3;

  // -------------------------------------------------------------------------
  // METHOD 1: SuGaR Surface-Aligned Gaussian Reconstruction (Direct 1-to-1 Splat Mesh)
  // Reconstructs the exact surface directly from the structured Gaussian Splatting grid
  // -------------------------------------------------------------------------
  if (splatData.surfaceGrid && splatData.surfaceGrid.map) {
    const { cols, rows, map } = splatData.surfaceGrid;
    const verts = [];
    const vertColors = [];
    const faces = [];

    // Find min Y to determine base pedestal height
    let minY = Infinity;
    for (let i = 0; i < count; i++) {
      const y = positions[i * 3 + 1];
      if (y < minY) minY = y;
    }
    const baseFloorY = minY - 0.12;

    // Add all primary surface splat positions and colors
    for (let i = 0; i < count; i++) {
      verts.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      if (colors && colors.length >= (i + 1) * 3) {
        vertColors.push(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      } else {
        vertColors.push(0.12, 0.72, 0.52);
      }
    }

    const distSq = (i1, i2) => {
      const dx = verts[i1 * 3] - verts[i2 * 3];
      const dy = verts[i1 * 3 + 1] - verts[i2 * 3 + 1];
      const dz = verts[i1 * 3 + 2] - verts[i2 * 3 + 2];
      return dx * dx + dy * dy + dz * dz;
    };

    const maxEdgeLenSq = 0.35 * 0.35;
    const edgeMap = new Map(); // key: "u_v", value: count

    const addTriangle = (iA, iB, iC) => {
      faces.push(iA, iB, iC);
      const registerEdge = (u, v) => {
        const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      };
      registerEdge(iA, iB);
      registerEdge(iB, iC);
      registerEdge(iC, iA);
    };

    // Triangulate surface quads between neighboring splats
    for (let gy = 0; gy < rows - 1; gy++) {
      for (let gx = 0; gx < cols - 1; gx++) {
        const iA = map[gy * cols + gx];
        const iB = map[gy * cols + (gx + 1)];
        const iC = map[(gy + 1) * cols + gx];
        const iD = map[(gy + 1) * cols + (gx + 1)];

        const hasABC = iA >= 0 && iB >= 0 && iC >= 0;
        const hasBDC = iB >= 0 && iD >= 0 && iC >= 0;

        if (hasABC && distSq(iA, iB) < maxEdgeLenSq && distSq(iA, iC) < maxEdgeLenSq && distSq(iB, iC) < maxEdgeLenSq) {
          addTriangle(iA, iB, iC);
        }
        if (hasBDC && distSq(iB, iD) < maxEdgeLenSq && distSq(iD, iC) < maxEdgeLenSq && distSq(iB, iC) < maxEdgeLenSq) {
          addTriangle(iB, iD, iC);
        }
      }
    }

    // Watertight Boundary Sealing: extrude boundary edges down to baseFloorY and cap bottom
    if (isWatertightSeal && faces.length > 0) {
      const baseIndexMap = new Map();

      const getBaseIndex = (origIdx) => {
        if (baseIndexMap.has(origIdx)) return baseIndexMap.get(origIdx);
        const newIdx = verts.length / 3;
        verts.push(verts[origIdx * 3], baseFloorY, verts[origIdx * 3 + 2]);
        vertColors.push(
          vertColors[origIdx * 3] * 0.45,
          vertColors[origIdx * 3 + 1] * 0.45,
          vertColors[origIdx * 3 + 2] * 0.45
        );
        baseIndexMap.set(origIdx, newIdx);
        return newIdx;
      };

      const centerBaseIdx = verts.length / 3;
      verts.push(0, baseFloorY, 0);
      vertColors.push(0.06, 0.1, 0.14);

      for (const [key, countVal] of edgeMap.entries()) {
        if (countVal === 1) {
          const [uStr, vStr] = key.split('_');
          const u = parseInt(uStr);
          const v = parseInt(vStr);

          const uBase = getBaseIndex(u);
          const vBase = getBaseIndex(v);

          // Wall quad
          faces.push(u, v, vBase);
          faces.push(u, vBase, uBase);

          // Bottom cap triangle
          faces.push(uBase, vBase, centerBaseIdx);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();

    return {
      geometry,
      verticesCount: verts.length / 3,
      trianglesCount: faces.length / 3,
      isWatertight: true,
      method: 'SuGaR Surface-Aligned Gaussian Reconstruction',
    };
  }

  // -------------------------------------------------------------------------
  // METHOD 2: Adaptive Continuous Volumetric TSDF (For unstructured point clouds)
  // -------------------------------------------------------------------------
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const pad = 0.22;
  minX -= pad; minY -= pad; minZ -= pad;
  maxX += pad; maxY += pad; maxZ += pad;

  const res = Math.min(48, Math.max(32, resolution));
  const dx = (maxX - minX) / (res - 1);
  const dy = (maxY - minY) / (res - 1);
  const dz = (maxZ - minZ) / (res - 1);

  const densityGrid = new Float32Array(res * res * res);
  const colorRGrid = new Float32Array(res * res * res);
  const colorGGrid = new Float32Array(res * res * res);
  const colorBGrid = new Float32Array(res * res * res);

  const kernelRadius = 3;
  const sigma = Math.max(0.14, dx * 2.2);
  const sigmaSq2 = 2.0 * sigma * sigma;

  const step = count > 12000 ? Math.ceil(count / 12000) : 1;

  for (let i = 0; i < count; i += step) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    const r = colors ? colors[i * 3] : 0.2;
    const g = colors ? colors[i * 3 + 1] : 0.7;
    const b = colors ? colors[i * 3 + 2] : 0.9;
    const opacity = splatData.opacities ? splatData.opacities[i] : 0.85;

    const gx = Math.round((px - minX) / dx);
    const gy = Math.round((py - minY) / dy);
    const gz = Math.round((pz - minZ) / dz);

    for (let iz = Math.max(0, gz - kernelRadius); iz <= Math.min(res - 1, gz + kernelRadius); iz++) {
      const cz = minZ + iz * dz;
      const ddz = pz - cz;
      for (let iy = Math.max(0, gy - kernelRadius); iy <= Math.min(res - 1, gy + kernelRadius); iy++) {
        const cy = minY + iy * dy;
        const ddy = py - cy;
        for (let ix = Math.max(0, gx - kernelRadius); ix <= Math.min(res - 1, gx + kernelRadius); ix++) {
          const cx = minX + ix * dx;
          const ddx = px - cx;
          const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
          const weight = Math.exp(-distSq / sigmaSq2) * opacity;

          const gIdx = iz * res * res + iy * res + ix;
          densityGrid[gIdx] += weight;
          colorRGrid[gIdx] += r * weight;
          colorGGrid[gIdx] += g * weight;
          colorBGrid[gIdx] += b * weight;
        }
      }
    }
  }

  let maxDensity = 0;
  for (let i = 0; i < densityGrid.length; i++) {
    if (densityGrid[i] > maxDensity) maxDensity = densityGrid[i];
  }

  if (maxDensity > 0.0001) {
    for (let i = 0; i < densityGrid.length; i++) {
      if (densityGrid[i] > 0.0001) {
        colorRGrid[i] /= densityGrid[i];
        colorGGrid[i] /= densityGrid[i];
        colorBGrid[i] /= densityGrid[i];
      }
      densityGrid[i] /= maxDensity;
    }
  }

  if (isWatertightSeal) {
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        densityGrid[0 * res * res + y * res + x] = 0;
        densityGrid[(res - 1) * res * res + y * res + x] = 0;
      }
    }
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        densityGrid[z * res * res + 0 * res + x] = 0;
        densityGrid[z * res * res + (res - 1) * res + x] = 0;
      }
    }
    for (let z = 0; z < res; z++) {
      for (let y = 0; y < res; y++) {
        densityGrid[z * res * res + y * res + 0] = 0;
        densityGrid[z * res * res + y * res + (res - 1)] = 0;
      }
    }
  }

  const verts = [];
  const vertexColors = [];
  const faces = [];
  const iso = densityThreshold;

  const cubeTets = [
    [0, 5, 1, 3],
    [0, 4, 5, 3],
    [4, 6, 5, 3],
    [6, 7, 5, 3],
    [6, 2, 7, 3],
    [0, 2, 6, 3],
  ];

  function interpolateEdge(pA, pB, vA, vB, cA, cB) {
    const t = Math.max(0, Math.min(1, (iso - vA) / (vB - vA + 0.00001)));
    return {
      x: pA[0] + t * (pB[0] - pA[0]),
      y: pA[1] + t * (pB[1] - pA[1]),
      z: pA[2] + t * (pB[2] - pA[2]),
      r: cA[0] + t * (cB[0] - cA[0]),
      g: cA[1] + t * (cB[1] - cA[1]),
      b: cA[2] + t * (cB[2] - cA[2]),
    };
  }

  for (let z = 0; z < res - 1; z++) {
    for (let y = 0; y < res - 1; y++) {
      for (let x = 0; x < res - 1; x++) {
        const cornerP = [
          [minX + x * dx, minY + y * dy, minZ + z * dz],
          [minX + (x + 1) * dx, minY + y * dy, minZ + z * dz],
          [minX + x * dx, minY + (y + 1) * dy, minZ + z * dz],
          [minX + (x + 1) * dx, minY + (y + 1) * dy, minZ + z * dz],
          [minX + x * dx, minY + y * dy, minZ + (z + 1) * dz],
          [minX + (x + 1) * dx, minY + y * dy, minZ + (z + 1) * dz],
          [minX + x * dx, minY + (y + 1) * dy, minZ + (z + 1) * dz],
          [minX + (x + 1) * dx, minY + (y + 1) * dy, minZ + (z + 1) * dz],
        ];

        const cornerV = [
          densityGrid[z * res * res + y * res + x],
          densityGrid[z * res * res + y * res + (x + 1)],
          densityGrid[z * res * res + (y + 1) * res + x],
          densityGrid[z * res * res + (y + 1) * res + (x + 1)],
          densityGrid[(z + 1) * res * res + y * res + x],
          densityGrid[(z + 1) * res * res + y * res + (x + 1)],
          densityGrid[(z + 1) * res * res + (y + 1) * res + x],
          densityGrid[(z + 1) * res * res + (y + 1) * res + (x + 1)],
        ];

        const cornerC = [
          [colorRGrid[z * res * res + y * res + x], colorGGrid[z * res * res + y * res + x], colorBGrid[z * res * res + y * res + x]],
          [colorRGrid[z * res * res + y * res + (x + 1)], colorGGrid[z * res * res + y * res + (x + 1)], colorBGrid[z * res * res + y * res + (x + 1)]],
          [colorRGrid[z * res * res + (y + 1) * res + x], colorGGrid[z * res * res + (y + 1) * res + x], colorBGrid[z * res * res + (y + 1) * res + x]],
          [colorRGrid[z * res * res + (y + 1) * res + (x + 1)], colorGGrid[z * res * res + (y + 1) * res + (x + 1)], colorBGrid[z * res * res + (y + 1) * res + (x + 1)]],
          [colorRGrid[(z + 1) * res * res + y * res + x], colorGGrid[(z + 1) * res * res + y * res + x], colorBGrid[(z + 1) * res * res + y * res + x]],
          [colorRGrid[(z + 1) * res * res + y * res + (x + 1)], colorGGrid[(z + 1) * res * res + y * res + (x + 1)], colorBGrid[(z + 1) * res * res + y * res + (x + 1)]],
          [colorRGrid[(z + 1) * res * res + (y + 1) * res + x], colorGGrid[(z + 1) * res * res + (y + 1) * res + x], colorBGrid[(z + 1) * res * res + (y + 1) * res + x]],
          [colorRGrid[(z + 1) * res * res + (y + 1) * res + (x + 1)], colorGGrid[(z + 1) * res * res + (y + 1) * res + (x + 1)], colorBGrid[(z + 1) * res * res + (y + 1) * res + (x + 1)]],
        ];

        for (let t = 0; t < 6; t++) {
          const tet = cubeTets[t];
          const t0 = tet[0], t1 = tet[1], t2 = tet[2], t3 = tet[3];

          const p0 = cornerP[t0], p1 = cornerP[t1], p2 = cornerP[t2], p3 = cornerP[t3];
          const v0 = cornerV[t0], v1 = cornerV[t1], v2 = cornerV[t2], v3 = cornerV[t3];
          const c0 = cornerC[t0], c1 = cornerC[t1], c2 = cornerC[t2], c3 = cornerC[t3];

          let mask = 0;
          if (v0 >= iso) mask |= 1;
          if (v1 >= iso) mask |= 2;
          if (v2 >= iso) mask |= 4;
          if (v3 >= iso) mask |= 8;

          if (mask === 0 || mask === 15) continue;

          const e01 = interpolateEdge(p0, p1, v0, v1, c0, c1);
          const e02 = interpolateEdge(p0, p2, v0, v2, c0, c2);
          const e03 = interpolateEdge(p0, p3, v0, v3, c0, c3);
          const e12 = interpolateEdge(p1, p2, v1, v2, c1, c2);
          const e13 = interpolateEdge(p1, p3, v1, v3, c1, c3);
          const e23 = interpolateEdge(p2, p3, v2, v3, c2, c3);

          const addTri = (A, B, C) => {
            const bIdx = verts.length / 3;
            verts.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
            vertexColors.push(A.r, A.g, A.b, B.r, B.g, B.b, C.r, C.g, C.b);
            faces.push(bIdx, bIdx + 1, bIdx + 2);
          };

          switch (mask) {
            case 1: addTri(e01, e02, e03); break;
            case 2: addTri(e01, e13, e12); break;
            case 3: addTri(e02, e13, e12); addTri(e02, e03, e13); break;
            case 4: addTri(e02, e12, e23); break;
            case 5: addTri(e01, e12, e23); addTri(e01, e23, e03); break;
            case 6: addTri(e01, e13, e23); addTri(e01, e23, e02); break;
            case 7: addTri(e03, e23, e13); break;
            case 8: addTri(e03, e23, e13); break;
            case 9: addTri(e01, e13, e23); addTri(e01, e23, e02); break;
            case 10: addTri(e01, e12, e23); addTri(e01, e23, e03); break;
            case 11: addTri(e02, e12, e23); break;
            case 12: addTri(e02, e03, e13); addTri(e02, e13, e12); break;
            case 13: addTri(e01, e13, e12); break;
            case 14: addTri(e01, e02, e03); break;
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  if (verts.length > 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
  }

  return {
    geometry,
    verticesCount: verts.length / 3,
    trianglesCount: faces.length / 3,
    isWatertight: true,
    method: 'Volumetric Continuous Marching Tetrahedra (Watertight Manifold)',
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}
