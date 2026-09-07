import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { Box, Maximize2, Minimize2, Eye, Sun, Moon, RotateCw, Sparkles, Layers } from 'lucide-react';
import { createProceduralCoral } from '../engine/coralGenerators';

export default function ThreeViewportNode({ data }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const coralGroupRef = useRef(null);
  const animFrameRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState('oceanSun'); // 'oceanSun' | 'biolum' | 'lab'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const params = data.parameters || {};

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 380;
    const height = isFullscreen ? window.innerHeight - 100 : 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070d18');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 5.5);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Setup Lighting
    const ambientLight = new THREE.AmbientLight(
      lightingPreset === 'biolum' ? '#0e3a53' : '#38bdf8',
      lightingPreset === 'biolum' ? 0.8 : 1.2
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(params.tentacleGlow || '#38bdf8', 2.0, 10);
    pointLight.position.set(0, 1.5, 0);
    scene.add(pointLight);

    // Grid Floor
    const grid = new THREE.GridHelper(8, 16, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.21;
    scene.add(grid);

    // Interaction Controls (Manual Pointer Dragging)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 5.5, theta: 0.8, phi: 1.1 };

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi) + 0.8;
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0.8, 0);
    };

    const dom = renderer.domElement;
    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.01;
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 + 0.1, spherical.phi - dy * 0.01));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(2.5, Math.min(10, spherical.radius + e.deltaY * 0.005));
      updateCamera();
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (autoRotate && coralGroupRef.current && !isDragging) {
        coralGroupRef.current.rotation.y += delta * 0.4;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [lightingPreset, isFullscreen]);

  // Re-generate Procedural Coral on Parameter Change
  useEffect(() => {
    if (!sceneRef.current) return;

    if (coralGroupRef.current) {
      sceneRef.current.remove(coralGroupRef.current);
      // Clean memory
      coralGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }

    const coralGroup = createProceduralCoral(params);
    coralGroupRef.current = coralGroup;

    // Apply Wireframe if active
    if (wireframe) {
      coralGroup.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = true;
        }
      });
    }

    sceneRef.current.add(coralGroup);
    if (data.onCoralMeshReady) {
      data.onCoralMeshReady(coralGroup);
    }
  }, [params, wireframe]);

  return (
    <div
      className="coral-node"
      style={{
        minWidth: isFullscreen ? '780px' : '400px',
        zIndex: isFullscreen ? 1000 : 10,
        transition: 'width 0.3s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="viewport-in"
        style={{ top: '50%' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper" style={{ color: 'var(--accent-violet)', background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <Box size={18} />
          </div>
          <div>
            <div className="node-title">4. Procedural 3D Coral Viewport</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              WebGL Three.js • PBR Subsurface Shader
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
        </div>
      </div>

      <div className="node-body" style={{ padding: '10px' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: isFullscreen ? '420px' : '260px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#070d18',
            cursor: 'grab',
            position: 'relative',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
          <span>Drag to Orbit • Scroll to Zoom</span>
          <span style={{ color: 'var(--accent-cyan)' }}>60 FPS Realtime</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="viewport-out"
        style={{ top: '50%' }}
      />
    </div>
  );
}
