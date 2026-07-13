import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { T } from "../../styles/theme.js";
import {
  BG_COLOR,
  buildViewerBoxMesh,
  updateViewerBoxMesh,
  addSceneLights,
  buildGrid,
  disposeGroup,
  findContiguousBoxes,
} from "../builder/threeHelpers.js";
import { generateLayoutData } from "../../data/mockData.js";
import warehouseData from "../../data/warehouse.wh.json";

function WarehouseViewer({ dominantType, activeItem }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rendRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const rafRef = useRef(null);

  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [colorMode, setColorMode] = useState("capacity");
  const [initialized, setInitialized] = useState(false); // NEW

  const boxes = useMemo(() => generateLayoutData(warehouseData.boxes), []);
  const rcRef = useRef(new THREE.Raycaster());

  // Camera state mimicking Builder
  const camSph = useRef({ r: 26, phi: 0.82, theta: 0.68 });
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));
  const ptrState = useRef({ down: false, button: -1, lx: 0, ly: 0 });

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

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth,
      H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(new THREE.Color(BG_COLOR));
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.02);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    camRef.current = cam;
    applyCamera();

    addSceneLights(scene);
    scene.add(buildGrid(60, 1));

    setInitialized(true); // TRIGGER

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
      if (el && renderer.domElement.parentNode === el)
        el.removeChild(renderer.domElement);
    };
  }, [applyCamera]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !initialized) return; // GUARD

    // Automatically use the first item type if nothing else is active
    const filterType = activeItem?.ItemType || dominantType;
    const map = meshMapRef.current;
    const currentIds = new Set(boxes.map((b) => b.id));

    // Remove boxes not in current data
    for (const [id, group] of map.entries()) {
      if (!currentIds.has(id)) {
        scene.remove(group);
        disposeGroup(group);
        map.delete(id);
      }
    }

    // Identify contiguous landmark clusters
    const contiguousLandmarkIds = new Set();
    const clusterCenters = new Map();
    const clusterPrimaryBox = new Map();

    boxes
      .filter((b) => b.isLandmark)
      .forEach((b) => {
        if (!contiguousLandmarkIds.has(b.id)) {
          const cluster = findContiguousBoxes(b.id, boxes);
          let hasLandmark = false;
          let sumX = 0,
            sumZ = 0,
            count = 0;
          let minId = null;

          cluster.forEach((id) => {
            const box = boxes.find((b) => b.id === id);
            if (box?.isLandmark) {
              hasLandmark = true;
              sumX += box.position.x;
              sumZ += box.position.z;
              count++;
              if (minId === null || id < minId) minId = id;
            }
          });

          if (hasLandmark) {
            const center = { x: sumX / count, z: sumZ / count };
            cluster.forEach((id) => {
              contiguousLandmarkIds.add(id);
              clusterCenters.set(id, center);
              clusterPrimaryBox.set(id, minId);
            });
          }
        }
      });

    // Add/Update boxes
    boxes.forEach((box) => {
      const isMatch = filterType && box.itemType === filterType;
      const highlighted = isMatch;
      const dimmed = !box.isLandmark && filterType && !isMatch;
      const selected = box.id === selectedBoxId;
      const isPrimary =
        box.isLandmark && clusterPrimaryBox.get(box.id) === box.id;

      const flags = {
        highlighted,
        dimmed,
        selected,
        colorMode,
        isContiguous: box.isLandmark && contiguousLandmarkIds.has(box.id),
        clusterCenter: isPrimary ? clusterCenters.get(box.id) : null,
      };

      let group = map.get(box.id);
      if (group) {
        const result = updateViewerBoxMesh(group, box, flags);
        if (result === "REBUILD") {
          scene.remove(group);
          disposeGroup(group);
          group = buildViewerBoxMesh(box, flags);
          scene.add(group);
          map.set(box.id, group);
        }
      } else {
        group = buildViewerBoxMesh(box, flags);
        scene.add(group);
        map.set(box.id, group);
      }
    });
    console.log(
      "WarehouseViewer: Mesh management complete. Initialized:",
      initialized,
    );
  }, [
    boxes,
    dominantType,
    selectedBoxId,
    selectedItemType,
    activeItem,
    colorMode,
    initialized,
  ]); // DEPENDENCY

  const onPointerDown = useCallback((e) => {
    ptrState.current = {
      down: true,
      button: e.button,
      lx: e.clientX,
      ly: e.clientY,
    };

    const el = mountRef.current;
    const cam = camRef.current;
    if (!el || !cam) return;

    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    rcRef.current.setFromCamera(ndc, cam);

    const objects = Array.from(meshMapRef.current.values());
    const hits = rcRef.current.intersectObjects(objects, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.boxId) {
        obj = obj.parent;
      }
      if (obj) {
        setSelectedBoxId(obj.userData.boxId);
        setSelectedItemType(obj.userData.itemType);
      }
    } else {
      setSelectedBoxId(null);
      setSelectedItemType(null);
    }
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const ps = ptrState.current;
      if (!ps.down) return;
      const dx = e.clientX - ps.lx;
      const dy = e.clientY - ps.ly;

      if (ps.button === 0) {
        // Rotate
        camSph.current.theta -= dx * 0.008;
        camSph.current.phi -= dy * 0.008;
      } else {
        // Pan
        const cam = camRef.current,
          fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        const right = new THREE.Vector3()
          .crossVectors(fwd, new THREE.Vector3(0, 1, 0))
          .normalize();
        const up2 = new THREE.Vector3()
          .crossVectors(right, new THREE.Vector3(0, 1, 0))
          .normalize();
        camTarget.current.addScaledVector(right, -dx * 0.02);
        camTarget.current.addScaledVector(up2, -dy * 0.02);
      }
      applyCamera();
      ps.lx = e.clientX;
      ps.ly = e.clientY;
    },
    [applyCamera],
  );

  const onPointerUp = useCallback(() => {
    ptrState.current = { down: false, button: -1, lx: 0, ly: 0 };
  }, []);

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

  return (
    <div
      style={{ position: "relative", flex: 1, width: "100%", height: "100%" }}
    >
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: "pointer",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Mode Toggle & Legend */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            color: "#e0e0e0",
            fontSize: 11,
            fontWeight: "bold",
            background: T.bg2,
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #3a6a90",
          }}
        >
          Left Click: Rotate | Right Click: Translate
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button
            onClick={() => setColorMode("capacity")}
            style={{
              padding: "5px 10px",
              background: colorMode === "capacity" ? T.blue : T.bg2,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Capacity
          </button>
          <button
            onClick={() => setColorMode("item")}
            style={{
              padding: "5px 10px",
              background: colorMode === "item" ? T.blue : T.bg2,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Item Type
          </button>
        </div>
      </div>
    </div>
  );
}

export default WarehouseViewer;
