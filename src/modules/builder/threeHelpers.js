// src/modules/builder/threeHelpers.js
// Shared Three.js utilities used by both WarehouseBuilder and WarehouseViewer

import * as THREE from "three";
import { CAPACITY_COLORS, ITEM_TYPES } from "../../data/mockData.js";

// Find all boxes contiguous to the start box (sharing a face)
export function findContiguousBoxes(startId, boxes) {
  const result = new Set([startId]);
  const queue = [startId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentBox = boxes.find(b => b.id === currentId);
    if (!currentBox) continue;

    for (const otherBox of boxes) {
      if (result.has(otherBox.id)) continue;
      
      // Simple bounding box intersection (with small epsilon)
      const touches = 
        Math.abs(currentBox.position.x - otherBox.position.x) < (currentBox.size.w + otherBox.size.w) / 2 + 0.01 &&
        Math.abs(currentBox.position.z - otherBox.position.z) < (currentBox.size.d + otherBox.size.d) / 2 + 0.01 &&
        Math.abs(currentBox.position.y - otherBox.position.y) < (currentBox.size.h + otherBox.size.h) / 2 + 0.01;
      
      if (touches) {
        result.add(otherBox.id);
        queue.push(otherBox.id);
      }
    }
  }
  return result;
}

export const BG_COLOR = "#050810";
export const GRID_SIZE = 60;

