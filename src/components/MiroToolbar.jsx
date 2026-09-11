import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  Scissors,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Map,
  RefreshCw,
  Images,
  Sparkles,
  Box,
  Grid,
  Download,
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

      {/* Wire Cutting Scissors Mode */}
      <button
        className={`miro-tool-btn ${activeTool === 'cut' ? 'active' : ''}`}
        onClick={() => setActiveTool(activeTool === 'cut' ? 'select' : 'cut')}
        style={activeTool === 'cut' ? { background: 'rgba(244, 63, 94, 0.25)', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.5)' } : {}}
      >
        <Scissors size={18} />
        <span className="tooltip">Cut Wires / Disconnect (C)</span>
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
              width: '260px',
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
                onAddNode('reefImageInput');
                setShowAddMenu(false);
              }}
            >
              <Images size={14} style={{ color: '#38bdf8' }} /> 1. Reef Imagery Input
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('splatMesher');
                setShowAddMenu(false);
              }}
            >
              <Box size={14} style={{ color: '#c084fc' }} /> 2. Splat Surface Extractor
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('watertightViewport');
                setShowAddMenu(false);
              }}
            >
              <Box size={14} style={{ color: '#a855f7' }} /> 3. Watertight Mesh Viewport
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('morphologySynthesizer');
                setShowAddMenu(false);
              }}
            >
              <GitMerge size={14} style={{ color: '#f472b6' }} /> Multi-Mesh Synthesizer
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('somSynthesizer');
                setShowAddMenu(false);
              }}
            >
              <Grid size={14} style={{ color: '#10b981' }} /> 4. 10x10 SOM Synthesizer Grid
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('interpolatedViewport');
                setShowAddMenu(false);
              }}
            >
              <Sparkles size={14} style={{ color: '#fbbf24' }} /> 5. Interpolated Viewport
            </button>

            <button
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                onAddNode('exportNode');
                setShowAddMenu(false);
              }}
            >
              <Download size={14} style={{ color: '#f59e0b' }} /> 6. Production Exporter
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
