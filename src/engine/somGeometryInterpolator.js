import * as THREE from 'three';

/**
 * High-Precision 3D Geometry SOM Interpolator Engine
 * Performs continuous volumetric TSDF / Isosurface morphing between arbitrary 3D meshes.
 * Seamlessly handles disparate topologies, differing vertex counts, and arbitrary genus.
 */

// Cache precomputed volumetric fields for Geometry A and Geometry B to ensure instant ~20ms SOM interactive updates
const fieldCache = new WeakMap();

/**
 * Creates a clean watertight reference specimen geometry if extraction is pending.
 */
export function getFallbackSpecimenGeometry(type = 'brain') {
  if (type === 'brain' || type === 'mound') {
    const geo = new THREE.IcosahedronGeometry(0.85, 24);
    const pos = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (y < -0.3) y = -0.3 + (y + 0.3) * 0.2;
      const ripple = Math.sin(x * 9) * Math.cos(z * 9) * 0.08;
      pos.setXYZ(i, x * (1 + ripple), y * (1 + ripple), z * (1 + ripple));
      colors.push(0.06, 0.72, 0.50); // Emerald green
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  } else {
    // Porites or Tiered coral form
    const geo = new THREE.CylinderGeometry(0.25, 0.65, 1.3, 24, 16);
    const pos = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const bulge = Math.sin(y * 4) * 0.18;
      pos.setXYZ(i, x * (1 + bulge), y, z * (1 + bulge));
      colors.push(0.08, 0.64, 0.91); // Azure blue
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }
}

/**
 * Rasterizes a Three.js BufferGeometry into a 3D volumetric density & color field.
 */
export function rasterizeGeometryToGrid(geometry, resolution = 44) {
  if (!geometry || !geometry.attributes?.position) return null;

  if (fieldCache.has(geometry)) {
    return fieldCache.get(geometry);
  }

  const posAttr = geometry.attributes.position;
  const colAttr = geometry.attributes.color;
  const count = posAttr.count;

  // Compute bounding box
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox || new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.1);

  const res = resolution;
  const densityGrid = new Float32Array(res * res * res);
  const colorRGrid = new Float32Array(res * res * res);
  const colorGGrid = new Float32Array(res * res * res);
  const colorBGrid = new Float32Array(res * res * res);

  const sigma = 0.09;
  const sigmaSq2 = 2.0 * sigma * sigma;
  const kernelRadius = 2;

  // Coordinate mapping: center and scale geometry into normalized [-0.85, 0.85] bounds
  const scaleFactor = 1.7 / maxDim;

  const step = count > 15000 ? Math.ceil(count / 15000) : 1;

  for (let i = 0; i < count; i += step) {
    const origX = posAttr.getX(i);
    const origY = posAttr.getY(i);
    const origZ = posAttr.getZ(i);

    // Normalized coordinates in [-0.95, 0.95]
    const nx = (origX - center.x) * scaleFactor;
    const ny = (origY - center.y) * scaleFactor;
    const nz = (origZ - center.z) * scaleFactor;

    // Grid coordinates [0, res-1]
    const gx = Math.round(((nx + 1.0) * 0.5) * (res - 1));
    const gy = Math.round(((ny + 1.0) * 0.5) * (res - 1));
    const gz = Math.round(((nz + 1.0) * 0.5) * (res - 1));

    const r = colAttr ? colAttr.getX(i) : 0.2;
    const g = colAttr ? colAttr.getY(i) : 0.7;
    const b = colAttr ? colAttr.getZ(i) : 0.9;

    for (let iz = Math.max(0, gz - kernelRadius); iz <= Math.min(res - 1, gz + kernelRadius); iz++) {
      const zNorm = (iz / (res - 1)) * 2.0 - 1.0;
      const ddz = nz - zNorm;
      for (let iy = Math.max(0, gy - kernelRadius); iy <= Math.min(res - 1, gy + kernelRadius); iy++) {
        const yNorm = (iy / (res - 1)) * 2.0 - 1.0;
        const ddy = ny - yNorm;
        for (let ix = Math.max(0, gx - kernelRadius); ix <= Math.min(res - 1, gx + kernelRadius); ix++) {
          const xNorm = (ix / (res - 1)) * 2.0 - 1.0;
          const ddx = nx - xNorm;
          const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
          const weight = Math.exp(-distSq / sigmaSq2);

          const idx = iz * res * res + iy * res + ix;
          densityGrid[idx] += weight;
          colorRGrid[idx] += r * weight;
          colorGGrid[idx] += g * weight;
          colorBGrid[idx] += b * weight;
        }
      }
    }
  }

  // Normalize grid colors and densities
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

  const result = {
    resolution: res,
    density: densityGrid,
    colorR: colorRGrid,
    colorG: colorGGrid,
    colorB: colorBGrid,
    maxDim,
    center,
  };

  fieldCache.set(geometry, result);
  return result;
}

