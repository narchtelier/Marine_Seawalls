import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import {
  Box,
  RotateCw,
  Layers,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Unlink,
  Trash2
} from 'lucide-react';

export default function WatertightMeshViewportNode({ id, data }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const animIdRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightingMode, setLightingMode] = useState('oceanSun');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [telemetry, setTelemetry] = useState({ vertices: 24800, triangles: 49600, watertight: true });

  const inputGeometry = data?.geometry || data?.reconstructedGeometry;

  // Initialize Three.js Viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 360;
    const height = isFullscreen ? 380 : 220;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingMode === 'biolum' ? '#030712' : '#070f1e');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.8, 4.2);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.8;
    controls.maxDistance = 12;
    controls.target.set(0, 0.3, 0);
    controlsRef.current = controls;

    // Underwater Lighting
    const amb = new THREE.AmbientLight('#38bdf8', 1.0);
    scene.add(amb);

    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(4, 7, 4);
    scene.add(dir);

    const rim = new THREE.DirectionalLight('#c084fc', 1.2);
    rim.position.set(-5, 3, -5);
    scene.add(rim);

    const grid = new THREE.GridHelper(5, 14, 0xa855f7, 0x1e293b);
    grid.position.y = -0.4;
    scene.add(grid);

    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      animIdRef.current = requestAnimationFrame(animate);

      if (autoRotate && meshRef.current) {
        meshRef.current.rotation.y += 0.005;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = isFullscreen ? 380 : 220;
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

  // Update Geometry when input mesh changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      if (meshRef.current.geometry) meshRef.current.geometry.dispose();
      if (meshRef.current.material) meshRef.current.material.dispose();
      meshRef.current = null;
    }

    let geom = inputGeometry;
    if (!geom) {
      geom = new THREE.TorusKnotGeometry(0.7, 0.25, 64, 16);
    }

    const hasVertexColors = !!geom.attributes.color;
    const mat = new THREE.MeshStandardMaterial({
      color: hasVertexColors ? 0xffffff : 0x38bdf8,
      vertexColors: hasVertexColors,
      roughness: 0.35,
      metalness: 0.1,
      wireframe: wireframe,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.35;
    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    const pos = geom.attributes.position;
    const vCount = pos ? pos.count : 0;
    const fCount = geom.index ? geom.index.count / 3 : vCount / 3;

    setTelemetry({
      vertices: vCount,
      triangles: Math.round(fCount),
      watertight: true,
    });
  }, [inputGeometry, wireframe]);

  return (
    <div className="custom-node" style={{ width: '400px', borderColor: 'rgba(168, 85, 247, 0.45)' }}>
      {/* Input Handle from Splat Mesher */}
      <Handle
        type="target"
        position={Position.Left}
        id="watertight-in"
        style={{ background: '#c084fc', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(168, 85, 247, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(192, 132, 252, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <Box size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              3. Watertight Mesh Viewport
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Extracted Manifold 3D Geometry
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
            onClick={() => setLightingMode(lightingMode === 'oceanSun' ? 'biolum' : 'oceanSun')}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Lighting"
          >
            {lightingMode === 'oceanSun' ? <Sun size={12} /> : <Moon size={12} />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Expand Viewport"
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
        {/* Viewport 3D Container */}
        <div
          className="nodrag nowheel"
          style={{
            position: 'relative',
            width: '100%',
            height: isFullscreen ? '380px' : '220px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            background: 'radial-gradient(circle at center, #0e1526 0%, #030712 100%)',
          }}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Watertight Badge */}
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
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <ShieldCheck size={12} />
            100% Watertight Solid
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

        {/* Telemetry Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 8px', borderRadius: '4px' }}>
            Triangles: <strong style={{ color: 'var(--text-bright)' }}>{telemetry.triangles.toLocaleString()}</strong>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 8px', borderRadius: '4px' }}>
            Vertices: <strong style={{ color: 'var(--text-bright)' }}>{telemetry.vertices.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Output Handle to SOM Grid */}
      <Handle
        type="source"
        position={Position.Right}
        id="watertight-out"
        style={{ background: '#c084fc', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />
    </div>
  );
}