// ─── Label canvas texture ─────────────────────────────────────────────────────
// Strategy for crisp text:
//   • 1024×512 canvas (2× each axis vs what Three.js samples = 4× pixel budget)
//   • imageSmoothingEnabled = false keeps pixel boundaries hard
//   • System UI sans-serif — browsers rasterise it at native DPI with hinting
//   • No shadow blur anywhere — blur destroys crispness at small texture sizes
//   • anisotropy = renderer max so slanted views stay sharp
export function makeLabelTexture(label, capBorder, renderer = null) {
  const W = 1024,
    H = 512;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;

  // Dark background
  c.fillStyle = "#04090f";
  c.fillRect(0, 0, W, H);

  // Coloured border — two passes: thick dim glow then thin crisp line
  c.strokeStyle = capBorder + "44";
  c.lineWidth = 24;
  c.strokeRect(4, 4, W - 8, H - 8);
  c.strokeStyle = capBorder;
  c.lineWidth = 8;
  c.strokeRect(4, 4, W - 8, H - 8);

  // Label — system UI font, large, pure white, no blur at all
  const text = (label || "·").toUpperCase();
  // Limit to 24 characters to ensure it fits and remains readable
  const displayLabel = text.length > 24 ? text.substring(0, 24) : text;
  c.fillStyle = "#ffffff";
  // Scale font size to fit — shorter labels get bigger text
  const basePx = displayLabel.length <= 2 ? 320 : displayLabel.length <= 6 ? 240 : 160;
  c.font = `900 ${basePx}px -apple-system, "Segoe UI", Arial, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";

  // Measure and shrink if needed
  let fontSize = basePx;
  while (c.measureText(displayLabel).width > W - 80 && fontSize > 60) {
    fontSize -= 10;
    c.font = `900 ${fontSize}px -apple-system, "Segoe UI", Arial, sans-serif`;
  }

  c.fillText(displayLabel, W / 2, H / 2 - 10);

  // Bottom accent bar in the capacity/type colour
  c.fillStyle = capBorder;
  c.fillRect(W * 0.2, H - 28, W * 0.6, 10);

  const t = new THREE.CanvasTexture(cv);
  // Use renderer's max anisotropy if available, otherwise fall back to 16
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ─── Box mesh (builder mode — full interactive) ───────────────────────────────
// Helper to create a billboarded text label
export function createBillboardLabel(text, color) {
  const tex = makeLabelTexture(text, color);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 0.75, 1); // Adjust size as needed
  return sprite;
}

export function buildBoxMesh(box, flags = {}) {
  const { selected = false, hoveredDelete = false, dimmed = false, isContiguous = false, clusterCenter = null } = flags;
  const { w, h, d } = box.size;
  const isLandmark = !!box.isLandmark;
  
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  const group = new THREE.Group();
  group.userData = { boxId: box.id };

  const bodyColor = hoveredDelete ? "#2a0a0a" : isLandmark ? "#0c1a20" : "#0c1d30";
  const emissive = hoveredDelete ? "#ff0000" : isLandmark ? "#204060" : cap.border;
  const emissiveI = hoveredDelete
    ? 0.6
    : isLandmark
    ? 0.2
    : selected
      ? 0.28
      : dimmed
        ? 0.02
        : 0.07;
  const bodyOpacity = dimmed ? 0.25 : 1;

  // Use full size for landmarks to avoid gaps
  const geo = new THREE.BoxGeometry(
    w - (isLandmark ? 0 : 0.045), 
    h - (isLandmark ? 0 : 0.045), 
    d - (isLandmark ? 0 : 0.045)
  );
  
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColor),
    metalness: isLandmark ? 0.2 : 0.5,
    roughness: isLandmark ? 0.8 : 0.5,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: emissiveI,
    transparent: dimmed,
    opacity: bodyOpacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edgeColor = hoveredDelete ? "#ff2244" : isLandmark ? "#4080c0" : cap.border;
  const edgeOpacity = dimmed
    ? 0.1
    : hoveredDelete
      ? 1.0
      : selected
        ? 0.95
        : 0.5;
  const edgeGeo = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(
      w - (isLandmark ? 0 : 0.02), 
      h - (isLandmark ? 0 : 0.02), 
      d - (isLandmark ? 0 : 0.02)
    )
  );
  group.add(
    new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(edgeColor),
        transparent: true,
        opacity: edgeOpacity,
      }),
    ),
  );

  if (hoveredDelete) {
    const rg = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(w + 0.18, h + 0.18, d + 0.18),
    );
    group.add(
      new THREE.LineSegments(
        rg,
        new THREE.LineBasicMaterial({
          color: 0xff2244,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    );
  }
  if (selected && !hoveredDelete) {
    const rg = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(w + 0.1, h + 0.1, d + 0.1),
    );
    group.add(
      new THREE.LineSegments(
        rg,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
  }
  
  if (!dimmed) {
    if (isLandmark && isContiguous && clusterCenter) {
      // Add billboard label to the group, positioned at cluster center
      const label = createBillboardLabel(box.label, cap.border);
      // Position relative to group
      label.position.set(
        clusterCenter.x - box.position.x,
        h/2 + 1.0, 
        clusterCenter.z - box.position.z
      );
      group.add(label);
    } else if (!isLandmark) {
      const tex = makeLabelTexture(box.label, cap.border);
      const lMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const addFace = (pos, ry) => {
        const fw = ry === 0 || ry === Math.PI ? w * 0.82 : d * 0.82;
        const pm = new THREE.Mesh(
          new THREE.PlaneGeometry(fw, h * 0.72),
          lMat.clone(),
        );
        pm.position.copy(pos);
        pm.rotation.y = ry;
        group.add(pm);
      };
      addFace(new THREE.Vector3(0, 0, d / 2 + 0.001), 0);
      addFace(new THREE.Vector3(0, 0, -d / 2 - 0.001), Math.PI);
      addFace(new THREE.Vector3(w / 2 + 0.001, 0, 0), Math.PI / 2);
      addFace(new THREE.Vector3(-w / 2 - 0.001, 0, 0), -Math.PI / 2);
    }
  }

  group.position.set(box.position.x, box.position.y, box.position.z);
  return group;
}

// ─── Viewer-mode box mesh (read-only, type-tinted, clickable) ─────────────────
// overrideEdgeColor: forces edges + emissive to this hex — used to show capacity
// colour on matching bins when the inventory view is filtering by item type.
export function buildViewerBoxMesh(box, flags = {}) {
  const {
    selected = false,
    dimmed = false,
    highlighted = false,
    overrideEdgeColor = null,
    colorMode = 'capacity', // 'capacity' | 'item'
  } = flags;
  const { w, h, d } = box.size;
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  const typeColor = ITEM_TYPES[box.itemType]?.color || "#2a5a8a";

  const group = new THREE.Group();
  group.userData = {
    boxId: box.id,
    boxLabel: box.label,
    itemType: box.itemType,
    ...flags,
  };

  const isLandmark = !!box.isLandmark;
  const bodyHex = isLandmark ? "#2a3a4a" : (dimmed ? "#090f1a" : highlighted ? "#0e2040" : "#0c1d30");
  
  // Decide base color based on mode
  const modeColor = isLandmark ? "#2a3a4a" : (colorMode === 'item' ? typeColor : cap.border);
  
  const emissiveHex =
    overrideEdgeColor || (highlighted ? modeColor : modeColor); // Simplified for now based on mode
  const emissiveInt = dimmed
    ? 0.01
    : highlighted
      ? 0.2
      : selected
        ? 0.25
        : 0.06;

  const geo = new THREE.BoxGeometry(w - 0.045, h - 0.045, d - 0.045);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyHex),
    metalness: 0.4,
    roughness: 0.6,
    emissive: new THREE.Color(emissiveHex),
    emissiveIntensity: emissiveInt,
    transparent: dimmed && !isLandmark,
    opacity: (dimmed && !isLandmark) ? 0.18 : 1,
  });
  const body = new THREE.Mesh(geo, mat);
  body.name = 'body';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const edgeCol = selected
    ? "#ffffff"
    : overrideEdgeColor
      ? overrideEdgeColor
      : modeColor; // Use modeColor here
  const edgeOp = dimmed && !isLandmark ? 0.07 : selected ? 0.9 : highlighted ? 0.8 : 0.35;
  const eg = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(w - 0.02, h - 0.02, d - 0.02),
  );
  const edges = new THREE.LineSegments(
    eg,
    new THREE.LineBasicMaterial({
      color: new THREE.Color(edgeCol),
      transparent: true,
      opacity: edgeOp,
    }),
  );
  edges.name = 'edges';
  group.add(edges);

  if (selected) {
    const rg = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12),
    );
    const selection = new THREE.LineSegments(
      rg,
      new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.9,
      }),
    );
    selection.name = 'selection';
    group.add(selection);
  }

  if (!dimmed || isLandmark) {
    if (box.isLandmark && flags.isContiguous && flags.clusterCenter) {
      const labelAccent = overrideEdgeColor || (highlighted ? typeColor : cap.border);
      const label = createBillboardLabel(box.label, labelAccent);
      label.position.set(
        flags.clusterCenter.x - box.position.x,
        h/2 + 1.0, 
        flags.clusterCenter.z - box.position.z
      );
      group.add(label);
    } else if (!box.isLandmark) {
      const labelAccent =
        overrideEdgeColor || (highlighted ? typeColor : cap.border);
      const tex = makeLabelTexture(box.label, labelAccent);
      const lMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const addFace = (pos, ry, i) => {
        const fw = ry === 0 || ry === Math.PI ? w * 0.82 : d * 0.82;
        const pm = new THREE.Mesh(
          new THREE.PlaneGeometry(fw, h * 0.72),
          lMat.clone(),
        );
        pm.position.copy(pos);
        pm.rotation.y = ry;
        pm.name = `label-face-${i}`;
        group.add(pm);
      };
      addFace(new THREE.Vector3(0, 0, d / 2 + 0.001), 0, 0);
      addFace(new THREE.Vector3(0, 0, -d / 2 - 0.001), Math.PI, 1);
      addFace(new THREE.Vector3(w / 2 + 0.001, 0, 0), Math.PI / 2, 2);
      addFace(new THREE.Vector3(-w / 2 - 0.001, 0, 0), -Math.PI / 2, 3);
    }
  }

  group.position.set(box.position.x, box.position.y, box.position.z);
  return group;
}

export function updateViewerBoxMesh(group, box, flags) {
  const {
    selected = false,
    dimmed = false,
    highlighted = false,
    overrideEdgeColor = null,
    colorMode = 'capacity', // 'capacity' | 'item'
  } = flags;

  // Rebuild if dimmed or highlighted status changes to ensure labels are correct
  if (group.userData.dimmed !== dimmed || group.userData.highlighted !== highlighted) return 'REBUILD';

  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  const typeColor = ITEM_TYPES[box.itemType]?.color || "#2a5a8a";

  const isLandmark = !!box.isLandmark;
  const bodyHex = isLandmark ? "#2a3a4a" : (dimmed ? "#090f1a" : highlighted ? "#0e2040" : "#0c1d30");
  const modeColor = isLandmark ? "#2a3a4a" : (colorMode === 'item' ? typeColor : cap.border);
  const emissiveHex = overrideEdgeColor || modeColor;
  const emissiveInt = dimmed ? 0.01 : highlighted ? 0.2 : selected ? 0.25 : 0.06;

  // Update Body
  const body = group.getObjectByName('body');
  if (!body) return 'REBUILD';
  body.material.color.set(bodyHex);
  body.material.emissive.set(emissiveHex);
  body.material.emissiveIntensity = emissiveInt;
  body.material.transparent = dimmed && !isLandmark;
  body.material.opacity = (dimmed && !isLandmark) ? 0.18 : 1;

  // Update Edges
  const edges = group.getObjectByName('edges');
  if (!edges) return 'REBUILD';
  const edgeCol = selected ? "#ffffff" : overrideEdgeColor || modeColor;
  const edgeOp = (dimmed && !isLandmark) ? 0.07 : selected ? 0.9 : highlighted ? 0.8 : 0.35;
  edges.material.color.set(edgeCol);
  edges.material.opacity = edgeOp;

  // Update/Handle Selection
  let selection = group.getObjectByName('selection');
  if (selected && !(dimmed && !isLandmark)) {
    if (!selection) {
      const { w, h, d } = box.size;
      const rg = new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12));
      selection = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.9,
      }));
      selection.name = 'selection';
      group.add(selection);
    }
  } else if (selection) {
    group.remove(selection);
    selection.geometry.dispose();
    selection.material.dispose();
  }
  
  group.userData = { ...group.userData, ...flags };
}

// ─── Floor grid ───────────────────────────────────────────────────────────────
// step = atomic unit spacing for minor grid lines; major lines every 4 steps
export function buildGrid(size = GRID_SIZE, step = 1) {
  const g = new THREE.Group();
  const half = size / 2;
  const MAJOR_EVERY = 4; // major line every N atoms — matches default box footprint
  const minor = new THREE.LineBasicMaterial({
    color: 0x0a1a2e,
    transparent: true,
    opacity: 0.45,
  });
  const major = new THREE.LineBasicMaterial({
    color: 0x142840,
    transparent: true,
    opacity: 0.65,
  });
  const count = Math.ceil(size / step);
  for (let n = -count; n <= count; n++) {
    const i = n * step;
    if (Math.abs(i) > half) continue;
    const isMajor = n % MAJOR_EVERY === 0;
    const m = isMajor ? major : minor;
    const y = isMajor ? 0.003 : 0;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-half, y, i),
          new THREE.Vector3(half, y, i),
        ]),
        m,
      ),
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(i, y, -half),
          new THREE.Vector3(i, y, half),
        ]),
        m,
      ),
    );
  }
  return g;
}

// ─── Ghost placement indicator ────────────────────────────────────────────────
export function makeGhostMesh(w, h, d) {
  const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  return new THREE.LineSegments(
    eg,
    new THREE.LineBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.45,
    }),
  );
}

// ─── Standard scene lights ────────────────────────────────────────────────────
export function addSceneLights(scene) {
  scene.add(new THREE.AmbientLight(0x0e2244, 2.2));
  const sun = new THREE.DirectionalLight(0x6688bb, 2.5);
  sun.position.set(8, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048;
  Object.assign(sun.shadow.camera, {
    left: -30,
    right: 30,
    top: 30,
    bottom: -30,
    near: 0.5,
    far: 120,
  });
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x002255, 0.9);
  fill.position.set(-6, 4, -8);
  scene.add(fill);
}

// ─── Dispose a group and all its children ─────────────────────────────────────
export function disposeGroup(grp) {
  grp.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      if (c.material.map) c.material.map.dispose();
      c.material.dispose();
    }
  });
}
