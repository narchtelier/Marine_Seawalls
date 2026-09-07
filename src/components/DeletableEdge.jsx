import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { Scissors, X } from 'lucide-react';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const [isHovered, setIsHovered] = useState(false);

  const onEdgeClick = (evt) => {
    evt.stopPropagation();
    if (data?.onDeleteEdge) {
      data.onDeleteEdge(id);
    }
  };

  const isCutActive = data?.isCutMode || false;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isHovered || isCutActive ? '#f43f5e' : (selected ? '#38bdf8' : '#06b6d4'),
          strokeWidth: isHovered || isCutActive ? 3.5 : (selected ? 3.0 : 2.5),
          filter: isHovered || isCutActive ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))' : 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.4))',
          cursor: isCutActive ? 'crosshair' : 'pointer',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* Invisible thicker interaction path for easy clicking and hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onEdgeClick}
        style={{ cursor: isCutActive ? 'crosshair' : 'pointer' }}
      />

      {/* Interactive Floating Wire Cut Button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {(isHovered || selected || isCutActive) && (
            <button
              onClick={onEdgeClick}
              style={{
                width: '22px',
                height: '22px',
                background: '#f43f5e',
                border: '2px solid #fff',
                color: '#fff',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(244, 63, 94, 0.8)',
                transform: 'scale(1)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Cut Wire (Sever Connection)"
            >
              {isCutActive ? <Scissors size={12} /> : <X size={12} />}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
