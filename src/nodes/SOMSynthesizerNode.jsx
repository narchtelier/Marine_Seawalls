import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Grid,
  Box,
  RotateCw,
  Flame,
  Blend,
  Trash2,
  Unlink,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { generateSOMGrid } from '../engine/somInterpolation';
import { interpolateGeometriesSOM, getFallbackSpecimenGeometry } from '../engine/somGeometryInterpolator';
import SOMGridCanvas from '../components/SOMGridCanvas';

function SOMSynthesizerNode({ id, data }) {
  const [displayMode, setDisplayMode] = useState('wireframe'); // 'wireframe' | 'hybrid' | 'heatmap'
  const [heatmapMode, setHeatmapMode] = useState('j_eco'); // 'j_eco' | 'tau_diss' | 'sigma_rec' | 'phi'
  const [selectedCoord, setSelectedCoord] = useState({ x: 5, y: 5 });
  const [hoveredCell, setHoveredCell] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);

  // Derived input specimens from MorphologySynthesizerNode or upstream extractors
  const inputSource = useMemo(() => {
    if (data?.synthesizerData?.specimens) return data.synthesizerData.specimens;
    if (data?.specimens) return data.specimens;
    if (data?.features) return [{ name: 'Extracted Input', features: data.features }];
    return [];
  }, [data?.synthesizerData, data?.specimens, data?.features]);

  // Extract source 3D geometries for true SOM geometric morphing
  const geomA = useMemo(() => {
    return data?.geometryA ||
      data?.synthesizerData?.geometryA ||
      data?.specimens?.[0]?.geometry ||
      getFallbackSpecimenGeometry('brain');
  }, [data?.geometryA, data?.synthesizerData?.geometryA, data?.specimens]);

  const geomB = useMemo(() => {
    return data?.geometryB ||
      data?.synthesizerData?.geometryB ||
      data?.specimens?.[1]?.geometry ||
      getFallbackSpecimenGeometry('other');
  }, [data?.geometryB, data?.synthesizerData?.geometryB, data?.specimens]);

  // Generate 10x10 SOM latent space matrix
  const somGrid = useMemo(() => {
    return generateSOMGrid(inputSource);
  }, [inputSource]);

  // Selected cell object with real interpolated 3D geometry
  const activeCell = useMemo(() => {
    if (!somGrid || somGrid.length === 0) return null;
    const row = somGrid[selectedCoord.y] || somGrid[0];
    const baseCell = row[selectedCoord.x] || row[0];

    const u = selectedCoord.x / 9.0;
    const v = selectedCoord.y / 9.0;

    // Execute real volumetric SOM 3D geometry interpolation
    const morphedGeometry = interpolateGeometriesSOM(geomA, geomB, u, { u, v });

    return {
      ...baseCell,
      geometry: morphedGeometry,
      interpolatedGeometry: morphedGeometry,
      weightA: 1.0 - u,
      weightB: u,
    };
  }, [somGrid, selectedCoord, geomA, geomB]);

  // Notify downstream nodes whenever active cell changes
  useEffect(() => {
    if (activeCell && data?.onSelectInterpolated) {
      data.onSelectInterpolated(activeCell);
    }
  }, [activeCell]);

  const displayCell = hoveredCell || activeCell;

  return (
    <div
      className="custom-node"
      style={{
        width: '424px',
        borderColor: 'rgba(16, 185, 129, 0.55)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(16, 185, 129, 0.15)',
      }}
    >
      {/* Input Handle from Watertight Viewport / Synthesizer */}
      <Handle
        type="target"
        position={Position.Left}
        id="som-in"
        style={{ background: '#10b981', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(16, 185, 129, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(14, 165, 233, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Grid size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              4. 10x10 SOM Synthesizer Grid
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              3D Wireframe Latent Morphospace (100 Geometries)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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

      <div className="node-content" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {/* Controls Bar: Mode Switcher & 3D Auto-Rotate */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Mode Switcher */}
          <div style={{ flex: 1, display: 'flex', gap: '3px', background: 'rgba(15, 23, 42, 0.75)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'wireframe', label: '3D Wireframe', icon: Box },
              { id: 'hybrid', label: 'Hybrid Glow', icon: Blend },
              { id: 'heatmap', label: 'Heatmap', icon: Flame },
            ].map((mode) => {
              const Icon = mode.icon;
              const active = displayMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setDisplayMode(mode.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    padding: '4px 3px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#10b981' : 'transparent',
                    color: active ? '#022c22' : 'var(--text-dim)',
                    fontWeight: active ? 700 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={11} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3D Orbit / Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              padding: '5px 7px',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              background: autoRotate ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.75)',
              color: autoRotate ? '#34d399' : 'var(--text-dim)',
              fontWeight: autoRotate ? 700 : 500,
              transition: 'all 0.15s ease',
            }}
            title="Toggle continuous 3D rotation of the morphospace"
          >
            <RotateCw size={11} className={autoRotate ? 'animate-spin' : ''} />
            <span>{autoRotate ? 'Rotating' : 'Rotate 3D'}</span>
          </button>
        </div>

        {/* Heatmap Metric Selector */}
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(11, 19, 32, 0.65)', padding: '2px', borderRadius: '5px' }}>
          {[
            { id: 'j_eco', label: 'J_eco (Eco-Fitness)' },
            { id: 'tau_diss', label: 'τ_diss (Wave Shear)' },
            { id: 'sigma_rec', label: 'σ_rec (Settlement)' },
            { id: 'phi', label: 'Φ (Porosity)' },
          ].map((m) => {
            const active = heatmapMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setHeatmapMode(m.id)}
                style={{
                  flex: 1,
                  fontSize: '9.5px',
                  padding: '3px 1px',
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                  color: active ? '#34d399' : 'var(--text-dim)',
                  borderBottom: active ? '2px solid #10b981' : '2px solid transparent',
                  fontWeight: active ? 700 : 500,
                  transition: 'all 0.12s ease',
                }}
                title={m.label}
              >
                {m.label.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Grid Axis Anchors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', padding: '0 2px' }}>
          <span style={{ color: '#10b981', fontWeight: 600 }}>◀ 100% Specimen A</span>
          <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '9px', opacity: 0.85 }}>
            100 3D Wireframe Snapshots
          </span>
          <span style={{ color: '#0ea5e9', fontWeight: 600 }}>100% Specimen B ▶</span>
        </div>

        {/* 10x10 Single-Canvas Zero-Drag 3D Wireframe Grid */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SOMGridCanvas
            somGrid={somGrid}
            geomA={geomA}
            geomB={geomB}
            activeGeometry={activeCell?.geometry}
            displayMode={displayMode}
            heatmapMode={heatmapMode}
            selectedCoord={selectedCoord}
            hoveredCell={hoveredCell}
            onSelectCoord={setSelectedCoord}
            onHoverCell={setHoveredCell}
            autoRotate={autoRotate}
            width={384}
            height={384}
          />
        </div>

        {/* Compact HUD Line (Cell viewer removed; lightweight telemetry only) */}
        {displayCell && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(11, 19, 32, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '5px',
              padding: '5px 8px',
              fontSize: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                Cell ({displayCell.x}, {displayCell.y})
              </span>
              <span style={{ color: 'var(--text-dim)' }}>•</span>
              <span style={{ color: '#e2e8f0' }}>
                {(displayCell.weightA * 100).toFixed(0)}% A / {(displayCell.weightB * 100).toFixed(0)}% B
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                {displayCell.parameters.morphologyType.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 700,
                  fontSize: '9.5px',
                }}
              >
                J_eco: {((displayCell.metrics.j_eco || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Output Handle to Interpolated Viewport */}
      <Handle
        type="source"
        position={Position.Right}
        id="som-out"
        style={{ background: '#10b981', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />
    </div>
  );
}

export default React.memo(SOMSynthesizerNode);
