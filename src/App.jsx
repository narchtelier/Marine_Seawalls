import React, { useState, useCallback, useMemo, useRef } from 'react';
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

import ImagePoolNode from './nodes/ImagePoolNode';
import FeatureExtractorNode from './nodes/FeatureExtractorNode';
import MorphologyControlsNode from './nodes/MorphologyControlsNode';
import ThreeViewportNode from './nodes/ThreeViewportNode';
import SubstrateSeawallNode from './nodes/SubstrateSeawallNode';
import ExportNode from './nodes/ExportNode';

import { DEFAULT_CORAL_PRESETS } from './engine/defaultCorals';
import { analyzeCoralImage } from './engine/imageAnalysis';

const nodeTypes = {
  imagePool: ImagePoolNode,
  featureExtractor: FeatureExtractorNode,
  morphologyControls: MorphologyControlsNode,
  threeViewport: ThreeViewportNode,
  substrateSeawall: SubstrateSeawallNode,
  exportNode: ExportNode,
};

function FlowApp() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [activeTool, setActiveTool] = useState('select');
  const [showMinimap, setShowMinimap] = useState(true);

  // Global active synthesized parameters for 3D Viewport & Export
  const [synthesizedParams, setSynthesizedParams] = useState({
    ...DEFAULT_CORAL_PRESETS[0].features,
    growthScale: 1.0,
    polypSize: 0.08,
    showPolyps: true,
    substrateType: 'seawall',
  });

  const [coralMesh, setCoralMesh] = useState(null);
  const [synthesizerWeights, setSynthesizerWeights] = useState({
    'node-extractor-1': 0.5,
    'node-extractor-2': 0.5,
  });

  // Recompute synthesized parameters from all connected extractors
  const recomputeSynthesis = useCallback((currentNodes, currentEdges, weights) => {
    const synthNode = currentNodes.find((n) => n.type === 'morphologyControls');
    if (!synthNode) return;

    const incomingEdges = currentEdges.filter((e) => e.target === synthNode.id);
    const incomingExtractors = currentNodes.filter((n) =>
      incomingEdges.some((e) => e.source === n.id)
    );

    if (incomingExtractors.length === 0) return;

    let totalWeight = 0;
    const currentWeights = {};
    incomingExtractors.forEach((ext) => {
      const w = weights[ext.id] !== undefined ? weights[ext.id] : 1.0 / incomingExtractors.length;
      currentWeights[ext.id] = w;
      totalWeight += w;
    });

    const norm = totalWeight > 0 ? totalWeight : 1.0;

    let bBranch = 0, bRugo = 0, bCalice = 0, bMean = 0, bFrac = 0;
    incomingExtractors.forEach((ext) => {
      const w = currentWeights[ext.id] / norm;
      const f = ext.data?.features || DEFAULT_CORAL_PRESETS[0].features;
      bBranch += (f.branchingFactor || 0) * w;
      bRugo += (f.rugosity || 0) * w;
      bCalice += (f.caliceDensity || 0) * w;
      bMean += (f.meanderingFreq || 0) * w;
      bFrac += (f.fractalDimension || 1.6) * w;
    });

    // Dominant archetype
    let dominantExt = incomingExtractors[0];
    let maxW = -1;
    incomingExtractors.forEach((ext) => {
      if (currentWeights[ext.id] > maxW) {
        maxW = currentWeights[ext.id];
        dominantExt = ext;
      }
    });

    const domF = dominantExt?.data?.features || DEFAULT_CORAL_PRESETS[0].features;

    setSynthesizedParams((prev) => ({
      ...prev,
      morphologyType: domF.morphologyType || 'branching',
      primaryColor: domF.primaryColor || prev.primaryColor,
      secondaryColor: domF.secondaryColor || prev.secondaryColor,
      tentacleGlow: domF.tentacleGlow || prev.tentacleGlow,
      branchingFactor: parseFloat(bBranch.toFixed(3)),
      rugosity: parseFloat(bRugo.toFixed(3)),
      caliceDensity: parseFloat(bCalice.toFixed(3)),
      meanderingFreq: parseFloat(bMean.toFixed(3)),
      fractalDimension: parseFloat(bFrac.toFixed(3)),
    }));
  }, []);

  // Update a parameter directly
  const handleUpdateParameter = useCallback((key, value) => {
    setSynthesizedParams((prev) => {
      const updated = { ...prev, [key]: value };
      // Update nodes data
      setNodes((nds) =>
        nds.map((n) => {
          if (n.type === 'morphologyControls' || n.type === 'threeViewport' || n.type === 'exportNode' || n.type === 'substrateSeawall') {
            return {
              ...n,
              data: {
                ...n.data,
                parameters: updated,
              },
            };
          }
          return n;
        })
      );
      return updated;
    });
  }, []);

  const handleRandomize = useCallback(() => {
    setSynthesizedParams((prev) => {
      const updated = {
        ...prev,
        branchingFactor: Math.min(1, Math.max(0.1, (prev.branchingFactor || 0.5) + (Math.random() * 0.3 - 0.15))),
        rugosity: Math.min(1, Math.max(0.1, (prev.rugosity || 0.5) + (Math.random() * 0.3 - 0.15))),
        caliceDensity: Math.min(1, Math.max(0.1, (prev.caliceDensity || 0.5) + (Math.random() * 0.3 - 0.15))),
        meanderingFreq: Math.min(1, Math.max(0.1, (prev.meanderingFreq || 0.5) + (Math.random() * 0.3 - 0.15))),
      };
      setNodes((nds) =>
        nds.map((n) =>
          n.type === 'morphologyControls' || n.type === 'threeViewport' || n.type === 'exportNode'
            ? { ...n, data: { ...n.data, parameters: updated } }
            : n
        )
      );
      return updated;
    });
  }, []);

  // Weight update handler
  const handleUpdateWeights = useCallback((extractorId, weight) => {
    setSynthesizerWeights((prev) => {
      const nextWeights = { ...prev, [extractorId]: weight };
      setNodes((nds) => {
        setEdges((eds) => {
          recomputeSynthesis(nds, eds, nextWeights);
          return eds;
        });
        return nds.map((n) =>
          n.type === 'morphologyControls'
            ? { ...n, data: { ...n.data, inputWeights: nextWeights } }
            : n
        );
      });
      return nextWeights;
    });
  }, [recomputeSynthesis]);

  const handleSetDualWeights = useCallback((id1, w1, id2, w2) => {
    const nextWeights = { [id1]: w1, [id2]: w2 };
    setSynthesizerWeights(nextWeights);
    setNodes((nds) => {
      setEdges((eds) => {
        recomputeSynthesis(nds, eds, nextWeights);
        return eds;
      });
      return nds.map((n) =>
        n.type === 'morphologyControls'
          ? { ...n, data: { ...n.data, inputWeights: nextWeights } }
          : n
      );
    });
  }, [recomputeSynthesis]);

  // Handle image selection in a pool
  const handleSelectPoolImage = useCallback(async (poolId, imageObj) => {
    // 1. Update pool node
    setNodes((nds) =>
      nds.map((n) => (n.id === poolId ? { ...n, data: { ...n.data, selectedImage: imageObj } } : n))
    );

    // 2. Find connected extractors & analyze
    setEdges((eds) => {
      const connectedExtractorIds = eds
        .filter((e) => e.source === poolId)
        .map((e) => e.target);

      connectedExtractorIds.forEach(async (extId) => {
        setNodes((nds) =>
          nds.map((n) => (n.id === extId ? { ...n, data: { ...n.data, isAnalyzing: true } } : n))
        );

        let extracted;
        if (imageObj.features) {
          extracted = imageObj.features;
        } else {
          try {
            extracted = await analyzeCoralImage(imageObj.previewUrl);
          } catch (e) {
            extracted = DEFAULT_CORAL_PRESETS[0].features;
          }
        }

        setNodes((nds) => {
          const updated = nds.map((n) =>
            n.id === extId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    isAnalyzing: false,
                    specimenName: imageObj.name,
                    features: extracted,
                  },
                }
              : n
          );
          recomputeSynthesis(updated, eds, synthesizerWeights);
          return updated;
        });
      });
      return eds;
    });
  }, [recomputeSynthesis, synthesizerWeights]);

  // Handle adding custom images
  const handleAddPoolImages = useCallback((poolId, newImgs) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === poolId) {
          return {
            ...n,
            data: {
              ...n.data,
              images: [...newImgs, ...(n.data.images || [])],
            },
          };
        }
        return n;
      })
    );
    if (newImgs.length > 0) {
      handleSelectPoolImage(poolId, newImgs[0]);
    }
  }, [handleSelectPoolImage]);

  // Handle node delete
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => {
      const remainingEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
      setNodes((nds) => {
        recomputeSynthesis(nds, remainingEdges, synthesizerWeights);
        return nds;
      });
      return remainingEdges;
    });
  }, [recomputeSynthesis, synthesizerWeights]);

  // Factory to create initial dual setup
  const createDualSetup = useCallback(() => {
    const pA = DEFAULT_CORAL_PRESETS[0];
    const pB = DEFAULT_CORAL_PRESETS[1];
    const initialWeights = { 'node-extractor-1': 0.5, 'node-extractor-2': 0.5 };
    setSynthesizerWeights(initialWeights);

    const dualNodes = [
      {
        id: 'node-pool-1',
        type: 'imagePool',
        position: { x: 50, y: 80 },
        data: {
          label: '1A. Reference Pool (Staghorn)',
          images: DEFAULT_CORAL_PRESETS,
          selectedImage: pA,
          onSelectImage: handleSelectPoolImage,
          onAddImages: handleAddPoolImages,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-extractor-1',
        type: 'featureExtractor',
        position: { x: 440, y: 80 },
        data: {
          label: '2A. Extractor (Staghorn)',
          specimenName: pA.name,
          features: pA.features,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-pool-2',
        type: 'imagePool',
        position: { x: 50, y: 480 },
        data: {
          label: '1B. Reference Pool (Brain Coral)',
          images: DEFAULT_CORAL_PRESETS,
          selectedImage: pB,
          onSelectImage: handleSelectPoolImage,
          onAddImages: handleAddPoolImages,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-extractor-2',
        type: 'featureExtractor',
        position: { x: 440, y: 480 },
        data: {
          label: '2B. Extractor (Brain Coral)',
          specimenName: pB.name,
          features: pB.features,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-synthesizer',
        type: 'morphologyControls',
        position: { x: 880, y: 220 },
        data: {
          label: '3. Morphology Multi-Input Synthesizer',
          parameters: synthesizedParams,
          connectedExtractors: [
            { id: 'node-extractor-1', specimenName: pA.name, features: pA.features },
            { id: 'node-extractor-2', specimenName: pB.name, features: pB.features },
          ],
          inputWeights: initialWeights,
          onUpdateParameter: handleUpdateParameter,
          onUpdateWeights: handleUpdateWeights,
          onSetDualWeights: handleSetDualWeights,
          onRandomize: handleRandomize,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-three-viewport',
        type: 'threeViewport',
        position: { x: 1340, y: 220 },
        data: {
          parameters: synthesizedParams,
          onCoralMeshReady: setCoralMesh,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-substrate-seawall',
        type: 'substrateSeawall',
        position: { x: 880, y: 800 },
        data: {
          parameters: synthesizedParams,
          onUpdateParameter: handleUpdateParameter,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-export',
        type: 'exportNode',
        position: { x: 1820, y: 220 },
        data: {
          coralMesh,
          parameters: synthesizedParams,
          onDeleteNode: handleDeleteNode,
        },
      },
    ];

    const dualEdges = [
      { id: 'e-p1-e1', source: 'node-pool-1', sourceHandle: 'image-out', target: 'node-extractor-1', targetHandle: 'image-in', animated: true },
      { id: 'e-p2-e2', source: 'node-pool-2', sourceHandle: 'image-out', target: 'node-extractor-2', targetHandle: 'image-in', animated: true },
      { id: 'e-e1-s', source: 'node-extractor-1', sourceHandle: 'features-out', target: 'node-synthesizer', targetHandle: 'controls-in', animated: true },
      { id: 'e-e2-s', source: 'node-extractor-2', sourceHandle: 'features-out', target: 'node-synthesizer', targetHandle: 'controls-in', animated: true },
      { id: 'e-s-v', source: 'node-synthesizer', sourceHandle: 'controls-out', target: 'node-three-viewport', targetHandle: 'viewport-in', animated: true },
      { id: 'e-sub-v', source: 'node-substrate-seawall', sourceHandle: 'substrate-out', target: 'node-three-viewport', targetHandle: 'viewport-in', animated: true },
      { id: 'e-v-exp', source: 'node-three-viewport', sourceHandle: 'viewport-out', target: 'node-export', targetHandle: 'export-in', animated: true },
    ];

    return { dualNodes, dualEdges };
  }, [
    synthesizedParams,
    coralMesh,
    handleSelectPoolImage,
    handleAddPoolImages,
    handleDeleteNode,
    handleUpdateParameter,
    handleUpdateWeights,
    handleSetDualWeights,
    handleRandomize,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Initialize once on mount
  const hasInitialized = useRef(false);
  React.useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const { dualNodes, dualEdges } = createDualSetup();
      setNodes(dualNodes);
      setEdges(dualEdges);
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100);
    }
  }, [createDualSetup, setNodes, setEdges, fitView]);

  // Connect edge
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const nextEds = addEdge({ ...params, animated: true }, eds);
        setNodes((nds) => {
          recomputeSynthesis(nds, nextEds, synthesizerWeights);
          return nds;
        });
        return nextEds;
      });
    },
    [recomputeSynthesis, synthesizerWeights, setEdges, setNodes]
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
        images: DEFAULT_CORAL_PRESETS,
        selectedImage: DEFAULT_CORAL_PRESETS[0],
        features: DEFAULT_CORAL_PRESETS[0].features,
        specimenName: DEFAULT_CORAL_PRESETS[0].name,
        parameters: synthesizedParams,
        coralMesh,
        onSelectImage: handleSelectPoolImage,
        onAddImages: handleAddPoolImages,
        onDeleteNode: handleDeleteNode,
        onUpdateParameter: handleUpdateParameter,
        onUpdateWeights: handleUpdateWeights,
        onSetDualWeights: handleSetDualWeights,
        onRandomize: handleRandomize,
        onCoralMeshReady: setCoralMesh,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [
    synthesizedParams,
    coralMesh,
    handleSelectPoolImage,
    handleAddPoolImages,
    handleDeleteNode,
    handleUpdateParameter,
    handleUpdateWeights,
    handleSetDualWeights,
    handleRandomize,
    setNodes,
  ]);

  const handleResetLayout = () => {
    const { dualNodes, dualEdges } = createDualSetup();
    setNodes(dualNodes);
    setEdges(dualEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 50);
  };

  const handleLoadTripleTemplate = () => {
    const pA = DEFAULT_CORAL_PRESETS[0];
    const pB = DEFAULT_CORAL_PRESETS[1];
    const pC = DEFAULT_CORAL_PRESETS[2];
    const tripleWeights = {
      'node-extractor-1': 0.33,
      'node-extractor-2': 0.33,
      'node-extractor-3': 0.34,
    };
    setSynthesizerWeights(tripleWeights);

    const tripleNodes = [
      {
        id: 'node-pool-1',
        type: 'imagePool',
        position: { x: 50, y: 50 },
        data: {
          label: '1A. Pool (Staghorn)',
          images: DEFAULT_CORAL_PRESETS,
          selectedImage: pA,
          onSelectImage: handleSelectPoolImage,
          onAddImages: handleAddPoolImages,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-extractor-1',
        type: 'featureExtractor',
        position: { x: 440, y: 50 },
        data: {
          label: '2A. Extractor (Staghorn)',
          specimenName: pA.name,
          features: pA.features,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-pool-2',
        type: 'imagePool',
        position: { x: 50, y: 400 },
        data: {
          label: '1B. Pool (Brain Coral)',
          images: DEFAULT_CORAL_PRESETS,
          selectedImage: pB,
          onSelectImage: handleSelectPoolImage,
          onAddImages: handleAddPoolImages,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-extractor-2',
        type: 'featureExtractor',
        position: { x: 440, y: 400 },
        data: {
          label: '2B. Extractor (Brain Coral)',
          specimenName: pB.name,
          features: pB.features,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-pool-3',
        type: 'imagePool',
        position: { x: 50, y: 750 },
        data: {
          label: '1C. Pool (Massive Boulder)',
          images: DEFAULT_CORAL_PRESETS,
          selectedImage: pC,
          onSelectImage: handleSelectPoolImage,
          onAddImages: handleAddPoolImages,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-extractor-3',
        type: 'featureExtractor',
        position: { x: 440, y: 750 },
        data: {
          label: '2C. Extractor (Massive Boulder)',
          specimenName: pC.name,
          features: pC.features,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-synthesizer',
        type: 'morphologyControls',
        position: { x: 880, y: 250 },
        data: {
          label: '3. Triple-Input Morphology Synthesizer',
          parameters: synthesizedParams,
          connectedExtractors: [
            { id: 'node-extractor-1', specimenName: pA.name, features: pA.features },
            { id: 'node-extractor-2', specimenName: pB.name, features: pB.features },
            { id: 'node-extractor-3', specimenName: pC.name, features: pC.features },
          ],
          inputWeights: tripleWeights,
          onUpdateParameter: handleUpdateParameter,
          onUpdateWeights: handleUpdateWeights,
          onSetDualWeights: handleSetDualWeights,
          onRandomize: handleRandomize,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-three-viewport',
        type: 'threeViewport',
        position: { x: 1340, y: 250 },
        data: {
          parameters: synthesizedParams,
          onCoralMeshReady: setCoralMesh,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-substrate-seawall',
        type: 'substrateSeawall',
        position: { x: 880, y: 850 },
        data: {
          parameters: synthesizedParams,
          onUpdateParameter: handleUpdateParameter,
          onDeleteNode: handleDeleteNode,
        },
      },
      {
        id: 'node-export',
        type: 'exportNode',
        position: { x: 1820, y: 250 },
        data: {
          coralMesh,
          parameters: synthesizedParams,
          onDeleteNode: handleDeleteNode,
        },
      },
    ];

    const tripleEdges = [
      { id: 'e-p1-e1', source: 'node-pool-1', sourceHandle: 'image-out', target: 'node-extractor-1', targetHandle: 'image-in', animated: true },
      { id: 'e-p2-e2', source: 'node-pool-2', sourceHandle: 'image-out', target: 'node-extractor-2', targetHandle: 'image-in', animated: true },
      { id: 'e-p3-e3', source: 'node-pool-3', sourceHandle: 'image-out', target: 'node-extractor-3', targetHandle: 'image-in', animated: true },
      { id: 'e-e1-s', source: 'node-extractor-1', sourceHandle: 'features-out', target: 'node-synthesizer', targetHandle: 'controls-in', animated: true },
      { id: 'e-e2-s', source: 'node-extractor-2', sourceHandle: 'features-out', target: 'node-synthesizer', targetHandle: 'controls-in', animated: true },
      { id: 'e-e3-s', source: 'node-extractor-3', sourceHandle: 'features-out', target: 'node-synthesizer', targetHandle: 'controls-in', animated: true },
      { id: 'e-s-v', source: 'node-synthesizer', sourceHandle: 'controls-out', target: 'node-three-viewport', targetHandle: 'viewport-in', animated: true },
      { id: 'e-sub-v', source: 'node-substrate-seawall', sourceHandle: 'substrate-out', target: 'node-three-viewport', targetHandle: 'viewport-in', animated: true },
      { id: 'e-v-exp', source: 'node-three-viewport', sourceHandle: 'viewport-out', target: 'node-export', targetHandle: 'export-in', animated: true },
    ];

    setNodes(tripleNodes);
    setEdges(tripleEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 50);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onResetLayout={handleResetLayout}
        onLoadDualSpecimenTemplate={handleResetLayout}
        onLoadTripleSpecimenTemplate={handleLoadTripleTemplate}
        onAddImagePool={() => handleAddNode('imagePool')}
        onAddExtractor={() => handleAddNode('featureExtractor')}
      />

      <div style={{ flex: 1, position: 'relative' }}>
        <MiroToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onAddNode={handleAddNode}
          onFitView={() => fitView({ padding: 0.15, duration: 500 })}
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
          fitView
          panOnDrag={activeTool === 'hand' || [1, 2]}
          selectionOnDrag={activeTool === 'select'}
          panOnScroll
          minZoom={0.2}
          maxZoom={2.0}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="rgba(56, 189, 248, 0.15)"
          />
          <Controls position="bottom-left" showInteractive={false} />
          {showMinimap && (
            <MiniMap
              position="bottom-right"
              nodeColor={(n) => {
                if (n.type === 'threeViewport') return '#8b5cf6';
                if (n.type === 'featureExtractor') return '#14b8a6';
                if (n.type === 'morphologyControls') return '#f43f5e';
                if (n.type === 'substrateSeawall') return '#10b981';
                if (n.type === 'exportNode') return '#f59e0b';
                return '#06b6d4';
              }}
              maskColor="rgba(7, 13, 24, 0.8)"
            />
          )}
        </ReactFlow>
      </div>
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
