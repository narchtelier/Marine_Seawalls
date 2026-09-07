import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Download, FileCode, CheckCircle, Package } from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportGroupToOBJ, exportGroupToSTL, exportParametersJSON } from '../engine/exporters';

export default function ExportNode({ data }) {
  const meshGroup = data.coralMesh;
  const params = data.parameters || {};

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
    <div className="coral-node" style={{ minWidth: '320px' }}>
      <Handle
        type="target"
        position={Position.Left}
        id="export-in"
        style={{ top: '50%' }}
      />

      <div className="node-header">
        <div className="node-title-group">
          <div className="node-icon-wrapper" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <Download size={18} />
          </div>
          <div>
            <div className="node-title">6. Morphology Exporter</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              CAD / 3D Print / Parameter Matrices
            </div>
          </div>
        </div>
        <span className="glass-pill" style={{ color: 'var(--accent-amber)' }}>Ready</span>
      </div>

      <div className="node-body">
        <button
          onClick={handleExportOBJ}
          disabled={!meshGroup}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          <Package size={15} /> Export 3D Mesh (.OBJ)
        </button>

        <button
          onClick={handleExportSTL}
          disabled={!meshGroup}
          className="btn-secondary"
          style={{ width: '100%', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
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
