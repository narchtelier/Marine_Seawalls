import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import {
  Sparkles,
  RotateCw,
  Layers,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Unlink,
  Trash2,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { interpolateGeometriesSOM, getFallbackSpecimenGeometry } from '../engine/somGeometryInterpolator';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';

export default function InterpolatedGeometryViewportNode({ id, data }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const coralMeshRef = useRef(null);
  const animIdRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState('oceanSun');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meshTelemetry, setMeshTelemetry] = useState({ vertices: 22000, faces: 44000, fps: 60 });

  // Current interpolated parameters and weights from SOM grid selection
  const currentParams = data?.cell?.parameters || data?.parameters || DEFAULT_CORAL_PRESETS[0].features;
  const weightA = data?.cell?.weightA ?? 0.5;
  const weightB = data?.cell?.weightB ?? 0.5;

  // Initialize Three.js Viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 380;
    const height = isFullscreen ? 420 : 250;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070f1e');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.6, 4.2);
    camera.lookAt(0, 0.4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.8;
    controls.maxDistance = 14;
    controls.target.set(0, 0.4, 0);
    controlsRef.current = controls;

    // Underwater PBR Lighting
    const ambLight = new THREE.AmbientLight('#38bdf8', 1.0);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(4, 8, 4);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight('#fbbf24', 1.4);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(6, 16, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.3;
    scene.add(grid);

    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      animIdRef.current = requestAnimationFrame(animate);

      if (autoRotate && coralMeshRef.current) {
        coralMeshRef.current.rotation.y += 0.005;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = isFullscreen ? 420 : 250;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [isFullscreen]);

  // Lighting updates
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070f1e');
  }, [lightingPreset]);

  // Render the actual 3D interpolated geometry from the SOM grid
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clean up previous mesh
    if (coralMeshRef.current) {
      sceneRef.current.remove(coralMeshRef.current);
      if (coralMeshRef.current.geometry) coralMeshRef.current.geometry.dispose();
      if (coralMeshRef.current.material) {
        if (Array.isArray(coralMeshRef.current.material)) {
          coralMeshRef.current.material.forEach((m) => m.dispose());
        } else {
          coralMeshRef.current.material.dispose();
        }
      }
      coralMeshRef.current = null;
    }

    // Retrieve or compute the true interpolated 3D geometry
    let geom = data?.cell?.geometry || data?.cell?.interpolatedGeometry || data?.geometry;
    if (!geom) {
      const u = data?.cell?.u ?? 0.5;
      const v = data?.cell?.v ?? 0.5;
      const geomA = data?.geometryA || getFallbackSpecimenGeometry('brain');
      const geomB = data?.geometryB || getFallbackSpecimenGeometry('other');
      geom = interpolateGeometriesSOM(geomA, geomB, u, { u, v });
    }

    const hasColors = !!geom.attributes.color;
    const mat = new THREE.MeshStandardMaterial({
      color: hasColors ? 0xffffff : 0x10b981,
      vertexColors: hasColors,
      roughness: 0.35,
      metalness: 0.08,
      wireframe: wireframe,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.35;
    sceneRef.current.add(mesh);
    coralMeshRef.current = mesh;

    const pos = geom.attributes.position;
    const vCount = pos ? pos.count : 0;
    const fCount = geom.index ? Math.round(geom.index.count / 3) : Math.round(vCount / 3);

    setMeshTelemetry({
      vertices: vCount,
      faces: fCount,
      fps: 60,
    });

    // Pass synthesized mesh to Exporter node
    if (data?.onFinalMeshReady) {
      data.onFinalMeshReady({
        coralMesh: mesh,
        geometry: geom,
        parameters: currentParams,
      });
    }
  }, [data?.cell, data?.geometry, wireframe]);

  return (
    <div className="custom-node" style={{ width: '420px', borderColor: 'rgba(245, 158, 11, 0.45)' }}>
      {/* Input Handle from SOM Grid */}
      <Handle
        type="target"
        position={Position.Left}
        id="interpolated-in"
        style={{ background: '#fbbf24', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(245, 158, 11, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              5. Selected Interpolated Geometry
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Active SOM Morphospace Synthesized Specimen
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`btn-secondary ${autoRotate ? 'active' : ''}`}
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Auto Rotate"
          >
            <RotateCw size={12} />
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`btn-secondary ${wireframe ? 'active' : ''}`}
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Wireframe"
          >
            <Layers size={12} />
          </button>
          <button
            onClick={() => setLightingPreset(lightingPreset === 'oceanSun' ? 'biolum' : 'oceanSun')}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Lighting"
          >
            {lightingPreset === 'oceanSun' ? <Sun size={12} /> : <Moon size={12} />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Expand"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          {data?.onUnlinkNode && (
            <button
              className="btn-icon"
              title="Unlink"
              onClick={() => data.onUnlinkNode(id)}
              style={{ width: '22px', height: '22px' }}
            >
              <Unlink size={12} />
            </button>
          )}
          {data?.onDeleteNode && (
            <button
              className="btn-icon"
              title="Delete"
              onClick={() => data.onDeleteNode(id)}
              style={{ width: '22px', height: '22px', color: 'var(--accent-coral)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="node-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Viewport 3D Canvas */}
        <div
          className="nodrag nowheel"
          style={{
            position: 'relative',
            width: '100%',
            height: isFullscreen ? '420px' : '250px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            background: 'radial-gradient(circle at center, #0e1628 0%, #030712 100%)',
          }}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Interpolated Archetype Badge */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <CheckCircle2 size={12} />
            SOM 3D Morph: {(weightA * 100).toFixed(0)}% Specimen A + {(weightB * 100).toFixed(0)}% Specimen B
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontSize: '9px',
              color: 'var(--text-dim)',
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 6px',
              borderRadius: '3px',
            }}
          >
            Orbit: Drag | Zoom: Scroll
          </div>
        </div>

        {/* Live Morphometric Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            fontSize: '10px',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Rugosity: <b style={{ color: '#fff' }}>{(currentParams.rugosity || 0.5).toFixed(2)}</b>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Branching: <b style={{ color: '#fff' }}>{(currentParams.branchingFactor || 0.5).toFixed(2)}</b>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Calices: <b style={{ color: '#fff' }}>{(currentParams.caliceDensity || 0.5).toFixed(2)}</b>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Faces: <b style={{ color: '#fbbf24' }}>{meshTelemetry.faces.toLocaleString()}</b>
          </div>
        </div>
      </div>

      {/* Output Handle to Exporter */}
      <Handle
        type="source"
        position={Position.Right}
        id="interpolated-out"
        style={{ background: '#fbbf24', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />
    </div>
  );
}
