import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { GrayScottSolver } from './reactionDiffusion';
import { getAragoniteNormalMap, getAragoniteRoughnessMap } from './coralTextures';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const noise3D = createNoise3D();
const brainSolver = new GrayScottSolver(128, 0.038, 0.062);
brainSolver.step(120);

export async function createProceduralCoral(parameters) {
  const {
    morphologyType = 'branching',
    colonyForm = 'branching',
    branchingFactor = 0.8,
    rugosity = 0.6,
    caliceDensity = 0.5,
    caliceDiameter = 1.0,
    septaCount = 12,
    meanderingFreq = 0.2,
    fractalDimension = 1.7,
    growthScale = 1.0,
    primaryColor = '#0ea5e9',
    secondaryColor = '#0284c7',
    tentacleGlow = '#38bdf8',
    showPolyps = true,
    fidelity = 0.8,
    name = "Specimen"
  } = parameters;

  const group = new THREE.Group();
  group.name = 'CoralColony';

  const normalMap = getAragoniteNormalMap();
  const roughnessMap = getAragoniteRoughnessMap();

  const coralMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryColor),
    roughness: Math.max(0.1, 0.7 - rugosity * 0.4),
    metalness: 0.02,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(1.0 + rugosity, 1.0 + rugosity),
    roughnessMap: roughnessMap,
    flatShading: false,
  });

  coralMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.subsurfaceColor = { value: new THREE.Color(tentacleGlow || '#38bdf8') };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 subsurfaceColor;
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       vec3 viewDir = normalize(vViewPosition);
       float fresnel = 1.0 - max(0.0, dot(normal, -viewDir));
       float rim = pow(fresnel, 3.0) * 0.65;
       gl_FragColor.rgb += subsurfaceColor * rim;
      `
    );
  };

  let macroMesh = null;
  let apicalPoints = [];

  // Attempt to fetch from Deep Generative Python Backend (Option 2)
  try {
    const res = await fetch('http://localhost:8000/api/generate-3d-mesh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        species_name: name,
        morphology_type: morphologyType,
        rugosity,
        meanderingFreq,
        branchingFactor,
        caliceDensity,
        resolution: Math.round(32 + fidelity * 32)
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.geometry) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(data.geometry.vertices, 3));
        geo.setIndex(data.geometry.faces);
        geo.computeVertexNormals();
        macroMesh = new THREE.Mesh(geo, coralMaterial);
      }
    }
  } catch (err) {
    console.warn("Backend 3D generation failed or not available. Falling back to local generation.", err);
  }

  // Fallback to local exact grammars if backend is offline
  if (!macroMesh) {
    const form = colonyForm || morphologyType;
    const isHybrid = form.includes('hybrid') || (parameters.weightA > 0.18 && parameters.weightB > 0.18);

    if (isHybrid) {
      const res = buildHybridGeometry(parameters, coralMaterial);
      macroMesh = res.mesh;
      apicalPoints = res.apicalPoints;
    } else if (form === 'branching' || form === 'digitate') {
      const res = buildBranchingGeometry(parameters, coralMaterial);
      macroMesh = res.mesh;
      apicalPoints = res.apicalPoints;
    } else if (form === 'meandroid' || form === 'brain') {
      macroMesh = buildBrainGeometry(parameters, coralMaterial);
    } else if (form === 'cerioid' || form === 'massive') {
      macroMesh = buildMassiveGeometry(parameters, coralMaterial);
    } else if (form === 'foliose' || form === 'table') {
      macroMesh = buildFolioseGeometry(parameters, coralMaterial);
    } else {
      macroMesh = buildMassiveGeometry(parameters, coralMaterial);
    }
  }

  macroMesh.position.set(0, 0, 0);
  macroMesh.scale.set(1.6 * growthScale, 1.6 * growthScale, 1.6 * growthScale);
  group.add(macroMesh);

  if (showPolyps && caliceDensity > 0.05) {
    const polypsGroup = buildMesoCoralliteScatterer(macroMesh, apicalPoints, parameters);
    polypsGroup.position.copy(macroMesh.position);
    polypsGroup.scale.copy(macroMesh.scale);
    group.add(polypsGroup);
  }

  return group;
}

// ----------------------------------------------------
// PHENOTYPE-SPECIFIC ENGINES
// ----------------------------------------------------

function buildBranchingGeometry(params, material) {
  const { branchingFactor = 0.8, fractalDimension = 1.7, branchTapering = 0.85, fidelity = 0.8, rugosity = 0.6 } = params;
  
  // Advanced L-System to Spline conversion
  const { segments, apicalPoints } = generateParametricBranchPaths(branchingFactor, fractalDimension, fidelity);
  
  const radialSegments = Math.min(16, Math.max(6, Math.round(6 + fidelity * 10)));
  const tubeGeometries = [];

  for (const seg of segments) {
    // CatmullRomCurve3 for perfectly smooth biological splines
    const curve = new THREE.CatmullRomCurve3(seg.points);
    
    // Instead of custom class which needs UVs, we can directly modify the vertices based on their distance from start
    const tubularSegments = Math.max(4, Math.round(seg.points.length * 3 * fidelity));
    const geo = new THREE.TubeGeometry(curve, tubularSegments, seg.radius, radialSegments, false);
    
    // Apply tapering and micro-rugosity
    const pos = geo.attributes.position;
    const startPoint = seg.points[0];
    const totalLength = curve.getLength();
    
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      // Approximate t along curve
      let dist = v.distanceTo(startPoint);
      let t = Math.min(1.0, dist / (totalLength + 0.0001));
      
      // Tapering
      const taperScale = 1.0 - (t * branchTapering * 0.7);
      
      // Find closest point on curve to get normal direction for tapering
      // For simplicity, we interpolate back toward the curve center
      const centerPt = curve.getPointAt(t);
      v.sub(centerPt).multiplyScalar(taperScale).add(centerPt);
      
      // Add coral-specific bumpy rugosity
      const micro = noise3D(v.x * 8, v.y * 8, v.z * 8) * 0.015 * rugosity;
      const normal = new THREE.Vector3().subVectors(v, centerPt).normalize();
      v.add(normal.multiplyScalar(micro));
      
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    
    geo.computeVertexNormals();
    tubeGeometries.push(geo);
  }

  const mergedGeo = mergeGeometries(tubeGeometries, false);
  const mesh = new THREE.Mesh(mergedGeo, material);
  
  return { mesh, apicalPoints };
}

function buildBrainGeometry(params, material) {
  const { meanderingFreq = 0.2, rugosity = 0.6, fidelity = 0.8, isBiomimetic, turingFeed, turingKill, turingScale, turingHeight } = params;
  
  // Use exact biology if available
  const feed = isBiomimetic && turingFeed ? turingFeed : 0.038;
  const kill = isBiomimetic && turingKill ? turingKill : 0.062;
  const scaleMult = isBiomimetic && turingScale ? turingScale : (4.0 + meanderingFreq * 8.0);
  const heightMult = isBiomimetic && turingHeight ? turingHeight : 0.25;

  const localSolver = new GrayScottSolver(128, feed, kill);
  localSolver.step(120);

  const detail = Math.min(128, Math.round(32 + fidelity * 96));
  const geo = new THREE.IcosahedronGeometry(0.8, detail);
  const pos = geo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);
    
    if (vy < -0.4) vy = -0.4 + (vy + 0.4) * 0.2;

    const u = (Math.atan2(vz, vx) / (Math.PI * 2) + 0.5) * scaleMult;
    const v = (Math.asin(vy / 0.8) / Math.PI + 0.5) * scaleMult;
    
    const turingVal = localSolver.sample(u, v);
    const ridge = 1.0 / (1.0 + Math.exp(-15.0 * (turingVal - 0.5)));
    
    const disp = (ridge - 0.5) * heightMult * rugosity;
    const micro = noise3D(vx * 15, vy * 15, vz * 15) * 0.01 * rugosity;
    
    const scale = 1.0 + disp + micro;
    pos.setXYZ(i, vx * scale, vy * scale, vz * scale);
  }
  
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

function buildHybridGeometry(params, material) {
  const {
    weightA = 0.5,
    weightB = 0.5,
    branchingFactor = 0.5,
    rugosity = 0.7,
    meanderingFreq = 0.5,
    fidelity = 0.8,
  } = params;

  // 1. Build Base Convoluted Mound (Brain Morphology Component)
  const moundScale = 0.55 + weightA * 0.45;
  const localSolver = new GrayScottSolver(96, 0.038, 0.062);
  localSolver.step(80);

  const detail = Math.min(64, Math.round(24 + fidelity * 48));
  const moundGeo = new THREE.IcosahedronGeometry(0.75 * moundScale, detail);
  const mPos = moundGeo.attributes.position;

  for (let i = 0; i < mPos.count; i++) {
    let vx = mPos.getX(i);
    let vy = mPos.getY(i);
    let vz = mPos.getZ(i);

    // Flatten bottom slightly for stable seafloor attachment
    if (vy < -0.3 * moundScale) vy = -0.3 * moundScale + (vy + 0.3 * moundScale) * 0.2;

    const u = (Math.atan2(vz, vx) / (Math.PI * 2) + 0.5) * (4.0 + meanderingFreq * 6.0);
    const v = (Math.asin(Math.max(-1, Math.min(1, vy / (0.75 * moundScale)))) / Math.PI + 0.5) * (4.0 + meanderingFreq * 6.0);

    const turingVal = localSolver.sample(u, v);
    const ridge = 1.0 / (1.0 + Math.exp(-12.0 * (turingVal - 0.5)));
    const disp = (ridge - 0.5) * 0.22 * rugosity * weightA;
    const micro = noise3D(vx * 12, vy * 12, vz * 12) * 0.012 * rugosity;

    const scale = 1.0 + disp + micro;
    mPos.setXYZ(i, vx * scale, vy * scale, vz * scale);
  }
  moundGeo.computeVertexNormals();

  // 2. Build Sprouting Arborescent Branches (Branching Morphology Component)
  const numMainBranches = Math.max(2, Math.round(2 + weightB * 5));
  const tubeGeometries = [moundGeo];
  const apicalPoints = [];

  const branchLength = 0.5 + weightB * 0.7;
  const branchRadius = 0.05 + weightA * 0.03;

  for (let b = 0; b < numMainBranches; b++) {
    const angle = (b / numMainBranches) * Math.PI * 2 + (b * 0.3);
    const moundSurfaceX = Math.cos(angle) * (0.35 * moundScale);
    const moundSurfaceZ = Math.sin(angle) * (0.35 * moundScale);
    const moundSurfaceY = (0.2 + (b % 2) * 0.15) * moundScale;

    // Build branch curve starting from the mound surface
    const p0 = new THREE.Vector3(moundSurfaceX, moundSurfaceY, moundSurfaceZ);
    const p1 = new THREE.Vector3(
      moundSurfaceX * 1.5 + (Math.sin(angle * 2) * 0.15),
      moundSurfaceY + branchLength * 0.45,
      moundSurfaceZ * 1.5 + (Math.cos(angle * 2) * 0.15)
    );
    const p2 = new THREE.Vector3(
      moundSurfaceX * 1.8 + Math.cos(angle) * 0.2,
      moundSurfaceY + branchLength,
      moundSurfaceZ * 1.8 + Math.sin(angle) * 0.2
    );

    apicalPoints.push(p2);

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const bGeo = new THREE.TubeGeometry(curve, 12, branchRadius * (1.0 - (b % 2) * 0.2), 8, false);

    // Apply tapering
    const bPos = bGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      const by = bPos.getY(i);
      const bz = bPos.getZ(i);
      const t = Math.max(0, Math.min(1, (by - moundSurfaceY) / (branchLength + 0.01)));
      const taper = 1.0 - t * 0.45;
      const ptOnCurve = curve.getPointAt(t);
      const offset = new THREE.Vector3(bx, by, bz).sub(ptOnCurve).multiplyScalar(taper);
      bPos.setXYZ(i, ptOnCurve.x + offset.x, ptOnCurve.y + offset.y, ptOnCurve.z + offset.z);
    }
    bGeo.computeVertexNormals();
    tubeGeometries.push(bGeo);
  }

  // Merge mound and sprouting branches into a single unified watertight geometry
  let mergedGeo = null;
  try {
    mergedGeo = mergeGeometries(tubeGeometries, false);
    mergedGeo.computeVertexNormals();
  } catch (e) {
    console.warn("Could not merge hybrid geometries:", e);
    mergedGeo = moundGeo;
  }

  const mesh = new THREE.Mesh(mergedGeo, material);
  return { mesh, apicalPoints };
}

function buildMassiveGeometry(params, material) {
  const { rugosity = 0.6, caliceDensity = 0.5, fidelity = 0.8, isBiomimetic, cellularFreq, cellularDepth, lobeFrequency, lobeAmplitude } = params;
  
  const cFreq = isBiomimetic && cellularFreq ? cellularFreq : (20.0 + caliceDensity * 20.0);
  const cDepth = isBiomimetic && cellularDepth ? cellularDepth : (0.04 * caliceDensity);
  const lFreq = isBiomimetic && lobeFrequency ? lobeFrequency : 2.0;
  const lAmp = isBiomimetic && lobeAmplitude ? lobeAmplitude : (0.25 * rugosity);

  const detail = Math.min(128, Math.round(32 + fidelity * 96));
  const geo = new THREE.IcosahedronGeometry(0.8, detail);
  const pos = geo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);
    
    if (vy < -0.4) vy = -0.4 + (vy + 0.4) * 0.2;

    const lobe = noise3D(vx * lFreq, vy * lFreq, vz * lFreq) * lAmp;
    const cellNoise = Math.sin(vx * cFreq) * Math.sin(vy * cFreq) * Math.sin(vz * cFreq);
    const wall = Math.pow(Math.abs(cellNoise), 0.2) * cDepth;
    const micro = noise3D(vx * 30, vy * 30, vz * 30) * 0.005;
    
    const scale = 1.0 + lobe + wall + micro;
    pos.setXYZ(i, vx * scale, vy * scale, vz * scale);
  }
  
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

function buildFolioseGeometry(params, material) {
  const { rugosity = 0.6, fidelity = 0.8, isBiomimetic, whorlFreq, whorlAmplitude, tierDroop } = params;
  const detail = Math.min(128, Math.round(64 + fidelity * 64));
  
  const wFreq = isBiomimetic && whorlFreq ? whorlFreq : (6.0 + rugosity * 4.0);
  const wAmp = isBiomimetic && whorlAmplitude ? whorlAmplitude : (0.25 * rugosity);
  const droop = isBiomimetic && tierDroop ? tierDroop : 0.3;

  const geo = new THREE.CylinderGeometry(0.9, 0.1, 0.05, detail, Math.floor(detail / 3), true);
  const pos = geo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    let vy = pos.getY(i);
    const vz = pos.getZ(i);
    
    const rXZ = Math.sqrt(vx * vx + vz * vz);
    const theta = Math.atan2(vz, vx);
    
    const ruffle = Math.sin(theta * wFreq) * Math.pow(rXZ, 2.0) * wAmp;
    vy += ruffle;
    vy += (Math.pow(rXZ, 1.5) * droop) - 0.2;
    
    pos.setY(i, vy);
  }
  
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

// ----------------------------------------------------
// MESO-CORALLITE SCATTERER
// ----------------------------------------------------

function buildMesoCoralliteScatterer(macroMesh, apicalPoints, params) {
  const { caliceDiameter = 1.0, caliceDensity = 0.5, tentacleGlow = '#38bdf8', septaCount = 12 } = params;
  
  const group = new THREE.Group();
  const radius = (caliceDiameter / 10.0) * 0.3; 
  const geo = buildSingleCoralliteGeometry(radius, septaCount);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tentacleGlow),
    emissive: new THREE.Color(tentacleGlow),
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  
  let scatterPoints = [];
  
  if (apicalPoints && apicalPoints.length > 0) {
    for (const ap of apicalPoints) {
      scatterPoints.push({ position: ap.pos, normal: ap.dir, isApical: true });
    }
  }
  
  if (macroMesh.geometry && macroMesh.geometry.attributes && macroMesh.geometry.attributes.position) {
    const pos = macroMesh.geometry.attributes.position;
    const norm = macroMesh.geometry.attributes.normal;
    const skip = Math.max(1, Math.floor((1.0 - caliceDensity) * 15) + 1); 
    
    for (let i = 0; i < pos.count; i += skip) {
      if (Math.random() > caliceDensity * 1.5) continue;
      
      const p = new THREE.Vector3().fromBufferAttribute(pos, i);
      const n = new THREE.Vector3().fromBufferAttribute(norm, i);
      if (p.y < -0.4) continue; 
      
      let tooClose = false;
      for (const ap of apicalPoints) {
        if (p.distanceToSquared(ap.pos) < (radius * radius * 9.0)) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        scatterPoints.push({ position: p, normal: n, isApical: false });
      }
    }
  }

  const MAX_POLYPS = 3500;
  if (scatterPoints.length > MAX_POLYPS) {
    const apical = scatterPoints.filter(p => p.isApical);
    let radial = scatterPoints.filter(p => !p.isApical);
    radial = radial.sort(() => 0.5 - Math.random()).slice(0, MAX_POLYPS - apical.length);
    scatterPoints = [...apical, ...radial];
  }

  const instancedMesh = new THREE.InstancedMesh(geo, mat, scatterPoints.length);
  const dummy = new THREE.Object3D();
  
  scatterPoints.forEach((pt, i) => {
    const scale = pt.isApical ? 1.4 : (0.7 + Math.random() * 0.6);
    dummy.position.copy(pt.position);
    if (pt.isApical) {
      dummy.position.add(pt.normal.clone().multiplyScalar(radius * 0.5));
    }
    dummy.lookAt(dummy.position.clone().add(pt.normal));
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  });
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  group.add(instancedMesh);
  
  return group;
}

function buildSingleCoralliteGeometry(radius, septaCount = 12) {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.1, radius * 0.35, septaCount, 1, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const angle = Math.atan2(vz, vx);
    const septalRib = Math.sin(angle * septaCount) * (radius * 0.25);
    pos.setX(i, vx + Math.cos(angle) * septalRib);
    pos.setZ(i, vz + Math.sin(angle) * septalRib);
  }
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// ----------------------------------------------------
// UTILS: EXACT L-SYSTEM PARSER
// ----------------------------------------------------

function generateParametricBranchPaths(params) {
  const { branchingFactor = 0.8, fractalDimension = 1.7, fidelity = 0.8, isBiomimetic, lSystemAxiom, lSystemRules, lSystemTheta, lSystemStepScale, lSystemRadiusScale } = params;
  const segments = [];
  const apicalPoints = [];

  // Fallback to legacy generator if not biomimetic
  if (!isBiomimetic || !lSystemAxiom) {
    return runGenericSpaceColonization(branchingFactor, fractalDimension, fidelity);
  }

  // TRUE BIOMIMICRY L-SYSTEM
  const depth = Math.min(5, Math.max(2, Math.round(fractalDimension * 2.2)));
  let sentence = lSystemAxiom;
  
  for (let i = 0; i < depth; i++) {
    let nextSentence = "";
    for (let j = 0; j < sentence.length; j++) {
      const char = sentence.charAt(j);
      if (lSystemRules[char]) {
        nextSentence += lSystemRules[char];
      } else {
        nextSentence += char;
      }
    }
    sentence = nextSentence;
  }

  let currentPt = new THREE.Vector3(0, -0.6, 0);
  let currentDir = new THREE.Vector3(0, 1, 0);
  let currentLen = 0.5;
  let currentRad = 0.15;
  let stack = [];

  const thetaRad = (lSystemTheta || 45) * (Math.PI / 180);
  const stepScale = lSystemStepScale || 0.75;
  const radScale = lSystemRadiusScale || 0.8;

  let currentPath = [currentPt.clone()];
  
  for (let i = 0; i < sentence.length; i++) {
    const char = sentence.charAt(i);
    
    if (char === 'F') {
      const nextPt = currentPt.clone().add(currentDir.clone().multiplyScalar(currentLen));
      currentPath.push(nextPt);
      currentPt = nextPt;
    } else if (char === '[') {
      stack.push({
        pt: currentPt.clone(),
        dir: currentDir.clone(),
        len: currentLen,
        rad: currentRad,
        path: [...currentPath]
      });
      currentLen *= stepScale;
      currentRad *= radScale;
    } else if (char === ']') {
      if (currentPath.length > 1) {
        segments.push({ points: currentPath, radius: currentRad });
        apicalPoints.push({ pos: currentPath[currentPath.length - 1], dir: currentDir.clone() });
      }
      
      const popped = stack.pop();
      currentPt = popped.pt;
      currentDir = popped.dir;
      currentLen = popped.len;
      currentRad = popped.rad;
      currentPath = [currentPt.clone()];
    } else if (char === '+') {
      currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), thetaRad);
    } else if (char === '-') {
      currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -thetaRad);
    } else if (char === '&') {
      currentDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), thetaRad);
    } else if (char === '^') {
      currentDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -thetaRad);
    }
  }

  if (currentPath.length > 1) {
    segments.push({ points: currentPath, radius: currentRad });
    apicalPoints.push({ pos: currentPath[currentPath.length - 1], dir: currentDir.clone() });
  }

  return { segments, apicalPoints };
}

function runGenericSpaceColonization(branchingFactor, fractalDimension, fidelity) {
  const segments = [];
  const apicalPoints = [];
  const depth = Math.min(6, Math.max(2, Math.round(fractalDimension * 2.2 + (fidelity - 0.5))));

  function addSegment(startPt, dir, length, radius, level) {
    if (level > depth || length < 0.05) {
      apicalPoints.push({ pos: startPt, dir: dir.clone().normalize() });
      return;
    }

    const points = [startPt];
    const numSubSteps = 3;
    let currentPt = startPt.clone();
    let currentDir = dir.clone().normalize();
    const phototropism = new THREE.Vector3(0, 0.4, 0);

    for (let i = 1; i <= numSubSteps; i++) {
      currentDir.add(phototropism.clone().multiplyScalar(0.2)).normalize();
      const wander = new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
      currentDir.add(wander).normalize();
      const stepLen = length / numSubSteps;
      currentPt = currentPt.clone().add(currentDir.clone().multiplyScalar(stepLen));
      points.push(currentPt);
    }

    segments.push({ points, radius });
    const endPt = points[points.length - 1];
    const numBranches = level === 1 ? (branchingFactor > 0.6 ? 4 : 3) : (Math.random() < branchingFactor ? 2 : 1);

    if (numBranches === 0) {
      apicalPoints.push({ pos: endPt, dir: currentDir.clone() });
    }

    for (let b = 0; b < numBranches; b++) {
      const spread = (0.25 + (1 - branchingFactor * 0.4) * 0.4) * (1 + b * 0.1);
      const azimuth = (b / Math.max(1, numBranches)) * Math.PI * 2 + level * 1.5;

      const up = new THREE.Vector3(0, 1, 0);
      let right = new THREE.Vector3().crossVectors(currentDir, up);
      if (right.lengthSq() < 0.01) right = new THREE.Vector3(1, 0, 0);
      right.normalize();
      const side = right.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(currentDir, azimuth));
      
      const nextDir = currentDir.clone().multiplyScalar(Math.cos(spread)).add(side.multiplyScalar(Math.sin(spread))).normalize();
      const nextLen = length * (0.65 + branchingFactor * 0.15);
      const nextRad = radius * (0.65 + (1 - branchingFactor) * 0.15);

      addSegment(endPt, nextDir, nextLen, nextRad, level + 1);
    }
  }

  addSegment(new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 1, 0), 0.6, 0.15, 1);
  return { segments, apicalPoints };
}
