// src/modules/builder/WarehouseBuilder.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import {
  BG_COLOR,
  GRID_SIZE,
  buildBoxMesh,
  buildGrid,
  makeGhostMesh,
  addSceneLights,
  disposeGroup,
} from "./threeHelpers.js";
import {
  CAPACITY_COLORS,
  CAPACITIES,
  ITEM_TYPES,
} from "../../data/mockData.js";

// ─── Atomic unit system ───────────────────────────────────────────────────────
// ATOM is the smallest meaningful floor unit. All box W/D dimensions must be
// multiples of ATOM so any two boxes can sit flush edge-to-edge.
// H (height) can be any positive multiple of ATOM too, but is less critical.
const ATOM = 0.125; // 1/8 au smallest unit

// Default box is 1au (8 atoms) in each direction
const DEFAULT_W = 1.0;
const DEFAULT_H = 1.0;
const DEFAULT_D = 1.0;

const DEFAULT_PRESETS = [
  { name: "Standard", w: DEFAULT_W, h: DEFAULT_H, d: DEFAULT_D },
  { name: "Half-Height", w: DEFAULT_W, h: DEFAULT_H / 2, d: DEFAULT_D },
  { name: "Slim", w: DEFAULT_W / 2, h: DEFAULT_H, d: DEFAULT_D },
];

const MAX_HISTORY = 60;
let _id = 1;
const newId = () => `box_${_id++}`;

// Round to nearest multiple of ATOM
const snapAtom = (v) => Math.round(v / ATOM) * ATOM;
// Round to nearest multiple of unit (used for per-box-size grid snapping)
const snapTo = (v, unit) => Math.round(v / unit) * unit;
const round2 = (v) => Math.round(v * 100) / 100;

// Clamp a dimension to min 1 atom, max 1.0 (1au), snapped to atom grid
const clampDim = (v) => Math.max(ATOM, Math.min(1.0, snapAtom(v)));

// ─── Stacking helpers ─────────────────────────────────────────────────────────
function getColumnTop(boxes, x, z) {
  let top = 0;
  for (const b of boxes) {
    if (b.position.x === x && b.position.z === z) {
      const t = b.position.y + b.size.h / 2;
      if (t > top) top = t;
    }
  }
  return top;
}
const stackY = (boxes, x, z, size) => getColumnTop(boxes, x, z) + size.h / 2;

// Near-snap: pull position to flush with a neighbour edge if within 1.0 (a unit)
function nearSnap(x, z, size, boxes) {
  let nx = x;
  let nz = z;
  const SNAP_THRESHOLD = Math.max(0.3, Math.max(size.w, size.d) * 0.5);

  let bestX = x;
  let bestZ = z;
  let minCombinedDist = Infinity;

  for (const b of boxes) {
    const bx = b.position.x, bz = b.position.z;
    const bw = b.size.w, bd = b.size.d;

    const bLeftX = bx - bw / 2;
    const bRightX = bx + bw / 2;
    const bNearZ = bz - bd / 2;
    const bFarZ = bz + bd / 2;

    const halfW = size.w / 2;
    const halfD = size.d / 2;

    // Potential target X/Z positions
    const targets = [
      { nx: bRightX + halfW, nz: bz }, // Flush right
      { nx: bLeftX - halfW, nz: bz },  // Flush left
      { nx: bx, nz: bFarZ + halfD },   // Flush far
      { nx: bx, nz: bNearZ - halfD },  // Flush near
    ];

    for (const { nx: targetX, nz: targetZ } of targets) {
      const dist = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(z - targetZ, 2));
      
      // Check if both axes are within threshold to snap to this target
      if (dist < SNAP_THRESHOLD && dist < minCombinedDist) {
        minCombinedDist = dist;
        bestX = targetX;
        bestZ = targetZ;
      }
    }
  }

  return { x: bestX, z: bestZ };
}

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#060d1c",
  border: "#0e2540",
  text: "#c8dcf0",
  textDim: "#6a9ac0",
  textMute: "#3a6a90",
  accent: "#2a7fff",
  danger: "#ff3355",
  green: "#00ff88",
  orange: "#ff8800",
};
const sec = {
  borderBottom: `1px solid ${C.border}`,
  padding: "12px 14px",
  flexShrink: 0,
};
const slabel = {
  display: "block",
  color: C.textMute,
  fontSize: 9,
  letterSpacing: 3,
  textTransform: "uppercase",
  marginBottom: 8,
  fontWeight: "bold",
};
const tbtn = (a) => ({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 10px",
  marginBottom: 4,
  borderRadius: 5,
  background: a ? "#0e2a45" : "transparent",
  border: `1px solid ${a ? "#1e5090" : "transparent"}`,
  color: a ? "#5ab0ff" : C.textDim,
  cursor: "pointer",
  fontSize: 13,
  width: "100%",
  textAlign: "left",
});
const pbtn = (a) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "7px 10px",
  marginBottom: 4,
  borderRadius: 4,
  background: a ? "#0d2440" : "transparent",
  border: `1px solid ${a ? "#1a4070" : C.border}`,
  color: a ? "#5ab0ff" : C.text,
  cursor: "pointer",
  fontSize: 12,
});
const abtn = {
  padding: "7px 10px",
  borderRadius: 4,
  border: `1px solid #0e3060`,
  background: "#091828",
  color: "#5ab0ff",
  cursor: "pointer",
  fontSize: 12,
  marginBottom: 5,
  width: "100%",
  textAlign: "left",
};
const dbtn = {
  ...abtn,
  color: "#ff3355",
  border: `1px solid #3a1020`,
  background: "#120810",
};
const kbd = {
  background: "#081525",
  border: `1px solid #1a3a55`,
  color: C.textDim,
  borderRadius: 3,
  padding: "1px 6px",
  fontSize: 10,
};
const sinput = {
  background: "#08162a",
  border: `1px solid #1a3a55`,
  color: C.text,
  borderRadius: 4,
  padding: "5px 8px",
  fontSize: 12,
  outline: "none",
  width: "100%",
  fontFamily: "'Courier New',monospace",
};
const capDot = (c) => (
  <span
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: CAPACITY_COLORS[c]?.border || "#333",
      display: "inline-block",
      marginRight: 6,
      boxShadow: `0 0 5px ${CAPACITY_COLORS[c]?.border || "#333"}`,
    }}
  />
);

