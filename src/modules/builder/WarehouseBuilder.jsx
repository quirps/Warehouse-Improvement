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

// ─── Default size presets (user can add more) ─────────────────────────────────
const DEFAULT_PRESETS = [
  { name: "Cube", w: 1, h: 1, d: 1 },
  { name: "Half-H", w: 1, h: 0.5, d: 1 },
  { name: "Quarter-H", w: 1, h: 0.25, d: 1 },
];

const MAX_HISTORY = 60;
let _id = 1;
const newId = () => `box_${_id++}`;
const round2 = (v) => Math.round(v * 100) / 100;

// Smallest footprint unit any box can use on the floor grid. All footprint
// dimensions (W/D) are constrained to multiples of this so boxes of
// different fractional sizes still snap flush against each other.
const GRID_UNIT = 0.5;
const snapToUnit = (v, unit = GRID_UNIT) => Math.round(v / unit) * unit;
// Back-compat alias — snap() now snaps to the grid unit, not whole integers
const snap = (v) => snapToUnit(v);

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

// ─── New Box Type Dialog ──────────────────────────────────────────────────────
// Lets user derive a new preset from the selected box by halving or doubling
// any single dimension, then naming it.
function NewTypeDialog({ baseSize, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState({ ...baseSize });
  const [nameErr, setNameErr] = useState(false);

  const adjust = (axis, op) => {
    setSize((prev) => {
      const next = round2(op === "×2" ? prev[axis] * 2 : prev[axis] / 2);
      // W and D (footprint) must stay on the GRID_UNIT lattice so boxes of
      // different sizes still line up flush on the floor. H is unrestricted
      // since height only affects stacking, not floor snapping.
      if (axis === "w" || axis === "d") {
        return { ...prev, [axis]: Math.max(GRID_UNIT, next) };
      }
      return { ...prev, [axis]: Math.max(0.1, next) };
    });
  };

  const handleAdd = () => {
    if (!name.trim()) {
      setNameErr(true);
      return;
    }
    onAdd({ name: name.trim(), ...size });
  };

  const DimRow = ({ axis, label }) => (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
    >
      <span style={{ color: C.textDim, fontSize: 11, width: 20 }}>{label}</span>
      <button
        onClick={() => adjust(axis, "÷2")}
        style={{
          ...abtn,
          margin: 0,
          padding: "3px 10px",
          width: "auto",
          fontSize: 11,
        }}
      >
        ÷2
      </button>
      <span
        style={{
          color: C.text,
          fontSize: 14,
          fontWeight: "bold",
          minWidth: 36,
          textAlign: "center",
          fontFamily: "'Courier New',monospace",
        }}
      >
        {size[axis]}
      </span>
      <button
        onClick={() => adjust(axis, "×2")}
        style={{
          ...abtn,
          margin: 0,
          padding: "3px 10px",
          width: "auto",
          fontSize: 11,
        }}
      >
        ×2
      </button>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#00000075",
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
          borderRadius: 10,
          padding: "22px 24px",
          minWidth: 280,
          boxShadow: "0 0 40px #0a2a6050",
          display: "flex",
          flexDirection: "column",
          gap: 14,
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

        {/* Base reference */}
        <div style={{ color: C.textDim, fontSize: 11 }}>
          Based on:{" "}
          <span
            style={{ color: C.text, fontFamily: "'Courier New',monospace" }}
          >
            {baseSize.w}×{baseSize.h}×{baseSize.d}
          </span>
        </div>

        {/* Dimension adjusters */}
        <div>
          <div style={{ ...slabel, marginBottom: 10 }}>Adjust Dimensions</div>
          <DimRow axis="w" label="W" />
          <DimRow axis="h" label="H" />
          <DimRow axis="d" label="D" />
          <div style={{ color: C.textMute, fontSize: 10, marginTop: 4 }}>
            Result:{" "}
            <span style={{ color: C.text }}>
              {size.w}×{size.h}×{size.d}
            </span>
          </div>
          <div
            style={{
              color: "#2a5070",
              fontSize: 9,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            W/D snap to {GRID_UNIT}-unit steps so boxes stay flush on the floor
            grid. Height is unrestricted.
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            background: "#0a1828",
            borderRadius: 6,
            padding: "10px 12px",
            border: `1px solid #1a3050`,
          }}
        >
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 6 }}>
            3D preview (relative)
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 40,
            }}
          >
            {[
              {
                label: "W",
                val: size.w,
                max: Math.max(size.w, size.h, size.d),
                col: "#3b82f6",
              },
              {
                label: "H",
                val: size.h,
                max: Math.max(size.w, size.h, size.d),
                col: "#22c55e",
              },
              {
                label: "D",
                val: size.d,
                max: Math.max(size.w, size.h, size.d),
                col: "#f97316",
              },
            ].map(({ label, val, max, col }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: Math.max(4, (val / max) * 34),
                    background: col + "44",
                    border: `1px solid ${col}88`,
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: C.textMute, fontSize: 9 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div>
          <label style={{ ...slabel, marginBottom: 6 }}>Type Name</label>
          <input
            autoFocus
            value={name}
            maxLength={20}
            placeholder="e.g. Tall Shelf, Wide Pallet…"
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
              padding: "7px 10px",
            }}
          />
          {nameErr && (
            <div style={{ color: C.danger, fontSize: 10, marginTop: 4 }}>
              Name required
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: 5,
              background: "#0e2a45",
              border: "1px solid #2060a0",
              color: "#5ab0ff",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={handleAdd}
          >
            + Add Type
          </button>
          <button
            style={{
              padding: "9px 14px",
              borderRadius: 5,
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

// ─── Box Info Panel (replaces "select/move" sidebar) ─────────────────────────
function BoxInfoPanel({ box, onEdit, onDelete }) {
  if (!box) return null;
  const cap = CAPACITY_COLORS[box.capacity] || CAPACITY_COLORS.Unset;
  return (
    <div style={{ ...sec, background: "#080f1e" }}>
      <span style={slabel}>Selected Box</span>
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
          {box.size.w}×{box.size.h}×{box.size.d}
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
  const camSph = useRef({ r: 22, phi: 0.82, theta: 0.68 });
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
  const [region, setRegion] = useState("MH"); // which warehouse this layout belongs to
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

  // Stable refs for event handlers
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
    scene.add(buildGrid());
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    floorRef.current = floor;
    const ghost = makeGhostMesh(1, 1, 1);
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
    const ids = new Set(boxes.map((b) => b.id));
    for (const [id, grp] of map.entries()) {
      if (!ids.has(id)) {
        scene.remove(grp);
        disposeGroup(grp);
        map.delete(id);
      }
    }
    const display = demoMode
      ? boxes.map((b, i) => ({
          ...b,
          capacity: CAPACITIES[i % CAPACITIES.length],
        }))
      : boxes;
    for (const box of display) {
      if (map.has(box.id)) {
        const old = map.get(box.id);
        scene.remove(old);
        disposeGroup(old);
        map.delete(box.id);
      }
      const grp = buildBoxMesh(box, {
        selected: box.id === selectedId,
        hoveredDelete: box.id === delHoverId,
      });
      scene.add(grp);
      map.set(box.id, grp);
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

  // ── Raycasting helpers ──────────────────────────────────────────────────────
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

  const getFloorPos = useCallback((hit) => {
    if (!hit) return null;
    if (hit.type === "floor")
      return { x: snap(hit.point.x), z: snap(hit.point.z) };
    if (hit.type === "box") {
      const b = bRef.current.find((b) => b.id === hit.boxId);
      return b ? { x: b.position.x, z: b.position.z } : null;
    }
    return null;
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
        const hit = raycast(getNDC(e));
        setHoverPos(getFloorPos(hit));
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
        const pos = getFloorPos(hit);
        if (!pos) return;
        const prev = bRef.current;
        const y = stackY(prev, pos.x, pos.z, p);
        const nb = {
          id: newId(),
          label: "",
          position: { x: pos.x, y, z: pos.z },
          size: { w: p.w, h: p.h, d: p.d },
          capacity: "Unset",
        };
        commitBoxes([...prev, nb], prev);
        setSelectedId(nb.id);
        status(`Placed ${p.name}`);
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
        Math.min(65, camSph.current.r + e.deltaY * 0.03),
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
            65,
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
        const nb = {
          ...cb,
          id: newId(),
          position: { ...cb.position, x: cb.position.x + 1 },
        };
        nb.position.y = stackY(prev, nb.position.x, nb.position.z, nb.size);
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
      const NUDGE = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (NUDGE[e.key] && sel) {
        e.preventDefault();
        const [dxu, dzu] = NUDGE[e.key];
        const dx = dxu * GRID_UNIT,
          dz = dzu * GRID_UNIT;
        const prev = bRef.current;
        commitBoxes(
          prev.map((b) => {
            if (b.id !== sel) return b;
            const nx = snap(b.position.x + dx),
              nz = snap(b.position.z + dz);
            return {
              ...b,
              position: {
                x: nx,
                y: stackY(
                  prev.filter((x) => x.id !== sel),
                  nx,
                  nz,
                  b.size,
                ),
                z: nz,
              },
            };
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
          const loadedBoxes = p.boxes || p; // support both {boxes,presets} and bare array
          if (p.region) setRegion(p.region);
          if (Array.isArray(loadedBoxes)) {
            const mx = loadedBoxes.reduce(
              (m, b) =>
                Math.max(m, parseInt((b.id || "").replace("box_", "")) || 0),
              0,
            );
            _id = mx + 1;
            commitBoxes(loadedBoxes, bRef.current);
            if (p.presets && Array.isArray(p.presets)) setPresets(p.presets);
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
    setPresets((prev) => [...prev, preset]);
    setActiveSzIdx(presets.length); // select the new one
    setShowNewType(false);
    status(`New type "${preset.name}" added`);
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
          width: 218,
          minWidth: 218,
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

        {/* Tools — no "Move" mode, just Select / Place / Delete */}
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
          {presets.map((p, i) => (
            <button
              key={i}
              style={pbtn(activeSzIdx === i)}
              onClick={() => setActiveSzIdx(i)}
            >
              <span>{p.name}</span>
              <span style={{ color: C.textMute, fontSize: 10 }}>
                {p.w}×{p.h}×{p.d}
              </span>
            </button>
          ))}
          {/* New type — only show when a box is selected or always from current preset */}
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
            <span style={{ fontSize: 11 }}>
              New type from {selectedBox ? "selected" : "current"}…
            </span>
          </button>
        </div>

        {/* Selected box info panel */}
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

        {/* Demo mode */}
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
            ["dbl-click", "edit"],
            ["E", "edit selected"],
            ["Del", "delete"],
            ["⌃Z / ⌃Y", "undo / redo"],
            ["⌃C / ⌃V", "copy / paste"],
            ["↑↓←→", "nudge"],
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
