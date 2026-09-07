import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

/**
 * Continuous Morphological 3D Coral Geometry & Mesh Generator
 * Generates continuous geometric interpolations between coral phenotypes
 */

export function createProceduralCoral(parameters) {
  const {
    morphologyType = 'branching',
    branchingFactor = 0.8,
    rugosity = 0.6,
    caliceDensity = 0.5,
    meanderingFreq = 0.2,
    fractalDimension = 1.7,
    axialDominance = 0.8,
    growthScale = 1.0,
    polypSize = 0.08,
    primaryColor = '#0ea5e9',
    secondaryColor = '#0284c7',
    tentacleGlow = '#38bdf8',
    showPolyps = true,
    substrateType = 'seawall',
  } = parameters;

  const group = new THREE.Group();
  group.name = 'CoralColony';

  // Coral PBR Material with Subsurface Scattering Glow
  const coralMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryColor),
    roughness: Math.max(0.18, 0.92 - rugosity * 0.45),
    metalness: 0.08,
    flatShading: false,
  });

  const polypsGroup = new THREE.Group();

  // If branching factor is very low (< 0.2) or meandering/calices dominant, morph into solid boulder/brain
  let mainMesh;
  if (branchingFactor > 0.25) {
    mainMesh = buildContinuousBranchingMorphMesh(parameters, coralMaterial, polypsGroup);
  } else if (meanderingFreq > 0.45) {
    mainMesh = buildContinuousBrainMorphMesh(parameters, coralMaterial, polypsGroup);
  } else if (morphologyType === 'table') {
    mainMesh = buildContinuousTableMorphMesh(parameters, coralMaterial, polypsGroup);
  } else {
    mainMesh = buildContinuousMassiveMorphMesh(parameters, coralMaterial, polypsGroup);
  }

  group.add(mainMesh);

  if (showPolyps && polypsGroup.children.length > 0) {
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
 * Continuous Branching Coral with Meandroid Surface Morphing & Calices
 */
function buildContinuousBranchingMorphMesh(params, material, polypsGroup) {
  const {
    branchingFactor,
    rugosity,
    caliceDensity,
    meanderingFreq,
    fractalDimension,
    growthScale,
    tentacleGlow,
  } = params;

  const geometries = [];
  const depth = Math.min(5, Math.max(2, Math.round(fractalDimension * 2.1)));

  function growBranch(start, dir, length, radius, level) {
    if (level > depth || length < 0.12) return;

    const end = start.clone().add(dir.clone().multiplyScalar(length));
    const radialSegs = Math.max(8, Math.round(14 * (1 - level * 0.12)));
    const cylGeo = new THREE.CylinderGeometry(radius * 0.65, radius, length, radialSegs, 6);

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const orientation = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(up, dir).normalize();
    const angle = Math.acos(Math.min(1, Math.max(-1, up.dot(dir))));

    if (axis.length() > 0.001) {
      orientation.makeRotationAxis(axis, angle);
    }
    orientation.setPosition(midPoint);

    // Continuous vertex displacement blending rugosity + meander grooves + polyp calice dips
    const pos = cylGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      // Meandroid ridge modulation along stem
      const meanderWave = Math.sin(vy * (8 + meanderingFreq * 16) + noise3D(vx * 4, vy * 4, vz * 4) * 4) * (0.05 * meanderingFreq);
      const rugoNoise = noise3D(vx * 5 + level, vy * 5, vz * 5) * (rugosity * 0.08);

      pos.setXYZ(i, vx + vx * (rugoNoise + meanderWave), vy, vz + vz * (rugoNoise + meanderWave));
    }
    cylGeo.computeVertexNormals();
    cylGeo.applyMatrix4(orientation);
    geometries.push(cylGeo);

    // Calice Polyps along branches
    if (caliceDensity > 0.1 && Math.random() < caliceDensity * 1.3) {
      const polypGeo = new THREE.SphereGeometry(radius * 0.42, 6, 6);
      polypGeo.applyMatrix4(orientation);
      const polypMesh = new THREE.Mesh(polypGeo, new THREE.MeshStandardMaterial({
        color: new THREE.Color(tentacleGlow || '#38bdf8'),
        emissive: new THREE.Color(tentacleGlow || '#38bdf8'),
        emissiveIntensity: 0.5,
      }));
      polypsGroup.add(polypMesh);
    }

    // Branching bifurcation count modulated by branchingFactor
    const branchProb = branchingFactor;
    const branchCount = level === 1 ? (branchFactorToCount(branchingFactor)) : (Math.random() < branchProb ? 2 : 1);

    for (let b = 0; b < branchCount; b++) {
      const spreadAngle = (0.25 + (1 - branchingFactor * 0.5) * 0.4) * (1 + b * 0.2);
      const rotAngle = (b / Math.max(1, branchCount)) * Math.PI * 2 + level * 1.4;

      const sideDir = new THREE.Vector3(Math.cos(rotAngle), 0, Math.sin(rotAngle));
      const newDir = dir.clone().multiplyScalar(0.7)
        .add(sideDir.multiplyScalar(Math.sin(spreadAngle)))
        .normalize();

      const nextLen = length * (0.68 + (branchingFactor * 0.1));
      const nextRad = radius * (0.7 + (1 - branchingFactor) * 0.1);

      growBranch(end, newDir, nextLen, nextRad, level + 1);
    }
  }

  function branchFactorToCount(bf) {
    if (bf > 0.7) return 4;
    if (bf > 0.4) return 3;
    return 2;
  }

  const startPos = new THREE.Vector3(0, 0, 0);
  const startDir = new THREE.Vector3(0, 1, 0);
  const baseLength = (1.1 + (1 - branchingFactor) * 0.3) * growthScale;
  const baseRadius = (0.35 + (1 - branchingFactor) * 0.25) * growthScale;

  growBranch(startPos, startDir, baseLength, baseRadius, 1);

  const mergedGeo = mergeBufferGeometries(geometries);
  return new THREE.Mesh(mergedGeo, material);
}

