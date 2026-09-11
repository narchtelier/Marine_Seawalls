import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import {
  Box,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  RotateCw,
  RotateCcw,
  Sparkles,
  Layers,
  Unlink2,
  Trash2,
  Eye,
  Sliders,
  Layers3
} from 'lucide-react';
import { createProceduralCoral } from '../engine/coralGenerators';
import { LumaGaussianSplatEngine } from '../engine/lumaSplatEngine';

export default function ThreeViewportNode({ data, id }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const coralGroupRef = useRef(null);
  const splatEngineRef = useRef(null);
  const animFrameRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState('oceanSun'); // 'oceanSun' | 'biolum'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('synthesized'); // 'synthesized' | 'extracted' | 'luma_splat'
  const [meshTelemetry, setMeshTelemetry] = useState({ vertices: 14200, faces: 28400, fps: 60 });
  const [splatReveal, setSplatReveal] = useState(1.0);

  const params = data.parameters || {};

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 380;
    const height = isFullscreen ? 420 : 260;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070d18');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 5.2);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.8;
    controls.maxDistance = 16;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // Underwater PBR Lighting
    const ambientLight = new THREE.AmbientLight('#38bdf8', 1.1);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(params.tentacleGlow || '#38bdf8', 1.5);
    rimLight.name = 'rimLight';
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(params.tentacleGlow || '#38bdf8', 2.0, 12);
    pointLight.position.set(0, 1.5, 0);
    scene.add(pointLight);

    // Bathymetric Substrate Grid
    const grid = new THREE.GridHelper(8, 16, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.21;
    scene.add(grid);

    // Instantiate Splat Engine
    const splatEngine = new LumaGaussianSplatEngine(scene, { particleRevealProgress: splatReveal });
    splatEngineRef.current = splatEngine;

    let lastTime = performance.now();
    let frameCount = 0;
    let isMounted = true;

    const animate = (time) => {
      if (!isMounted) return;
      animFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setMeshTelemetry((prev) => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastTime = now;
      }

      if (autoRotate) {
        if (coralGroupRef.current) coralGroupRef.current.rotation.y += 0.005;
      }

      if (splatEngineRef.current) {
        splatEngineRef.current.update(time, camera);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = isFullscreen ? 420 : 260;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (splatEngineRef.current) splatEngineRef.current.dispose();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [isFullscreen]);

  // Lighting preset updates
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070d18');
    const amb = sceneRef.current.getObjectByName('ambientLight');
    if (amb) {
      amb.color.set(lightingPreset === 'biolum' ? '#0e3a53' : '#38bdf8');
      amb.intensity = lightingPreset === 'biolum' ? 0.7 : 1.2;
    }
  }, [lightingPreset]);

  // Strict Single-Geometry Scene Update Logic
  useEffect(() => {
    if (!sceneRef.current) return;

    // 1. Thoroughly dispose and remove existing coral mesh
    if (coralGroupRef.current) {
      sceneRef.current.remove(coralGroupRef.current);
      coralGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material?.dispose();
        }
      });
      coralGroupRef.current = null;
    }

    // 2. Thoroughly dispose existing splat object
    if (splatEngineRef.current) {
      splatEngineRef.current.dispose();
    }

    // 3. Render ONLY the selected view mode
    if (viewMode === 'luma_splat' && (data.splatInput || data.splatData) && splatEngineRef.current) {
      const source = data.splatInput?.source || data.splatInput || data.splatData;
      splatEngineRef.current.loadSplat(source, {
        particleRevealEnabled: true,
        pointScale: 2.2,
      });

      setMeshTelemetry((prev) => ({
        ...prev,
        vertices: (data.splatInput?.count || data.splatData?.count || 18000),
        faces: 0,
      }));
      return;
    }

    if (viewMode === 'extracted' && data.reconstructedGeometry) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(params.primaryColor || '#38bdf8'),
        roughness: 0.45,
        metalness: 0.15,
        wireframe: wireframe,
        vertexColors: data.reconstructedGeometry.attributes.color ? true : false,
      });

      const mesh = new THREE.Mesh(data.reconstructedGeometry, mat);
      mesh.position.y = 0.4;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const group = new THREE.Group();
      group.add(mesh);
      sceneRef.current.add(group);
      coralGroupRef.current = group;

      const pos = data.reconstructedGeometry.attributes.position;
      setMeshTelemetry((prev) => ({
        ...prev,
        vertices: pos ? pos.count : 24000,
        faces: data.reconstructedGeometry.index ? data.reconstructedGeometry.index.count / 3 : 48000,
      }));
      return;
    }

    // Default: Synthesized Interpolated Geometry
    createProceduralCoral(params).then((coralGroup) => {
      if (!sceneRef.current) return;
      coralGroupRef.current = coralGroup;

      if (wireframe) {
        coralGroup.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.wireframe = true;
          }
        });
      }

      sceneRef.current.add(coralGroup);

      let totalVerts = 0;
      let totalFaces = 0;
      coralGroup.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const p = child.geometry.attributes.position;
          if (p) totalVerts += p.count;
          if (child.geometry.index) totalFaces += child.geometry.index.count / 3;
        }
      });

      setMeshTelemetry((prev) => ({
        ...prev,
        vertices: totalVerts || 18500,
        faces: totalFaces || 37000,
      }));

      if (data.onCoralMeshReady) {
        data.onCoralMeshReady(coralGroup);
      }
    });
  }, [params, wireframe, viewMode, data.reconstructedGeometry, data.splatInput, data.splatData]);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 2.2, 5.2);
      controlsRef.current.target.set(0, 0.8, 0);
      controlsRef.current.update();
    }
  };

  const handleSplatRevealChange = (val) => {
    setSplatReveal(val);
    if (splatEngineRef.current) {
      splatEngineRef.current.setParticleRevealProgress(val);
    }
  };

  return (
    <div
      className="coral-node"
      style={{
        minWidth: isFullscreen ? '780px' : '440px',
        zIndex: isFullscreen ? 1000 : 10,
        transition: 'width 0.3s ease',
        borderColor: 'rgba(139, 92, 246, 0.4)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="viewport-in"
        style={{ top: '50%', background: '#8b5cf6', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      {/* Header */}
      <div className="node-header">
        <div className="node-title-group">
          <div
            className="node-icon-wrapper"
            style={{ color: '#c084fc', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
          >
            <Box size={18} />
          </div>
          <div>
            <div className="node-title">Three.js 3D Seawall Viewport</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Single Geometry Viewport Mode
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={handleResetCamera}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Reset Orbit Camera"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`btn-secondary ${autoRotate ? 'active' : ''}`}
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Toggle Auto Rotation"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`btn-secondary ${wireframe ? 'active' : ''}`}
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Toggle Wireframe"
          >
            <Layers size={13} />
          </button>
          <button
            onClick={() => setLightingPreset(lightingPreset === 'oceanSun' ? 'biolum' : 'oceanSun')}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Toggle Oceanic Lighting"
          >
            {lightingPreset === 'oceanSun' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Expand Viewport"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          {data.onUnlinkNode && (
            <button
              onClick={() => data.onUnlinkNode(id || 'node-three-viewport')}
              className="btn-secondary"
              style={{ padding: '4px 6px', fontSize: '11px' }}
              title="Unlink Viewport"
            >
              <Unlink2 size={13} />
            </button>
          )}
          {data.onDeleteNode && (
            <button
              onClick={() => data.onDeleteNode(id || 'node-three-viewport')}
              className="btn-secondary"
              style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--accent-coral)' }}
              title="Delete Viewport"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="node-body" style={{ padding: '10px' }}>
        {/* Active Geometry Viewport Mode Switcher */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Layers3 size={12} style={{ color: '#c084fc' }} /> DISPLAY MODE:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '11px',
              padding: '4px 8px',
            }}
          >
            <option value="synthesized">Single Synthesized Interpolated Mesh</option>
            <option value="extracted">Extracted Watertight Splat Mesh</option>
            <option value="luma_splat">Luma AI 3D Gaussian Radiance Splat</option>
          </select>
        </div>

        <div
          ref={containerRef}
          className="nodrag nowheel"
          style={{
            width: '100%',
            height: isFullscreen ? '420px' : '260px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0b1528 0%, #030712 100%)',
            position: 'relative',
          }}
        />

        {viewMode === 'luma_splat' && (
          <div style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#38bdf8' }}>
              <span>Luma Particle Reveal Transition</span>
              <span>{Math.round(splatReveal * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              className="nodrag nopan"
              value={splatReveal}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onChange={(e) => handleSplatRevealChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>
        )}

        {/* Telemetry Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: 'var(--text-dim)',
            marginTop: '6px',
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          <span>OrbitControls: <b>Drag to Orbit</b> • <b>Scroll: Zoom</b></span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span>Vertices/Points: <b style={{ color: '#c084fc' }}>{meshTelemetry.vertices.toLocaleString()}</b></span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{meshTelemetry.fps} FPS</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="viewport-out"
        style={{ top: '50%', background: '#8b5cf6', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />
    </div>
  );
}
