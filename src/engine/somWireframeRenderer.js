import * as THREE from 'three';
import { rasterizeGeometryToGrid } from './somGeometryInterpolator';

/**
 * High-Precision Actual Geometry-Grounded Wireframe Engine for SOM Latent Morphospace
 * Generates all 100 unique cell wireframe models (10×10 grid) using both:
 *   u-axis: Volumetric blend ratio between Specimen A and Specimen B
 *   v-axis: Iso-threshold morphological modulation (dilation/erosion)
 * Each cell gets its own Marching Tetrahedra surface extraction.
 */

const bufferGeometryCache = new WeakMap();
const gridModelsCache = new WeakMap();

/**
 * Extracts normalized 3D vertices and triangular wireframe edges directly
 * from a real Three.js BufferGeometry (e.g. activeCell.geometry or geomA/geomB).
 */
export function extractEdgesFromBufferGeometry(geometry, targetEdgeCount = 220) {
  if (!geometry || !geometry.attributes?.position) return null;

  if (bufferGeometryCache.has(geometry)) {
    return bufferGeometryCache.get(geometry);
  }

  const pos = geometry.attributes.position;
  const index = geometry.index;
  const count = pos.count;
  const faceCount = index ? index.count / 3 : Math.floor(count / 3);

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox || new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.1);
  const scale = 1.55 / maxDim;

  const step = Math.max(1, Math.floor(faceCount / targetEdgeCount));
  const edges = [];
  const edgeSet = new Set();
  const usedVertIndices = new Set();

  for (let f = 0; f < faceCount; f += step) {
    const a = index ? index.getX(f * 3) : f * 3;
    const b = index ? index.getX(f * 3 + 1) : f * 3 + 1;
    const c = index ? index.getX(f * 3 + 2) : f * 3 + 2;

    const addE = (i1, i2) => {
      const k = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push([i1, i2]);
        usedVertIndices.add(i1);
        usedVertIndices.add(i2);
      }
    };
    addE(a, b);
    addE(b, c);
    addE(c, a);
  }

  // Remap used vertices into a compact array
  const vertMap = new Map();
  const verts = [];
  usedVertIndices.forEach((origIdx) => {
    vertMap.set(origIdx, verts.length);
    verts.push([
      (pos.getX(origIdx) - center.x) * scale,
      (pos.getY(origIdx) - center.y) * scale,
      (pos.getZ(origIdx) - center.z) * scale,
    ]);
  });

  const remappedEdges = edges.map(([i1, i2]) => [vertMap.get(i1), vertMap.get(i2)]);

  const result = { verts, edges: remappedEdges };
  bufferGeometryCache.set(geometry, result);
  return result;
}

/**
 * Precomputes all 100 unique Marching Tetrahedra 3D wireframe models for the full 10×10 SOM grid.
 * - u-axis (columns 0–9): Controls blend ratio between geomA and geomB densities
 * - v-axis (rows 0–9): Controls iso-threshold for morphological dilation/erosion
 * Each cell (col, row) produces a genuinely distinct wireframe silhouette.
 *
 * Returns a 10×10 2D array: gridModels[row][col] = { u, v, verts, edges }
 */