/**
 * Continuous Brain Coral with Variable Meander Frequency & Rugosity
 */
function buildContinuousBrainMorphMesh(params, material, polypsGroup) {
  const { rugosity, meanderingFreq, caliceDensity, growthScale } = params;

  const radius = 1.4 * growthScale;
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y < -radius * 0.38) {
      pos.setY(i, -radius * 0.38);
      continue;
    }

    const freq = 3.0 + meanderingFreq * 6.5;
    const n1 = noise3D(x * freq, y * freq, z * freq);
    const n2 = noise3D(x * freq * 2.2, y * freq * 2.2, z * freq * 2.2);

    const ridge = Math.sin(n1 * Math.PI * 3.0) * (0.24 * rugosity);
    const pores = Math.sin(n2 * 8.0) * (0.04 * caliceDensity);

    const normal = new THREE.Vector3(x, y, z).normalize();
    const disp = ridge + pores;

    pos.setXYZ(i, x + normal.x * disp, y + normal.y * disp, z + normal.z * disp);
  }

  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/**
 * Continuous Massive Coral (Porites organic boulder with calice pore field)
 */
function buildContinuousMassiveMorphMesh(params, material, polypsGroup) {
  const { rugosity, caliceDensity, growthScale } = params;

  const radius = 1.35 * growthScale;
  const geometry = new THREE.IcosahedronGeometry(radius, 5);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y < -radius * 0.38) {
      pos.setY(i, -radius * 0.38);
      continue;
    }

    const lobe1 = noise3D(x * 1.1, y * 1.1, z * 1.1) * 0.32;
    const lobe2 = noise3D(x * 3.8, y * 3.8, z * 3.8) * (0.16 * rugosity);
    const calices = Math.sin(noise3D(x * 9.0, y * 9.0, z * 9.0) * 14.0) * (0.05 * caliceDensity);

    const normal = new THREE.Vector3(x, y, z).normalize();
    const totalDisp = lobe1 + lobe2 + calices;

    pos.setXYZ(i, x + normal.x * totalDisp, y + normal.y * totalDisp, z + normal.z * totalDisp);
  }

  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/**
 * Continuous Table / Foliose Coral
 */
function buildContinuousTableMorphMesh(params, material, polypsGroup) {
  const { rugosity, growthScale, caliceDensity } = params;
  const geometries = [];

  const trunkHeight = 1.1 * growthScale;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, trunkHeight, 16);
  trunkGeo.translate(0, trunkHeight / 2, 0);
  geometries.push(trunkGeo);

  const tierCount = 3;
  for (let t = 0; t < tierCount; t++) {
    const tierY = trunkHeight * (0.45 + (t / tierCount) * 0.65);
    const plateRadius = (1.85 - t * 0.38) * growthScale;
    const plateGeo = new THREE.CylinderGeometry(plateRadius, plateRadius * 0.88, 0.08 * growthScale, 36);

    const pos = plateGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);

      if (dist > plateRadius * 0.45) {
        const wave = Math.sin(angle * (6 + t * 2)) * (0.14 * rugosity);
        const noise = noise3D(vx * 2.5, vy, vz * 2.5) * (0.08 * rugosity);
        pos.setY(i, vy + wave + noise);
      }
    }
    plateGeo.computeVertexNormals();
    plateGeo.translate(0, tierY, 0);
    geometries.push(plateGeo);
  }

  const merged = mergeBufferGeometries(geometries);
  return new THREE.Mesh(merged, material);
}

function buildSeawallFoundation() {
  const group = new THREE.Group();
  const blockGeo = new THREE.BoxGeometry(4.5, 0.4, 4.5);
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

function mergeBufferGeometries(geometries) {
  let totalVertices = 0;
  let totalIndices = 0;

  geometries.forEach(geo => {
    totalVertices += geo.attributes.position.count;
    if (geo.index) {
      totalIndices += geo.index.count;
    } else {
      totalIndices += geo.attributes.position.count;
    }
  });

  const mergedPosition = new Float32Array(totalVertices * 3);
  const mergedNormal = new Float32Array(totalVertices * 3);
  const mergedIndices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  geometries.forEach(geo => {
    const pos = geo.attributes.position.array;
    const norm = geo.attributes.normal.array;
    mergedPosition.set(pos, vertexOffset * 3);
    mergedNormal.set(norm, vertexOffset * 3);

    if (geo.index) {
      const idx = geo.index.array;
      for (let i = 0; i < idx.length; i++) {
        mergedIndices[indexOffset + i] = idx[i] + vertexOffset;
      }
      indexOffset += idx.length;
    } else {
      for (let i = 0; i < geo.attributes.position.count; i++) {
        mergedIndices[indexOffset + i] = i + vertexOffset;
      }
      indexOffset += geo.attributes.position.count;
    }

    vertexOffset += geo.attributes.position.count;
  });

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPosition, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormal, 3));
  mergedGeo.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  mergedGeo.computeVertexNormals();

  return mergedGeo;
}
