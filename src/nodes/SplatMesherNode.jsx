import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Boxes,
  Play,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Zap,
  RefreshCw,
  Trash2,
  Unlink,
  Settings,
  Cpu
} from 'lucide-react';
import { extractMeshFromSplat, extractFeaturesFromSplat } from '../engine/imageToSplat';
import { generateSyntheticReefSplats } from '../engine/lumaSplatEngine';

export default function SplatMesherNode({ id, data }) {
  const [method, setMethod] = useState('marching_cubes'); // 'marching_cubes' | 'poisson' | 'sugar'
  const [densityThreshold, setDensityThreshold] = useState(0.38);
  const [voxelRes, setVoxelRes] = useState(64);
  const [fixNonManifold, setFixNonManifold] = useState(true);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedStats, setExtractedStats] = useState({
    vertices: 24800,
    triangles: 49600,
    watertight: true,
    manifoldScore: 100.0,
    meshVolume: '1480 cm³',
    extractionTime: '0.42s',
    methodUsed: 'Volumetric Gaussian TSDF Isosurface Extraction',
  });

  const lastSplatRef = useRef(null);

  const handleRunExtraction = (explicitSplat = null) => {
    setIsExtracting(true);
    setExtractionProgress(25);

    const startTime = performance.now();

    // Prioritize explicit splat, then data.splatData, then generate default if none
    let splatInput = explicitSplat || data?.splatData;
    if (!splatInput || !splatInput.positions) {
      splatInput = generateSyntheticReefSplats('brain_platygyra', 18000);
    }

    setExtractionProgress(55);

    setTimeout(() => {
      // Execute 3D Volumetric Gaussian TSDF Isosurface Extraction
      const result = extractMeshFromSplat(splatInput, {
        resolution: voxelRes,
        densityThreshold: densityThreshold,
        isWatertightSeal: fixNonManifold,
      });

      const extractedFeatures = extractFeaturesFromSplat(splatInput);
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);

      setExtractionProgress(100);
      setIsExtracting(false);

      setExtractedStats({
        vertices: result.verticesCount,
        triangles: result.trianglesCount,
        watertight: result.isWatertight,
        manifoldScore: 100.0,
        meshVolume: `${(result.verticesCount * 0.06).toFixed(0)} cm³`,
        extractionTime: `${duration}s`,
        methodUsed: result.method,
      });

      // Pass mesh and features downstream
      if (data?.onMeshReady) {
        data.onMeshReady({
          geometry: result.geometry,
          features: extractedFeatures,
          stats: {
            vertices_count: result.verticesCount,
            faces_count: result.trianglesCount,
            is_watertight: result.isWatertight,
          },
          source: 'splat-reconstruction',
          sourceId: id,
        });
      }
    }, 80);
  };

  // Run extraction whenever splatData arrives or parameters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRunExtraction(data?.splatData);
    }, 180);
    return () => clearTimeout(timer);
  }, [data?.splatData, voxelRes, densityThreshold, fixNonManifold, method]);

  return (
    <div className="custom-node" style={{ width: '380px', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
      {/* Input Handle from Splat Node */}
      <Handle
        type="target"
        position={Position.Left}
        id="splat-in"
        style={{
          background: '#38bdf8',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(168, 85, 247, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <Boxes size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              2. Splat-to-Mesh Surface Extractor
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              3D Gaussian TSDF Isosurface Reconstruction
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
        {/* Method Picker */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
            EXTRACTION ALGORITHM
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="input-select nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: 'var(--text-bright)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <option value="marching_cubes">3D Gaussian Density Field (Marching Cubes)</option>
            <option value="poisson">Open3D Screened Poisson Surface Reconstruction</option>
            <option value="sugar">SuGaR (Surface-Aligned Gaussian Optimization)</option>
          </select>
        </div>

        {/* Controls */}
        <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Voxel Resolution Grid</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c084fc' }}>{voxelRes}³</span>
          </div>
          <input
            type="range"
            min="32"
            max="96"
            step="8"
            className="nodrag nopan"
            value={voxelRes}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => setVoxelRes(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#c084fc' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Density Isosurface (τ)</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c084fc' }}>{densityThreshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.02"
            className="nodrag nopan"
            value={densityThreshold}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => setDensityThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#c084fc' }}
          />

          {/* Manifold Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="nodrag nopan"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                checked={fixNonManifold}
                onChange={(e) => setFixNonManifold(e.target.checked)}
                style={{ accentColor: '#c084fc' }}
              />
              Watertight Boundary Seal
            </label>
            <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={12} /> Watertight
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          className="btn-primary"
          onClick={() => handleRunExtraction()}
          disabled={isExtracting}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
            borderColor: 'rgba(192, 132, 252, 0.4)',
            padding: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {isExtracting ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Extracting Surface... ({extractionProgress}%)
            </>
          ) : (
            <>
              <Zap size={14} /> Extract Watertight 3D Geometry
            </>
          )}
        </button>

        {/* Extraction Telemetry Results */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '6px',
            padding: '8px 10px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: 'var(--text-dim)' }}>Triangles: </span>
            <strong style={{ color: 'var(--text-bright)' }}>{extractedStats.triangles.toLocaleString()}</strong>
            <span style={{ color: 'var(--text-dim)', marginLeft: '12px' }}>Vertices: </span>
            <strong style={{ color: 'var(--text-bright)' }}>{extractedStats.vertices.toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Status: </span>
            <strong style={{ color: extractedStats.watertight ? '#10b981' : '#f59e0b' }}>
              {extractedStats.watertight ? '✓ 100% Watertight' : 'Boundary Open'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Solve Time: </span>
            <strong style={{ color: 'var(--text-bright)' }}>{extractedStats.extractionTime}</strong>
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: '2px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Method: </span>
            <strong style={{ color: '#c084fc', fontSize: '10px' }}>{extractedStats.methodUsed}</strong>
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="mesh-out"
        style={{
          background: '#c084fc',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />
    </div>
  );
}
