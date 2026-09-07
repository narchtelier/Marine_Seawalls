import * as THREE from 'three';

/**
 * 3D Mesh Exporter (OBJ & STL) + Parameter Config Downloader
 */

export function exportGroupToOBJ(group, filename = 'Marine_Seawalls_Coral.obj') {
  let output = `# Marine_Seawalls Procedural Coral Export\n# Vertices & Normals\n\n`;
  let vertexOffset = 1;

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;
      const matrix = child.matrixWorld;
      const pos = geo.attributes.position;
      const norm = geo.attributes.normal;

      output += `o ${child.name || 'CoralPart'}\n`;

      // Vertices
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(matrix);
        output += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`;
      }

      // Normals
      if (norm) {
        for (let i = 0; i < norm.count; i++) {
          const n = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).transformDirection(matrix);
          output += `vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}\n`;
        }
      }

      // Faces
      if (geo.index) {
        const idx = geo.index.array;
        for (let i = 0; i < idx.length; i += 3) {
          const a = idx[i] + vertexOffset;
          const b = idx[i + 1] + vertexOffset;
          const c = idx[i + 2] + vertexOffset;
          output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          const a = i + vertexOffset;
          const b = i + 1 + vertexOffset;
          const c = i + 2 + vertexOffset;
          output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        }
      }

      vertexOffset += pos.count;
    }
  });

  downloadBlob(output, filename, 'text/plain');
}

export function exportGroupToSTL(group, filename = 'Marine_Seawalls_Coral.stl') {
  let output = `solid Marine_Seawalls_Coral\n`;

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;
      const matrix = child.matrixWorld;
      const pos = geo.attributes.position;

      const getVertex = (i) => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(matrix);

      if (geo.index) {
        const idx = geo.index.array;
        for (let i = 0; i < idx.length; i += 3) {
          const vA = getVertex(idx[i]);
          const vB = getVertex(idx[i + 1]);
          const vC = getVertex(idx[i + 2]);

          const cb = new THREE.Vector3().subVectors(vC, vB);
          const ab = new THREE.Vector3().subVectors(vA, vB);
          const normal = cb.cross(ab).normalize();

          output += `  facet normal ${normal.x.toFixed(4)} ${normal.y.toFixed(4)} ${normal.z.toFixed(4)}\n`;
          output += `    outer loop\n`;
          output += `      vertex ${vA.x.toFixed(4)} ${vA.y.toFixed(4)} ${vA.z.toFixed(4)}\n`;
          output += `      vertex ${vB.x.toFixed(4)} ${vB.y.toFixed(4)} ${vB.z.toFixed(4)}\n`;
          output += `      vertex ${vC.x.toFixed(4)} ${vC.y.toFixed(4)} ${vC.z.toFixed(4)}\n`;
          output += `    endloop\n`;
          output += `  endfacet\n`;
        }
      }
    }
  });

  output += `endsolid Marine_Seawalls_Coral\n`;
  downloadBlob(output, filename, 'text/plain');
}

export function exportParametersJSON(parameters, filename = 'coral_morphology_params.json') {
  const jsonStr = JSON.stringify(parameters, null, 2);
  downloadBlob(jsonStr, filename, 'application/json');
}

function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
