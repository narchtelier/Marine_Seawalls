import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Images, Upload, Trash2, CheckCircle2, Copy } from 'lucide-react';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';

export default function ImagePoolNode({ data, id }) {
  const fileInputRef = useRef(null);
  const images = data.images || DEFAULT_CORAL_PRESETS;
  const selectedImage = data.selectedImage || images[0];
  const nodeLabel = data.label || 'Reference Image Pool';

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

  return (
    <div className="coral-node" style={{ minWidth: '320px' }}>
      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper">
            <Images size={18} />
          </div>
          <div>
            <div className="node-title">{nodeLabel}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {images.length} Specimens • Selected: {selectedImage?.name || 'None'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="glass-pill" style={{ color: 'var(--accent-cyan)' }}>Pool</span>
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

      <div className="node-body">
        {/* Upload Drop Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(6, 182, 212, 0.04)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <Upload size={18} style={{ color: 'var(--accent-cyan)', margin: '0 auto 4px' }} />
          <div style={{ fontSize: '12px', fontWeight: 600 }}>Add Image to this Pool</div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>PNG, JPG, WebP, SVG</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {/* Reference Image Grid */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Select Active Pool Specimen:
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            maxHeight: '180px',
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
                  style={{ width: '100%', height: '65px', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    padding: '3px 5px',
                    fontSize: '10px',
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
                      top: '4px',
                      right: '4px',
                      background: 'var(--accent-cyan)',
                      borderRadius: '50%',
                      padding: '2px',
                      color: '#070d18',
                      display: 'flex',
                    }}
                  >
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
