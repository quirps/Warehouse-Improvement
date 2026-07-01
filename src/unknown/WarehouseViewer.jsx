// src/modules/inventory/WarehouseViewer.jsx
// Read-only 3D view of a warehouse region (or a custom uploaded layout).
// When dominantType is set:
//   - Non-matching bins are dimmed
//   - Matching bins show their CAPACITY colour (not type colour) so operators
//     can immediately see which matching slots have room
// Clicking a bin selects it as the put-away destination.

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import {
  BG_COLOR,
  buildViewerBoxMesh,
  buildGrid,
  addSceneLights,
  disposeGroup,
} from "../builder/threeHelpers.js";
import {
  ITEM_TYPES,
  REGION_LAYOUTS,
  CAPACITY_COLORS,
} from "../../data/mockData.js";
import { T } from "../../styles/theme.js";

export default function WarehouseViewer({
  region,
  dominantType,
  selectedBinLabel,
  onSelectBin,
  customLayout = null, // enriched boxes from generateLayoutData(); overrides REGION_LAYOUTS
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rendRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const floorRef = useRef(null);
  const rcRef = useRef(new THREE.Raycaster());
  const rafRef = useRef(null);
  const camSph = useRef({ r: 30, phi: 0.78, theta: 0.55 });
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

  const applyCamera = useCallback(() => {
    const sp = camSph.current;
    sp.phi = Math.max(0.1, Math.min(Math.PI / 2.1, sp.phi));
    const cam = camRef.current;
    if (!cam) return;
    cam.position.set(
      camTarget.current.x + sp.r * Math.sin(sp.phi) * Math.sin(sp.theta),
      camTarget.current.y + sp.r * Math.cos(sp.phi),
      camTarget.current.z + sp.r * Math.sin(sp.phi) * Math.cos(sp.theta),
    );
    cam.lookAt(camTarget.current);
  }, []);

  // ── Active layout (custom upload or built-in region) ──
  const getLayout = useCallback(() => {
    return customLayout || REGION_LAYOUTS[region] || [];
  }, [customLayout, region]);

  // ── Centre camera on whatever layout is active ──
  const centreCamera = useCallback(() => {
    const layout = getLayout();
    if (!layout.length || !camRef.current) return;
    const xs = layout.map((b) => b.position.x);
    const zs = layout.map((b) => b.position.z);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    camTarget.current.set(cx, 0, cz);
    const span = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
    );
    camSph.current.r = Math.max(20, span * 1.05);
    applyCamera();
  }, [getLayout, applyCamera]);

  // ── Scene init (once) ──
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
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.012);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);
    camRef.current = cam;

    addSceneLights(scene);
    scene.add(buildGrid(100));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    floorRef.current = floor;

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
  }, []); // scene created once — never re-init

  // ── Re-centre whenever layout or region changes ──
  useEffect(() => {
    centreCamera();
  }, [centreCamera, region, customLayout]);

  // ── Rebuild meshes whenever layout / filter / selection changes ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const map = meshMapRef.current;
    for (const grp of map.values()) {
      scene.remove(grp);
      disposeGroup(grp);
    }
    map.clear();

    const layout = getLayout();
    const filtering = !!dominantType;

    for (const box of layout) {
      const isMatch =
        !filtering ||
        box.itemType === dominantType ||
        box.itemType === "MISC" ||
        dominantType === "MISC";
      const isSelected = box.label === selectedBinLabel;
      const dimmed = filtering && !isMatch;

      // When filtering: highlighted matching bins use CAPACITY colour for their edges/emissive
      // so the operator sees Full/Near Full/Plenty at a glance instead of type tint.
      const capColor =
        filtering && isMatch && !isSelected
          ? CAPACITY_COLORS[box.capacity]?.border ||
            CAPACITY_COLORS.Unset.border
          : null;

      const grp = buildViewerBoxMesh(box, {
        selected: isSelected,
        dimmed,
        highlighted: isMatch && !isSelected,
        overrideEdgeColor: capColor, // null = default behaviour
      });
      scene.add(grp);
      map.set(box.id, grp);
    }
  }, [getLayout, dominantType, selectedBinLabel, region, customLayout]);

  // ── Pointer handlers ──
  const getNDC = useCallback((e) => {
    const r = mountRef.current.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  }, []);

  const raycastBoxes = useCallback((ndc) => {
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
        return {
          boxId: obj.userData.boxId,
          boxLabel: obj.userData.boxLabel,
          itemType: obj.userData.itemType,
        };
    }
    return null;
  }, []);

  const onPtrDown = useCallback((e) => {
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
      if (!ps.down) return;
      if (ps.button === 0) {
        camSph.current.theta -= dx * 0.007;
        camSph.current.phi -= dy * 0.007;
      } else {
        const cam = camRef.current,
          fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        const right = new THREE.Vector3()
          .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
          .normalize();
        const up2 = new THREE.Vector3()
          .crossVectors(right, new THREE.Vector3(0, 1, 0))
          .normalize();
        camTarget.current.addScaledVector(right, -dx * 0.04);
        camTarget.current.addScaledVector(up2, dy * 0.04);
      }
      applyCamera();
      ps.lx = e.clientX;
      ps.ly = e.clientY;
    },
    [applyCamera],
  );

  const onPtrUp = useCallback(
    (e) => {
      const ps = ptrState.current;
      const wasMoved = ps.moved;
      ps.down = false;
      if (wasMoved || e.button !== 0) return;
      const hit = raycastBoxes(getNDC(e));
      if (hit?.boxLabel)
        onSelectBin({
          label: hit.boxLabel,
          boxId: hit.boxId,
          itemType: hit.itemType,
        });
    },
    [raycastBoxes, getNDC, onSelectBin],
  );

  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      camSph.current.r = Math.max(
        5,
        Math.min(150, camSph.current.r + e.deltaY * 0.06),
      );
      applyCamera();
    },
    [applyCamera],
  );

  const onPtrLeave = useCallback(() => {
    ptrState.current.down = false;
  }, []);

  // ── Legend ──
  const layout = getLayout();
  const regionTypes = [...new Set(layout.map((b) => b.itemType))];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Legend strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 14px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            color: T.textMuted,
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          {customLayout ? "📂 CUSTOM" : region}:
        </span>
        {regionTypes.map((t) => {
          const info = ITEM_TYPES[t];
          if (!info) return null;
          const active = !dominantType || t === dominantType || t === "MISC";
          return (
            <span
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: active ? info.color : T.textMuted,
                opacity: active ? 1 : 0.35,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: info.color,
                  display: "inline-block",
                  boxShadow: active ? `0 0 4px ${info.color}` : "none",
                }}
              />
              {info.label}
            </span>
          );
        })}
        {dominantType && (
          <span
            style={{ marginLeft: "auto", fontSize: 10, color: T.textMuted }}
          >
            Matching bins show{" "}
            <strong style={{ color: "#fff" }}>capacity</strong> colour
          </span>
        )}
        {/* Re-centre button */}
        <button
          onClick={centreCamera}
          style={{
            marginLeft: dominantType ? "8px" : "auto",
            padding: "3px 9px",
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            color: T.textMuted,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: T.font,
          }}
        >
          ⊙ Reset view
        </button>
      </div>

      {/* 3D canvas */}
      <div
        ref={mountRef}
        style={{ flex: 1, overflow: "hidden", cursor: "default" }}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerLeave={onPtrLeave}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Selected bin callout */}
      {selectedBinLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 12,
            background: "#07111fee",
            border: `1px solid ${T.blue}60`,
            borderRadius: 8,
            padding: "7px 14px",
            color: "#fff",
            fontSize: 12,
            fontFamily: "'Courier New',monospace",
          }}
        >
          Selected:{" "}
          <strong style={{ color: T.blue }}>
            {customLayout ? "" : region}
            {selectedBinLabel}
          </strong>
        </div>
      )}

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          color: T.textMuted,
          fontSize: 10,
          lineHeight: 1.8,
        }}
      >
        L-drag orbit · R-drag pan · scroll zoom · click bin to select
      </div>
    </div>
  );
}
