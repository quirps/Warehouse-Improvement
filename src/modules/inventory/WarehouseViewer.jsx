// src/modules/inventory/WarehouseViewer.jsx
import { useEffect, useRef, useCallback } from "react";
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
  customLayout = null,
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

  // Keep latest prop values accessible inside stable callbacks without re-creating them
  const layoutRef = useRef(null);
  const dominantTypeRef = useRef(dominantType);
  const selectedLabelRef = useRef(selectedBinLabel);

  // Sync refs on every render
  layoutRef.current = customLayout || REGION_LAYOUTS[region] || [];
  dominantTypeRef.current = dominantType;
  selectedLabelRef.current = selectedBinLabel;

  // ── Camera ──────────────────────────────────────────────────────────────────
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

  const centreCamera = useCallback(() => {
    const layout = layoutRef.current;
    if (!layout.length || !camRef.current) return;
    const xs = layout.map((b) => b.position.x);
    const zs = layout.map((b) => b.position.z);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    camTarget.current.set(cx, 0, cz);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanZ = Math.max(...zs) - Math.min(...zs);
    camSph.current.r = Math.max(20, Math.max(spanX, spanZ) * 1.1);
    applyCamera();
  }, [applyCamera]);

  // ── Rebuild all box meshes from current layout+filter state ─────────────────
  const rebuildMeshes = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const map = meshMapRef.current;

    // Dispose and remove all existing box meshes
    for (const grp of map.values()) {
      scene.remove(grp);
      disposeGroup(grp);
    }
    map.clear();

    const layout = layoutRef.current;
    const domType = dominantTypeRef.current;
    const selLabel = selectedLabelRef.current;
    const filtering = !!domType;

    for (const box of layout) {
      // A box "matches" if its section type matches the filter, or if it's MISC
      const typeMatch =
        !filtering ||
        box.itemType === domType ||
        box.itemType === "MISC" ||
        domType === "MISC";

      // Also dim Empty slots even if they type-match — nothing there to worry about
      const isEmpty = box.capacity === "Empty" || box.capacity === "Unset";
      const isSelected = box.label === selLabel;
      const dimmed = filtering && (!typeMatch || (isEmpty && !isSelected));

      // When filtering: show capacity colour on highlighted (non-empty matching) boxes
      // so operators instantly see Full vs Plenty vs Near Full
      const highlighted = filtering && typeMatch && !isEmpty && !isSelected;
      const capColor = highlighted
        ? CAPACITY_COLORS[box.capacity]?.border || CAPACITY_COLORS.Unset.border
        : null;

      const grp = buildViewerBoxMesh(box, {
        selected: isSelected,
        dimmed,
        highlighted,
        overrideEdgeColor: capColor,
      });
      scene.add(grp);
      map.set(box.id, grp);
    }
  }, []); // stable — reads everything from refs

  // ── Scene init — runs once ───────────────────────────────────────────────────
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

    // Initial build happens after mount when the layout effect runs
    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === el)
        el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-build meshes whenever layout, region, filter, or selection changes ───
  // Using primitive/reference values as deps — not functions — so React sees
  // real changes and always re-runs this effect.
  const layoutKey = customLayout
    ? `custom-${customLayout.length}`
    : `region-${region}`;
  useEffect(() => {
    rebuildMeshes();
    centreCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, dominantType, selectedBinLabel]);

  // ── Pointer handlers ─────────────────────────────────────────────────────────
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

  // ── Legend derived from current layout ───────────────────────────────────────
  const layout = customLayout || REGION_LAYOUTS[region] || [];
  const regionTypes = [
    ...new Set(layout.map((b) => b.itemType).filter(Boolean)),
  ];

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
          {customLayout ? "📂 LOADED" : region}:
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
          <span style={{ fontSize: 10, color: T.textMuted }}>
            · matching bins show{" "}
            <strong style={{ color: "#fff" }}>capacity</strong> colour
          </span>
        )}

        <button
          onClick={centreCamera}
          style={{
            marginLeft: "auto",
            padding: "3px 10px",
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
          pointerEvents: "none",
        }}
      >
        L-drag orbit · R-drag pan · scroll zoom · click bin to select
      </div>
    </div>
  );
}
