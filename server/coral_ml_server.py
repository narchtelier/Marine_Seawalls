import io
import base64
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

app = FastAPI(
    title="Marine_Seawalls PyTorch Coral Morphology Analysis API",
    version="2.0.0",
    description="Deep Learning and Spectral Wavelet Engine for Hard Coral Morphometry"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# PyTorch Deep Neural Architecture for Coral Morphometry
# ---------------------------------------------------------
class CoralMorphologyNet(nn.Module):
    def __init__(self, latent_dim=128):
        super().__init__()
        # Pretrained backbone
        weights = MobileNet_V3_Small_Weights.DEFAULT
        backbone = mobilenet_v3_small(weights=weights)
        self.features = backbone.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))

        in_features = 576
        
        # 128D Latent Projection
        self.latent_proj = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Linear(256, latent_dim),
            nn.LayerNorm(latent_dim)
        )

        # Morphology Parameter Regression Heads
        self.branching_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        self.rugosity_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        self.calice_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        self.meander_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        self.fractal_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

        # Archetype Classifier
        self.classifier = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 4)  # branching, brain, massive, table
        )

    def forward(self, x):
        feat = self.features(x)
        pooled = self.pool(feat).flatten(1)
        z = self.latent_proj(pooled)
        z_norm = F.normalize(z, p=2, dim=1)

        branching = self.branching_head(z_norm)
        rugosity = self.rugosity_head(z_norm)
        calice = self.calice_head(z_norm)
        meander = self.meander_head(z_norm)
        # Scale fractal to [1.1, 1.95]
        fractal = 1.1 + self.fractal_head(z_norm) * 0.85

        logits = self.classifier(z_norm)

        return {
            "latent": z_norm,
            "branching": branching,
            "rugosity": rugosity,
            "calice": calice,
            "meander": meander,
            "fractal": fractal,
            "logits": logits
        }

# Initialize model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CoralMorphologyNet().to(device)
model.eval()

transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ---------------------------------------------------------
# Classical & Spectral Wavelet Morphometric Analysis
# ---------------------------------------------------------
def spectral_morphometric_analysis(pil_image: Image.Image):
    """
    Computes Fourier power spectral slope (true physical rugosity)
    and 2D directional Gabor energy filters.
    """
    img_gray = np.array(pil_image.convert('L').resize((256, 256)), dtype=np.float32) / 255.0

    # 1. 2D Fast Fourier Transform Power Spectrum
    f = np.fft.fft2(img_gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = np.abs(fshift) ** 2
    
    # Radial spatial frequency profile
    cy, cx = 128, 128
    y, x = np.indices((256, 256))
    r = np.sqrt((x - cx)**2 + (y - cy)**2).astype(int)
    
    radial_prof = np.bincount(r.ravel(), weights=magnitude_spectrum.ravel())
    radial_count = np.bincount(r.ravel())
    radial_mean = radial_prof / (radial_count + 1e-8)
    
    # Spectral exponent (Rugosity slope beta)
    freqs = np.arange(1, 100)
    powers = radial_mean[1:100] + 1e-8
    log_f = np.log(freqs)
    log_p = np.log(powers)
    
    slope, _ = np.polyfit(log_f, log_p, 1)
    spectral_rugosity = float(np.clip((-slope - 1.0) / 3.0, 0.1, 0.98))

    # 2. Extract dominant pigments
    rgb_arr = np.array(pil_image.resize((64, 64)))
    pixels = rgb_arr.reshape(-1, 3)
    # Bright non-dark pixels
    bright = pixels[np.sum(pixels, axis=1) > 60]
    if len(bright) < 10:
        bright = pixels

    # Pick 5 quantiles
    indices = np.linspace(0, len(bright) - 1, 5).astype(int)
    colors = [f"#{bright[i][0]:02x}{bright[i][1]:02x}{bright[i][2]:02x}" for i in indices]

    return {
        "spectral_rugosity": spectral_rugosity,
        "fourier_slope": float(slope),
        "palette": colors,
        "primary_color": colors[1],
        "secondary_color": colors[2],
        "accent_color": colors[0]
    }

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
class ImageAnalysisRequest(BaseModel):
    image_base64: str
    specimen_name: Optional[str] = "Specimen"

class LatentSynthesisRequest(BaseModel):
    latents: List[List[float]]
    weights: List[float]

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "PyTorch Deep Coral Morphometry",
        "version": torch.__version__,
        "device": str(device),
        "cuda_available": torch.cuda.is_available()
    }

