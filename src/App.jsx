import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';

import Header from './components/Header';
import MiroToolbar from './components/MiroToolbar';

import ReefImageInputNode from './nodes/ReefImageInputNode';
import SplatMesherNode from './nodes/SplatMesherNode';
import WatertightMeshViewportNode from './nodes/WatertightMeshViewportNode';
import MorphologySynthesizerNode from './nodes/MorphologySynthesizerNode';
import SOMSynthesizerNode from './nodes/SOMSynthesizerNode';
import InterpolatedGeometryViewportNode from './nodes/InterpolatedGeometryViewportNode';
import ExportNode from './nodes/ExportNode';
import DeletableEdge from './components/DeletableEdge';

import { DEFAULT_CORAL_PRESETS } from './engine/defaultCorals';

const nodeTypes = {
  reefImageInput: ReefImageInputNode,
  splatMesher: SplatMesherNode,
  watertightViewport: WatertightMeshViewportNode,
  morphologySynthesizer: MorphologySynthesizerNode,
  somSynthesizer: SOMSynthesizerNode,
  interpolatedViewport: InterpolatedGeometryViewportNode,
  exportNode: ExportNode,
};

const edgeTypes = {
  default: DeletableEdge,
};

function FlowApp() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [activeTool, setActiveTool] = useState('select');
  const [showMinimap, setShowMinimap] = useState(true);

  // Active state bridging pipeline for multi-specimen synthesis
  const [specimenAGeometry, setSpecimenAGeometry] = useState(null);
  const [specimenBGeometry, setSpecimenBGeometry] = useState(null);
  const [specimenAData, setSpecimenAData] = useState({
    name: 'Specimen A (Brain Coral)',
    morphologyType: 'brain',
    features: DEFAULT_CORAL_PRESETS[1].features,
  });
  const [specimenBData, setSpecimenBData] = useState({
    name: 'Specimen B (Staghorn Coral)',
    morphologyType: 'branching',
    features: DEFAULT_CORAL_PRESETS[0].features,
  });

  const [synthesizerData, setSynthesizerData] = useState(null);
  const [selectedSOMCell, setSelectedSOMCell] = useState(null);
  const [finalCoralMesh, setFinalCoralMesh] = useState(null);

  // Handle edge delete / wire cut
  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  // Handle unlinking all connections for a specific node
  const handleUnlinkNode = useCallback((nodeId) => {
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setEdges]);

  // Handle node delete
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // 1. Splat Ingestion -> Route to corresponding Splat Mesher
  const handleSplatDataReady = useCallback((splatData, sourceNodeId) => {
    const targetMesherId = sourceNodeId === 'node-image-input-2' ? 'node-splat-mesher-2' : 'node-splat-mesher-1';
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === targetMesherId || (nds.length <= 6 && n.type === 'splatMesher')) {
          return { ...n, data: { ...n.data, splatData } };
        }
        return n;
      })
    );
  }, [setNodes]);

  // 2. Splat Mesher -> Watertight Viewports & Morphology Synthesizer
  const handleMeshReady = useCallback((meshResult) => {
    const isBranchB = meshResult?.sourceId === 'node-splat-mesher-2';

    if (isBranchB) {
      if (meshResult?.geometry) setSpecimenBGeometry(meshResult.geometry);
      const updatedB = {
        name: 'Specimen B (Extracted)',
        morphologyType: meshResult?.features?.morphologyType || 'branching',
        features: meshResult?.features || DEFAULT_CORAL_PRESETS[0].features,
        vertices: meshResult?.stats?.vertices_count || 18000,
        triangles: meshResult?.stats?.faces_count || 36000,
        watertight: meshResult?.stats?.is_watertight ?? true,
        color: meshResult?.features?.primaryColor || '#0ea5e9',
        geometry: meshResult.geometry,
      };
      setSpecimenBData(updatedB);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === 'node-watertight-viewport-2') {
            return { ...n, data: { ...n.data, geometry: meshResult.geometry } };
          }
          if (n.type === 'morphologySynthesizer') {
            return { ...n, data: { ...n.data, specimenB: updatedB, geometryB: meshResult.geometry } };
          }
          if (n.type === 'somSynthesizer') {
            return { ...n, data: { ...n.data, geometryB: meshResult.geometry } };
          }
          if (n.type === 'interpolatedViewport') {
            return { ...n, data: { ...n.data, geometryB: meshResult.geometry } };
          }
          return n;
        })
      );
    } else {
      if (meshResult?.geometry) setSpecimenAGeometry(meshResult.geometry);
      const updatedA = {
        name: 'Specimen A (Extracted)',
        morphologyType: meshResult?.features?.morphologyType || 'brain',
        features: meshResult?.features || DEFAULT_CORAL_PRESETS[1].features,
        vertices: meshResult?.stats?.vertices_count || 24000,
        triangles: meshResult?.stats?.faces_count || 48000,
        watertight: meshResult?.stats?.is_watertight ?? true,
        color: meshResult?.features?.primaryColor || '#10b981',
        geometry: meshResult.geometry,
      };
      setSpecimenAData(updatedA);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === 'node-watertight-viewport-1') {
            return { ...n, data: { ...n.data, geometry: meshResult.geometry } };
          }
          if (n.type === 'morphologySynthesizer') {
            return { ...n, data: { ...n.data, specimenA: updatedA, geometryA: meshResult.geometry } };
          }
          if (n.type === 'somSynthesizer') {
            return { ...n, data: { ...n.data, geometryA: meshResult.geometry } };
          }
          if (n.type === 'interpolatedViewport') {
            return { ...n, data: { ...n.data, geometryA: meshResult.geometry } };
          }
          return n;
        })
      );
    }
  }, [setNodes]);

  // 3. Morphology Synthesizer -> 10x10 SOM Latent Space
  const handleSynthesizerReady = useCallback((synthProfile) => {
    setSynthesizerData(synthProfile);
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'somSynthesizer') {
          return {
            ...n,
            data: {
              ...n.data,
              synthesizerData: synthProfile,
              specimens: synthProfile.specimens,
              parameters: synthProfile.parameters,
              geometryA: synthProfile.geometryA,
              geometryB: synthProfile.geometryB,
            },
          };
        }
        if (n.type === 'interpolatedViewport') {
          return {
            ...n,
            data: {
              ...n.data,
              geometryA: synthProfile.geometryA,
              geometryB: synthProfile.geometryB,
            },
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // 4. SOM Synthesizer Selection -> Interpolated Viewport
  const handleSelectInterpolated = useCallback((cell) => {
    setSelectedSOMCell(cell);
    setNodes((nds) =>
      nds.map((n) =>
        n.type === 'interpolatedViewport'
          ? { ...n, data: { ...n.data, cell, geometry: cell.geometry } }
          : n
      )
    );
  }, [setNodes]);

  // 5. Interpolated Viewport -> Production Exporter
  const handleFinalMeshReady = useCallback((meshData) => {
    if (meshData?.coralMesh) {
      setFinalCoralMesh(meshData.coralMesh);
      setNodes((nds) =>
        nds.map((n) =>
          n.type === 'exportNode'
            ? {
                ...n,
                data: {
                  ...n.data,
                  coralMesh: meshData.coralMesh,
                  parameters: meshData.parameters,
                },
              }
            : n
        )
      );
    }
  }, [setNodes]);

  // Create initial multi-specimen pipeline setup
  const createPipelineSetup = useCallback(() => {
    const initialNodes = [
      // --- Branch A: Specimen A (Brain Coral) ---
      {
        id: 'node-image-input-1',
        type: 'reefImageInput',
        position: { x: 50, y: 50 },
        data: {
          label: '1A. Coral Reef Input (Brain Specimen)',
          initialPresetIndex: 1, // Brain Coral preset
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onSplatDataReady: handleSplatDataReady,
        },
      },
      {
        id: 'node-splat-mesher-1',
        type: 'splatMesher',
        position: { x: 470, y: 50 },
        data: {
          label: '2A. Splat Surface Extractor (A)',
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onMeshReady: handleMeshReady,
        },
      },
      {
        id: 'node-watertight-viewport-1',
        type: 'watertightViewport',
        position: { x: 890, y: 50 },
        data: {
          label: '3A. Watertight Viewport (Specimen A)',
          geometry: specimenAGeometry,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
        },
      },

      // --- Branch B: Specimen B (Staghorn Coral) ---
      {
        id: 'node-image-input-2',
        type: 'reefImageInput',
        position: { x: 50, y: 490 },
        data: {
          label: '1B. Coral Reef Input (Staghorn Specimen)',
          initialPresetIndex: 0, // Staghorn Branching preset
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onSplatDataReady: handleSplatDataReady,
        },
      },
      {
        id: 'node-splat-mesher-2',
        type: 'splatMesher',
        position: { x: 470, y: 490 },
        data: {
          label: '2B. Splat Surface Extractor (B)',
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onMeshReady: handleMeshReady,
        },
      },
      {
        id: 'node-watertight-viewport-2',
        type: 'watertightViewport',
        position: { x: 890, y: 490 },
        data: {
          label: '3B. Watertight Viewport (Specimen B)',
          geometry: specimenBGeometry,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
        },
      },

      // --- Convergence: Morphology Mesh Synthesizer ---
      {
        id: 'node-morphology-synthesizer',
        type: 'morphologySynthesizer',
        position: { x: 1320, y: 270 },
        data: {
          label: 'Morphology Mesh Synthesizer',
          specimenA: specimenAData,
          specimenB: specimenBData,
          geometryA: specimenAGeometry,
          geometryB: specimenBGeometry,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onSynthesizerReady: handleSynthesizerReady,
        },
      },

      // --- 10x10 SOM Synthesizer Grid ---
      {
        id: 'node-som-synthesizer',
        type: 'somSynthesizer',
        position: { x: 1760, y: 270 },
        data: {
          label: '4. 10x10 SOM Synthesizer Grid',
          synthesizerData: synthesizerData,
          geometryA: specimenAGeometry,
          geometryB: specimenBGeometry,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onSelectInterpolated: handleSelectInterpolated,
        },
      },

      // --- Selected Interpolated Geometry Viewport ---
      {
        id: 'node-interpolated-viewport',
        type: 'interpolatedViewport',
        position: { x: 2220, y: 270 },
        data: {
          label: '5. Selected Interpolated Geometry',
          cell: selectedSOMCell,
          geometry: selectedSOMCell?.geometry,
          geometryA: specimenAGeometry,
          geometryB: specimenBGeometry,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
          onFinalMeshReady: handleFinalMeshReady,
        },
      },

      // --- Production Exporter ---
      {
        id: 'node-export',
        type: 'exportNode',
        position: { x: 2680, y: 270 },
        data: {
          label: '6. Production Exporter',
          coralMesh: finalCoralMesh,
          parameters: selectedSOMCell?.parameters,
          onDeleteNode: handleDeleteNode,
          onUnlinkNode: handleUnlinkNode,
        },
      },
    ];

    const initialEdges = [
      // Branch A Edges
      { id: 'e-1a-2a', source: 'node-image-input-1', sourceHandle: 'splat-out', target: 'node-splat-mesher-1', targetHandle: 'splat-in', animated: true },
      { id: 'e-2a-3a', source: 'node-splat-mesher-1', sourceHandle: 'mesh-out', target: 'node-watertight-viewport-1', targetHandle: 'watertight-in', animated: true },
      { id: 'e-3a-synth', source: 'node-watertight-viewport-1', sourceHandle: 'watertight-out', target: 'node-morphology-synthesizer', targetHandle: 'mesh-in-1', animated: true },

      // Branch B Edges
      { id: 'e-1b-2b', source: 'node-image-input-2', sourceHandle: 'splat-out', target: 'node-splat-mesher-2', targetHandle: 'splat-in', animated: true },
      { id: 'e-2b-3b', source: 'node-splat-mesher-2', sourceHandle: 'mesh-out', target: 'node-watertight-viewport-2', targetHandle: 'watertight-in', animated: true },
      { id: 'e-3b-synth', source: 'node-watertight-viewport-2', sourceHandle: 'watertight-out', target: 'node-morphology-synthesizer', targetHandle: 'mesh-in-2', animated: true },

      // Synthesizer -> SOM -> Viewport -> Exporter
      { id: 'e-synth-som', source: 'node-morphology-synthesizer', sourceHandle: 'synthesizer-out', target: 'node-som-synthesizer', targetHandle: 'som-in', animated: true },
      { id: 'e-som-interp', source: 'node-som-synthesizer', sourceHandle: 'som-out', target: 'node-interpolated-viewport', targetHandle: 'interpolated-in', animated: true },
      { id: 'e-interp-exp', source: 'node-interpolated-viewport', sourceHandle: 'interpolated-out', target: 'node-export', targetHandle: 'export-in', animated: true },
    ];

    return { initialNodes, initialEdges };
  }, [
    specimenAGeometry,
    specimenBGeometry,
    specimenAData,
    specimenBData,
    synthesizerData,
    selectedSOMCell,
    finalCoralMesh,
    handleDeleteNode,
    handleUnlinkNode,
    handleSplatDataReady,
    handleMeshReady,
    handleSynthesizerReady,
    handleSelectInterpolated,
    handleFinalMeshReady,
  ]);

  // Initialize once on mount
  const hasInitialized = useRef(false);
  React.useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const { initialNodes, initialEdges } = createPipelineSetup();
      setNodes(initialNodes);
      setEdges(initialEdges);
      setTimeout(() => fitView({ padding: 0.12, duration: 450 }), 100);
    }
  }, [createPipelineSetup, setNodes, setEdges, fitView]);

  // Connect edge
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  // Add custom node
  const handleAddNode = useCallback((type) => {
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    const newNode = {
      id,
      type,
      position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 300 },
      data: {
        label: `Custom ${type.replace(/([A-Z])/g, ' $1')}`,
        specimenA: specimenAData,
        specimenB: specimenBData,
        geometry: specimenAGeometry,
        cell: selectedSOMCell,
        coralMesh: finalCoralMesh,
        onDeleteNode: handleDeleteNode,
        onUnlinkNode: handleUnlinkNode,
        onSplatDataReady: handleSplatDataReady,
        onMeshReady: handleMeshReady,
        onSynthesizerReady: handleSynthesizerReady,
        onSelectInterpolated: handleSelectInterpolated,
        onFinalMeshReady: handleFinalMeshReady,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [
    specimenAData,
    specimenBData,
    specimenAGeometry,
    selectedSOMCell,
    finalCoralMesh,
    handleDeleteNode,
    handleUnlinkNode,
    handleSplatDataReady,
    handleMeshReady,
    handleSynthesizerReady,
    handleSelectInterpolated,
    handleFinalMeshReady,
    setNodes,
  ]);

  // Reset layout
  const handleResetLayout = useCallback(() => {
    const { initialNodes, initialEdges } = createPipelineSetup();
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.12, duration: 450 }), 100);
  }, [createPipelineSetup, setNodes, setEdges, fitView]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-canvas)', position: 'relative', overflow: 'hidden' }}>
      <Header onAddNode={handleAddNode} />

      <MiroToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onAddNode={handleAddNode}
        onFitView={() => fitView({ duration: 400 })}
        onZoomIn={() => zoomIn({ duration: 300 })}
        onZoomOut={() => zoomOut({ duration: 300 })}
        showMinimap={showMinimap}
        setShowMinimap={setShowMinimap}
        onResetLayout={handleResetLayout}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnScroll={activeTool === 'hand'}
        selectionOnDrag={activeTool === 'select'}
        panOnDrag={activeTool === 'hand' || [1, 2]} // right or middle mouse button pan
        fitView
        defaultEdgeOptions={{ animated: true, type: 'default' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="rgba(56, 189, 248, 0.15)" />
        <Controls position="bottom-right" style={{ background: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(56, 189, 248, 0.2)' }} />
        {showMinimap && (
          <MiniMap
            position="bottom-left"
            style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}
            nodeColor={(node) => {
              if (node.type === 'reefImageInput') return '#38bdf8';
              if (node.type === 'splatMesher') return '#c084fc';
              if (node.type === 'watertightViewport') return '#a855f7';
              if (node.type === 'morphologySynthesizer') return '#f472b6';
              if (node.type === 'somSynthesizer') return '#10b981';
              if (node.type === 'interpolatedViewport') return '#fbbf24';
              if (node.type === 'exportNode') return '#f59e0b';
              return '#64748b';
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowApp />
    </ReactFlowProvider>
  );
}
