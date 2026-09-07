import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { Box, Maximize2, Minimize2, Eye, Sun, Moon, RotateCw, RotateCcw, Sparkles, Layers, Unlink2, Trash2 } from 'lucide-react';
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

  // Setup Three.js Scene once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 380;
    const height = 260;

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
    const ambientLight = new THREE.AmbientLight('#38bdf8', 1.2);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Rim backlight for Fresnel subsurface translucency
    const rimLight = new THREE.DirectionalLight(params.tentacleGlow || '#38bdf8', 1.5);
    rimLight.name = 'rimLight';
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(params.tentacleGlow || '#38bdf8', 2.2, 12);
    pointLight.position.set(0, 1.5, 0);
    scene.add(pointLight);

    // Grid Floor
    const grid = new THREE.GridHelper(8, 16, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.21;
    scene.add(grid);

    // Interaction Controls (Manual Pointer Dragging + Panning)
    let isDragging = false;
    let dragMode = 'orbit'; // 'orbit' | 'pan'
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 5.5, theta: 0.8, phi: 1.1 };
    let target = new THREE.Vector3(0, 0.8, 0);

    const updateCamera = () => {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    };

    const dom = renderer.domElement;
    
    // Prevent default context menu on right click to allow smooth right-click panning
    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      // Right click (button 2) or Shift + Left click -> Pan mode
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        dragMode = 'pan';
      } else {
        dragMode = 'orbit';
      }
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      if (dragMode === 'pan') {
        // Compute camera view orientation vectors for accurate screen-space panning
        const forward = new THREE.Vector3().subVectors(camera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();
        const up = new THREE.Vector3().crossVectors(forward, right).normalize();

        const panSpeed = (spherical.radius / 700);
        target.addScaledVector(right, -dx * panSpeed);
        target.addScaledVector(up, dy * panSpeed);
      } else {
        // Orbit mode
        spherical.theta -= dx * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.2, spherical.phi - dy * 0.01));
      }

      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(1.5, Math.min(14, spherical.radius + e.deltaY * 0.005));
      updateCamera();
    };

    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Expose reset view function to node ref
    containerRef.current.resetView = () => {
      spherical = { radius: 5.5, theta: 0.8, phi: 1.1 };
      target = new THREE.Vector3(0, 0.8, 0);
      updateCamera();
    };

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
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, []);

  // Update lighting preset dynamically
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(lightingPreset === 'biolum' ? '#030712' : '#070d18');
    const amb = sceneRef.current.getObjectByName('ambientLight');
    if (amb) {
      amb.color.set(lightingPreset === 'biolum' ? '#0e3a53' : '#38bdf8');
      amb.intensity = lightingPreset === 'biolum' ? 0.8 : 1.2;
    }
  }, [lightingPreset]);

  // Handle resize when isFullscreen changes
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
    const timer = setTimeout(() => {
      const w = containerRef.current.clientWidth || 380;
      const h = isFullscreen ? 420 : 260;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

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
            onClick={() => {
              if (containerRef.current?.resetView) {
                containerRef.current.resetView();
              }
            }}
            className="btn-secondary"
            style={{ padding: '4px 6px', fontSize: '11px' }}
            title="Reset Camera & Pan Center"
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
              onClick={() => data.onUnlinkNode(data.id || 'node-three-viewport')}
              className="btn-secondary"
              style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--text-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-cyan)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title="Unlink All Wires from this Viewport"
            >
              <Unlink2 size={13} />
            </button>
          )}
          {data.onDeleteNode && (
            <button
              onClick={() => data.onDeleteNode(data.id || 'node-three-viewport')}
              className="btn-secondary"
              style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--text-dim)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-coral)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title="Delete Viewport Node"
            >
              <Trash2 size={13} />
            </button>
          )}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
          <span>Left Drag: <b>Orbit</b> • Right/Shift Drag: <b>Pan</b> • Wheel: <b>Zoom</b></span>
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
