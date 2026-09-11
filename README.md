# Marine_Seawalls

**Live Interactive Application**: [https://narchtelier.github.io/Marine_Seawalls/](https://narchtelier.github.io/Marine_Seawalls/)

Marine_Seawalls is an advanced computational marine ecology and biomimetic engineering platform designed to analyze, synthesize, and procedurally generate 3D hard coral reef morphologies for ecological seawall enhancement. Combining 3D Gaussian Splatting (`@lumaai/luma-web`), volumetric TSDF isosurface extraction, and Self-Organizing Map (SOM) latent morphospaces within an interactive node graph canvas, researchers and marine engineers can transform 2D coral reef photographs into watertight 3D geometries, synthesize continuous 10x10 latent manifolds, and export production-ready CAD/STL files for additive manufacturing and reef restoration.


## 6-Stage End-to-End Generative Pipeline

1. **Reef Imagery Input (`ReefImageInputNode`)**: Ingest user-uploaded coral reef photographs or curated biological specimen presets. Transforms images into volumetric 3D Gaussian Splats with real-time Three.js OrbitControls and particle reveal animations.
2. **Watertight Surface Extractor (`SplatMesherNode`)**: Computes high-fidelity 3D Alpha-Hull Heightmap and TSDF Isosurface extractions with watertight boundary sealing, foreground/background segmentation, vertex color mapping, and biometric feature telemetry (`branchingFactor`, `rugosity`, `caliceDensity`, `primaryColor`).
3. **Watertight Mesh Viewport (`WatertightMeshViewportNode`)**: Custom Three.js viewport rendering the newly extracted watertight 3D mesh with OrbitControls, wireframe toggle, manifold validation badge, and triangle telemetry.
4. **10x10 Multi-Specimen SOM Synthesizer Grid (`SOMSynthesizerNode`)**: Robust 3D Self-Organizing Map latent morphospace generator synthesizing 100 interpolated coral phenotypes across input specimens. Features interactive heatmap metric modes (Eco-Fitness $J_{\text{eco}}$, Wave Shear Dissipation $\tau_{\text{diss}}$, Larval Settlement $\sigma_{\text{rec}}$, Porosity $\Phi$) and direct cell selection.
5. **Selected Interpolated Geometry Viewport (`InterpolatedGeometryViewportNode`)**: Custom 3D viewport rendering the single newly interpolated geometry selected from the SOM grid in full Three.js PBR fidelity with ocean lighting presets, wireframe, and live morphometrics card.
6. **Production Exporter (`ExportNode`)**: Direct one-click export of the selected interpolated geometry to `.STL` (for 3D printing onto seawalls), `.OBJ` (for Rhino, Blender, Maya, CAD), and morphological `.JSON`.


## Getting Started

### Prerequisites
- Node.js (v18+) & npm

### Installation

```bash
npm install --legacy-peer-deps
```

### Running the Application

```bash
npm run dev
```
*Open `http://localhost:5173` in your browser.*

## Controls & Navigation

| Action | Control / Gesture |
| :--- | :--- |
| **Select / Move Nodes** | `Left Click` + Drag node header |
| **Pan Canvas** | `Right Click` / `Middle Click` Drag, or select **Hand Tool (H)** |
| **Zoom Canvas** | `Mouse Wheel` Scroll or `+` / `-` buttons |
| **Upload Coral Imagery** | Click **Upload Coral Image** in Node 1 |
| **Run Surface Extraction** | Click **Extract Watertight 3D Geometry** in Node 2 |
| **Inspect Watertight Mesh** | Orbit / Zoom inside Node 3 Viewport |
| **Select SOM Grid Cell** | `Left Click` on any of the 100 cells in Node 4 (10x10 SOM Grid) |
| **Inspect Interpolated 3D Coral** | Orbit / Zoom inside Node 5 Viewport |
| **Export 3D CAD / STL** | Click **Export 3D Print (.STL)** or **Export 3D Mesh (.OBJ)** in Node 6 |
