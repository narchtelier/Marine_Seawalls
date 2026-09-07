import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { createNoise3D } from 'simplex-noise';
import { GrayScottSolver } from './reactionDiffusion';
import { getAragoniteNormalMap, getAragoniteRoughnessMap } from './coralTextures';

const noise3D = createNoise3D();
const brainSolver = new GrayScottSolver(128, 0.038, 0.062);
brainSolver.step(120); // Pre-compute labyrinthine meander patterns

/**
 * World-Class Biomechanical Coral Morphogenesis Engine
 * Uses Three.js MarchingCubes for seamless implicit calcification,
 * Turing Reaction-Diffusion for meandroid valleys, and polar sclerosepta polyps.
 */

export function createProceduralCoral(parameters) {
  const {
    morphologyType = 'branching',
    branchingFactor = 0.8,
    rugosity = 0.6,
    caliceDensity = 0.5,
    meanderingFreq = 0.2,
    fractalDimension = 1.7,
    growthScale = 1.0,
    primaryColor = '#0ea5e9',
    secondaryColor = '#0284c7',
    tentacleGlow = '#38bdf8',
    showPolyps = true,
    substrateType = 'seawall',
  } = parameters;

  const group = new THREE.Group();
  group.name = 'CoralColony';

  // Procedural Micro-Textures
  const normalMap = getAragoniteNormalMap();
  const roughnessMap = getAragoniteRoughnessMap();

  // Coral Biocrystal Aragonite CaCO3 Material with Micro-Textures & SSS
  const coralMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryColor),
    roughness: Math.max(0.22, 0.82 - rugosity * 0.35),
    metalness: 0.04,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.8 + rugosity * 0.8, 0.8 + rugosity * 0.8),
    roughnessMap: roughnessMap,
    flatShading: false,
  });

  // Inject Fresnel Subsurface Translucency for living coenosarc light transmission
  coralMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.subsurfaceColor = { value: new THREE.Color(tentacleGlow || '#38bdf8') };

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 subsurfaceColor;
      `
    );

    // Biological Fresnel Translucency Rim
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       vec3 viewDir = normalize(vViewPosition);
       float fresnel = 1.0 - max(0.0, dot(normal, -viewDir));
       float rim = pow(fresnel, 2.6) * 0.55;
       gl_FragColor.rgb += subsurfaceColor * rim;
      `
    );
  };

  const fidelity = parameters.fidelity !== undefined ? parameters.fidelity : 0.8;
  // Scalable grid resolution: from 26 (fast low) up to 54 (highest fidelity trabecular detail)
  const resolution = parameters.resolution || Math.min(54, Math.max(26, Math.round(26 + fidelity * 28)));
  const maxPoly = Math.round(70000 + fidelity * 130000);

  const mc = new MarchingCubes(resolution, coralMaterial, true, true, maxPoly);
  mc.position.set(0, 1.2 * growthScale, 0);
  mc.scale.set(1.6 * growthScale, 1.6 * growthScale, 1.6 * growthScale);
  mc.isolation = 80;

  // Populate implicit potential field
  populateCoralPotentialField(mc, parameters);

  group.add(mc);

  // Meso-Scale Corallite Polyps with S1/S2/S3 Radial Sclerosepta
  if (showPolyps && caliceDensity > 0.08) {
    const polypsGroup = buildMesoCorallitePolyps(parameters);
    group.add(polypsGroup);
  }

  // Seawall Concrete Foundation Substrate
  if (substrateType === 'seawall') {
    const seawallFoundation = buildSeawallFoundation();
    group.add(seawallFoundation);
  }

  return group;
}

/**
 * Evaluates the multi-phenotype continuous potential field in Marching Cubes
 */
