// src/modules/builder/threeHelpers.js
// Shared Three.js utilities used by both WarehouseBuilder and WarehouseViewer

import * as THREE from "three";
import { CAPACITY_COLORS, ITEM_TYPES } from "../../data/mockData.js";

export const BG_COLOR = "#050810";
export const GRID_SIZE = 60;

// ─── Label canvas texture ─────────────────────────────────────────────────────
export function makeLabelTexture(label, capBorder) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 128;
  const c = cv.getContext("2d");
  c.fillStyle = "#071828ee";
  c.fillRect(0, 0, 256, 128);
  c.shadowColor = capBorder;
  c.shadowBlur = 20;
  c.strokeStyle = capBorder;
  c.lineWidth = 5;
  c.strokeRect(4, 4, 248, 120);
  c.shadowBlur = 0;
  c.fillStyle = "#e8f4ff";
  c.font = "bold 54px 'Courier New',monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.shadowColor = capBorder;
  c.shadowBlur = 14;
  c.fillText(label || "·", 128, 66);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

// ─── Box mesh (builder mode — full interactive) ───────────────────────────────
export function buildBoxMesh(box, flags = {}) {
  const {
    selected = false,
    hoveredDelete = false,
    dragging = false,
    dimmed = false,
  } = flags;
  const { w, h, d } = box.size;
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  const group = new THREE.Group();
  group.userData = { boxId: box.id };

  const bodyColor = dragging
    ? "#1a3a5a"
    : hoveredDelete
      ? "#2a0a0a"
      : "#0c1d30";
  const emissive = hoveredDelete ? "#ff0000" : cap.border;
  const emissiveI = hoveredDelete
    ? 0.6
    : selected
      ? 0.28
      : dimmed
        ? 0.02
        : 0.07;
  const bodyOpacity = dimmed ? 0.25 : 1;

  const geo = new THREE.BoxGeometry(w - 0.045, h - 0.045, d - 0.045);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColor),
    metalness: 0.5,
    roughness: 0.5,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: emissiveI,
    transparent: dimmed,
    opacity: bodyOpacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edgeColor = hoveredDelete ? "#ff2244" : cap.border;
  const edgeOpacity = dimmed
    ? 0.1
    : hoveredDelete
      ? 1.0
      : selected
        ? 0.95
        : 0.5;
  const edgeGeo = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(w - 0.02, h - 0.02, d - 0.02),
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
  if (dragging) {
    const rg = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(w + 0.14, h + 0.14, d + 0.14),
    );
    group.add(
      new THREE.LineSegments(
        rg,
        new THREE.LineBasicMaterial({
          color: 0x00ccff,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
  }

  if (!dimmed) {
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

  group.position.set(box.position.x, box.position.y, box.position.z);
  return group;
}

// ─── Viewer-mode box mesh (read-only, type-tinted, clickable) ─────────────────
// overrideEdgeColor: when set, forces edges + emissive to this hex string.
//   Used by WarehouseViewer to show capacity colour on matching bins when filtering.
export function buildViewerBoxMesh(box, flags = {}) {
  const {
    selected = false,
    dimmed = false,
    highlighted = false,
    overrideEdgeColor = null,
  } = flags;
  const { w, h, d } = box.size;
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  const typeColor = ITEM_TYPES[box.itemType]?.color || "#2a5a8a";

  const group = new THREE.Group();
  group.userData = {
    boxId: box.id,
    boxLabel: box.label,
    itemType: box.itemType,
  };

  // Body
  const bodyHex = dimmed ? "#090f1a" : highlighted ? "#0e2040" : "#0c1d30";
  // Emissive: override → capacity colour; else type colour when highlighted
  const emissiveHex =
    overrideEdgeColor || (highlighted ? typeColor : cap.border);
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
    transparent: dimmed,
    opacity: dimmed ? 0.18 : 1,
  });
  group.add(
    Object.assign(new THREE.Mesh(geo, mat), {
      castShadow: true,
      receiveShadow: true,
    }),
  );

  // Edges — capacity colour override when filtering, else type/cap default
  const edgeCol = selected
    ? "#ffffff"
    : overrideEdgeColor
      ? overrideEdgeColor
      : highlighted
        ? typeColor
        : cap.border;
  const edgeOp = dimmed ? 0.07 : selected ? 0.9 : highlighted ? 0.8 : 0.35;
  const eg = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(w - 0.02, h - 0.02, d - 0.02),
  );
  group.add(
    new THREE.LineSegments(
      eg,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(edgeCol),
        transparent: true,
        opacity: edgeOp,
      }),
    ),
  );

  // Selection ring — blue
  if (selected) {
    const rg = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12),
    );
    group.add(
      new THREE.LineSegments(
        rg,
        new THREE.LineBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    );
  }

  // Labels (skip when dimmed — saves textures and keeps scene readable)
  if (!dimmed) {
    // Label colour: when overrideEdgeColor (capacity mode) use that; else type colour
    const labelAccent =
      overrideEdgeColor || (highlighted ? typeColor : cap.border);
    const tex = makeLabelTexture(box.label, labelAccent);
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

  group.position.set(box.position.x, box.position.y, box.position.z);
  return group;
}

// ─── Floor grid ───────────────────────────────────────────────────────────────
export function buildGrid(size = GRID_SIZE) {
  const g = new THREE.Group();
  const half = size / 2;
  const minor = new THREE.LineBasicMaterial({
    color: 0x0c1e35,
    transparent: true,
    opacity: 0.5,
  });
  const major = new THREE.LineBasicMaterial({
    color: 0x173060,
    transparent: true,
    opacity: 0.65,
  });
  for (let i = -half; i <= half; i++) {
    const m = i % 5 === 0 ? major : minor;
    const y = i % 5 === 0 ? 0.002 : 0;
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