// Axis colour coding (W=blue, H=green, D=orange) — consistent everywhere
const AXIS_COLORS = { w: "#3b82f6", h: "#22c55e", d: "#f97316" };

// ─── Live 3D Box Type Preview (Three.js in a small canvas) ───────────────────
function BoxTypePreview({ newSize }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendRef = useRef(null);
  const camRef = useRef(null);
  const rafRef = useRef(null);
  const theta = useRef(0.6);
  const phi = useRef(0.85);
  const ptrState = useRef({ down: false, lx: 0, ly: 0 });

  // Rebuild scene whenever sizes change
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 240,
      H = el.clientHeight || 160;

    if (!rendRef.current) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setSize(W, H);
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setClearColor(0x000000, 0);
      el.appendChild(r.domElement);
      rendRef.current = r;
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const d = new THREE.DirectionalLight(0x88aaff, 2.0);
      d.position.set(5, 8, 5);
      scene.add(d);
      const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
      camRef.current = cam;
    }

    const scene = sceneRef.current;
    // Clear old box meshes (keep lights)
    const toRemove = [];
    scene.traverse((o) => {
      if (o.userData.preview) toRemove.push(o);
    });
    toRemove.forEach((o) => {
      scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });

    const { w, h, d } = newSize;
    const dw = DEFAULT_W,
      dh = DEFAULT_H,
      dd = DEFAULT_D;

    // Default box ghost (dim wireframe)
    const defGeo = new THREE.BoxGeometry(dw, dh, dd);
    const defEdge = new THREE.EdgesGeometry(defGeo);
    const ghost = new THREE.LineSegments(
      defEdge,
      new THREE.LineBasicMaterial({
        color: 0x334466,
        transparent: true,
        opacity: 0.35,
      }),
    );
    ghost.userData.preview = true;
    ghost.position.y = dh / 2;
    scene.add(ghost);
    defGeo.dispose();

    // New box — solid with coloured faces per axis
    const nGeo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0d1f35,
      metalness: 0.3,
      roughness: 0.6,
      emissive: 0x0a1a30,
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(nGeo, mat);
    mesh.userData.preview = true;
    mesh.position.y = h / 2;
    scene.add(mesh);

    // Coloured edge axes: 4 lines along W (blue), 4 along H (green), 4 along D (orange)
    const hw = w / 2,
      hh = h / 2,
      hd = d / 2;
    const edgeLines = [
      // W axis — blue — 4 parallel edges
      [
        [-hw, -hh, -hd],
        [hw, -hh, -hd],
      ],
      [
        [-hw, hh, -hd],
        [hw, hh, -hd],
      ],
      [
        [-hw, -hh, hd],
        [hw, -hh, hd],
      ],
      [
        [-hw, hh, hd],
        [hw, hh, hd],
      ],
      // H axis — green — 4 parallel edges
      [
        [-hw, -hh, -hd],
        [-hw, hh, -hd],
      ],
      [
        [hw, -hh, -hd],
        [hw, hh, -hd],
      ],
      [
        [-hw, -hh, hd],
        [-hw, hh, hd],
      ],
      [
        [hw, -hh, hd],
        [hw, hh, hd],
      ],
      // D axis — orange — 4 parallel edges
      [
        [-hw, -hh, -hd],
        [-hw, -hh, hd],
      ],
      [
        [hw, -hh, -hd],
        [hw, -hh, hd],
      ],
      [
        [-hw, hh, -hd],
        [-hw, hh, hd],
      ],
      [
        [hw, hh, -hd],
        [hw, hh, hd],
      ],
    ];
    const axisColors = [
      0x3b82f6, 0x3b82f6, 0x3b82f6, 0x3b82f6, 0x22c55e, 0x22c55e, 0x22c55e,
      0x22c55e, 0xf97316, 0xf97316, 0xf97316, 0xf97316,
    ];
    edgeLines.forEach(([a, b], i) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...a),
        new THREE.Vector3(...b),
      ]);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: axisColors[i], linewidth: 2 }),
      );
      line.userData.preview = true;
      line.position.y = h / 2;
      scene.add(line);
    });

    // Fit camera to the larger of the two boxes
    const maxDim = Math.max(w, h, d, dw, dh, dd);
    camRef.current.aspect = W / H;
    camRef.current.updateProjectionMatrix();

    const applyOrbitCam = () => {
      const r2 = maxDim * 2.2;
      const p = phi.current,
        t = theta.current;
      camRef.current.position.set(
        r2 * Math.sin(p) * Math.sin(t),
        r2 * Math.cos(p),
        r2 * Math.sin(p) * Math.cos(t),
      );
      camRef.current.lookAt(0, Math.max(h, dh) / 2, 0);
    };
    applyOrbitCam();

    let live = true;
    const tick = () => {
      if (!live) return;
      rafRef.current = requestAnimationFrame(tick);
      // Slow auto-rotate when not being manipulated
      if (!ptrState.current.down) {
        theta.current += 0.005;
        applyOrbitCam();
      }
      rendRef.current.render(scene, camRef.current);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    tick();

    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [newSize.w, newSize.h, newSize.d]);

  // Cleanup renderer on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (rendRef.current) {
        rendRef.current.dispose();
        const el = mountRef.current;
        if (el && rendRef.current.domElement.parentNode === el)
          el.removeChild(rendRef.current.domElement);
        rendRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  const onPtrDown = (e) => {
    ptrState.current = { down: true, lx: e.clientX, ly: e.clientY };
  };
  const onPtrMove = (e) => {
    const ps = ptrState.current;
    if (!ps.down) return;
    theta.current -= (e.clientX - ps.lx) * 0.01;
    phi.current = Math.max(
      0.15,
      Math.min(Math.PI / 2.1, phi.current - (e.clientY - ps.ly) * 0.01),
    );
    ps.lx = e.clientX;
    ps.ly = e.clientY;
  };
  const onPtrUp = () => {
    ptrState.current.down = false;
  };

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: 160,
        borderRadius: 8,
        overflow: "hidden",
        background: "#060f1c",
        border: `1px solid #1a3050`,
        cursor: "grab",
      }}
      onPointerDown={onPtrDown}
      onPointerMove={onPtrMove}
      onPointerUp={onPtrUp}
      onPointerLeave={onPtrUp}
    />
  );
}

