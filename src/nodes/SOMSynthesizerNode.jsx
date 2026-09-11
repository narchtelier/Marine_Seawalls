import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Grid,
  Activity,
  Zap,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  Trash2,
  Unlink
} from 'lucide-react';
import { generateSOMGrid } from '../engine/somInterpolation';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';
import { interpolateGeometriesSOM, getFallbackSpecimenGeometry } from '../engine/somGeometryInterpolator';

export default function SOMSynthesizerNode({ id, data }) {
  const [heatmapMode, setHeatmapMode] = useState('j_eco'); // 'j_eco' | 'tau_diss' | 'sigma_rec' | 'phi'
  const [selectedCoord, setSelectedCoord] = useState({ x: 5, y: 5 });
  const [hoveredCell, setHoveredCell] = useState(null);

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

  // Generate 10x10 SOM latent space matrix grounded in the connected geometries
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

  // Compute color based on metric
  const getCellColor = (cell) => {
    const val = cell.metrics[heatmapMode] || 0.5;
    if (heatmapMode === 'j_eco') {
      // Emerald / Cyan
      const h = 160 + val * 60;
      return `hsl(${h}, 85%, ${30 + val * 35}%)`;
    } else if (heatmapMode === 'tau_diss') {
      // Amber / Orange
      const h = 25 + val * 45;
      return `hsl(${h}, 90%, ${35 + val * 30}%)`;
    } else if (heatmapMode === 'sigma_rec') {
      // Teal / Blue
      const h = 190 + val * 30;
      return `hsl(${h}, 85%, ${35 + val * 30}%)`;
    } else {
      // Purple / Violet (Porosity)
      const h = 270 + val * 40;
      return `hsl(${h}, 80%, ${35 + val * 30}%)`;
    }
  };

  return (
    <div className="custom-node" style={{ width: '420px', borderColor: 'rgba(16, 185, 129, 0.45)' }}>
      {/* Input Handle from Watertight Viewport */}
      <Handle
        type="target"
        position={Position.Left}
        id="som-in"
        style={{ background: '#10b981', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(16, 185, 129, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <Grid size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              4. 10x10 SOM Synthesizer Grid
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              3D Self-Organizing Map Latent Morphospace (100 Geometries)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
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
        {/* Heatmap Metric Selector */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '6px' }}>
          {[
            { id: 'j_eco', label: 'Eco-Fitness (J_eco)' },
            { id: 'tau_diss', label: 'Wave Shear (τ_diss)' },
            { id: 'sigma_rec', label: 'Settlement (σ_rec)' },
            { id: 'phi', label: 'Porosity (Φ)' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setHeatmapMode(m.id)}
              style={{
                flex: 1,
                fontSize: '10px',
                padding: '4px 2px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: heatmapMode === m.id ? '#10b981' : 'transparent',
                color: heatmapMode === m.id ? '#022c22' : 'var(--text-dim)',
                fontWeight: heatmapMode === m.id ? 700 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              {m.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Grid Axis Anchors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', padding: '0 2px' }}>
          <span style={{ color: '#10b981', fontWeight: 600 }}>◀ 100% Specimen A</span>
          <span style={{ color: '#f472b6', fontWeight: 600 }}>Synthetic Hybrids</span>
          <span style={{ color: '#0ea5e9', fontWeight: 600 }}>100% Specimen B ▶</span>
        </div>

        {/* 10x10 SOM Interactive Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '3px',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          {somGrid.map((row, j) =>
            row.map((cell, i) => {
              const isSelected = selectedCoord.x === i && selectedCoord.y === j;
              return (
                <div
                  key={`${i}-${j}`}
                  onClick={() => setSelectedCoord({ x: i, y: j })}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    aspectRatio: '1',
                    background: getCellColor(cell),
                    borderRadius: '3px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                    boxShadow: isSelected ? '0 0 10px #10b981' : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    zIndex: isSelected ? 10 : 1,
                    transition: 'transform 0.1s ease',
                  }}
                  title={`Cell (${i},${j}) - Blend: ${(cell.weightA * 100).toFixed(0)}% A / ${(cell.weightB * 100).toFixed(0)}% B - Score: ${((cell.metrics[heatmapMode] || 0) * 100).toFixed(0)}%`}
                />
              );
            })
          )}
        </div>

        {/* Selected Cell Biometric Readout */}
        {activeCell && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                Selected Cell ({activeCell.x}, {activeCell.y})
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                Morphology: <b style={{ color: '#fff' }}>{activeCell.parameters.morphologyType}</b>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '10px' }}>
              <div>Rugosity: <b>{activeCell.parameters.rugosity.toFixed(2)}</b></div>
              <div>Branching: <b>{activeCell.parameters.branchingFactor.toFixed(2)}</b></div>
              <div>Eco Fitness: <b style={{ color: '#10b981' }}>{(activeCell.metrics.j_eco * 100).toFixed(0)}%</b></div>
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
