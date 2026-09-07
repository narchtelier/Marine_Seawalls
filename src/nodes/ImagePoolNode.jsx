import React, { useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Images, Upload, Trash2, CheckCircle2, Box, LayoutGrid, Columns, Search, Sparkles, Sliders, Unlink2 } from 'lucide-react';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';
import { parseCoralReefTaxonomy, CORAL_SPECIES_PRESETS } from '../engine/coralTaxonomy';
import MiniSpecimenViewport from '../components/MiniSpecimenViewport';

export default function ImagePoolNode({ data, id }) {
  const fileInputRef = useRef(null);
  const images = data.images || DEFAULT_CORAL_PRESETS;
  const selectedImage = data.selectedImage || images[0];
  const nodeLabel = data.label || 'Reference Image Pool';

  // View modes: 'grid' | '3d' | 'split'
  const [viewMode, setViewMode] = useState('split');
  
  // Custom Coral Reef / Species Name input state
  const [coralNameInput, setCoralNameInput] = useState('');
  // Fidelity slider state: 0.2 (Low) to 1.0 (Highest Ultra-HD Fidelity)
  const [fidelity, setFidelity] = useState(0.95);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImgs = files.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return {
        id: `custom-img-${Date.now()}-${idx}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        type: 'custom',
        previewUrl: url,
        file: file,
      };
    });

    if (data.onAddImages) {
      data.onAddImages(id, newImgs);
    }
  };

  const handleSelect = (img) => {
    if (data.onSelectImage) {
      data.onSelectImage(id, img);
    }
  };

  const handleDelete = () => {
    if (data.onDeleteNode) {
      data.onDeleteNode(id);
    }
  };

  // Generate 3D Specimen from user-inputted coral reef / species name
  const handleGenerateFromTaxonomy = (nameToUse) => {
    const targetName = nameToUse || coralNameInput;
    if (!targetName || targetName.trim() === '') return;

    const parsedSpecimen = parseCoralReefTaxonomy(targetName, fidelity);
    const newSpecimenObj = {
      id: `taxonomy-${Date.now()}`,
      name: parsedSpecimen.name,
      type: 'taxonomy',
      previewUrl: parsedSpecimen.previewUrl,
      features: {
        ...parsedSpecimen.features,
        fidelity: fidelity,
      },
    };

    if (data.onAddImages) {
      data.onAddImages(id, [newSpecimenObj]);
    } else if (data.onSelectImage) {
      data.onSelectImage(id, newSpecimenObj);
    }
  };

  // Handle fidelity slider change
  const handleFidelityChange = (newFidelity) => {
    setFidelity(newFidelity);
    if (selectedImage && data.onSelectImage) {
      const updatedImg = {
        ...selectedImage,
        features: {
          ...(selectedImage.features || DEFAULT_CORAL_PRESETS[0].features),
          fidelity: newFidelity,
        },
      };
      data.onSelectImage(id, updatedImg);
    }
  };

  const currentFeatures = {
    ...(selectedImage?.features || DEFAULT_CORAL_PRESETS[0].features),
    fidelity: fidelity,
  };

  const fidelityPercentage = Math.round(fidelity * 100);
  const gridResolution = Math.min(54, Math.max(26, Math.round(26 + fidelity * 28)));

  return (
    <div className="coral-node" style={{ minWidth: '380px' }}>
      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper">
            <Images size={18} />
          </div>
          <div>
            <div className="node-title">{nodeLabel}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Active: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{selectedImage?.name || 'None'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nodrag nopan">
          {/* View mode toggle buttons */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', gap: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-secondary ${viewMode === 'grid' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="Gallery Grid"
            >
              <LayoutGrid size={11} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`btn-secondary ${viewMode === 'split' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="Split 2D + 3D View"
            >
              <Columns size={11} />
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn-secondary ${viewMode === '3d' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="3D Specimen Geometry"
            >
              <Box size={11} />
            </button>
          </div>

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
        {/* CORAL REEF / SPECIES NAME INPUT & SEARCH */}
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Search size={12} /> Specific Coral Reef / Species Name:
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Instant 3D Replacement</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="nodrag nopan"
              placeholder="e.g. Acropora Cervicornis, Great Barrier Reef Brain Coral..."
              value={coralNameInput}
              onChange={(e) => setCoralNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleGenerateFromTaxonomy();
                }
              }}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleGenerateFromTaxonomy()}
              className="btn-primary"
              style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
              title="Generate & Replace 3D Geometry"
            >
              <Sparkles size={12} /> Replace 3D
            </button>
          </div>

          {/* Quick Species Suggestion Chips */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {CORAL_SPECIES_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setCoralNameInput(preset.name);
                  handleGenerateFromTaxonomy(preset.name);
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {preset.commonName}
              </button>
            ))}
          </div>
        </div>

        {/* 3D GEOMETRY FIDELITY SLIDER */}
        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Sliders size={12} style={{ color: 'var(--accent-teal)' }} /> 3D Mesh Geometry Fidelity:
            </span>
            <span className="slider-value" style={{ color: fidelity >= 0.9 ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
              {fidelityPercentage}% ({gridResolution}³ Voxels)
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            className="nodrag nopan"
            value={fidelity}
            onChange={(e) => handleFidelityChange(parseFloat(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)' }}>
            <span>Fast (26³)</span>
            <span>Balanced (40³)</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Ultra-HD (54³)</span>
          </div>
        </div>

        {/* 3D Geometry Preview View (Active in '3d' or 'split' modes) */}
        {(viewMode === '3d' || viewMode === 'split') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Box size={13} /> Input Specimen 3D Geometry
              </span>
              <span className="glass-pill" style={{ fontSize: '9px', padding: '2px 6px' }}>
                {currentFeatures.morphologyType?.toUpperCase()} • {fidelityPercentage}% FIDELITY
              </span>
            </div>
            <MiniSpecimenViewport parameters={currentFeatures} height={viewMode === '3d' ? 240 : 155} />
          </div>
        )}

        {/* Upload & Reference Image Grid (Active in 'grid' or 'split' modes) */}
        {(viewMode === 'grid' || viewMode === 'split') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Upload Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(6, 182, 212, 0.04)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <Upload size={13} style={{ color: 'var(--accent-cyan)' }} />
              <div style={{ fontSize: '10px', fontWeight: 600 }}>Add Custom Photo Specimen</div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Select Active Pool Specimen:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: viewMode === 'split' ? '110px' : '220px',
                overflowY: 'auto',
                paddingRight: '2px',
              }}
            >
              {images.map((img) => {
                const isSelected = img.id === selectedImage?.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => handleSelect(img)}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.3)',
                      boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        padding: '2px 4px',
                        fontSize: '9px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        background: 'rgba(13, 23, 40, 0.9)',
                      }}
                    >
                      {img.name}
                    </div>
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          background: 'var(--accent-cyan)',
                          borderRadius: '50%',
                          padding: '2px',
                          color: '#070d18',
                          display: 'flex',
                        }}
                      >
                        <CheckCircle2 size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        style={{ top: '50%' }}
      />
    </div>
  );
}