// ─── New Box Type Dialog ──────────────────────────────────────────────────────
function NewTypeDialog({ baseSize, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState({
    w: clampDim(baseSize.w),
    h: clampDim(baseSize.h),
    d: clampDim(baseSize.d),
  });
  const [nameErr, setNameErr] = useState(false);

  const atoms = { w: size.w / ATOM, h: size.h / ATOM, d: size.d / ATOM };
  const defAtoms = {
    w: DEFAULT_W / ATOM,
    h: DEFAULT_H / ATOM,
    d: DEFAULT_D / ATOM,
  };

  const adjust = (axis, delta) => {
    setSize((prev) => {
      const next = clampDim(round2(prev[axis] + delta * ATOM));
      return { ...prev, [axis]: next };
    });
  };

  const handleAdd = () => {
    if (!name.trim()) {
      setNameErr(true);
      return;
    }
    onAdd({ name: name.trim(), w: size.w, h: size.h, d: size.d });
  };

  const DimRow = ({ axis }) => {
    const col = AXIS_COLORS[axis];
    const label = axis.toUpperCase();
    const val = size[axis];
    const aCount = val / ATOM;
    const dCount =
      (axis === "w" ? DEFAULT_W : axis === "h" ? DEFAULT_H : DEFAULT_D) / ATOM;
    const pct = Math.min(
      200,
      Math.round(
        (val /
          (axis === "w" ? DEFAULT_W : axis === "h" ? DEFAULT_H : DEFAULT_D)) *
          100,
      ),
    );
    return (
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{ color: col, fontSize: 12, fontWeight: "bold", width: 16 }}
          >
            {label}
          </span>
          <button
            onClick={() => adjust(axis, -1)}
            style={{
              background: "#091828",
              border: `1px solid ${col}44`,
              color: col,
              borderRadius: 4,
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            −
          </button>
          <div
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {/* Atom dots */}
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: Math.max(aCount, dCount) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: i < aCount ? col : col + "22",
                    border: `1px solid ${col}55`,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                color: col,
                fontSize: 12,
                fontWeight: "bold",
                minWidth: 20,
              }}
            >
              {aCount}
            </span>
            <span style={{ color: C.textMute, fontSize: 10 }}>
              atoms ({val}u)
            </span>
          </div>
          <button
            onClick={() => adjust(axis, +1)}
            style={{
              background: "#091828",
              border: `1px solid ${col}44`,
              color: col,
              borderRadius: 4,
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            +
          </button>
        </div>
        {/* Size bar vs default */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6 }} />
          <div
            style={{
              flex: 1,
              height: 6,
              background: "#0a1825",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, pct)}%`,
                background: col,
                borderRadius: 3,
                transition: "width 0.15s",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 9,
              color: pct === 100 ? C.textMute : pct > 100 ? col : C.textMute,
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {pct === 100
              ? "=default"
              : pct > 100
                ? `+${pct - 100}%`
                : `${pct}%`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000000aa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "#07111f",
          border: "1px solid #1a4a80",
          borderRadius: 12,
          padding: "22px 24px",
          width: 380,
          maxWidth: "95vw",
          boxShadow: "0 0 60px #0a2a6070",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#5ab0ff",
            fontSize: 11,
            letterSpacing: 3,
            fontWeight: "bold",
          }}
        >
          NEW BOX TYPE
        </div>

        {/* Live 3D preview */}
        <BoxTypePreview newSize={size} />

        {/* Axis legend */}
        <div style={{ display: "flex", gap: 14 }}>
          {Object.entries(AXIS_COLORS).map(([ax, col]) => (
            <div
              key={ax}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 20,
                  height: 3,
                  background: col,
                  borderRadius: 2,
                }}
              />
              <span style={{ color: col, fontSize: 10, fontWeight: "bold" }}>
                {ax.toUpperCase()}
              </span>
            </div>
          ))}
          <span style={{ color: C.textMute, fontSize: 9, marginLeft: "auto" }}>
            Ghost = default ({DEFAULT_W}×{DEFAULT_H}×{DEFAULT_D})
          </span>
        </div>

        {/* Dimension controls */}
        <div
          style={{
            background: "#080f1a",
            borderRadius: 8,
            padding: "12px 14px",
            border: `1px solid #1a3050`,
          }}
        >
          <div style={{ ...slabel, marginBottom: 10 }}>
            Dimensions (1 step = {ATOM} unit atom)
          </div>
          <DimRow axis="w" />
          <DimRow axis="h" />
          <DimRow axis="d" />
          <div style={{ color: C.textMute, fontSize: 10, marginTop: 2 }}>
            Final:{" "}
            <span
              style={{ color: C.text, fontFamily: "'Courier New',monospace" }}
            >
              {size.w}×{size.h}×{size.d}
            </span>
            <span style={{ color: "#2a5070", marginLeft: 8 }}>
              ({atoms.w}×{atoms.h}×{atoms.d} atoms)
            </span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={{ ...slabel, marginBottom: 6 }}>Box Type Name</label>
          <input
            autoFocus
            value={name}
            maxLength={24}
            placeholder="e.g. Tall Shelf, Wide Pallet, Small Bin…"
            onChange={(e) => {
              setName(e.target.value);
              setNameErr(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") onCancel();
              e.stopPropagation();
            }}
            style={{
              ...sinput,
              borderColor: nameErr ? C.danger : "#1a3a55",
              fontSize: 13,
              padding: "8px 12px",
            }}
          />
          {nameErr && (
            <div style={{ color: C.danger, fontSize: 10, marginTop: 4 }}>
              Name is required
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 6,
              background: "#0e2a45",
              border: "1px solid #2060a0",
              color: "#5ab0ff",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={handleAdd}
          >
            + Add Box Type
          </button>
          <button
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              background: "#0a1825",
              border: "1px solid #1a3050",
              color: "#4a7090",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDialog({ box, labelDraft, setLabelDraft, onConfirm, onCancel }) {
  const [cap, setCap] = useState(box.capacity);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#00000070",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "#07111f",
          border: "1px solid #1a4a80",
          borderRadius: 10,
          padding: "24px 26px",
          minWidth: 300,
          boxShadow: "0 0 40px #0a2a6050",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            color: "#5ab0ff",
            fontSize: 11,
            letterSpacing: 3,
            fontWeight: "bold",
          }}
        >
          EDIT BOX
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <label style={{ color: "#7abcee", fontSize: 11, letterSpacing: 2 }}>
            LABEL
          </label>
          <input
            autoFocus
            value={labelDraft}
            maxLength={8}
            placeholder="A1, DK, 8D…"
            onChange={(e) => setLabelDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(labelDraft, cap);
              if (e.key === "Escape") onCancel();
              e.stopPropagation();
            }}
            style={{
              background: "#0a1e33",
              border: "1px solid #1a4a80",
              color: "#a0d4ff",
              padding: "10px 14px",
              borderRadius: 5,
              fontSize: 20,
              outline: "none",
              letterSpacing: 4,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ color: "#7abcee", fontSize: 11, letterSpacing: 2 }}>
            CAPACITY
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}
          >
            {CAPACITIES.map((c) => {
              const active = cap === c;
              const col = CAPACITY_COLORS[c];
              return (
                <button
                  key={c}
                  onClick={() => setCap(c)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 6,
                    border: `2px solid ${active ? col.border : "#1a3050"}`,
                    background: active ? col.border + "22" : "#09182a",
                    color: active ? col.label : "#6a9abc",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: active ? `0 0 12px ${col.border}60` : "none",
                    transition: "all 0.12s",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: col.border,
                      flexShrink: 0,
                    }}
                  />
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 5,
              background: "#0e2a45",
              border: "1px solid #2060a0",
              color: "#5ab0ff",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={() => onConfirm(labelDraft, cap)}
          >
            ✓ Save
          </button>
          <button
            style={{
              padding: "10px 16px",
              borderRadius: 5,
              background: "#0a1825",
              border: "1px solid #1a3050",
              color: "#4a7090",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={onCancel}
          >
            Esc
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Box Info Panel ───────────────────────────────────────────────────────────
function BoxInfoPanel({ box, onEdit, onDelete }) {
  if (!box) return null;
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  return (
    <div style={{ ...sec, background: "#080f1e" }}>
      <span style={slabel}>Selected Box</span>
      {box.presetName && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <span style={{ color: C.textDim, fontSize: 11 }}>Type</span>
          <span style={{ color: "#5ab0ff", fontSize: 11, fontWeight: "bold" }}>
            {box.presetName}
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span style={{ color: C.textDim, fontSize: 11 }}>Label</span>
        <span
          style={{
            color: C.text,
            fontSize: 13,
            fontWeight: "bold",
            fontFamily: "'Courier New',monospace",
            letterSpacing: 2,
          }}
        >
          {box.label || "—"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span style={{ color: C.textDim, fontSize: 11 }}>Size</span>
        <span style={{ color: C.text, fontSize: 11 }}>
          <span style={{ color: AXIS_COLORS.w }}>{box.size.w}</span>×
          <span style={{ color: AXIS_COLORS.h }}>{box.size.h}</span>×
          <span style={{ color: AXIS_COLORS.d }}>{box.size.d}</span>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ color: C.textDim, fontSize: 11 }}>Capacity</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {capDot(box.capacity)}
          <span style={{ color: cap.label, fontSize: 11, fontWeight: "bold" }}>
            {box.capacity}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          style={{
            ...abtn,
            flex: 1,
            margin: 0,
            textAlign: "center",
            fontSize: 11,
          }}
          onClick={onEdit}
        >
          ✎ Edit
        </button>
        <button
          style={{
            ...dbtn,
            flex: 1,
            margin: 0,
            textAlign: "center",
            fontSize: 11,
          }}
          onClick={onDelete}
        >
          ⊟ Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WarehouseBuilder({
  initialBoxes = null,
  onSave = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rendRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const ghostRef = useRef(null);
  const floorRef = useRef(null);
  const rcRef = useRef(new THREE.Raycaster());
  const rafRef = useRef(null);
  const camSph = useRef({ r: 26, phi: 0.82, theta: 0.68 });
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));
  const ptrState = useRef({
    down: false,
    button: -1,
    lx: 0,
    ly: 0,
    moved: false,
    startX: 0,
    startY: 0,
  });
  const touchSt = useRef({ pts: [], lastDist: 0 });
  const lastClick = useRef(0);

  const [boxes, setBoxes] = useState(initialBoxes || []);
  const [region, setRegion] = useState("MH");
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState("select");
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [activeSzIdx, setActiveSzIdx] = useState(0);
  const [editingBox, setEditingBox] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [clipboard, setClipboard] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Select a tool to begin");
  const [hoverPos, setHoverPos] = useState(null);
  const [delHoverId, setDelHoverId] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showNewType, setShowNewType] = useState(false);

  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const bRef = useRef(boxes);
  const selRef = useRef(selectedId);
  const toolRef = useRef(tool);
  const szRef = useRef(activeSzIdx);
  const presRef = useRef(presets);
  const editRef = useRef(editingBox);
  const draftRef = useRef(labelDraft);
  const clipRef = useRef(clipboard);
  const delHRef = useRef(delHoverId);

  useEffect(() => {
    bRef.current = boxes;
  }, [boxes]);
  useEffect(() => {
    selRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    szRef.current = activeSzIdx;
  }, [activeSzIdx]);
  useEffect(() => {
    presRef.current = presets;
  }, [presets]);
  useEffect(() => {
    editRef.current = editingBox;
  }, [editingBox]);
  useEffect(() => {
    draftRef.current = labelDraft;
  }, [labelDraft]);
  useEffect(() => {
    clipRef.current = clipboard;
  }, [clipboard]);
  useEffect(() => {
    delHRef.current = delHoverId;
  }, [delHoverId]);

  const status = useCallback((m) => setStatusMsg(m), []);

  const commitBoxes = useCallback((next, prev) => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), prev];
    futureRef.current = [];
    setBoxes(next);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) {
      status("Nothing to undo");
      return;
    }
    futureRef.current = [
      bRef.current,
      ...futureRef.current.slice(0, MAX_HISTORY - 1),
    ];
    historyRef.current = h.slice(0, -1);
    setBoxes(h[h.length - 1]);
    setSelectedId(null);
    status("Undo");
  }, [status]);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (!f.length) {
      status("Nothing to redo");
      return;
    }
    historyRef.current = [
      ...historyRef.current.slice(-MAX_HISTORY + 1),
      bRef.current,
    ];
    futureRef.current = f.slice(1);
    setBoxes(f[0]);
    setSelectedId(null);
    status("Redo");
  }, [status]);

  const applyCamera = useCallback(() => {
    const sp = camSph.current;
    sp.phi = Math.max(0.07, Math.min(Math.PI / 2.05, sp.phi));
    const cam = camRef.current;
    if (!cam) return;
    cam.position.set(
      camTarget.current.x + sp.r * Math.sin(sp.phi) * Math.sin(sp.theta),
      camTarget.current.y + sp.r * Math.cos(sp.phi),
      camTarget.current.z + sp.r * Math.sin(sp.phi) * Math.cos(sp.theta),
    );
    cam.lookAt(camTarget.current);
  }, []);

  // ── Scene init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    const W = el.clientWidth,
      H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(new THREE.Color(BG_COLOR));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.016);
    sceneRef.current = scene;
    const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camRef.current = cam;
    applyCamera();
    addSceneLights(scene);
    // Grid at ATOM spacing up to a reasonable size
    scene.add(buildGrid(40, ATOM));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    floorRef.current = floor;
    const ghost = makeGhostMesh(DEFAULT_W, DEFAULT_H, DEFAULT_D);
    ghost.visible = false;
    scene.add(ghost);
    ghostRef.current = ghost;
    let live = true;
    const tick = () => {
      if (!live) return;
      rafRef.current = requestAnimationFrame(tick);
      renderer.render(scene, cam);
    };
    tick();
    const onResize = () => {
      const W2 = el.clientWidth,
        H2 = el.clientHeight;
      cam.aspect = W2 / H2;
      cam.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === el)
        el.removeChild(renderer.domElement);
    };
  }, [applyCamera]);

  // ── Sync boxes → meshes ─────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const map = meshMapRef.current;
    
    // Identify which boxes need to be displayed (considering demoMode)
    const displayBoxes = demoMode
      ? boxes.map((b, i) => ({
          ...b,
          capacity: CAPACITIES[i % CAPACITIES.length],
        }))
      : boxes;
    
    const displayIds = new Set(displayBoxes.map((b) => b.id));

    // 1. Remove meshes for boxes no longer in the list
    for (const [id, { group }] of map.entries()) {
      if (!displayIds.has(id)) {
        scene.remove(group);
        disposeGroup(group);
        map.delete(id);
      }
    }

    // 2. Add or update meshes for boxes in the list
    for (const box of displayBoxes) {
      const isSelected = box.id === selectedId;
      const isHoveredDelete = box.id === delHoverId;
      
      const existing = map.get(box.id);
      const needsUpdate = !existing || 
        existing.flags.selected !== isSelected || 
        existing.flags.hoveredDelete !== isHoveredDelete ||
        // Check if box properties changed (position, size, label, capacity)
        JSON.stringify(existing.boxProps) !== JSON.stringify(box);

      if (needsUpdate) {
        if (existing) {
          scene.remove(existing.group);
          disposeGroup(existing.group);
        }
        
        const group = buildBoxMesh(box, {
          selected: isSelected,
          hoveredDelete: isHoveredDelete,
        });
        scene.add(group);
        map.set(box.id, {
          group,
          flags: { selected: isSelected, hoveredDelete: isHoveredDelete },
          boxProps: box,
        });
      }
    }
  }, [boxes, selectedId, delHoverId, demoMode]);

  // ── Ghost update ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    const p = presRef.current[activeSzIdx] || presRef.current[0];
    if (hoverPos && tool === "place") {
      const y = stackY(boxes, hoverPos.x, hoverPos.z, p);
      ghost.position.set(hoverPos.x, y, hoverPos.z);
      if (ghost.geometry) ghost.geometry.dispose();
      ghost.geometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(p.w, p.h, p.d),
      );
      ghost.visible = true;
    } else ghost.visible = false;
  }, [hoverPos, tool, activeSzIdx, boxes]);

  // ── Raycasting ──────────────────────────────────────────────────────────────
  const getNDC = useCallback((e) => {
    const r = mountRef.current.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  }, []);

  const raycast = useCallback((ndc) => {
    const rc = rcRef.current;
    rc.setFromCamera(ndc, camRef.current);
    const meshes = [];
    for (const grp of meshMapRef.current.values())
      grp.traverse((c) => {
        if (c.isMesh) meshes.push(c);
      });
    const hits = rc.intersectObjects(meshes);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData.boxId) obj = obj.parent;
      if (obj?.userData?.boxId)
        return { type: "box", boxId: obj.userData.boxId, point: hits[0].point };
    }
    const fh = rc.intersectObject(floorRef.current);
    if (fh.length) return { type: "floor", point: fh[0].point };
    return null;
  }, []);

  // Compute floor position using the fine ATOM snap grid (0.125),
  // then apply near-snap to pull to adjacent box edges
  const getFloorPos = useCallback((hit, preset) => {
    if (!hit) return null;
    let raw;
    if (hit.type === "floor") raw = { x: hit.point.x, z: hit.point.z };
    else if (hit.type === "box") {
      const b = bRef.current.find((b) => b.id === hit.boxId);
      raw = b
        ? { x: b.position.x, z: b.position.z }
        : { x: hit.point.x, z: hit.point.z };
    } else return null;

    // Snap to the fine ATOM grid (0.125) for smooth movement
    let x = snapAtom(raw.x);
    let z = snapAtom(raw.z);

    // Near-snap: pull edges flush to neighbours
    const snapped = nearSnap(x, z, preset, bRef.current);
    return snapped;
  }, []);

  // ── Pointer handlers ────────────────────────────────────────────────────────
  const onPtrDown = useCallback((e) => {
    if (editRef.current) return;
    ptrState.current = {
      down: true,
      button: e.button,
      lx: e.clientX,
      ly: e.clientY,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };
  }, []);

  const onPtrMove = useCallback(
    (e) => {
      const ps = ptrState.current;
      const dx = e.clientX - ps.lx,
        dy = e.clientY - ps.ly;
      if (
        Math.abs(e.clientX - ps.startX) > 4 ||
        Math.abs(e.clientY - ps.startY) > 4
      )
        ps.moved = true;
      if (toolRef.current === "place") {
        const preset = presRef.current[szRef.current] || presRef.current[0];
        const hit = raycast(getNDC(e));
        setHoverPos(getFloorPos(hit, preset));
      } else setHoverPos(null);
      if (toolRef.current === "delete") {
        const hit = raycast(getNDC(e));
        const nh = hit?.type === "box" ? hit.boxId : null;
        if (nh !== delHRef.current) setDelHoverId(nh);
      } else if (delHRef.current != null) setDelHoverId(null);
      if (!ps.down) return;
      if (ps.button === 0) {
        camSph.current.theta -= dx * 0.008;
        camSph.current.phi -= dy * 0.008;
      } else if (ps.button !== 0) {
        const cam = camRef.current,
          fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        const right = new THREE.Vector3()
          .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
          .normalize();
        const up2 = new THREE.Vector3()
          .crossVectors(right, new THREE.Vector3(0, 1, 0))
          .normalize();
        camTarget.current.addScaledVector(right, -dx * 0.022);
        camTarget.current.addScaledVector(up2, dy * 0.022);
      }
      applyCamera();
      ps.lx = e.clientX;
      ps.ly = e.clientY;
    },
    [raycast, getNDC, getFloorPos, applyCamera],
  );

  const onPtrUp = useCallback(
    (e) => {
      const ps = ptrState.current;
      const wasMoved = ps.moved;
      ps.down = false;
      if (wasMoved || e.button !== 0 || editRef.current) return;
      const hit = raycast(getNDC(e));
      const now = Date.now();
      const isDbl = now - lastClick.current < 280;
      lastClick.current = now;
      const t = toolRef.current;
      if (t === "place") {
        const p = presRef.current[szRef.current] || presRef.current[0];
        const pos = getFloorPos(hit, p);
        if (!pos) return;
        const prev = bRef.current;
        const y = stackY(prev, pos.x, pos.z, p);
        const nb = {
          id: newId(),
          label: "",
          presetName: p.name, // ← save the type name on the placed box
          position: { x: pos.x, y, z: pos.z },
          size: { w: p.w, h: p.h, d: p.d },
          capacity: "Unset",
        };
        commitBoxes([...prev, nb], prev);
        setSelectedId(nb.id);
        status(`Placed "${p.name}"`);
      } else if (t === "select") {
        if (hit?.type === "box") {
          setSelectedId(hit.boxId);
          if (isDbl) {
            const box = bRef.current.find((b) => b.id === hit.boxId);
            setLabelDraft(box?.label || "");
            setEditingBox({ id: hit.boxId });
            status("Editing");
          } else
            status(
              "Selected · E or double-click to edit · arrow keys to nudge",
            );
        } else {
          setSelectedId(null);
          status("Click a box to select");
        }
      } else if (t === "delete") {
        if (hit?.type === "box") {
          const prev = bRef.current;
          commitBoxes(
            prev.filter((b) => b.id !== hit.boxId),
            prev,
          );
          setSelectedId(null);
          setDelHoverId(null);
          status("Deleted · Ctrl+Z to undo");
        }
      }
    },
    [raycast, getNDC, getFloorPos, commitBoxes, status],
  );

  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      camSph.current.r = Math.max(
        3,
        Math.min(80, camSph.current.r + e.deltaY * 0.04),
      );
      applyCamera();
    },
    [applyCamera],
  );
  const onPtrLeave = useCallback(() => {
    ptrState.current.down = false;
    setHoverPos(null);
    setDelHoverId(null);
  }, []);
  const onTouchStart = useCallback((e) => {
    touchSt.current.pts = Array.from(e.touches);
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX,
        dy = e.touches[0].clientY - e.touches[1].clientY;
      touchSt.current.lastDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);
  const onTouchMove = useCallback(
    (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const prev = touchSt.current.pts[0];
        if (prev) {
          camSph.current.theta -= (e.touches[0].clientX - prev.clientX) * 0.008;
          camSph.current.phi -= (e.touches[0].clientY - prev.clientY) * 0.008;
          applyCamera();
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX,
          dy = e.touches[0].clientY - e.touches[1].clientY,
          dist = Math.sqrt(dx * dx + dy * dy);
        camSph.current.r = Math.max(
          3,
          Math.min(
            80,
            camSph.current.r + (touchSt.current.lastDist - dist) * 0.05,
          ),
        );
        touchSt.current.lastDist = dist;
        applyCamera();
      }
      touchSt.current.pts = Array.from(e.touches);
    },
    [applyCamera],
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (editRef.current) {
        if (e.key === "Escape") {
          setEditingBox(null);
          status("Cancelled");
        }
        return;
      }
      const sel = selRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "e" || e.key === "E") {
        if (sel) {
          const b = bRef.current.find((b) => b.id === sel);
          setLabelDraft(b?.label || "");
          setEditingBox({ id: sel });
          status("Editing");
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (sel) {
          const b = bRef.current.find((b) => b.id === sel);
          if (b) {
            setClipboard({ ...b });
            status("Copied");
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        const cb = clipRef.current;
        if (!cb) return;
        const prev = bRef.current;
        const nx = snapTo(cb.position.x + cb.size.w, Math.max(ATOM, cb.size.w));
        const nz = cb.position.z;
        const ny = stackY(prev, nx, nz, cb.size);
        const nb = { ...cb, id: newId(), position: { x: nx, y: ny, z: nz } };
        commitBoxes([...prev, nb], prev);
        setSelectedId(nb.id);
        status("Pasted");
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !e.target.matches("input,textarea")
      ) {
        if (sel) {
          const prev = bRef.current;
          commitBoxes(
            prev.filter((b) => b.id !== sel),
            prev,
          );
          setSelectedId(null);
          status("Deleted");
        }
        return;
      }
      // Arrow keys nudge by the box's own footprint size
      const NUDGE = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (NUDGE[e.key] && sel) {
        e.preventDefault();
        const [dxu, dzu] = NUDGE[e.key];
        const prev = bRef.current;
        const selBox = prev.find((b) => b.id === sel);
        if (!selBox) return;
        const stepX = Math.max(ATOM, selBox.size.w) * dxu;
        const stepZ = Math.max(ATOM, selBox.size.d) * dzu;
        commitBoxes(
          prev.map((b) => {
            if (b.id !== sel) return b;
            const nx = snapTo(b.position.x + stepX, Math.max(ATOM, b.size.w));
            const nz = snapTo(b.position.z + stepZ, Math.max(ATOM, b.size.d));
            const ny = stackY(
              prev.filter((x) => x.id !== sel),
              nx,
              nz,
              b.size,
            );
            return { ...b, position: { x: nx, y: ny, z: nz } };
          }),
          prev,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, commitBoxes, status]);

  // ── Export / Import ─────────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { region, boxes, presets };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "warehouse.wh.json";
    a.click();
    URL.revokeObjectURL(url);
    if (onSave) onSave(data);
    status("Exported warehouse.wh.json");
  };

  const importJSON = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,.wh.json";
    inp.onchange = (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (e2) => {
        try {
          const p = JSON.parse(e2.target.result);
          const loadedBoxes = p.boxes || (Array.isArray(p) ? p : null);
          if (Array.isArray(loadedBoxes)) {
            if (p.region) setRegion(p.region);
            if (p.presets && Array.isArray(p.presets)) setPresets(p.presets);
            const mx = loadedBoxes.reduce(
              (m, b) =>
                Math.max(m, parseInt((b.id || "").replace("box_", "")) || 0),
              0,
            );
            _id = mx + 1;
            commitBoxes(loadedBoxes, bRef.current);
            setSelectedId(null);
            status(`Loaded ${loadedBoxes.length} boxes`);
          }
        } catch {
          status("Error: invalid file");
        }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  const confirmEdit = useCallback(
    (newLabel, newCap) => {
      const eid = editRef.current?.id;
      if (!eid) return;
      const prev = bRef.current;
      commitBoxes(
        prev.map((b) =>
          b.id === eid ? { ...b, label: newLabel, capacity: newCap } : b,
        ),
        prev,
      );
      setEditingBox(null);
      status("Saved");
    },
    [commitBoxes, status],
  );

  const handleAddPreset = (preset) => {
    const next = [...presRef.current, preset];
    setPresets(next);
    setActiveSzIdx(next.length - 1);
    setShowNewType(false);
    status(`Box type "${preset.name}" added`);
  };

  const selectedBox = boxes.find((b) => b.id === selectedId);
  const activePreset = presets[activeSzIdx] || presets[0];
  const cursor =
    tool === "place" ? "crosshair" : tool === "delete" ? "no-drop" : "default";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: BG_COLOR,
        fontFamily: "'Courier New',monospace",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Sidebar ── */}
      <div
        style={{
          width: 224,
          minWidth: 224,
          background: C.bg,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${C.border}`,
            color: "#4a9fff",
            fontSize: 12,
            letterSpacing: 3,
            fontWeight: "bold",
          }}
        >
          ⬡ WH BUILDER
        </div>

        {/* Warehouse region */}
        <div style={sec}>
          <span style={slabel}>Warehouse</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["MH", "CW", "AW"].map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: 20,
                  background: region === r ? "#1a4a8a" : "#091828",
                  border: `1px solid ${region === r ? "#2a7aff" : "#1a3a55"}`,
                  color: region === r ? "#5ab0ff" : "#3a6a90",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ color: "#2a5070", fontSize: 9, marginTop: 5 }}>
            Saved in export — sets viewer region on load
          </div>
        </div>

        {/* Undo / Redo */}
        <div style={{ ...sec, display: "flex", gap: 6 }}>
          {[
            ["↩ Undo", undo],
            ["↪ Redo", redo],
          ].map(([l, fn]) => (
            <button
              key={l}
              onClick={fn}
              style={{
                flex: 1,
                padding: "7px 4px",
                borderRadius: 4,
                border: `1px solid #1a4060`,
                background: "#091828",
                color: "#80c0ff",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Tools */}
        <div style={sec}>
          <span style={slabel}>Tools</span>
          {[
            ["select", "↖", "Select"],
            ["place", "⊞", "Place Box"],
            ["delete", "⊟", "Delete"],
          ].map(([id, ic, lb]) => (
            <button
              key={id}
              style={tbtn(tool === id)}
              onClick={() => {
                setTool(id);
                status(`${lb} tool`);
              }}
            >
              <span style={{ fontSize: 15 }}>{ic}</span>
              {lb}
            </button>
          ))}
        </div>

        {/* Box type presets */}
        <div style={sec}>
          <span style={slabel}>Box Type</span>
          <div style={{ marginBottom: 6, fontSize: 9, color: "#2a5070" }}>
            1 atom = {ATOM}u · default = {DEFAULT_W / ATOM}×{DEFAULT_H / ATOM}×
            {DEFAULT_D / ATOM} atoms
          </div>
          {presets.map((p, i) => (
            <button
              key={i}
              style={pbtn(activeSzIdx === i)}
              onClick={() => setActiveSzIdx(i)}
            >
              <span>{p.name}</span>
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ color: AXIS_COLORS.w, fontSize: 9 }}>{p.w}</span>
                <span style={{ color: "#1a3050" }}>×</span>
                <span style={{ color: AXIS_COLORS.h, fontSize: 9 }}>{p.h}</span>
                <span style={{ color: "#1a3050" }}>×</span>
                <span style={{ color: AXIS_COLORS.d, fontSize: 9 }}>{p.d}</span>
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowNewType(true)}
            style={{
              ...pbtn(false),
              color: "#2a7aff",
              border: `1px dashed #1a4060`,
              marginTop: 4,
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>+</span>
            <span style={{ fontSize: 11 }}>New box type…</span>
          </button>
        </div>

        {/* Selected box info */}
        <BoxInfoPanel
          box={selectedBox}
          onEdit={() => {
            setLabelDraft(selectedBox?.label || "");
            setEditingBox({ id: selectedId });
          }}
          onDelete={() => {
            const prev = bRef.current;
            commitBoxes(
              prev.filter((b) => b.id !== selectedId),
              prev,
            );
            setSelectedId(null);
            status("Deleted");
          }}
        />

        {/* Capacity key */}
        <div style={sec}>
          <span style={slabel}>Capacity</span>
          {CAPACITIES.map((c) => (
            <div
              key={c}
              style={{ display: "flex", alignItems: "center", marginBottom: 6 }}
            >
              {capDot(c)}
              <span style={{ color: CAPACITY_COLORS[c].label, fontSize: 12 }}>
                {c}
              </span>
            </div>
          ))}
        </div>

        {/* Preview mode */}
        <div style={sec}>
          <span style={slabel}>Preview</span>
          <button
            style={{
              ...abtn,
              background: demoMode ? "#0e3a20" : "#091828",
              color: demoMode ? C.green : C.textDim,
              border: `1px solid ${demoMode ? "#1a6030" : C.border}`,
              marginBottom: 0,
            }}
            onClick={() => {
              setDemoMode((v) => !v);
              status(demoMode ? "Demo off" : "Showing capacity colours");
            }}
          >
            {demoMode ? "◉ Capacity ON" : "○ Preview capacities"}
          </button>
        </div>

        {/* File */}
        <div style={sec}>
          <span style={slabel}>File</span>
          <button style={abtn} onClick={exportJSON}>
            ⬇ Export .wh.json
          </button>
          <button style={abtn} onClick={importJSON}>
            ⬆ Import .wh.json
          </button>
          <button
            style={dbtn}
            onClick={() => {
              if (confirm("Clear all boxes?")) {
                const prev = bRef.current;
                commitBoxes([], prev);
                setSelectedId(null);
                status("Cleared");
              }
            }}
          >
            ⊗ Clear All
          </button>
        </div>

        {/* Shortcuts */}
        <div style={{ padding: "10px 14px 16px", flexShrink: 0 }}>
          <span style={{ ...slabel, marginBottom: 10 }}>Shortcuts</span>
          {[
            ["L-drag", "orbit"],
            ["R-drag", "pan"],
            ["scroll", "zoom"],
            ["click box", "select"],
            ["E / dbl-click", "edit box"],
            ["Del", "delete"],
            ["⌃Z / ⌃Y", "undo / redo"],
            ["⌃C / ⌃V", "copy / paste"],
            ["↑↓←→", "nudge by box size"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 5,
                alignItems: "center",
              }}
            >
              <span style={kbd}>{k}</span>
              <span style={{ color: C.textDim, fontSize: 10 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3D canvas ── */}
      <div
        ref={mountRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", cursor }}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerLeave={onPtrLeave}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* ── Status bar ── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#060e1c",
          border: `1px solid #0e2a45`,
          color: "#5a9acc",
          fontSize: 11,
          padding: "6px 20px",
          borderRadius: 20,
          letterSpacing: 1,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 20,
        }}
      >
        {statusMsg}&nbsp;·&nbsp;
        <span style={{ color: "#4a8aaa" }}>{boxes.length} boxes</span>
        {historyRef.current.length > 0 && (
          <span style={{ color: "#2a5070", marginLeft: 10 }}>
            · {historyRef.current.length} undo
            {historyRef.current.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Edit dialog ── */}
      {editingBox &&
        (() => {
          const box = boxes.find((b) => b.id === editingBox.id);
          if (!box) return null;
          return (
            <EditDialog
              box={box}
              labelDraft={labelDraft}
              setLabelDraft={setLabelDraft}
              onConfirm={confirmEdit}
              onCancel={() => {
                setEditingBox(null);
                status("Cancelled");
              }}
            />
          );
        })()}

      {/* ── New type dialog ── */}
      {showNewType && (
        <NewTypeDialog
          baseSize={selectedBox?.size || activePreset}
          onAdd={handleAddPreset}
          onCancel={() => setShowNewType(false)}
        />
      )}
    </div>
  );
}
