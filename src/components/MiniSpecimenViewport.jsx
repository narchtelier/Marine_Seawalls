import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, RotateCcw, Layers, Maximize2 } from 'lucide-react';
import { createProceduralCoral } from '../engine/coralGenerators';

export default function MiniSpecimenViewport({ parameters, height = 160 }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const coralGroupRef = useRef(null);
  const animFrameRef = useRef(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);

  const params = parameters || {};

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 280;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050b14');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 50);
    camera.position.set(0, 2.0, 4.5);
    camera.lookAt(0, 0.7, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight('#38bdf8', 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.6);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);

    // Rim backlight for Fresnel subsurface translucency
    const rimLight = new THREE.DirectionalLight(params.tentacleGlow || '#38bdf8', 1.3);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(params.tentacleGlow || '#38bdf8', 1.8, 8);
    pointLight.position.set(0, 1.2, 0);
    scene.add(pointLight);

    // Grid Floor
    const grid = new THREE.GridHelper(6, 12, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.21;
    scene.add(grid);

    // Interaction Orbit & Pan
    let isDragging = false;
    let dragMode = 'orbit';
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 4.5, theta: 0.7, phi: 1.1 };
    let target = new THREE.Vector3(0, 0.7, 0);

    const updateCamera = () => {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    };

    const dom = renderer.domElement;
    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      e.stopPropagation();
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        dragMode = 'pan';
      } else {
        dragMode = 'orbit';
      }
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.stopPropagation();
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      if (dragMode === 'pan') {
        const forward = new THREE.Vector3().subVectors(camera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();
        const up = new THREE.Vector3().crossVectors(forward, right).normalize();
        const panSpeed = spherical.radius / 600;
        target.addScaledVector(right, -dx * panSpeed);
        target.addScaledVector(up, dy * panSpeed);
      } else {
        spherical.theta -= dx * 0.012;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.2, spherical.phi - dy * 0.012));
      }

      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      spherical.radius = Math.max(1.5, Math.min(10, spherical.radius + e.deltaY * 0.004));
      updateCamera();
    };

    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    containerRef.current.resetView = () => {
      spherical = { radius: 4.5, theta: 0.7, phi: 1.1 };
      target = new THREE.Vector3(0, 0.7, 0);
      updateCamera();
    };

    // Render loop
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
  }, [height]);

  // Update Geometry
  useEffect(() => {
    if (!sceneRef.current) return;

    if (coralGroupRef.current) {
      sceneRef.current.remove(coralGroupRef.current);
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

    const coralGroup = createProceduralCoral({
      ...params,
      growthScale: params.growthScale || 0.85,
    });
    coralGroupRef.current = coralGroup;

    if (wireframe) {
      coralGroup.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = true;
        }
      });
    }

    sceneRef.current.add(coralGroup);
  }, [params, wireframe]);

  return (
    <div style={{ position: 'relative', width: '100%' }} className="nodrag nopan">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          background: '#050b14',
          cursor: 'grab',
          border: '1px solid rgba(56, 189, 248, 0.2)',
        }}
      />

      {/* Mini Viewport Overlay Controls */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '4px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => containerRef.current?.resetView?.()}
          className="btn-secondary"
          style={{ padding: '2px 5px', fontSize: '10px', background: 'rgba(0,0,0,0.6)' }}
          title="Reset Camera"
        >
          <RotateCcw size={11} />
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`btn-secondary ${autoRotate ? 'active' : ''}`}
          style={{ padding: '2px 5px', fontSize: '10px', background: 'rgba(0,0,0,0.6)' }}
          title="Toggle Rotation"
        >
          <RotateCw size={11} />
        </button>
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`btn-secondary ${wireframe ? 'active' : ''}`}
          style={{ padding: '2px 5px', fontSize: '10px', background: 'rgba(0,0,0,0.6)' }}
          title="Toggle Wireframe"
        >
          <Layers size={11} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9px',
          color: 'var(--text-dim)',
          marginTop: '3px',
          padding: '0 2px',
        }}
      >
        <span>Input Specimen 3D Mesh</span>
        <span style={{ color: 'var(--accent-teal)' }}>Interactive Orbit / Pan</span>
      </div>
    </div>
  );
}
