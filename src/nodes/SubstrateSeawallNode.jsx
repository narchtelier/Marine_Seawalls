import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Waves, Shield, Anchor, Droplets, Trash2 } from 'lucide-react';

export default function SubstrateSeawallNode({ data, id }) {
  const params = data.parameters || {};
  const onChange = data.onUpdateParameter || (() => {});

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data.onDeleteNode) {
      data.onDeleteNode(id);
    }
  };

  return (
    <div className="coral-node" style={{ minWidth: '320px' }}>
      <Handle
        type="target"
        position={Position.Left}
        id="substrate-in"
        style={{ top: '50%' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper" style={{ color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <Waves size={18} />
          </div>
          <div>
            <div className="node-title">5. Seawall Habitat Substrate</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Eco-Engineering & Attachment Matrix
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nodrag nopan">
          <span className="glass-pill" style={{ color: 'var(--accent-emerald)' }}>Eco-Block</span>
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
        {/* Substrate Mount Mode */}
        <div className="slider-group">
          <div className="slider-label-row">
            <span>Substrate Foundation</span>
            <span className="slider-value">{params.substrateType || 'seawall'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {['seawall', 'flat', 'none'].map((s) => (
              <button
                key={s}
                onClick={() => onChange('substrateType', s)}
                style={{
                  padding: '6px 2px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: params.substrateType === s ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  background: params.substrateType === s ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.2)',
                  color: params.substrateType === s ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Eco Metrics */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} style={{ color: 'var(--accent-cyan)' }} /> Wave Shear Dissipation:
            </span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>88.4%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Anchor size={12} style={{ color: 'var(--accent-teal)' }} /> Larval Recruitment Cavity:
            </span>
            <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>Optimal (9.2mm)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Droplets size={12} style={{ color: 'var(--accent-emerald)' }} /> Tidal Micro-Pool Volume:
            </span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>142 cm³</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="substrate-out"
        style={{ top: '50%' }}
      />
    </div>
  );
}
