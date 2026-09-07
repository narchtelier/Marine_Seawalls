import * as THREE from 'three';

// Cache generated textures to avoid redundant GPU uploads
let cachedNormalTexture = null;
let cachedRoughnessTexture = null;
let cachedCausticsTexture = null;

/**
 * Generates a procedural high-frequency normal map representing
 * crystalline Aragonite (CaCO3) micro-pores, corallite wall grain, and skeletal granules.
 */
export function getAragoniteNormalMap() {
  if (cachedNormalTexture) return cachedNormalTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // 1. Generate height field using multi-octave pseudo-cellular noise
  const heightField = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const nx = x / size;
      const ny = y / size;

      // High-frequency cellular crystal noise
      const f1 = Math.sin(nx * 128.0) * Math.cos(ny * 128.0);
      const f2 = Math.sin(nx * 64.0 + ny * 64.0) * 0.5;
      const f3 = Math.cos(nx * 256.0 - ny * 128.0) * 0.25;
      const f4 = Math.sin(nx * 32.0 * Math.PI) * Math.sin(ny * 32.0 * Math.PI) * 0.4;

      heightField[idx] = (f1 + f2 + f3 + f4) * 0.5;
    }
  }

  // 2. Convert height field to Sobel normal vector (RGB: [Nx, Ny, Nz])
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const idx = (y * size + x) * 4;

      // Central differences
      const dX = (heightField[y * size + xp] - heightField[y * size + xm]) * 3.5;
      const dY = (heightField[yp * size + x] - heightField[ym * size + x]) * 3.5;
      const dZ = 1.0;

      const len = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
      const nx = (-dX / len) * 0.5 + 0.5;
      const ny = (-dY / len) * 0.5 + 0.5;
      const nz = (dZ / len) * 0.5 + 0.5;

      data[idx] = Math.round(nx * 255);
      data[idx + 1] = Math.round(ny * 255);
      data[idx + 2] = Math.round(nz * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  cachedNormalTexture = texture;
  return texture;
}

/**
 * Generates a procedural roughness map differentiating calcified dry matte ridges
 * from organic moist polyp tissue in cavities.
 */
export function getAragoniteRoughnessMap() {
  if (cachedRoughnessTexture) return cachedRoughnessTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      const noise = (Math.sin(nx * 32.0) * Math.cos(ny * 32.0) + Math.sin(nx * 64.0) * 0.5) * 0.5 + 0.5;
      // Roughness range: 0.35 (organic sheen) to 0.92 (chalky aragonite)
      const roughness = 0.35 + noise * 0.55;
      const val = Math.round(roughness * 255);

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  cachedRoughnessTexture = texture;
  return texture;
}

/**
 * Generates dynamic underwater light caustic pattern for oceanic realism
 */
export function getCausticsTexture() {
  if (cachedCausticsTexture) return cachedCausticsTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;

      // Intersecting sine waves simulating wave refraction caustics
      const w1 = Math.sin(u * 20.0 + Math.sin(v * 15.0));
      const w2 = Math.sin(v * 20.0 + Math.sin(u * 15.0));
      const w3 = Math.sin((u + v) * 25.0);

      const intensity = Math.pow((w1 + w2 + w3 + 3.0) / 6.0, 3.5);
      const val = Math.min(255, Math.round(intensity * 255));

      data[idx] = Math.round(val * 0.8);
      data[idx + 1] = Math.round(val * 0.95);
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  cachedCausticsTexture = texture;
  return texture;
}