function populateCoralPotentialField(mc, params) {
  mc.reset();
  const {
    branchingFactor = 0.8,
    rugosity = 0.6,
    meanderingFreq = 0.2,
    caliceDensity = 0.5,
    fractalDimension = 1.7,
    fidelity = 0.8,
  } = params;

  const size = mc.size;
  const field = mc.field;

  // 1. Generate Phototropism Branch Nodes (Space Colonization)
  const branchNodes = generateBranchNodes(branchingFactor, fractalDimension, fidelity);

  // 2. Continuous Latent Archetype Weights
  const wBranch = Math.max(0, branchingFactor - 0.15);
  const wBrain = meanderingFreq * (1.0 - wBranch * 0.7);
  const wMassive = caliceDensity * (1.0 - wBranch * 0.7 - wBrain * 0.7);
  const wTable = Math.max(0, 1.0 - wBranch - wBrain - wMassive);

  const sumW = wBranch + wBrain + wMassive + wTable || 1.0;
  const normBranch = wBranch / sumW;
  const normBrain = wBrain / sumW;
  const normMassive = wMassive / sumW;
  const normTable = wTable / sumW;

  // Evaluate 3D density at each voxel in the Marching Cubes grid [0, size-1]
  for (let k = 0; k < size; k++) {
    const zNorm = (k / (size - 1)) * 2.0 - 1.0; // [-1, 1]
    for (let j = 0; j < size; j++) {
      const yNorm = (j / (size - 1)) * 2.0 - 1.0; // [-1, 1]
      for (let i = 0; i < size; i++) {
        const xNorm = (i / (size - 1)) * 2.0 - 1.0; // [-1, 1]
        const idx = i + j * size + k * size * size;

        // Ground plane truncation
        if (yNorm < -0.85) {
          field[idx] = 0;
          continue;
        }

        // A. Branching Density (Sum of inverse squared distances to skeleton segments)
        let branchDensity = 0;
        for (let b = 0; b < branchNodes.length; b++) {
          const node = branchNodes[b];
          const distSq = distToSegmentSq(xNorm, yNorm, zNorm, node.p1, node.p2);
          const r = node.radius;
          if (distSq < r * r * 4.0) {
            branchDensity += 120.0 / (1.0 + (distSq / (r * r)));
          }
        }

        // B. Brain Coral Density (Sphere + Turing Reaction Diffusion Manifold)
        const distCenter = Math.sqrt(xNorm * xNorm + (yNorm + 0.1) * (yNorm + 0.1) + zNorm * zNorm);
        const phi = Math.atan2(zNorm, xNorm);
        const theta = Math.acos(Math.max(-1, Math.min(1, (yNorm + 0.1) / (distCenter + 1e-4))));
        const uCoord = (phi / (Math.PI * 2) + 0.5) * (3.0 + meanderingFreq * 6.0);
        const vCoord = (theta / Math.PI) * (3.0 + meanderingFreq * 6.0);
        const turingVal = brainSolver.sample(uCoord, vCoord);
        
        let brainDensity = 0;
        if (distCenter < 0.85) {
          const meanderOffset = (turingVal - 0.5) * (0.35 * rugosity);
          const effectiveRadius = 0.65 + meanderOffset;
          if (distCenter < effectiveRadius) {
            brainDensity = 140.0 * (1.0 - (distCenter / effectiveRadius));
          }
        }

        // C. Massive Coral Density (Organic Boulder Lobes)
        const lobeNoise = noise3D(xNorm * 2.5, yNorm * 2.5, zNorm * 2.5) * (0.2 * rugosity);
        const massRadius = 0.68 + lobeNoise;
        let massiveDensity = 0;
        if (distCenter < massRadius) {
          massiveDensity = 150.0 * (1.0 - (distCenter / massRadius));
        }

        // D. Table Foliose Density (Tiered Horizontal Fronds)
        const rXZ = Math.sqrt(xNorm * xNorm + zNorm * zNorm);
        let tableDensity = 0;
        // Central pedestal
        if (rXZ < 0.2 && yNorm < 0.5) {
          tableDensity += 110.0;
        }
        // Shelf 1
        const dY1 = Math.abs(yNorm - 0.05);
        if (dY1 < 0.12 && rXZ < 0.82) {
          tableDensity += 130.0 * (1.0 - dY1 / 0.12);
        }
        // Shelf 2
        const dY2 = Math.abs(yNorm - 0.45);
        if (dY2 < 0.10 && rXZ < 0.58) {
          tableDensity += 120.0 * (1.0 - dY2 / 0.10);
        }

        // Blend densities continuously
        let totalDensity =
          normBranch * branchDensity +
          normBrain * brainDensity +
          normMassive * massiveDensity +
          normTable * tableDensity;

        // Micro-Rugosity Aragonite noise
        const microNoise = noise3D(xNorm * 5.0, yNorm * 5.0, zNorm * 5.0) * (15.0 * rugosity);
        const calicePores = Math.sin(noise3D(xNorm * 10.0, yNorm * 10.0, zNorm * 10.0) * 12.0) * (8.0 * caliceDensity);

        // High-frequency 3D noise for trabecular porosity and cavities
        const cavityNoise1 = noise3D(xNorm * 3.5, yNorm * 3.5 + 10.5, zNorm * 3.5);
        const cavityNoise2 = noise3D(xNorm * 7.0, yNorm * 7.0 - 5.5, zNorm * 7.0);
        let cavitySubtraction = 0;
        
        // Thresholds for carving out space
        if (cavityNoise1 > 0.35) {
           // Deep large cavities
           cavitySubtraction += (cavityNoise1 - 0.35) * 280.0 * (0.4 + rugosity * 0.6);
        }
        if (cavityNoise2 > 0.55) {
           // Small micropores
           cavitySubtraction += (cavityNoise2 - 0.55) * 450.0 * (0.2 + caliceDensity * 0.8);
        }

        // Apply a high-contrast density threshold to ensure sharp branching rather than blobs
        if (normBranch > 0.5 && branchDensity > 0) {
            // Sharpen branches by suppressing low-density halos
            if (branchDensity < 60) {
                totalDensity *= 0.5;
            }
        }

        field[idx] = Math.max(0, totalDensity + microNoise + calicePores - cavitySubtraction);
      }
    }
  }

  mc.update();
}

/**
 * Generates phototropism branch skeletal segments in normalized [-1, 1] cube
 */