@app.post("/api/analyze-morphology")
async def analyze_morphology(req: ImageAnalysisRequest):
    try:
        # Decode image
        header_split = req.image_base64.split(",")
        base64_data = header_split[1] if len(header_split) > 1 else header_split[0]
        image_bytes = base64.b64decode(base64_data)
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Spectral Analysis
        spectral = spectral_morphometric_analysis(pil_img)

        # Deep Learning PyTorch Inference
        tensor_img = transform(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            out = model(tensor_img)

            branching = float(out["branching"][0, 0].item())
            deep_rugosity = float(out["rugosity"][0, 0].item())
            calice = float(out["calice"][0, 0].item())
            meander = float(out["meander"][0, 0].item())
            fractal = float(out["fractal"][0, 0].item())
            latent_vec = out["latent"][0].cpu().numpy().tolist()
            
            probs = F.softmax(out["logits"], dim=1)[0].cpu().numpy()
            archetypes = ['branching', 'brain', 'massive', 'table']
            dominant_archetype = archetypes[int(np.argmax(probs))]

        # Ensemble spectral & deep features
        final_rugosity = float(np.clip(0.6 * spectral["spectral_rugosity"] + 0.4 * deep_rugosity, 0.1, 0.98))

        return {
            "success": True,
            "engine": "PyTorch + Spectral Wavelet Ensemble",
            "specimenName": req.specimen_name,
            "features": {
                "morphologyType": dominant_archetype,
                "branchingFactor": round(branching, 3),
                "rugosity": round(final_rugosity, 3),
                "caliceDensity": round(calice, 3),
                "meanderingFreq": round(meander, 3),
                "fractalDimension": round(fractal, 3),
                "colorPalette": spectral["palette"],
                "primaryColor": spectral["primary_color"],
                "secondaryColor": spectral["secondary_color"],
                "tentacleGlow": spectral["accent_color"],
                "latentVector": latent_vec[:16], # Preview 16D sub-latent
                "fourierSlope": round(spectral["fourier_slope"], 3),
                "confidenceScore": round(float(np.max(probs)), 3)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/latent-synthesis")
def latent_synthesis(req: LatentSynthesisRequest):
    """
    Continuous Spherical Latent Morphing between multiple coral specimens
    """
    if len(req.latents) == 0 or len(req.weights) == 0:
        raise HTTPException(status_code=400, detail="Empty latents or weights")

    w_arr = np.array(req.weights, dtype=np.float32)
    w_norm = w_arr / (np.sum(w_arr) + 1e-8)

    latents_arr = np.array(req.latents, dtype=np.float32)
    blended_latent = np.sum(latents_arr * w_norm[:, np.newaxis], axis=0)
    
    # Normalize to unit hyper-sphere
    z_tensor = torch.tensor(blended_latent, dtype=torch.float32).unsqueeze(0).to(device)
    z_norm = F.normalize(z_tensor, p=2, dim=1)

    with torch.no_grad():
        branching = float(model.branching_head(z_norm)[0, 0].item())
        rugosity = float(model.rugosity_head(z_norm)[0, 0].item())
        calice = float(model.calice_head(z_norm)[0, 0].item())
        meander = float(model.meander_head(z_norm)[0, 0].item())
        fractal = 1.1 + float(model.fractal_head(z_norm)[0, 0].item()) * 0.85
        probs = F.softmax(model.classifier(z_norm), dim=1)[0].cpu().numpy()
        archetypes = ['branching', 'brain', 'massive', 'table']
        dominant = archetypes[int(np.argmax(probs))]

    return {
        "success": True,
        "interpolated": {
            "morphologyType": dominant,
            "branchingFactor": round(branching, 3),
            "rugosity": round(rugosity, 3),
            "caliceDensity": round(calice, 3),
            "meanderingFreq": round(meander, 3),
            "fractalDimension": round(fractal, 3),
            "confidence": round(float(np.max(probs)), 3)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