export function get10x10GridInterpolatedModels(geomA, geomB) {
  if (!geomA || !geomB) return null;

  let aMap = gridModelsCache.get(geomA);
  if (aMap && aMap.has(geomB)) {
    return aMap.get(geomB);
  }

  const res = 16;
  const fA = rasterizeGeometryToGrid(geomA, res);
  const fB = rasterizeGeometryToGrid(geomB, res);

  if (!fA || !fB) return null;

  const cubeTets = [
    [0, 5, 1, 3],
    [0, 4, 5, 3],
    [4, 6, 5, 3],
    [6, 7, 5, 3],
    [6, 2, 7, 3],
    [0, 2, 6, 3],
  ];

  const gridModels = [];

  for (let row = 0; row < 10; row++) {
    const rowModels = [];
    const v = row / 9.0;

    // v-axis morphological modulation:
    // v=0: higher threshold & slender profile (delicate branching morphology)
    // v=1: lower threshold & robust/dilated profile (dense seawall barrier)
    const isoThreshold = 0.22 + (1.0 - v) * 0.18;
    const vMorphScale = 0.88 + v * 0.24;

    for (let col = 0; col < 10; col++) {
      const u = col / 9.0;
      const wB = u;
      const wA = 1.0 - u;

      // Blend density fields from specimens A and B with row-specific modulation
      const blended = new Float32Array(res * res * res);
      for (let z = 0; z < res; z++) {
        for (let y = 0; y < res; y++) {
          const yNorm = (y / (res - 1)) * 2 - 1;
          const heightMod = 1.0 + (yNorm * (v - 0.5) * 0.25);
          for (let x = 0; x < res; x++) {
            const idx = z * res * res + y * res + x;
            const blendedVal = (fA.density[idx] * wA + fB.density[idx] * wB) * heightMod;
            blended[idx] = blendedVal;
          }
        }
      }

      // Boundary seal for watertight shell
      for (let y = 0; y < res; y++) {
        for (let x = 0; x < res; x++) {
          blended[0 * res * res + y * res + x] = 0;
          blended[(res - 1) * res * res + y * res + x] = 0;
        }
      }
      for (let z = 0; z < res; z++) {
        for (let x = 0; x < res; x++) {
          blended[z * res * res + 0 * res + x] = 0;
          blended[z * res * res + (res - 1) * res + x] = 0;
        }
      }
      for (let z = 0; z < res; z++) {
        for (let y = 0; y < res; y++) {
          blended[z * res * res + y * res + 0] = 0;
          blended[z * res * res + y * res + (res - 1)] = 0;
        }
      }

      const verts = [];
      const edges = [];
      const edgeMap = new Map();

      function interp(pA, pB, vA, vB) {
        const t = Math.max(0, Math.min(1, (isoThreshold - vA) / (vB - vA + 0.00001)));
        return [
          (pA[0] + t * (pB[0] - pA[0])) * 0.85,
          (pA[1] + t * (pB[1] - pA[1])) * 0.85 * vMorphScale,
          (pA[2] + t * (pB[2] - pA[2])) * 0.85,
        ];
      }

      function addEdge(p1, p2) {
        const k1 = `${Math.round(p1[0] * 80) / 80},${Math.round(p1[1] * 80) / 80},${Math.round(p1[2] * 80) / 80}`;
        const k2 = `${Math.round(p2[0] * 80) / 80},${Math.round(p2[1] * 80) / 80},${Math.round(p2[2] * 80) / 80}`;
        let i1 = edgeMap.get(k1);
        if (i1 === undefined) {
          i1 = verts.length;
          verts.push(p1);
          edgeMap.set(k1, i1);
        }
        let i2 = edgeMap.get(k2);
        if (i2 === undefined) {
          i2 = verts.length;
          verts.push(p2);
          edgeMap.set(k2, i2);
        }
        if (i1 !== i2) edges.push([i1, i2]);
      }

      for (let z = 0; z < res - 1; z++) {
        const z0 = (z / (res - 1)) * 2 - 1;
        const z1 = ((z + 1) / (res - 1)) * 2 - 1;
        for (let y = 0; y < res - 1; y++) {
          const y0 = (y / (res - 1)) * 2 - 1;
          const y1 = ((y + 1) / (res - 1)) * 2 - 1;
          for (let x = 0; x < res - 1; x++) {
            const x0 = (x / (res - 1)) * 2 - 1;
            const x1 = ((x + 1) / (res - 1)) * 2 - 1;

            const cornerP = [
              [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
              [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
            ];

            const cornerV = [
              blended[z * res * res + y * res + x],
              blended[z * res * res + y * res + (x + 1)],
              blended[z * res * res + (y + 1) * res + x],
              blended[z * res * res + (y + 1) * res + (x + 1)],
              blended[(z + 1) * res * res + y * res + x],
              blended[(z + 1) * res * res + y * res + (x + 1)],
              blended[(z + 1) * res * res + (y + 1) * res + x],
              blended[(z + 1) * res * res + (y + 1) * res + (x + 1)],
            ];

            for (let tIdx = 0; tIdx < 6; tIdx++) {
              const tet = cubeTets[tIdx];
              const p0 = cornerP[tet[0]], p1 = cornerP[tet[1]], p2 = cornerP[tet[2]], p3 = cornerP[tet[3]];
              const v0 = cornerV[tet[0]], v1 = cornerV[tet[1]], v2 = cornerV[tet[2]], v3 = cornerV[tet[3]];

              let mask = 0;
              if (v0 >= isoThreshold) mask |= 1;
              if (v1 >= isoThreshold) mask |= 2;
              if (v2 >= isoThreshold) mask |= 4;
              if (v3 >= isoThreshold) mask |= 8;
              if (mask === 0 || mask === 15) continue;

              const e01 = interp(p0, p1, v0, v1);
              const e02 = interp(p0, p2, v0, v2);
              const e03 = interp(p0, p3, v0, v3);
              const e12 = interp(p1, p2, v1, v2);
              const e13 = interp(p1, p3, v1, v3);
              const e23 = interp(p2, p3, v2, v3);

              const addTri = (A, B, C) => {
                addEdge(A, B);
                addEdge(B, C);
                addEdge(C, A);
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

      // Filter edges for clean, uncluttered wireframe in small cells
      const targetEdges = 190;
      const stride = Math.max(1, Math.floor(edges.length / targetEdges));
      const subEdges = [];
      for (let e = 0; e < edges.length; e += stride) {
        subEdges.push(edges[e]);
      }

      rowModels.push({ u, v, verts, edges: subEdges });
    }
    gridModels.push(rowModels);
  }

  if (!aMap) {
    aMap = new WeakMap();
    gridModelsCache.set(geomA, aMap);
  }
  aMap.set(geomB, gridModels);

  return gridModels;
}

// Backward-compatible alias: still produces column-only models for external callers
export function get10ColumnInterpolatedModels(geomA, geomB) {
  const grid = get10x10GridInterpolatedModels(geomA, geomB);
  if (!grid) return null;
  // Return row 5 (middle v) as the column strip for backward compat
  return grid[5];
}

/**
 * Draws the ACTUAL 3D interpolated geometry wireframe for cell (x, y).
 * Now looks up the per-cell model from gridModels[row][col] for truly unique wireframes.
 */
export function drawSOM3DWireframe(
  ctx,
  cx,
  cy,
  radius,
  cell,
  rotationAngles = { yaw: 0.58, pitch: 0.36 },
  displayOptions = {
    heatmapMode: 'j_eco',
    isSelected: false,
    isHovered: false,
    colorA: '#10b981',
    colorB: '#0ea5e9',
    tintWithHeatmap: false,
  },
  gridModels = null,
  activeGeometry = null
) {
  const { u, v, parameters, metrics } = cell;
  const { yaw, pitch } = rotationAngles;
  const { isSelected, isHovered, colorA, colorB, tintWithHeatmap, heatmapMode } = displayOptions;

  // 1. Determine model: if this cell is selected and has active full-resolution geometry, use it!
  let wireModel = null;
  if (isSelected && activeGeometry) {
    wireModel = extractEdgesFromBufferGeometry(activeGeometry, 220);
  }

  // 2. Look up per-cell model from the full 10×10 grid
  if (!wireModel && gridModels) {
    // 2D grid: gridModels[row][col]
    if (Array.isArray(gridModels[0])) {
      const row = gridModels[cell.y];
      if (row) wireModel = row[cell.x];
    } else if (gridModels[cell.x]) {
      // 1D column strip (backward compat)
      wireModel = gridModels[cell.x];
    }
  }

  // 3. Fallback if models still loading
  if (!wireModel || !wireModel.verts || wireModel.verts.length === 0) {
    return;
  }

  const { verts, edges } = wireModel;

  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const projectedVerts = [];
  const projScale = radius * 1.05;

  for (let i = 0; i < verts.length; i++) {
    const v3 = verts[i];
    const x3d = v3[0];
    const y3d = v3[1];
    const z3d = v3[2];

    // 3D Euler rotation
    const rotX = x3d * cosYaw - z3d * sinYaw;
    const tempZ = x3d * sinYaw + z3d * cosYaw;
    const rotY = y3d * cosPitch - tempZ * sinPitch;
    const depthZ = y3d * sinPitch + tempZ * cosPitch;

    // Screen projection
    const px = cx + rotX * projScale;
    const py = cy - rotY * projScale;

    projectedVerts.push({
      x: px,
      y: py,
      z: depthZ,
    });
  }

  // Depth sort edges for authentic 3D spatial line rendering
  const edgeList = [];
  for (let e = 0; e < edges.length; e++) {
    const [idxA, idxB] = edges[e];
    const pA = projectedVerts[idxA];
    const pB = projectedVerts[idxB];
    if (pA && pB) {
      const avgZ = (pA.z + pB.z) * 0.5;
      edgeList.push({ pA, pB, avgZ });
    }
  }
  edgeList.sort((a, b) => a.avgZ - b.avgZ);

  // Wireframe Color Interpolation
  let baseColor = colorA;
  if (tintWithHeatmap && metrics) {
    const metricVal = metrics[heatmapMode] !== undefined ? metrics[heatmapMode] : 0.5;
    baseColor = getHeatmapColor(metricVal, heatmapMode);
  } else {
    baseColor = blendColors(colorA, colorB, u);
  }

  ctx.save();

  // Draw actual 3D triangular wireframe edges
  for (let i = 0; i < edgeList.length; i++) {
    const edge = edgeList[i];
    const depthNorm = Math.max(0, Math.min(1, (edge.avgZ + 0.9) * 0.55)); // 0 (back) to 1 (front)

    // Depth cueing: front edges are glowing and sharp; rear edges are faint
    const alpha = (0.22 + depthNorm * 0.78) * (isSelected ? 1.0 : isHovered ? 0.95 : 0.88);
    const lineWidth = (isSelected ? 1.4 : isHovered ? 1.25 : 0.85) * (0.55 + depthNorm * 0.7);

    ctx.beginPath();
    ctx.moveTo(edge.pA.x, edge.pA.y);
    ctx.lineTo(edge.pB.x, edge.pB.y);

    ctx.strokeStyle = adjustColorAlpha(baseColor, alpha);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  // Front-facing vertex polyp nodules
  const dotRadius = isSelected ? 1.3 : isHovered ? 1.15 : 0.85;
  for (let i = 0; i < projectedVerts.length; i++) {
    const p = projectedVerts[i];
    if (p.z > 0.12) {
      const alpha = Math.max(0.35, Math.min(1.0, p.z * 1.15));
      ctx.fillStyle = adjustColorAlpha(isSelected ? '#ffffff' : baseColor, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotRadius * (0.7 + p.z * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function getHeatmapColor(val, mode) {
  const c = Math.max(0, Math.min(1, val));
  if (mode === 'j_eco') {
    return `hsl(${155 + c * 45}, 85%, ${38 + c * 25}%)`;
  } else if (mode === 'tau_diss') {
    return `hsl(${30 + c * 35}, 90%, ${42 + c * 20}%)`;
  } else if (mode === 'sigma_rec') {
    return `hsl(${185 + c * 35}, 85%, ${40 + c * 25}%)`;
  } else {
    return `hsl(${265 + c * 35}, 80%, ${42 + c * 25}%)`;
  }
}

function blendColors(colA, colB, t) {
  const a = hexToRgb(colA) || [16, 185, 129];
  const b = hexToRgb(colB) || [14, 165, 233];
  const r = Math.round(a[0] * (1 - t) + b[0] * t);
  const g = Math.round(a[1] * (1 - t) + b[1] * t);
  const bl = Math.round(a[2] * (1 - t) + b[2] * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  } else if (h.length === 6) {
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
  }
  return null;
}

function adjustColorAlpha(col, alpha) {
  if (col.startsWith('rgb(')) {
    return col.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  } else if (col.startsWith('hsl(')) {
    return col.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  } else if (col.startsWith('#')) {
    const rgb = hexToRgb(col);
    if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }
  return col;
}
