import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { generateSOMGrid } from '../engine/somInterpolation';
import { createProceduralCoral } from '../engine/coralGenerators';
import { Layers, Activity, Maximize2, Zap, Power } from 'lucide-react';

export default function SOMGridViewportNode({ id, data }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const gridGroupRef = useRef(new THREE.Group());
  
  const [heatmapMode, setHeatmapMode] = useState('none');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [loading, setLoading] = useState(false);
  const [somGrid, setSomGrid] = useState(null);
  const [isSolverEnabled, setIsSolverEnabled] = useState(true);

  // We assume data.extractors contains the array of feature extractors connected to us
  const extractors = data.extractors || [];

  // Generate the latent space grid data when extractors change
  useEffect(() => {
    if (extractors.length === 0 || !isSolverEnabled) {
      if (!isSolverEnabled) setSomGrid(null);
      return;
    }
    setLoading(true);
    // Yield to let UI update loading state
    setTimeout(() => {
      const grid = generateSOMGrid(extractors);
      setSomGrid(grid);
      setLoading(false);
    }, 50);
  }, [extractors, isSolverEnabled]);

  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = 500;
    const height = 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1324');
    sceneRef.current = scene;

    scene.add(gridGroupRef.current);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 15, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight('#ffffff', 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    let animationFrameId;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Build the 3D meshes based on the somGrid
  useEffect(() => {
    // Clear old grid
    while (gridGroupRef.current.children.length > 0) {
      const child = gridGroupRef.current.children[0];
      gridGroupRef.current.remove(child);
      if (child.material) child.material.dispose();
      if (child.geometry) child.geometry.dispose();
    }

    if (!somGrid || !sceneRef.current || !isSolverEnabled) return;

    const gridSize = 10;
    const spacing = 1.5;
    const offset = (gridSize * spacing) / 2 - (spacing / 2);

    // InstancedMesh for Pedestals to optimize performance
    const pedGeom = new THREE.BoxGeometry(spacing * 0.9, 0.1, spacing * 0.9);
    const pedMat = new THREE.MeshBasicMaterial({ color: '#1e293b' });
    const pedestalInstancedMesh = new THREE.InstancedMesh(pedGeom, pedMat, gridSize * gridSize);
    gridGroupRef.current.add(pedestalInstancedMesh);
    
    // Create dummy object for instancing matrix
    const dummy = new THREE.Object3D();
    
    // Store metadata for raycasting mapping
    pedestalInstancedMesh.userData = { isInstancedPedestals: true, cells: [] };

    let instanceIdx = 0;

    const generateGrid = async () => {
      for (let j = 0; j < somGrid.length; j++) {
        for (let i = 0; i < somGrid[j].length; i++) {
          const cell = somGrid[j][i];
          const posX = i * spacing - offset;
          const posZ = j * spacing - offset;

          const coral = await createProceduralCoral({
            ...cell.parameters,
            resolution: 12,
            showPolyps: false,
            substrateType: 'none',
            growthScale: 0.35,
          });

          coral.position.set(posX, 0, posZ);
          coral.userData = { cell };
          gridGroupRef.current.add(coral);

          dummy.position.set(posX, -0.05, posZ);
          dummy.updateMatrix();
          pedestalInstancedMesh.setMatrixAt(instanceIdx, dummy.matrix);
          pedestalInstancedMesh.setColorAt(instanceIdx, new THREE.Color('#1e293b'));
          
          pedestalInstancedMesh.userData.cells[instanceIdx] = cell;
          instanceIdx++;
        }
      }
      if (pedestalInstancedMesh.instanceMatrix) pedestalInstancedMesh.instanceMatrix.needsUpdate = true;
      if (pedestalInstancedMesh.instanceColor) pedestalInstancedMesh.instanceColor.needsUpdate = true;
    };
    
    generateGrid();
    
    if (pedestalInstancedMesh.instanceMatrix) pedestalInstancedMesh.instanceMatrix.needsUpdate = true;
    if (pedestalInstancedMesh.instanceColor) pedestalInstancedMesh.instanceColor.needsUpdate = true;

  }, [somGrid, isSolverEnabled]);

  // Apply Heatmap Colors
  useEffect(() => {
    if (!somGrid || !isSolverEnabled) return;
    
    const pedestalMesh = gridGroupRef.current.children.find(c => c.userData?.isInstancedPedestals);
    if (!pedestalMesh) return;

    let instanceIdx = 0;
    somGrid.forEach((row) => {
      row.forEach((cell) => {
        let color = new THREE.Color('#1e293b');
        if (heatmapMode !== 'none') {
          const value = cell.metrics[heatmapMode]; // 0 to 1
          // Simple jet-like colormap
          color.setHSL((1.0 - value) * 0.66, 1.0, 0.5); 
        }
        pedestalMesh.setColorAt(instanceIdx, color);
        instanceIdx++;
      });
    });
    
    pedestalMesh.instanceColor.needsUpdate = true;
  }, [heatmapMode, somGrid, isSolverEnabled]);

  const onPointerMove = (e) => {
    if (!rendererRef.current || !cameraRef.current || !isSolverEnabled) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(gridGroupRef.current.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      
      // Check if it's the instanced mesh pedestal
      if (hit.object.userData?.isInstancedPedestals) {
        const instanceId = hit.instanceId;
        const cell = hit.object.userData.cells[instanceId];
        if (cell) {
          setHoveredCell(cell);
          return;
        }
      }
      
      // Find the root object that has cell data
      let obj = hit.object;
      while (obj && !obj.userData.cell) {
        obj = obj.parent;
      }
      if (obj && obj.userData.cell) {
        setHoveredCell(obj.userData.cell);
        return;
      }
    }
    setHoveredCell(null);
  };

  const onClick = () => {
    if (hoveredCell && data.onSetSynthesizedParams) {
      data.onSetSynthesizedParams(hoveredCell.parameters);
    }
  };

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl w-[500px] overflow-hidden">
      <Handle type="target" position={Position.Top} id="grid-in" className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
      
      {/* Header (Draggable) */}
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-fuchsia-400" />
          <h3 className="text-white font-bold tracking-wide">SOM Morphospace</h3>
        </div>
        <div className="flex gap-2 items-center nodrag nopan">
          <button 
            onClick={() => setIsSolverEnabled(!isSolverEnabled)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isSolverEnabled ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}
            title={isSolverEnabled ? "Disable SOM Solver" : "Enable SOM Solver"}
          >
            <Power className="w-3 h-3" />
            {isSolverEnabled ? 'ACTIVE' : 'DISABLED'}
          </button>
          
          <select 
            className="bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 outline-none nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            value={heatmapMode}
            onChange={(e) => setHeatmapMode(e.target.value)}
          >
            <option value="none">Heatmap: None</option>
            <option value="j_eco">Fitness (J_eco)</option>
            <option value="tau_diss">Wave Attenuation</option>
            <option value="sigma_rec">Larval Recruitment</option>
            <option value="phi">Porosity / Void Ratio</option>
          </select>
          <button className="text-slate-400 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewport Container */}
      <div 
        className="relative w-full h-[400px] nodrag nopan" 
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoveredCell(null)}
        onClick={onClick}
      >
        {!isSolverEnabled && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-10 p-6 text-center">
             <Power className="w-12 h-12 text-slate-600 mb-4" />
             <h4 className="text-slate-300 font-bold text-lg mb-2">SOM Solver Disabled</h4>
             <p className="text-slate-500 text-sm">Enable the solver to compute the 10x10 latent morphospace grid. Disabled to reduce application overhead.</p>
          </div>
        )}

        {loading && isSolverEnabled && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <Zap className="w-8 h-8 text-fuchsia-500 animate-pulse" />
              <span className="text-fuchsia-400 font-mono text-sm">Computing Latent Manifold (100x)...</span>
            </div>
          </div>
        )}

        {/* Hover Info Panel */}
        {hoveredCell && !loading && isSolverEnabled && (
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-3 text-xs shadow-xl pointer-events-none">
            <h4 className="text-white font-bold mb-2 flex items-center gap-2">
              <Activity className="w-3 h-3 text-green-400" />
              Cell [{hoveredCell.x}, {hoveredCell.y}] Metrics
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-400">Fitness (J_eco):</span>
              <span className="text-green-300 font-mono">{(hoveredCell.metrics.j_eco * 100).toFixed(1)}%</span>
              
              <span className="text-slate-400">Wave Dissipation:</span>
              <span className="text-blue-300 font-mono">{(hoveredCell.metrics.tau_diss * 100).toFixed(1)}%</span>
              
              <span className="text-slate-400">Recruitment:</span>
              <span className="text-pink-300 font-mono">{(hoveredCell.metrics.sigma_rec * 100).toFixed(1)}%</span>
              
              <span className="text-slate-400">Branching Factor:</span>
              <span className="text-slate-200 font-mono">{(hoveredCell.parameters.branchingFactor).toFixed(2)}</span>
            </div>
            <div className="mt-2 text-center text-slate-500 border-t border-slate-700 pt-1 italic">
              Click to synthesis
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
