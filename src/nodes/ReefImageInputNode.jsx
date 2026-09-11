import React, { useRef, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Upload,
  Sparkles,
  Images,
  RefreshCw,
  Trash2,
  Unlink,
  Eye,
  Sliders
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';
import { generateSplatFromImage } from '../engine/imageToSplat';
import { createCustomGaussianSplatMesh } from '../engine/lumaSplatEngine';

export default function ReefImageInputNode({ id, data }) {
  const fileInputRef = useRef(null);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const splatMeshRef = useRef(null);
  const animIdRef = useRef(null);

  const initialPreset = data?.initialPresetIndex !== undefined
    ? (DEFAULT_CORAL_PRESETS[data.initialPresetIndex] || DEFAULT_CORAL_PRESETS[0])
    : DEFAULT_CORAL_PRESETS[0];

  const [selectedImage, setSelectedImage] = useState(initialPreset);
  const [userImages, setUserImages] = useState(DEFAULT_CORAL_PRESETS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [splatStats, setSplatStats] = useState({ count: 18000, bounds: '2.4m x 1.8m' });
  const [pointScale, setPointScale] = useState(2.2);
  const [depthExtrusion, setDepthExtrusion] = useState(1.2);

  // Initialize Three.js Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = 180;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 3.4);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controlsRef.current = controls;

    const grid = new THREE.GridHelper(3.5, 12, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.85;
    scene.add(grid);

    let isMounted = true;
    const animate = (time) => {
      if (!isMounted) return;
      animIdRef.current = requestAnimationFrame(animate);

      if (splatMeshRef.current) {
        splatMeshRef.current.rotation.y += 0.003;
        if (splatMeshRef.current.material?.uniforms?.uTime) {
          splatMeshRef.current.material.uniforms.uTime.value = time * 0.001;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  // Instant radius update handler
  const handlePointScaleChange = (newScale) => {
    setPointScale(newScale);
    if (splatMeshRef.current?.material?.uniforms?.uPointScale) {
      splatMeshRef.current.material.uniforms.uPointScale.value = newScale;
    }
  };

  // Process image into 3D Gaussian Splat (debounced for smooth slider scrubbing)
  useEffect(() => {
    if (!selectedImage?.previewUrl || !sceneRef.current) return;

    let isCurrent = true;
    setIsGenerating(true);

    const timer = setTimeout(() => {
      generateSplatFromImage(selectedImage.previewUrl, {
        depthExtrusion: depthExtrusion,
        splatScaleBase: 0.022 * (pointScale / 2.0),
      })
        .then((splat) => {
          if (!isCurrent) return;

          // Clean up previous splat mesh
          if (splatMeshRef.current) {
            sceneRef.current.remove(splatMeshRef.current);
            if (splatMeshRef.current.geometry) splatMeshRef.current.geometry.dispose();
            if (splatMeshRef.current.material) splatMeshRef.current.material.dispose();
            splatMeshRef.current = null;
          }

          // Build 3DGS Three.js Mesh
          const mesh = createCustomGaussianSplatMesh(splat, {
            pointScale: pointScale,
            particleRevealProgress: 1.0,
          });

          sceneRef.current.add(mesh);
          splatMeshRef.current = mesh;

          setSplatStats({
            count: splat.count,
            bounds: `${(splat.bounds.max[0] - splat.bounds.min[0]).toFixed(1)}m x ${(splat.bounds.max[1] - splat.bounds.min[1]).toFixed(1)}m`,
          });

          setIsGenerating(false);

          // Notify downstream nodes
          if (data?.onSplatDataReady) {
            data.onSplatDataReady(splat, id);
          }
        })
        .catch((err) => {
          console.warn('Image to splat synthesis error:', err);
          if (isCurrent) setIsGenerating(false);
        });
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [selectedImage, depthExtrusion]);

  // Handle user image upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newImg = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        previewUrl: event.target.result,
        features: {
          ...DEFAULT_CORAL_PRESETS[0].features,
          morphologyType: 'branching',
        },
      };

      setUserImages((prev) => [newImg, ...prev]);
      setSelectedImage(newImg);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="custom-node" style={{ width: '390px', borderColor: 'rgba(56, 189, 248, 0.45)' }}>
      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(56, 189, 248, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Images size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              1. Coral Reef Imagery Input
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Photogrammetry & 3DGS Synthesis
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {data?.onUnlinkNode && (
            <button
              className="btn-icon"
              title="Unlink Edges"
              onClick={() => data.onUnlinkNode(id)}
              style={{ width: '22px', height: '22px' }}
            >
              <Unlink size={12} />
            </button>
          )}
          {data?.onDeleteNode && (
            <button
              className="btn-icon"
              title="Delete Node"
              onClick={() => data.onDeleteNode(id)}
              style={{ width: '22px', height: '22px', color: 'var(--accent-coral)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="node-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Upload Button & Specimen Picker */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Upload size={13} /> Upload Coral Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Thumbnail Selector */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {userImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              style={{
                width: '60px',
                height: '46px',
                flexShrink: 0,
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: selectedImage.id === img.id ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
              }}
            >
              <img src={img.previewUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>

        {/* 3D Gaussian Splat Preview Viewport */}
        <div
          className="nodrag nowheel"
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'radial-gradient(circle at center, #0b1528 0%, #030712 100%)',
          }}
        >
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Status Badge */}
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
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isGenerating ? '#f59e0b' : '#38bdf8',
                boxShadow: '0 0 6px #38bdf8',
              }}
            />
            {isGenerating ? 'Synthesizing 3DGS...' : `${splatStats.count.toLocaleString()} Gaussians`}
          </div>
        </div>

        {/* Splat Parameters */}
        <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Splat Radius</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>{pointScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            className="nodrag nopan"
            value={pointScale}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => handlePointScaleChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Volumetric Depth Extrusion</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>{depthExtrusion.toFixed(1)}m</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.1"
            className="nodrag nopan"
            value={depthExtrusion}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => setDepthExtrusion(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="splat-out"
        style={{
          background: '#38bdf8',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />
    </div>
  );
}
