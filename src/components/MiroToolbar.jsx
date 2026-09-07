import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Map,
  RefreshCw,
  Images,
  Cpu,
  Sliders,
  Box,
  Waves,
  Download,
  GitMerge,
} from 'lucide-react';

export default function MiroToolbar({
  activeTool,
  setActiveTool,
  onAddNode,
  onFitView,
  onZoomIn,
  onZoomOut,
  showMinimap,
  setShowMinimap,
  onResetLayout,
  onLoadDualSpecimenTemplate,
  onLoadTripleSpecimenTemplate,
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="miro-toolbar">
      {/* Selection Mode */}
      <button
        className={`miro-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
      >
        <MousePointer size={18} />
        <span className="tooltip">Select & Drag (V)</span>
      </button>

      {/* Pan Hand Mode */}
      <button
        className={`miro-tool-btn ${activeTool === 'hand' ? 'active' : ''}`}
        onClick={() => setActiveTool('hand')}
      >
        <Hand size={18} />
        <span className="tooltip">Pan Canvas (H)</span>
      </button>

      {/* Add Node Menu */}
      <div style={{ position: 'relative' }}>
        <button
          className={`miro-tool-btn ${showAddMenu ? 'active' : ''}`}
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus size={18} />
          <span className="tooltip">Add Node (+)</span>
        </button>

        {showAddMenu && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              left: '52px',
              top: '0',
              zIndex: 200,
              width: '230px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', padding: '4px 8px' }}>
              SPAWN CANVAS NODE
            </div>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('imagePool');
                setShowAddMenu(false);
              }}
            >
              <Images size={14} style={{ color: 'var(--accent-cyan)' }} /> Image Pool Node
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('featureExtractor');
                setShowAddMenu(false);
              }}
            >
              <Cpu size={14} style={{ color: 'var(--accent-teal)' }} /> Feature Extractor Node
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('morphologyControls');
                setShowAddMenu(false);
              }}
            >
              <Sliders size={14} style={{ color: 'var(--accent-coral)' }} /> Synthesizer Node
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('threeViewport');
                setShowAddMenu(false);
              }}
            >
              <Box size={14} style={{ color: 'var(--accent-violet)' }} /> 3D Viewport Node
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('substrateSeawall');
                setShowAddMenu(false);
              }}
            >
              <Waves size={14} style={{ color: 'var(--accent-emerald)' }} /> Seawall Substrate Node
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('exportNode');
                setShowAddMenu(false);
              }}
            >
              <Download size={14} style={{ color: 'var(--accent-amber)' }} /> Morphology Exporter
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Fit View */}
      <button className="miro-tool-btn" onClick={onFitView}>
        <Maximize size={18} />
        <span className="tooltip">Fit to Screen (F)</span>
      </button>

      {/* Zoom In */}
      <button className="miro-tool-btn" onClick={onZoomIn}>
        <ZoomIn size={18} />
        <span className="tooltip">Zoom In (+)</span>
      </button>

      {/* Zoom Out */}
      <button className="miro-tool-btn" onClick={onZoomOut}>
        <ZoomOut size={18} />
        <span className="tooltip">Zoom Out (-)</span>
      </button>

      {/* Toggle Minimap */}
      <button
        className={`miro-tool-btn ${showMinimap ? 'active' : ''}`}
        onClick={() => setShowMinimap(!showMinimap)}
      >
        <Map size={18} />
        <span className="tooltip">Toggle Minimap (M)</span>
      </button>

      <div style={{ width: '100%', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Reset Layout */}
      <button className="miro-tool-btn" onClick={onResetLayout}>
        <RefreshCw size={18} />
        <span className="tooltip">Organize Auto-Layout</span>
      </button>
    </div>
  );
}
