import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { drawSOM3DWireframe, get10x10GridInterpolatedModels } from '../engine/somWireframeRenderer';

/**
 * High-performance single-canvas 10x10 SOM 3D Wireframe Grid.
 * Projects and renders the actual Marching Tetrahedra 3D wireframe models grounded in geomA and geomB.
 * Each of the 100 cells gets a unique wireframe based on both u-axis (A↔B blend) and v-axis (iso-threshold).
 */
function SOMGridCanvas({
  somGrid,
  geomA,
  geomB,
  activeGeometry = null,
  displayMode = 'wireframe', // 'wireframe' | 'hybrid' | 'heatmap'
  heatmapMode = 'j_eco',
  selectedCoord = { x: 5, y: 5 },
  hoveredCell = null,
  onSelectCoord,
  onHoverCell,
  autoRotate = false,
  yawAngle = 0.58,
  pitchAngle = 0.36,
  width = 396,
  height = 396,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const rotAngleRef = useRef(yawAngle);

  // Compute actual Marching Tetrahedra 3D models for all 100 cells (10×10 grid)
  const gridModels = useMemo(() => {
    return get10x10GridInterpolatedModels(geomA, geomB);
  }, [geomA, geomB]);

  // Keep rotation reference updated
  useEffect(() => {
    if (!autoRotate) {
      rotAngleRef.current = yawAngle;
    }
  }, [yawAngle, autoRotate]);

  // Main Draw Call
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !somGrid || somGrid.length === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const displayW = width;
    const displayH = height;

    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Canvas oceanic backdrop
    ctx.fillStyle = '#060d19';
    ctx.fillRect(0, 0, displayW, displayH);

    const cols = 10;
    const rows = 10;
    const cellW = displayW / cols;
    const cellH = displayH / rows;
    const cellRadius = Math.min(cellW, cellH) * 0.46;

    const currentYaw = rotAngleRef.current;
    const currentPitch = pitchAngle;

    for (let j = 0; j < rows; j++) {
      const row = somGrid[j];
      if (!row) continue;
      for (let i = 0; i < cols; i++) {
        const cell = row[i];
        if (!cell) continue;

        const isSelected = selectedCoord.x === i && selectedCoord.y === j;
        const isHovered = hoveredCell && hoveredCell.x === i && hoveredCell.y === j;

        const cellX = i * cellW;
        const cellY = j * cellH;
        const cx = cellX + cellW / 2;
        const cy = cellY + cellH / 2;
        const pad = 1.5;
        const rw = cellW - pad * 2;
        const rh = cellH - pad * 2;
        const rx = cellX + pad;
        const ry = cellY + pad;

        // 1. Fast Cell Tile Backdrop without expensive clipping mask
        if (displayMode === 'heatmap') {
          const val = cell.metrics?.[heatmapMode] ?? 0.5;
          ctx.fillStyle = getMetricHeatColor(val, heatmapMode);
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(6, 13, 25, 0.45)';
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();
        } else {
          ctx.fillStyle = isSelected ? '#0b192c' : '#081120';
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();

          // Subtle radial glow behind wireframe
          const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cellRadius * 1.1);
          glowGrad.addColorStop(0, isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(14, 165, 233, 0.08)');
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(rx, ry, rw, rh);
        }

        // 2. Render actual 3D Wireframe Geometry grounded in geomA and geomB
        drawSOM3DWireframe(
          ctx,
          cx,
          cy,
          cellRadius,
          cell,
          { yaw: currentYaw, pitch: currentPitch },
          {
            heatmapMode,
            isSelected,
            isHovered,
            colorA: cell.parameters?.primaryColor || '#10b981',
            colorB: cell.parameters?.secondaryColor || '#0ea5e9',
            tintWithHeatmap: displayMode === 'hybrid' || displayMode === 'heatmap',
          },
          gridModels,
          isSelected ? activeGeometry : null
        );

        // 3. Hover / Select overlay and crisp border in single pass
        if (isSelected) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.12)';
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();

          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2.0;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 6;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Selection corner dots
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx, ry, 2.5, 2.5);
          ctx.fillRect(rx + rw - 2.5, ry, 2.5, 2.5);
          ctx.fillRect(rx, ry + rh - 2.5, 2.5, 2.5);
          ctx.fillRect(rx + rw - 2.5, ry + rh - 2.5, 2.5, 2.5);
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.fill();

          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.4;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 4;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
          ctx.lineWidth = 0.8;
          ctx.shadowBlur = 0;
          roundRect(ctx, rx, ry, rw, rh, 4);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [somGrid, gridModels, activeGeometry, displayMode, heatmapMode, selectedCoord, hoveredCell, pitchAngle, width, height]);

  // Continuous loop only if autoRotate is enabled; otherwise render on prop changes
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (autoRotate) {
        rotAngleRef.current += 0.012;
      }
      renderFrame();
      if (autoRotate) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (autoRotate) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      renderFrame();
    }

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, renderFrame]);

  // Mouse coordinate handling
  const getCellFromMouse = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > width || y < 0 || y > height) return null;

    const col = Math.min(9, Math.max(0, Math.floor((x / width) * 10)));
    const row = Math.min(9, Math.max(0, Math.floor((y / height) * 10)));
    return { col, row };
  };

  const isPointerDownRef = useRef(false);

  const selectTileAt = (pos) => {
    if (!pos || !onSelectCoord) return;
    onSelectCoord({ x: pos.col, y: pos.row });
  };

  const handlePointerDown = (e) => {
    isPointerDownRef.current = true;
    const pos = getCellFromMouse(e);
    if (pos) {
      selectTileAt(pos);
    }
  };

  const handlePointerMove = (e) => {
    const pos = getCellFromMouse(e);
    if (!pos || !somGrid) return;
    const cell = somGrid[pos.row]?.[pos.col];
    if (cell && onHoverCell) {
      onHoverCell(cell);
    }
    if (isPointerDownRef.current && pos) {
      selectTileAt(pos);
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handlePointerLeave = () => {
    isPointerDownRef.current = false;
    if (onHoverCell) {
      onHoverCell(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.8)',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}

export default React.memo(SOMGridCanvas);

function roundRect(ctx, x, y, width, height, radius = 4) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getMetricHeatColor(val = 0.5, mode = 'j_eco') {
  const c = Math.max(0, Math.min(1, val));
  if (mode === 'j_eco') {
    return `hsl(${155 + c * 45}, 85%, ${35 + c * 25}%)`;
  } else if (mode === 'tau_diss') {
    return `hsl(${30 + c * 35}, 90%, ${40 + c * 20}%)`;
  } else if (mode === 'sigma_rec') {
    return `hsl(${185 + c * 35}, 85%, ${38 + c * 25}%)`;
  } else {
    return `hsl(${265 + c * 35}, 80%, ${40 + c * 25}%)`;
  }
}
