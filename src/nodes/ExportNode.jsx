import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Download, FileCode, CheckCircle, Package, Unlink2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import * as THREE from 'three';
import { exportGroupToOBJ, exportGroupToSTL, exportParametersJSON } from '../engine/exporters';

export default function ExportNode({ data }) {
  let meshGroup = data.coralMesh || data.reconstructedMesh;
  const params = data.parameters || {};

  // Wrap BufferGeometry into Three.js Mesh / Group if needed
  if (!meshGroup && data.geometry) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const mesh = new THREE.Mesh(data.geometry, mat);
    const grp = new THREE.Group();
    grp.add(mesh);
    meshGroup = grp;
  }

  const handleExportOBJ = () => {
    if (!meshGroup) return;
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    exportGroupToOBJ(meshGroup, `Marine_Seawalls_Coral_${params.morphologyType || 'model'}.obj`);
  };

  const handleExportSTL = () => {
    if (!meshGroup) return;
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    exportGroupToSTL(meshGroup, `Marine_Seawalls_Coral_${params.morphologyType || 'model'}.stl`);
  };

  const handleExportJSON = () => {
    exportParametersJSON(params, `coral_morphology_${params.morphologyType || 'params'}.json`);
  };

  return (
    <div className="coral-node" style={{ minWidth: '320px', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Left}
        id="export-in"
        style={{ top: '50%', background: '#fbbf24', width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <Download size={18} />
          </div>
          <div>
            <div className="node-title">6. Production Exporter</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              CAD / 3D Print / Parameter Matrices
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nodrag nopan">
          <span className="glass-pill" style={{ color: 'var(--accent-amber)' }}>Ready</span>
          {data.onUnlinkNode && (
            <button
              onClick={() => data.onUnlinkNode(data.id || 'node-export')}
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
              title="Unlink All Wires"
            >
              <Unlink2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="node-body">
        <button
          onClick={handleExportOBJ}
          disabled={!meshGroup}
          className="btn-primary"
          style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', fontWeight: 700 }}
        >
          <Package size={15} /> Export 3D Mesh (.OBJ)
        </button>

        <button
          onClick={handleExportSTL}
          disabled={!meshGroup}
          className="btn-secondary"
          style={{ width: '100%', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontWeight: 600 }}
        >
          <Download size={15} /> Export 3D Print (.STL)
        </button>

        <button
          onClick={handleExportJSON}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          <FileCode size={15} /> Export Parameters (.JSON)
        </button>

        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>
          Compatible with Rhino, Blender, Maya, CAD & 3D Slicers
        </div>
      </div>
    </div>
  );
}
