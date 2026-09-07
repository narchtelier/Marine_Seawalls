import React from 'react';
import { Waves, Sparkles, Layers, ShieldCheck, GitMerge, Plus, RefreshCw } from 'lucide-react';

export default function Header({
  onResetLayout,
  onLoadDualSpecimenTemplate,
  onLoadTripleSpecimenTemplate,
  onAddImagePool,
  onAddExtractor,
}) {
  return (
    <header
      style={{
        height: '60px',
        padding: '0 20px',
        background: 'rgba(7, 13, 24, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
          }}
        >
          <Waves size={20} color="#fff" />
        </div>
        <div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Marine_Seawalls
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}
            >
              Multi-Pool Morphing Studio
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Multi-Image Pool Feature Extraction & Multi-Input Procedural Synthesizer
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Quick Node Spawners */}
        <button
          onClick={onAddImagePool}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <Plus size={13} style={{ color: 'var(--accent-cyan)' }} /> + Image Pool
        </button>

        <button
          onClick={onAddExtractor}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <Plus size={13} style={{ color: 'var(--accent-teal)' }} /> + Extractor
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Workflow Templates */}
        <button
          onClick={onLoadDualSpecimenTemplate}
          className="btn-primary"
          style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #0ea5e9 0%, #059669 100%)' }}
          title="Setup 2 Parallel Image Pools & Extractors into 1 Synthesizer"
        >
          <GitMerge size={14} /> Dual Specimen Setup
        </button>

        <button
          onClick={onLoadTripleSpecimenTemplate}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(139, 92, 246, 0.4)' }}
          title="Setup 3 Parallel Image Pools & Extractors into 1 Synthesizer"
        >
          <Sparkles size={14} style={{ color: 'var(--accent-violet)' }} /> Triple Hybrid Setup
        </button>

        <button
          onClick={onResetLayout}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          title="Reset Canvas Layout"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  );
}
