# Marine_Seawalls

Marine_Seawalls is an advanced computational marine ecology and biomimetic engineering platform designed to analyze, synthesize, and procedurally generate 3D hard coral reef morphologies for ecological seawall enhancement. Combining PyTorch deep convolutional feature extraction and Fourier spectral wavelets with an interactive Miro-style node graph workflow, the system extracts critical morphometric parameters—such as arborescent branching factors, surface rugosity exponents, corallite calice pore densities, and meandroid sinuosities—from multi-specimen reference image pools. Researchers and marine engineers can continuously morph and interpolate disparate coral phenotypes in latent space, evaluate hydro-dynamic wave shear dissipation on concrete seawall substrates, and export production-ready 3D CAD/STL files for additive manufacturing and reef restoration.

## Key Features

- **Miro-Style Workflow Canvas**: Infinite-pan canvas powered by `@xyflow/react` with custom nodes, dynamic edge routing, minimap, floating toolbars, wire cutting tool (scissors tool), single-click node unlinking, and spacious initial layout distribution.
- **Multiple Reference Image Pools & Species Taxonomy Parser**: Ingest and categorize independent reference specimen datasets (e.g., *Acropora*, *Platygyra*, *Porites*, *Turbinaria*). Enter any coral species/reef name to parse biological taxonomy and replace 3D geometry instantly with a customizable mesh fidelity slider (Ultra-HD $54^3$ voxel grid).
- **NLP Semantic Prompting Engine**: Direct natural language text inputs integrated into the Input Specimen node for morphological characteristics, geometric parameters, spatial conditions, and ecological functions (e.g., *branching, rugose, deep shelter, high wave resistance*) to override and fine-tune extracted features.
- **PyTorch Deep Learning Morphometry**: Deep neural network architecture with MobileNetV3 feature pyramids, 128D latent space projection, 2D Gabor wavelets, Self-Organizing Map (SOM) visual feature mapping, and Fourier power spectrum slope analysis for rugosity quantification.
- **Continuous 3D Morphology Synthesizer**: Real-time parameter augmentation and multi-specimen spherical latent space morphing ($n$-way blend sliders) with live 3D geometric deformation.
- **10x10 Interactive SOM 3D Morphospace Grid**: Movable, linked SOM node generating a 100-cell latent space manifold matrix rendering 100 live 3D procedural geometries using Three.js `InstancedMesh` batching. Includes an On/Off Solver Toggle to save GPU resources, and interactive color-coded heatmaps for wave dissipation ($\tau_{\text{diss}}$), recruitment score ($\sigma_{\text{rec}}$), porosity ($\Phi$), and eco-index ($J_{\text{eco}}$).
- **High-Fidelity Three.js WebGL Viewports**: Real-time PBR rendering with aragonite micro-texture normal maps, differential roughness maps, ocean light caustics, and Fresnel subsurface translucent rim lighting.
- **Seawall Substrate Integration**: Eco-engineering substrate matrix computing wave shear dissipation, larval recruitment cavity geometry, and tidal micro-pool retention.
- **Production 3D Export**: Export synthesized coral meshes to `.OBJ` and `.STL` formats (for 3D printing onto seawalls) alongside JSON parameter matrices.

## Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) with PyTorch

### Installation

1. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

2. **Install Python Deep Learning Dependencies**:
   ```bash
   pip install torch torchvision numpy scipy scikit-image pillow fastapi uvicorn python-multipart
   ```

### Running the Application

1. **Start the PyTorch Morphometry Server**:
   ```bash
   python server/coral_ml_server.py
   ```
   *The deep learning API will initialize at `http://127.0.0.1:8000`.*

2. **Start the Frontend Development Server**:
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
| **Add New Node** | Miro Toolbar `+` button or Header quick-action buttons |
| **3D Viewport Orbit** | `Left Click` + Drag inside 3D Viewport |
| **3D Viewport Zoom** | `Mouse Wheel` inside 3D Viewport |
| **3D Lighting Mode** | Sun / Moon toggle icon in Viewport header |
| **Morphing Interpolation** | Drag the **Dual-Specimen Blend Slider** or individual weight sliders in Node 3 |
| **3D Model Export** | Click **Export 3D Mesh (.OBJ)** or **Export 3D Print (.STL)** in Node 6 |
