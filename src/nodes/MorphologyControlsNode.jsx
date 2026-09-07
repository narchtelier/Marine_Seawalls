import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sliders, Shuffle, GitMerge, Trash2, Cpu, Unlink2 } from 'lucide-react';
import ParamInfo from '../components/ParamInfo';

export default function MorphologyControlsNode({ data, id }) {
  const params = data.parameters || {};
  const onChange = data.onUpdateParameter || (() => {});
  const connectedInputs = data.connectedExtractors || [];
  const inputWeights = data.inputWeights || {};
  const nodeLabel = data.label || '3. Morphology Parameter Synthesizer';

  const handleChange = (key, val) => {
    onChange(key, val);
  };

  const handleRandomize = (e) => {
    e.stopPropagation();
    if (data.onRandomize) {
      data.onRandomize();
    }
  };

  const handleWeightChange = (extractorId, newWeight) => {
    if (data.onUpdateWeights) {
      data.onUpdateWeights(extractorId, newWeight);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data.onDeleteNode) {
      data.onDeleteNode(id);
    }
  };

  return (
    <div className="coral-node" style={{ minWidth: '380px' }}>
      <Handle
        type="target"
        position={Position.Left}
        id="controls-in"
        style={{ top: '50%' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div
            className="node-icon-wrapper"
            style={{
              color: 'var(--accent-coral)',
              background: 'rgba(244, 63, 94, 0.12)',
              borderColor: 'rgba(244, 63, 94, 0.3)',
            }}
          >
            <Sliders size={18} />
          </div>
          <div>
            <div className="node-title">{nodeLabel}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {connectedInputs.length > 0
                ? `${connectedInputs.length} Specimen${connectedInputs.length > 1 ? 's' : ''} Synthesized`
                : 'Stand-alone Synthesis'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="nodrag nopan">
          <button
            onClick={handleRandomize}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Randomize variation"
          >
            <Shuffle size={12} /> Jitter
          </button>
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
        {/* MULTI-INPUT SYNTHESIS & MORPHING MIXER */}
        {connectedInputs.length > 1 && (
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <GitMerge size={14} /> Deep Morphing Interpolation
              </span>
              <span className="glass-pill" style={{ color: 'var(--accent-cyan)', fontSize: '10px' }}>
                Active Blending
              </span>
            </div>

            {/* If exactly 2 inputs, show 2-way blend morph bar */}
            {connectedInputs.length === 2 && (
              <div className="slider-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {connectedInputs[0].specimenName || 'Specimen A'}
                  </span>
                  <span style={{ color: 'var(--accent-coral)', fontWeight: 600 }}>
                    {connectedInputs[1].specimenName || 'Specimen B'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  className="nodrag nopan"
                  value={inputWeights[connectedInputs[1].id] !== undefined ? inputWeights[connectedInputs[1].id] : 0.5}
                  onChange={(e) => {
                    const w2 = parseFloat(e.target.value);
                    const w1 = 1 - w2;
                    if (data.onSetDualWeights) {
                      data.onSetDualWeights(connectedInputs[0].id, w1, connectedInputs[1].id, w2);
                    }
                  }}
                />
              </div>
            )}

            {/* Individual influence sliders for each connected specimen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connectedInputs.map((input) => {
                const weight = inputWeights[input.id] !== undefined ? inputWeights[input.id] : 1 / connectedInputs.length;
                return (
                  <div key={input.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                        <Cpu size={12} style={{ color: input.features?.primaryColor || 'var(--accent-teal)' }} />
                        {input.specimenName}
                        <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                          ({input.features?.morphologyType})
                        </span>
                      </span>
                      <span className="slider-value">{(weight * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      className="nodrag nopan"
                      value={weight}
                      onChange={(e) => handleWeightChange(input.id, parseFloat(e.target.value))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Morphology Class Selector */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Dominant Archetype
              <ParamInfo paramKey="morphologyType" />
            </span>
            <span className="slider-value" style={{ textTransform: 'uppercase' }}>
              {params.morphologyType || 'branching'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {['branching', 'brain', 'massive', 'table'].map((t) => (
              <button
                key={t}
                onClick={() => handleChange('morphologyType', t)}
                style={{
                  padding: '6px 2px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border:
                    params.morphologyType === t
                      ? '1px solid var(--accent-coral)'
                      : '1px solid var(--border-subtle)',
                  background:
                    params.morphologyType === t ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.2)',
                  color: params.morphologyType === t ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Branching Factor Slider */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Branching Factor (Arborescent Bifurcation)
              <ParamInfo paramKey="branchingFactor" />
            </span>
            <span className="slider-value">{(params.branchingFactor || 0.8).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.02"
            max="1.0"
            step="0.01"
            className="nodrag nopan"
            value={params.branchingFactor || 0.8}
            onChange={(e) => handleChange('branchingFactor', parseFloat(e.target.value))}
          />
        </div>

        {/* Rugosity Slider */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Surface Rugosity & Wavelet Noise
              <ParamInfo paramKey="rugosity" />
            </span>
            <span className="slider-value">{(params.rugosity || 0.6).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.01"
            className="nodrag nopan"
            value={params.rugosity || 0.6}
            onChange={(e) => handleChange('rugosity', parseFloat(e.target.value))}
          />
        </div>

        {/* Calice Density */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Corallite Calice Pore Density
              <ParamInfo paramKey="caliceDensity" />
            </span>
            <span className="slider-value">{(params.caliceDensity || 0.5).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            className="nodrag nopan"
            value={params.caliceDensity || 0.5}
            onChange={(e) => handleChange('caliceDensity', parseFloat(e.target.value))}
          />
        </div>

        {/* Meandering Frequency (Brain Corals) */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Meandroid Sinuosity & Valleys
              <ParamInfo paramKey="meanderingFreq" />
            </span>
            <span className="slider-value">{(params.meanderingFreq || 0.2).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.01"
            className="nodrag nopan"
            value={params.meanderingFreq || 0.2}
            onChange={(e) => handleChange('meanderingFreq', parseFloat(e.target.value))}
          />
        </div>

        {/* Fractal Dimension */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Fractal Dimension D (Tortuosity)
              <ParamInfo paramKey="fractalDimension" />
            </span>
            <span className="slider-value">{(params.fractalDimension || 1.7).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="1.1"
            max="2.0"
            step="0.02"
            className="nodrag nopan"
            value={params.fractalDimension || 1.7}
            onChange={(e) => handleChange('fractalDimension', parseFloat(e.target.value))}
          />
        </div>

        {/* Growth Scale Matrix */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>
              Colony Growth Scale
              <ParamInfo paramKey="growthScale" />
            </span>
            <span className="slider-value">{(params.growthScale || 1.0).toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.05"
            className="nodrag nopan"
            value={params.growthScale || 1.0}
            onChange={(e) => handleChange('growthScale', parseFloat(e.target.value))}
          />
        </div>

        {/* Color Palette Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '4px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
              <span>Primary Albedo</span>
              <ParamInfo paramKey="primaryColor" />
            </div>
            <input
              type="color"
              className="nodrag nopan"
              value={params.primaryColor || '#0ea5e9'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              style={{
                width: '100%',
                height: '28px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
              <span>Polyp Fluorescence</span>
              <ParamInfo paramKey="tentacleGlow" />
            </div>
            <input
              type="color"
              className="nodrag nopan"
              value={params.tentacleGlow || '#38bdf8'}
              onChange={(e) => handleChange('tentacleGlow', e.target.value)}
              style={{
                width: '100%',
                height: '28px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="controls-out"
        style={{ top: '50%' }}
      />
    </div>
  );
}
