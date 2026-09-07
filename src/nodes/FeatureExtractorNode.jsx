import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Activity, Disc, Sparkles, Layers, Trash2, BrainCircuit, Unlink2 } from 'lucide-react';
import ParamInfo from '../components/ParamInfo';

export default function FeatureExtractorNode({ data, id }) {
  const features = data.features || {
    morphologyType: 'branching',
    branchingFactor: 0.85,
    rugosity: 0.65,
    caliceDensity: 0.5,
    meanderingFreq: 0.2,
    fractalDimension: 1.75,
    colorPalette: ['#0284c7', '#38bdf8', '#bae6fd', '#0369a1', '#f0f9ff'],
    confidenceScore: 0.94,
    fourierSlope: -2.35,
  };

  const isAnalyzing = data.isAnalyzing || false;
  const specimenName = data.specimenName || 'Specimen';
  const nodeLabel = data.label || 'Morphological Vision Extractor';
  const engine = features.engine || 'PyTorch MobileNetV3 + FFT';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data.onDeleteNode) {
      data.onDeleteNode(id);
    }
  };

  return (
    <div className="coral-node" style={{ minWidth: '340px' }}>
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        style={{ top: '50%' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div
            className="node-icon-wrapper"
            style={{
              color: 'var(--accent-teal)',
              background: 'rgba(20, 184, 166, 0.12)',
              borderColor: 'rgba(20, 184, 166, 0.3)',
            }}
          >
            <BrainCircuit size={18} />
          </div>
          <div>
            <div className="node-title">{nodeLabel}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Source: <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{specimenName}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nodrag nopan">
          <span className="glass-pill" style={{ color: 'var(--accent-teal)', fontSize: '10px' }}>
            {isAnalyzing ? 'PyTorch...' : 'PyTorch DL'}
          </span>
          {data.onUnlinkNode && (
            <button
              onClick={() => data.onUnlinkNode(id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-cyan)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title="Unlink All Wires from this Node"
            >
              <Unlink2 size={14} />
            </button>
          )}
          {data.onDeleteNode && (
            <button
              onClick={handleDelete}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-coral)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title="Delete Node"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="node-body nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
        {/* Research Deep Learning Badge */}
        <div
          style={{
            background: 'rgba(20, 184, 166, 0.08)',
            border: '1px solid rgba(20, 184, 166, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
          }}
        >
          <span style={{ color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} /> {engine}
          </span>
          <span style={{ color: '#fff', fontWeight: 600 }}>
            Conf: {((features.confidenceScore || 0.92) * 100).toFixed(0)}%
          </span>
        </div>

        {/* Feature Meters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {/* Branching Factor */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={13} style={{ color: 'var(--accent-cyan)' }} /> Branching
                <ParamInfo paramKey="branchingFactor" />
              </span>
              <span className="slider-value">
                {((features.branchingFactor || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(features.branchingFactor || 0) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-cyan)',
                }}
              />
            </div>
          </div>

          {/* Rugosity Index */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Activity size={13} style={{ color: 'var(--accent-teal)' }} /> Rugosity
                <ParamInfo paramKey="rugosity" />
              </span>
              <span className="slider-value">
                {((features.rugosity || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(features.rugosity || 0) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-teal)',
                }}
              />
            </div>
          </div>

          {/* Calice Polyp Density */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Disc size={13} style={{ color: 'var(--accent-amber)' }} /> Calices
                <ParamInfo paramKey="caliceDensity" />
              </span>
              <span className="slider-value">
                {((features.caliceDensity || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(features.caliceDensity || 0) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-amber)',
                }}
              />
            </div>
          </div>

          {/* Fractal Dimension */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={13} style={{ color: 'var(--accent-coral)' }} /> Fractal D
                <ParamInfo paramKey="fractalDimension" />
              </span>
              <span className="slider-value">{features.fractalDimension || 1.6}</span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(((features.fractalDimension || 1.6) - 1.0) / 1.0) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-coral)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Latent Activation Map (SOM) */}
        <div style={{ marginTop: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              Deep Latent Activations:
              <ParamInfo paramKey="latentVector" />
            </span>
            <span style={{ fontSize: '9px', color: 'var(--accent-teal)' }}>16D Projection</span>
          </div>
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '2px',
              background: 'rgba(0,0,0,0.4)',
              padding: '4px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {(features.latentVector || Array(16).fill(0.1)).map((val, i) => {
              // Normalize latent value roughly from [-3, 3] to [0, 1] for visualization
              const intensity = Math.max(0, Math.min(1, (val + 3) / 6));
              const r = Math.round(14 * (1 - intensity) + 20 * intensity);
              const g = Math.round(165 * intensity + 20 * (1 - intensity));
              const b = Math.round(233 * intensity + 20 * (1 - intensity));
              
              return (
                <div
                  key={i}
                  style={{
                    height: '12px',
                    background: `rgb(${r}, ${g}, ${b})`,
                    borderRadius: '2px',
                    opacity: 0.3 + (intensity * 0.7),
                    boxShadow: intensity > 0.6 ? `0 0 4px rgba(${r}, ${g}, ${b}, 0.5)` : 'none',
                    transition: 'all 0.5s ease',
                  }}
                  title={`Dim ${i}: ${val.toFixed(3)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Extracted Pigment Palette */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '6px',
            }}
          >
            Extracted Pigments:
          </div>
          <div style={{ display: 'flex', gap: '6px', height: '22px' }}>
            {(features.colorPalette || ['#06b6d4', '#0284c7', '#38bdf8', '#0e3a53', '#f0f9ff']).map(
              (c, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: c,
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                  title={c}
                />
              )
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="features-out"
        style={{ top: '50%' }}
      />
    </div>
  );
}
