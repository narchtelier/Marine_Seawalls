import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Sparkles,
  Upload,
  Eye,
  Sliders,
  Trash2,
  Unlink,
  RefreshCw,
  Layers,
  Info,
  CheckCircle,
  AlertCircle,
  Play,
  Scissors
} from 'lucide-react';
import { LumaGaussianSplatEngine, LUMA_PRESETS, generateSyntheticReefSplats } from '../engine/lumaSplatEngine';

export default function SplatIngestNode({ id, data }) {
  const [pointCount, setPointCount] = useState(18000);
  const [pointScale, setPointScale] = useState(2.2);
  const [opacityCutoff, setOpacityCutoff] = useState(0.12);
  const [selectedDataset, setSelectedDataset] = useState('luma_coral_reef');
  const [customLumaUrl, setCustomLumaUrl] = useState('');
  const [particleRevealProgress, setParticleRevealProgress] = useState(1.0);
  const [semanticsMask, setSemanticsMask] = useState('ALL'); // 'ALL' | 'FOREGROUND' | 'BACKGROUND'

  const [splatStats, setSplatStats] = useState({
    points: 18000,
    bounds: '2.4m x 1.8m x 1.2m',
    meanScale: '0.042m',
    shDegree: 3,
    engineMode: 'Luma AI WebGL Splats (Three.js)',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Luma Splat engine active');

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const splatEngineRef = useRef(null);
  const reqIdRef = useRef(null);

  // Initialize Three.js viewport and Luma Splat Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 210;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
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

    // Bathymetric Substrate Grid
    const grid = new THREE.GridHelper(3.5, 12, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.85;
    scene.add(grid);

    // Initialize Luma Splat Engine
    const engine = new LumaGaussianSplatEngine(scene, {
      particleRevealProgress: particleRevealProgress,
      semanticsMask: semanticsMask,
    });
    splatEngineRef.current = engine;

    // Load default preset
    const preset = LUMA_PRESETS.find((p) => p.id === selectedDataset) || LUMA_PRESETS[0];
    const source = preset.type === 'luma_url' ? preset.url : generateSyntheticReefSplats(preset.id, pointCount);

    engine.loadSplat(source, {
      pointScale: pointScale,
      opacityCutoff: opacityCutoff,
      count: pointCount,
      onLoad: (splatObj) => {
        setSplatStats((prev) => ({
          ...prev,
          engineMode: engine.isLumaNative ? 'Native LumaSplatsThree' : 'Anisotropic ThreeGS Shader',
        }));

        if (data?.onSplatDataReady) {
          data.onSplatDataReady({
            dataset: selectedDataset,
            source: source,
            isLumaNative: engine.isLumaNative,
            count: pointCount,
          });
        }
      },
    });

    let isMounted = true;
    const animate = (time) => {
      if (!isMounted) return;
      reqIdRef.current = requestAnimationFrame(animate);

      if (splatEngineRef.current) {
        splatEngineRef.current.update(time, camera);
        if (splatEngineRef.current.currentObject) {
          splatEngineRef.current.currentObject.rotation.y += 0.0025;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (splatEngineRef.current) splatEngineRef.current.dispose();
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  // Handle Dataset Change
  const handleDatasetSelect = (datasetId) => {
    setSelectedDataset(datasetId);
    if (!splatEngineRef.current) return;

    setIsLoading(true);
    setStatusMsg('Loading Luma Splats...');

    const preset = LUMA_PRESETS.find((p) => p.id === datasetId);
    let source;
    if (preset && preset.type === 'luma_url') {
      source = preset.url;
    } else {
      source = generateSyntheticReefSplats(datasetId, pointCount);
    }

    splatEngineRef.current.loadSplat(source, {
      pointScale: pointScale,
      opacityCutoff: opacityCutoff,
      count: pointCount,
      onLoad: () => {
        setIsLoading(false);
        setStatusMsg('Splat loaded successfully');
        setSplatStats((prev) => ({
          ...prev,
          engineMode: splatEngineRef.current.isLumaNative ? 'Native LumaSplatsThree' : 'Anisotropic ThreeGS Shader',
        }));
      },
    });
  };

  // Handle Custom Luma URL Ingestion
  const handleLoadCustomLumaUrl = () => {
    if (!customLumaUrl.trim() || !splatEngineRef.current) return;
    setIsLoading(true);
    setStatusMsg('Ingesting Luma Capture URL...');
    setSelectedDataset('custom_luma');

    splatEngineRef.current.loadSplat(customLumaUrl.trim(), {
      pointScale: pointScale,
      opacityCutoff: opacityCutoff,
      onLoad: () => {
        setIsLoading(false);
        setStatusMsg('Luma Capture active');
      },
    });
  };

  // Update Particle Reveal Uniform
  const handleRevealChange = (val) => {
    setParticleRevealProgress(val);
    if (splatEngineRef.current) {
      splatEngineRef.current.setParticleRevealProgress(val);
    }
  };

  return (
    <div className="custom-node" style={{ width: '400px', borderColor: 'rgba(56, 189, 248, 0.45)' }}>
      {/* Node Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(56, 189, 248, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(244, 63, 94, 0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              Luma AI 3DGS Ingestion & Viewport
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Three.js Radiance Field Pipeline
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
        {/* Preset & Luma URL Selector */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
            LUMA AI SPECIMEN DATASET
          </div>
          <select
            value={selectedDataset}
            onChange={(e) => handleDatasetSelect(e.target.value)}
            className="input-select"
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: 'var(--text-bright)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            {LUMA_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.type === 'luma_url' ? 'Luma Capture URL' : 'Synthetic 3DGS Cloud'})
              </option>
            ))}
            <option value="custom_luma">Custom Luma AI Capture URL...</option>
          </select>
        </div>

        {selectedDataset === 'custom_luma' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="https://lumalabs.ai/capture/..."
              value={customLumaUrl}
              onChange={(e) => setCustomLumaUrl(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '6px',
                padding: '5px 8px',
                color: '#fff',
                fontSize: '11px',
              }}
            />
            <button
              onClick={handleLoadCustomLumaUrl}
              style={{
                background: '#38bdf8',
                color: '#090d16',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ingest
            </button>
          </div>
        )}

        {/* 3D Viewport Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '210px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'radial-gradient(circle at center, #0b1528 0%, #030712 100%)',
          }}
        >
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Engine Mode Badge */}
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
                background: isLoading ? '#f59e0b' : '#38bdf8',
                boxShadow: '0 0 6px #38bdf8',
              }}
            />
            {isLoading ? 'Loading Splats...' : splatStats.engineMode}
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

        {/* Luma Feature Controls: Particle Reveal & Semantics */}
        <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Play size={12} style={{ color: '#38bdf8' }} /> Particle Reveal Entrance
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>
              {Math.round(particleRevealProgress * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            className="nodrag nopan"
            value={particleRevealProgress}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => handleRevealChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Gaussian Splat Radius</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>{pointScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            className="nodrag nopan"
            value={pointScale}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => {
              setPointScale(parseFloat(e.target.value));
              if (splatEngineRef.current && splatEngineRef.current.currentObject?.material?.uniforms?.uPointScale) {
                splatEngineRef.current.currentObject.material.uniforms.uPointScale.value = parseFloat(e.target.value);
              }
            }}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>

        {/* Telemetry Footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Gaussians: <strong style={{ color: 'var(--text-bright)' }}>{pointCount.toLocaleString()}</strong>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '4px 6px', borderRadius: '4px' }}>
            Blend: <strong style={{ color: 'var(--text-bright)' }}>Three.js Alpha Sort</strong>
          </div>
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