function generateBranchNodes(branchingFactor, fractalDimension, fidelity = 0.8) {
  const nodes = [];
  const depth = Math.min(5, Math.max(2, Math.round(fractalDimension * 1.8 + (fidelity - 0.5) * 0.8)));

  function addSegment(p1, dir, length, radius, level) {
    if (level > depth || length < 0.08) return;

    // Upward phototropism vector
    const phototropism = new THREE.Vector3(0, 0.4, 0);
    const finalDir = dir.clone().add(phototropism).normalize();

    const p2 = [
      p1[0] + finalDir.x * length,
      p1[1] + finalDir.y * length,
      p1[2] + finalDir.z * length,
    ];

    nodes.push({ p1, p2, radius });

    const numBranches = level === 1 ? (branchingFactor > 0.6 ? 4 : 3) : (Math.random() < branchingFactor ? 2 : 1);

    for (let b = 0; b < numBranches; b++) {
      const spread = (0.35 + (1 - branchingFactor * 0.4) * 0.35) * (1 + b * 0.15);
      const azimuth = (b / Math.max(1, numBranches)) * Math.PI * 2 + level * 1.5;

      const side = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
      const nextDir = finalDir.clone().multiplyScalar(0.65).add(side.multiplyScalar(Math.sin(spread))).normalize();

      const nextLen = length * (0.72 + branchingFactor * 0.08);
      const nextRad = radius * (0.72 + (1 - branchingFactor) * 0.1);

      addSegment(p2, nextDir, nextLen, nextRad, level + 1);
    }
  }

  // Trunk base
  const root = [0, -0.8, 0];
  const trunkDir = new THREE.Vector3(0, 1, 0);
  const trunkLen = 0.55;
  const trunkRad = 0.22;

  addSegment(root, trunkDir, trunkLen, trunkRad, 1);
  return nodes;
}

/**
 * Meso-Scale Radial Corallite Polyps with S1/S2/S3 Septocostae
 */
function buildMesoCorallitePolyps(params) {
  const { caliceDensity = 0.5, tentacleGlow = '#38bdf8', growthScale = 1.0, branchingFactor = 0.8, fidelity = 0.8 } = params;
  const polypsGroup = new THREE.Group();

  const caliceGeo = buildSingleCoralliteGeometry(0.065 * growthScale);
  const caliceMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tentacleGlow),
    emissive: new THREE.Color(tentacleGlow),
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  const branchNodes = generateBranchNodes(branchingFactor, 1.7, fidelity);
  const count = Math.min(Math.round(24 + 56 * fidelity), Math.round(branchNodes.length * 4 * caliceDensity));

  for (let i = 0; i < count; i++) {
    const node = branchNodes[i % branchNodes.length];
    const t = (i * 0.37) % 1.0;
    const px = (node.p1[0] + (node.p2[0] - node.p1[0]) * t) * 1.6 * growthScale;
    const py = (node.p1[1] + (node.p2[1] - node.p1[1]) * t) * 1.6 * growthScale + 1.2 * growthScale;
    const pz = (node.p1[2] + (node.p2[2] - node.p1[2]) * t) * 1.6 * growthScale;

    const polypMesh = new THREE.Mesh(caliceGeo, caliceMat);
    const angle = (i * 1.37) * Math.PI * 2;
    const offsetR = node.radius * 1.6 * growthScale * 0.95;
    polypMesh.position.set(px + Math.cos(angle) * offsetR, py, pz + Math.sin(angle) * offsetR);
    
    // Radial outwards orientation
    polypMesh.lookAt(px, py, pz);
    polypsGroup.add(polypMesh);
  }

  return polypsGroup;
}

/**
 * Procedural Corallite Septa Calice Mesh (Radial Sclerosepta)
 */
function buildSingleCoralliteGeometry(radius) {
  const numSepta = 12; // 6 Primary S1 + 6 Secondary S2 septa
  const geo = new THREE.CylinderGeometry(radius, radius * 1.2, radius * 0.45, 12, 1, false);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const angle = Math.atan2(vz, vx);

    // Radial ribbed sclerosepta teeth
    const septalRib = Math.sin(angle * numSepta) * (radius * 0.18);
    pos.setX(i, vx + Math.cos(angle) * septalRib);
    pos.setZ(i, vz + Math.sin(angle) * septalRib);
  }

  geo.computeVertexNormals();
  return geo;
}

function distToSegmentSq(px, py, pz, a, b) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const baLenSq = bax * bax + bay * bay + baz * baz;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (baLenSq + 1e-8)));

  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return dx * dx + dy * dy + dz * dz;
}

function buildSeawallFoundation() {
  const group = new THREE.Group();
  const blockGeo = new THREE.BoxGeometry(4.6, 0.4, 4.6);
  const blockMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.95,
    metalness: 0.05,
  });
  const block = new THREE.Mesh(blockGeo, blockMat);
  block.position.y = -0.2;
  group.add(block);

  const ringGeo = new THREE.TorusGeometry(1.6, 0.12, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.9,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  return group;
}
