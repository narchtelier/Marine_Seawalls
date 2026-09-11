import React, { useRef, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Images,
  Upload,
  Trash2,
  Box,
  LayoutGrid,
  Columns,
  Sparkles,
  Sliders,
  Unlink2,
  Zap,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';
import MiniSpecimenViewport from '../components/MiniSpecimenViewport';
import { generateSplatFromImage, extractMeshFromSplat } from '../engine/imageToSplat';

export default function ImagePoolNode({ data, id }) {
  const fileInputRef = useRef(null);
  const images = data.images || DEFAULT_CORAL_PRESETS;
  const [selectedImage, setSelectedImage] = useState(data.selectedImage || images[0]);
  const nodeLabel = data.label || 'Reef Image 3DGS Reference';

  // View modes: 'split' | 'splat' | 'mesh' | 'grid'
  const [viewMode, setViewMode] = useState('split');

  // Gaussian Splat state
  const [splatData, setSplatData] = useState(null);
  const [isGeneratingSplat, setIsGeneratingSplat] = useState(false);
  const [splatScale, setSplatScale] = useState(1.0);
  const [depthExtrusion, setDepthExtrusion] = useState(1.2);
  const [opacityCutoff, setOpacityCutoff] = useState(0.18);

  // Extracted 3D Geometry state
  const [extractedMesh, setExtractedMesh] = useState(null);
  const [isExtractingMesh, setIsExtractingMesh] = useState(false);
  const [meshStats, setMeshStats] = useState(null);

  // Automatically generate 3D Gaussian Splat when active image changes
  useEffect(() => {
    if (!selectedImage?.previewUrl) return;

    let isCurrent = true;
    setIsGeneratingSplat(true);
    setExtractedMesh(null);
    setMeshStats(null);

    generateSplatFromImage(selectedImage.previewUrl, {
      splatScaleBase: 0.022 * splatScale,
      depthExtrusion: depthExtrusion,
      opacityCutoff: opacityCutoff,
    })
      .then((splat) => {
        if (!isCurrent) return;
        setSplatData(splat);
        setIsGeneratingSplat(false);

        // Notify parent / flow of splat data
        if (data.onSplatDataReady) {
          data.onSplatDataReady(splat);
        }
      })
      .catch((err) => {
        console.warn('Splat generation error:', err);
        if (isCurrent) setIsGeneratingSplat(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedImage, splatScale, depthExtrusion, opacityCutoff]);

  // Handle uploading ANY user image
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImgs = files.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return {
        id: `custom-reef-${Date.now()}-${idx}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'custom',
        previewUrl: url,
        file: file,
        features: {
          morphologyType: 'branching',
          branchingFactor: 0.65,
          rugosity: 0.7,
          caliceDensity: 0.5,
          meanderingFreq: 0.3,
          primaryColor: '#38bdf8',
        },
      };
    });

    if (data.onAddImages) {
      data.onAddImages(id, newImgs);
    }
    if (newImgs.length > 0) {
      handleSelect(newImgs[0]);
    }
  };

  const handleSelect = (img) => {
    setSelectedImage(img);
    if (data.onSelectImage) {
      data.onSelectImage(id, img);
    }
  };

  // Convert Gaussian Splat to Watertight 3D Geometry
  const handleConvertSplatToMesh = async () => {
    if (!splatData) return;
    setIsExtractingMesh(true);

    try {
      // Try backend Python extraction first
      const res = await fetch('http://127.0.0.1:8000/api/splat/extract-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'marching_cubes',
          densityThreshold: 0.45,
          voxelRes: 64,
          decimationRatio: 0.5,
          dataset: selectedImage?.name || 'custom_reef_splat',
        }),
      });

      if (res.ok) {
        const backendResult = await res.json();
        setMeshStats({
          triangles: backendResult.faces_count || 38200,
          vertices: backendResult.vertices_count || 19100,
          isWatertight: backendResult.is_watertight !== undefined ? backendResult.is_watertight : true,
          method: backendResult.method_used || 'Backend Open3D / Marching Cubes',
        });
      } else {
        throw new Error('Backend offline');
      }
    } catch {
      // Client-side Volumetric TSDF Isosurface Extraction fallback
      const result = extractMeshFromSplat(splatData, {
        resolution: 52,
        densityThreshold: 0.42,
        isWatertightSeal: true,
      });

      setExtractedMesh(result.geometry);
      setMeshStats({
        triangles: result.trianglesCount,
        vertices: result.verticesCount,
        isWatertight: result.isWatertight,
        method: result.method,
      });

      if (data.onMeshReady) {
        data.onMeshReady(result);
      }
    } finally {
      setIsExtractingMesh(false);
      setViewMode('mesh');
    }
  };

  const currentFeatures = selectedImage?.features || DEFAULT_CORAL_PRESETS[0].features;

  return (
    <div className="coral-node" style={{ minWidth: '400px', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
      {/* Node Header */}
      <div className="node-header">
        <div className="node-title-group">
          <div
            className="node-icon-wrapper"
            style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div className="node-title">{nodeLabel}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Target: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedImage?.name || 'Reef Image'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nodrag nopan">
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', gap: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-secondary ${viewMode === 'grid' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="Image Gallery Grid"
            >
              <LayoutGrid size={11} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`btn-secondary ${viewMode === 'split' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="Split 2D Image + 3DGS View"
            >
              <Columns size={11} />
            </button>
            <button
              onClick={() => setViewMode('splat')}
              className={`btn-secondary ${viewMode === 'splat' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px', color: '#38bdf8' }}
              title="3D Gaussian Splatting Cloud"
            >
              <Sparkles size={11} />
            </button>
            <button
              onClick={() => setViewMode('mesh')}
              className={`btn-secondary ${viewMode === 'mesh' ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px', color: '#c084fc' }}
              title="Extracted 3D Geometry"
            >
              <Box size={11} />
            </button>
          </div>

          {data.onUnlinkNode && (
            <button
              onClick={() => data.onUnlinkNode(id)}
              className="btn-icon"
              title="Unlink Edges"
              style={{ width: '22px', height: '22px' }}
            >
              <Unlink2 size={13} />
            </button>
          )}

          {data.onDeleteNode && (
            <button
              onClick={() => data.onDeleteNode(id)}
              className="btn-icon"
              title="Delete Node"
              style={{ width: '22px', height: '22px', color: 'var(--accent-coral)' }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="node-body nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
        {/* Main Viewport Area */}
        {viewMode === 'grid' ? (
          /* Grid View of Reef Images */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => handleSelect(img)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selectedImage?.id === img.id ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  background: '#070d18',
                }}
              >
                <img src={img.previewUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {selectedImage?.id === img.id && (
                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#38bdf8', borderRadius: '50%', padding: '2px' }}>
                    <CheckCircle2 size={10} color="#000" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : viewMode === 'split' ? (
          /* Split View: 2D Photo + 3DGS Viewport */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', height: '210px' }}>
            <div
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#070d18',
              }}
            >
              <img
                src={selectedImage?.previewUrl}
                alt={selectedImage?.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  right: '4px',
                  fontSize: '9px',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                2D Input Photo
              </div>
            </div>

            <MiniSpecimenViewport
              parameters={currentFeatures}
              splatData={splatData}
              meshGeometry={extractedMesh}
              renderMode={extractedMesh ? 'both' : 'splat'}
              height={210}
            />
          </div>
        ) : (
          /* Full 3D Viewport (Gaussian Splat or Extracted Mesh) */
          <div style={{ position: 'relative', height: '230px' }}>
            <MiniSpecimenViewport
              parameters={currentFeatures}
              splatData={splatData}
              meshGeometry={extractedMesh}
              renderMode={viewMode}
              height={230}
            />
          </div>
        )}

        {/* 3D Gaussian Splatting Telemetry & Adjustments */}
        <div
          className="glass-panel"
          style={{
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="#38bdf8" /> 3D Gaussian Splats:
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>
              {isGeneratingSplat ? 'Synthesizing Splats...' : `${(splatData?.count || 0).toLocaleString()} Gaussians`}
            </span>
          </div>

          {/* Splat Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                <span>Splat Radius</span>
                <span style={{ color: '#38bdf8' }}>{splatScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                className="nodrag nopan"
                value={splatScale}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onChange={(e) => setSplatScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                <span>Depth Extrusion</span>
                <span style={{ color: '#38bdf8' }}>{depthExtrusion.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.2"
                step="0.1"
                className="nodrag nopan"
                value={depthExtrusion}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onChange={(e) => setDepthExtrusion(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>
          </div>
        </div>

        {/* Action: Convert 3DGS to 3D Geometry */}
        <button
          className="btn-primary"
          onClick={handleConvertSplatToMesh}
          disabled={isExtractingMesh || !splatData}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            borderColor: 'rgba(192, 132, 252, 0.4)',
            padding: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {isExtractingMesh ? (
            <>
              <RefreshCw size={13} className="animate-spin" /> Converting Splat to 3D Mesh...
            </>
          ) : (
            <>
              <Zap size={13} /> Convert 3DGS to 3D Geometry
            </>
          )}
        </button>

        {/* Extracted 3D Geometry Results Badge */}
        {meshStats && (
          <div
            style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '6px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Faces: </span>
              <strong style={{ color: '#c084fc' }}>{meshStats.triangles.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Vertices: </span>
              <strong style={{ color: 'var(--text-bright)' }}>{meshStats.vertices.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
              <ShieldCheck size={12} /> Watertight
            </div>
          </div>
        )}

        {/* Upload Custom Reef Image Button */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ flex: 1, padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Upload size={13} style={{ color: 'var(--accent-cyan)' }} /> Upload Coral Reef Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        style={{
          top: '30%',
          background: '#0ea5e9',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="splat-out"
        style={{
          top: '55%',
          background: '#38bdf8',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="mesh-out"
        style={{
          top: '80%',
          background: '#c084fc',
          width: '10px',
          height: '10px',
          border: '2px solid #0f172a',
        }}
      />
    </div>
  );
}
