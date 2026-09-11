import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Layers,
  GitMerge,
  Sliders,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Unlink,
  Dna,
  ArrowRightLeft
} from 'lucide-react';
import { DEFAULT_CORAL_PRESETS } from '../engine/defaultCorals';
import { getFallbackSpecimenGeometry } from '../engine/somGeometryInterpolator';

export default function MorphologySynthesizerNode({ id, data }) {
  // Connected mesh specimens (can come from mesh-in-1 and mesh-in-2 or data props)
  const specimenA = useMemo(() => {
    const geo = data?.geometryA || data?.specimenA?.geometry || getFallbackSpecimenGeometry('brain');
    return data?.specimenA ? { ...data.specimenA, geometry: geo } : {
      name: 'Specimen A (Brain Coral)',
      morphologyType: 'brain',
      features: DEFAULT_CORAL_PRESETS[1].features,
      vertices: geo.attributes.position ? geo.attributes.position.count : 24800,
      triangles: geo.index ? Math.round(geo.index.count / 3) : 49600,
      watertight: true,
      color: '#10b981',
      geometry: geo,
    };
  }, [data?.specimenA, data?.geometryA]);

  const specimenB = useMemo(() => {
    const geo = data?.geometryB || data?.specimenB?.geometry || getFallbackSpecimenGeometry('other');
    return data?.specimenB ? { ...data.specimenB, geometry: geo } : {
      name: 'Specimen B (Staghorn Coral)',
      morphologyType: 'branching',
      features: DEFAULT_CORAL_PRESETS[0].features,
      vertices: geo.attributes.position ? geo.attributes.position.count : 18200,
      triangles: geo.index ? Math.round(geo.index.count / 3) : 36400,
      watertight: true,
      color: '#0ea5e9',
      geometry: geo,
    };
  }, [data?.specimenB, data?.geometryB]);

  // Synthesis Parameters
  const [blendWeight, setBlendWeight] = useState(0.5); // 0.0 (Pure A) to 1.0 (Pure B)
  const [confluenceBias, setConfluenceBias] = useState('balanced'); // 'basal_mound' | 'balanced' | 'axial_branching'
  const [porosityCoupling, setPorosityCoupling] = useState(0.65);

  // Compute interpolated / synthesized parameters between Specimen A and B
  const synthesizedProfile = useMemo(() => {
    const fA = specimenA.features || DEFAULT_CORAL_PRESETS[1].features;
    const fB = specimenB.features || DEFAULT_CORAL_PRESETS[0].features;

    const wB = blendWeight;
    const wA = 1.0 - blendWeight;

    const branchingFactor = parseFloat((fA.branchingFactor * wA + fB.branchingFactor * wB).toFixed(3));
    const rugosity = parseFloat((fA.rugosity * wA + fB.rugosity * wB).toFixed(3));
    const caliceDensity = parseFloat((fA.caliceDensity * wA + fB.caliceDensity * wB).toFixed(3));
    const meanderingFreq = parseFloat((fA.meanderingFreq * wA + fB.meanderingFreq * wB).toFixed(3));
    const fractalDimension = parseFloat((fA.fractalDimension * wA + fB.fractalDimension * wB).toFixed(2));

    // Determine classification
    let hybridType = 'geometric_morph';
    if (wA > 0.75) hybridType = 'specimen_a_dominant';
    else if (wB > 0.75) hybridType = 'specimen_b_dominant';
    else hybridType = 'volumetric_hybrid_morph';

    return {
      specimens: [
        { name: specimenA.name, features: fA, geometry: specimenA.geometry },
        { name: specimenB.name, features: fB, geometry: specimenB.geometry },
      ],
      geometryA: specimenA.geometry,
      geometryB: specimenB.geometry,
      blendWeight,
      confluenceBias,
      porosityCoupling,
      parameters: {
        morphologyType: hybridType,
        branchingFactor,
        rugosity,
        caliceDensity,
        meanderingFreq,
        fractalDimension,
        primaryColor: wA > 0.5 ? fA.primaryColor : fB.primaryColor,
        secondaryColor: wB > 0.5 ? fB.secondaryColor : fA.secondaryColor,
        tentacleGlow: wB > 0.5 ? fB.tentacleGlow : fA.tentacleGlow,
        blendWeightA: wA,
        blendWeightB: wB,
        growthScale: 1.0,
      }
    };
  }, [specimenA, specimenB, blendWeight, confluenceBias, porosityCoupling]);

  // Push synthesized profile downstream to SOM synthesizer
  useEffect(() => {
    if (data?.onSynthesizerReady) {
      data.onSynthesizerReady(synthesizedProfile);
    }
  }, [synthesizedProfile]);

  return (
    <div className="custom-node" style={{ width: '400px', borderColor: 'rgba(236, 72, 153, 0.45)' }}>
      {/* Input Handle for Mesh Geometry 1 (Specimen A) */}
      <Handle
        type="target"
        position={Position.Left}
        id="mesh-in-1"
        style={{
          top: '32%',
          background: '#10b981',
          width: '11px',
          height: '11px',
          border: '2px solid #0f172a',
        }}
        title="Connect Specimen A Mesh"
      />

      {/* Input Handle for Mesh Geometry 2 (Specimen B) */}
      <Handle
        type="target"
        position={Position.Left}
        id="mesh-in-2"
        style={{
          top: '68%',
          background: '#0ea5e9',
          width: '11px',
          height: '11px',
          border: '2px solid #0f172a',
        }}
        title="Connect Specimen B Mesh"
      />

      {/* Header */}
      <div className="node-header" style={{ borderBottomColor: 'rgba(236, 72, 153, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f472b6',
            }}
          >
            <GitMerge size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
              Morphology Mesh Synthesizer
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Multi-Mesh Confluence & SOM Latent Anchors
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {data?.onUnlinkNode && (
            <button
              className="btn-icon"
              title="Unlink Edges"
              onClick={() => data.onUnlinkNode(id)}
              style={{ width: '22px', height: '22px' }}
            >
              <Unlink size={12} />
            </button>
          )}
          {data?.onDeleteNode && (
            <button
              className="btn-icon"
              title="Delete Node"
              onClick={() => data.onDeleteNode(id)}
              style={{ width: '22px', height: '22px', color: 'var(--accent-coral)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="node-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Connected Geometries Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Specimen A Card */}
          <div
            className="glass-panel"
            style={{
              padding: '8px',
              borderLeft: '3px solid #10b981',
              background: 'rgba(15, 23, 42, 0.65)',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              SPECIMEN A (IN-1)
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {specimenA.name}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Rugosity: <strong>{specimenA.features?.rugosity || 0.9}</strong>
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
              Branching: <strong>{specimenA.features?.branchingFactor || 0.1}</strong>
            </div>
          </div>

          {/* Specimen B Card */}
          <div
            className="glass-panel"
            style={{
              padding: '8px',
              borderLeft: '3px solid #0ea5e9',
              background: 'rgba(15, 23, 42, 0.65)',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0ea5e9' }} />
              SPECIMEN B (IN-2)
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {specimenB.name}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Rugosity: <strong>{specimenB.features?.rugosity || 0.6}</strong>
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
              Branching: <strong>{specimenB.features?.branchingFactor || 0.9}</strong>
            </div>
          </div>
        </div>

        {/* Synthesis Weight Slider */}
        <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowRightLeft size={12} color="#f472b6" /> Morphospace Synthesis Blend
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f472b6' }}>
              {(1 - blendWeight).toFixed(2)} A : {blendWeight.toFixed(2)} B
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>Specimen A</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              className="nodrag nopan"
              value={blendWeight}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onChange={(e) => setBlendWeight(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#f472b6' }}
            />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0ea5e9' }}>Specimen B</span>
          </div>

          {/* Porosity Coupling */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Hydrodynamic Porosity Confluence</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#c084fc' }}>{(porosityCoupling * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            className="nodrag nopan"
            value={porosityCoupling}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onChange={(e) => setPorosityCoupling(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#c084fc' }}
          />
        </div>

        {/* Live Synthesized Profile Telemetry */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '6px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>Synthesized Morphotype:</span>
            <strong style={{ color: '#f472b6', textTransform: 'capitalize' }}>
              {synthesizedProfile.parameters.morphologyType.replace(/_/g, ' ')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>Combined Rugosity:</span>
            <strong style={{ color: 'var(--text-bright)' }}>{synthesizedProfile.parameters.rugosity}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>Branching Index:</span>
            <strong style={{ color: 'var(--text-bright)' }}>{synthesizedProfile.parameters.branchingFactor}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>Latent SOM Training Status:</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
              <CheckCircle2 size={12} /> Active Biometric Anchors Ready
            </span>
          </div>
        </div>
      </div>

      {/* Output Handle to SOM Synthesizer */}
      <Handle
        type="source"
        position={Position.Right}
        id="synthesizer-out"
        style={{
          background: '#f472b6',
          width: '11px',
          height: '11px',
          border: '2px solid #0f172a',
        }}
        title="Output Synthesized Specimen Set to SOM Grid"
      />
    </div>
  );
}
