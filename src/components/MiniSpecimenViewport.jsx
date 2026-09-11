import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { RotateCw, Layers, Sparkles, Box, Eye } from 'lucide-react';
import { createProceduralCoral } from '../engine/coralGenerators';

export default function MiniSpecimenViewport({
  parameters,
  splatData,
  meshGeometry,
  renderMode = 'splat', // 'splat' | 'mesh' | 'both'
  height = 200,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const splatPointsRef = useRef(null);
  const meshObjectRef = useRef(null);
  const animFrameRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [viewMode, setViewMode] = useState(renderMode);

  const params = parameters || {};

  useEffect(() => {
    setViewMode(renderMode);
  }, [renderMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050b14');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 50);
    camera.position.set(0, 1.6, 3.8);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 12;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // Underwater Lighting Setup
    const ambientLight = new THREE.AmbientLight('#38bdf8', 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(params.tentacleGlow || '#38bdf8', 1.4);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const bottomLight = new THREE.DirectionalLight('#0284c7', 0.5);
    bottomLight.position.set(0, -3, 0);
    scene.add(bottomLight);

    // Subtle Bathymetric Depth Grid
    const grid = new THREE.GridHelper(4, 10, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.7;
    scene.add(grid);

    // Animation Loop
    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate) {
        if (splatPointsRef.current) splatPointsRef.current.rotation.y += 0.005;
        if (meshObjectRef.current) meshObjectRef.current.rotation.y += 0.005;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(nw, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [height]);

  // Update Gaussian Splat points or Mesh when inputs change
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 1. Clean up existing objects
    if (splatPointsRef.current) {
      scene.remove(splatPointsRef.current);
      splatPointsRef.current.geometry.dispose();
      splatPointsRef.current = null;
    }
    if (meshObjectRef.current) {
      scene.remove(meshObjectRef.current);
      meshObjectRef.current = null;
    }

    // 2. Add 3D Gaussian Splats if present and mode allows
    if (splatData && (viewMode === 'splat' || viewMode === 'both')) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(splatData.positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(splatData.colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geo, mat);
      points.position.y = 0.4;
      scene.add(points);
      splatPointsRef.current = points;
    }

    // 3. Add Extracted or Procedural Mesh if in mesh/both mode
    let isCancelled = false;
    if (viewMode === 'mesh' || viewMode === 'both' || !splatData) {
      if (meshGeometry) {
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(params.primaryColor || '#0284c7'),
          roughness: 0.4,
          metalness: 0.1,
          wireframe: wireframe,
          flatShading: false,
        });

        const mesh = new THREE.Mesh(meshGeometry, mat);
        mesh.position.y = 0.4;
        scene.add(mesh);
        meshObjectRef.current = mesh;
      } else if (!splatData) {
        createProceduralCoral({
          morphologyType: params.morphologyType || 'branching',
          branchingFactor: params.branchingFactor || 0.6,
          rugosity: params.rugosity || 0.5,
          growthScale: 0.8,
          primaryColor: params.primaryColor || '#0284c7',
        }).then((coralGroup) => {
          if (isCancelled || !sceneRef.current) return;
          coralGroup.position.y = 0.4;
          scene.add(coralGroup);
          meshObjectRef.current = coralGroup;
        }).catch((err) => {
          console.warn("Failed to generate mini specimen coral:", err);
        });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [splatData, meshGeometry, viewMode, wireframe, params.primaryColor, params.morphologyType, params.branchingFactor, params.rugosity]);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px`, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating View Controls */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '4px',
          background: 'rgba(7, 13, 24, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '2px 4px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`btn-secondary ${autoRotate ? 'active' : ''}`}
          style={{ padding: '3px 6px', fontSize: '10px' }}
          title="Toggle Auto-Rotate"
        >
          <RotateCw size={11} />
        </button>
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`btn-secondary ${wireframe ? 'active' : ''}`}
          style={{ padding: '3px 6px', fontSize: '10px' }}
          title="Toggle Wireframe"
        >
          <Layers size={11} />
        </button>
        {splatData && (
          <button
            onClick={() => setViewMode(viewMode === 'splat' ? 'mesh' : viewMode === 'mesh' ? 'both' : 'splat')}
            className="btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px', color: '#38bdf8' }}
            title="Switch Splat / Solid Mesh View"
          >
            {viewMode === 'splat' ? <Sparkles size={11} /> : <Box size={11} />}
          </button>
        )}
      </div>

      {/* Footer Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '8px',
          fontSize: '9px',
          color: 'var(--text-dim)',
          pointerEvents: 'none',
        }}
      >
        Three.js PBR • Drag: Orbit • Scroll: Zoom • Right-click: Pan
      </div>
    </div>
  );
}