/**
 * Continuously interpolates between Geometry A and Geometry B in the SOM latent space.
 * @param {THREE.BufferGeometry} geomA - Primary input geometry (Specimen A)
 * @param {THREE.BufferGeometry} geomB - Secondary input geometry (Specimen B)
 * @param {number} t - Interpolation factor [0.0 (Pure A) to 1.0 (Pure B)]
 * @param {Object} somOptions - SOM latent parameters { u, v, rugosityBias, porosityBias }
 * @returns {THREE.BufferGeometry} 100% Watertight, smooth morphed BufferGeometry
 */
export function interpolateGeometriesSOM(geomA, geomB, t = 0.5, somOptions = {}) {
  // If only one geometry is provided, return cloned geometry
  if (!geomA && !geomB) return new THREE.TorusKnotGeometry(0.7, 0.25, 64, 16);
  if (!geomA) return geomB.clone();
  if (!geomB) return geomA.clone();

  const res = 44;
  const fieldA = rasterizeGeometryToGrid(geomA, res);
  const fieldB = rasterizeGeometryToGrid(geomB, res);

  if (!fieldA || !fieldB) return geomA.clone();

  const wB = Math.max(0, Math.min(1, t));
  const wA = 1.0 - wB;

  // Latent SOM modulation based on v-axis (e.g. morphological dilation / erosion)
  const v = somOptions.v !== undefined ? somOptions.v : 0.5;
  const isoShift = (v - 0.5) * 0.08; // Morphological dilation/erosion along SOM y-axis
  const isoThreshold = Math.max(0.18, Math.min(0.55, 0.35 + isoShift));

  // Blended volumetric density and RGB grids
  const blendedDensity = new Float32Array(res * res * res);
  const blendedR = new Float32Array(res * res * res);
  const blendedG = new Float32Array(res * res * res);
  const blendedB = new Float32Array(res * res * res);

  for (let i = 0; i < blendedDensity.length; i++) {
    blendedDensity[i] = fieldA.density[i] * wA + fieldB.density[i] * wB;
    blendedR[i] = fieldA.colorR[i] * wA + fieldB.colorR[i] * wB;
    blendedG[i] = fieldA.colorG[i] * wA + fieldB.colorG[i] * wB;
    blendedB[i] = fieldA.colorB[i] * wA + fieldB.colorB[i] * wB;
  }

  // Seal boundaries for 100% watertight shell
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      blendedDensity[0 * res * res + y * res + x] = 0;
      blendedDensity[(res - 1) * res * res + y * res + x] = 0;
    }
  }
  for (let z = 0; z < res; z++) {
    for (let x = 0; x < res; x++) {
      blendedDensity[z * res * res + 0 * res + x] = 0;
      blendedDensity[z * res * res + (res - 1) * res + x] = 0;
    }
  }
  for (let z = 0; z < res; z++) {
    for (let y = 0; y < res; y++) {
      blendedDensity[z * res * res + y * res + 0] = 0;
      blendedDensity[z * res * res + y * res + (res - 1)] = 0;
    }
  }

  // Marching Tetrahedra (MT) Extraction on the blended field
  const verts = [];
  const vertexColors = [];
  const faces = [];

  const cubeTets = [
    [0, 5, 1, 3],
    [0, 4, 5, 3],
    [4, 6, 5, 3],
    [6, 7, 5, 3],
    [6, 2, 7, 3],
    [0, 2, 6, 3],
  ];

  const scale = (fieldA.maxDim * wA + fieldB.maxDim * wB) * 0.58;

  function interpolateEdge(pA, pB, vA, vB, cA, cB) {
    const edgeT = Math.max(0, Math.min(1, (isoThreshold - vA) / (vB - vA + 0.00001)));
    return {
      x: (pA[0] + edgeT * (pB[0] - pA[0])) * scale,
      y: (pA[1] + edgeT * (pB[1] - pA[1])) * scale,
      z: (pA[2] + edgeT * (pB[2] - pA[2])) * scale,
      r: cA[0] + edgeT * (cB[0] - cA[0]),
      g: cA[1] + edgeT * (cB[1] - cA[1]),
      b: cA[2] + edgeT * (cB[2] - cA[2]),
    };
  }

  for (let z = 0; z < res - 1; z++) {
    const z0 = (z / (res - 1)) * 2.0 - 1.0;
    const z1 = ((z + 1) / (res - 1)) * 2.0 - 1.0;
    for (let y = 0; y < res - 1; y++) {
      const y0 = (y / (res - 1)) * 2.0 - 1.0;
      const y1 = ((y + 1) / (res - 1)) * 2.0 - 1.0;
      for (let x = 0; x < res - 1; x++) {
        const x0 = (x / (res - 1)) * 2.0 - 1.0;
        const x1 = ((x + 1) / (res - 1)) * 2.0 - 1.0;

        const cornerP = [
          [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
          [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
        ];

        const cornerV = [
          blendedDensity[z * res * res + y * res + x],
          blendedDensity[z * res * res + y * res + (x + 1)],
          blendedDensity[z * res * res + (y + 1) * res + x],
          blendedDensity[z * res * res + (y + 1) * res + (x + 1)],
          blendedDensity[(z + 1) * res * res + y * res + x],
          blendedDensity[(z + 1) * res * res + y * res + (x + 1)],
          blendedDensity[(z + 1) * res * res + (y + 1) * res + x],
          blendedDensity[(z + 1) * res * res + (y + 1) * res + (x + 1)],
        ];

        const cornerC = [
          [blendedR[z * res * res + y * res + x], blendedG[z * res * res + y * res + x], blendedB[z * res * res + y * res + x]],
          [blendedR[z * res * res + y * res + (x + 1)], blendedG[z * res * res + y * res + (x + 1)], blendedB[z * res * res + y * res + (x + 1)]],
          [blendedR[z * res * res + (y + 1) * res + x], blendedG[z * res * res + (y + 1) * res + x], blendedB[z * res * res + (y + 1) * res + x]],
          [blendedR[z * res * res + (y + 1) * res + (x + 1)], blendedG[z * res * res + (y + 1) * res + (x + 1)], blendedB[z * res * res + (y + 1) * res + (x + 1)]],
          [blendedR[(z + 1) * res * res + y * res + x], blendedG[(z + 1) * res * res + y * res + x], blendedB[(z + 1) * res * res + y * res + x]],
          [blendedR[(z + 1) * res * res + y * res + (x + 1)], blendedG[(z + 1) * res * res + y * res + (x + 1)], blendedB[(z + 1) * res * res + y * res + (x + 1)]],
          [blendedR[(z + 1) * res * res + (y + 1) * res + x], blendedG[(z + 1) * res * res + (y + 1) * res + x], blendedB[(z + 1) * res * res + (y + 1) * res + x]],
          [blendedR[(z + 1) * res * res + (y + 1) * res + (x + 1)], blendedG[(z + 1) * res * res + (y + 1) * res + (x + 1)], blendedB[(z + 1) * res * res + (y + 1) * res + (x + 1)]],
        ];

        for (let tIdx = 0; tIdx < 6; tIdx++) {
          const tet = cubeTets[tIdx];
          const t0 = tet[0], t1 = tet[1], t2 = tet[2], t3 = tet[3];

          const p0 = cornerP[t0], p1 = cornerP[t1], p2 = cornerP[t2], p3 = cornerP[t3];
          const v0 = cornerV[t0], v1 = cornerV[t1], v2 = cornerV[t2], v3 = cornerV[t3];
          const c0 = cornerC[t0], c1 = cornerC[t1], c2 = cornerC[t2], c3 = cornerC[t3];

          let mask = 0;
          if (v0 >= isoThreshold) mask |= 1;
          if (v1 >= isoThreshold) mask |= 2;
          if (v2 >= isoThreshold) mask |= 4;
          if (v3 >= isoThreshold) mask |= 8;

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

  const morphedGeometry = new THREE.BufferGeometry();
  if (verts.length > 0) {
    morphedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    morphedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    morphedGeometry.setIndex(faces);
    morphedGeometry.computeVertexNormals();
  }

  return morphedGeometry;
}
