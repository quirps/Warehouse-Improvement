import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { T } from "../../styles/theme.js";
import {
  BG_COLOR,
  buildViewerBoxMesh,
  updateViewerBoxMesh,
  buildGrid,
  addSceneLights,
  disposeGroup,
} from "../builder/threeHelpers.js";
import { generateLayoutData } from "../../data/mockData.js";
import warehouseData from "../../data/warehouse.wh.json";
import WarehouseBuilder from "../builder/WarehouseBuilder.jsx";
import { MockItemsPanel } from "./InventoryUI.jsx";
import { useInventory } from "../../hooks/useInventory.js";

function WarehouseViewer({ dominantType, activeItem }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const rafRef = useRef(null);
  const boxGroupsMapRef = useRef(new Map());
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [colorMode, setColorMode] = useState('capacity');
  
  const boxes = useMemo(() => generateLayoutData(warehouseData.boxes), []);
  const raycaster = useRef(new THREE.Raycaster());

  // Camera state mimicking Builder
  const camSph = useRef({ r: 26, phi: 0.82, theta: 0.68 });
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));
  const ptrState = useRef({ down: false, button: -1, lx: 0, ly: 0 });

  const applyCamera = useCallback(() => {
    const sp = camSph.current;
    sp.phi = Math.max(0.07, Math.min(Math.PI / 2.05, sp.phi));
    const cam = cameraRef.current;
    if (!cam) return;
    cam.position.set(
      camTarget.current.x + sp.r * Math.sin(sp.phi) * Math.sin(sp.theta),
      camTarget.current.y + sp.r * Math.cos(sp.phi),
      camTarget.current.z + sp.r * Math.sin(sp.phi) * Math.cos(sp.theta),
    );
    cam.lookAt(camTarget.current);
  }, []);

  useEffect(() => {
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(new THREE.Color(BG_COLOR));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    cameraRef.current = camera;
    applyCamera();

    addSceneLights(scene);
    scene.add(buildGrid(60, 1));

    let live = true;
    const tick = () => {
      if (!live) return;
      rafRef.current = requestAnimationFrame(tick);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
      if (mountRef.current) {
        if (rendererRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      sceneRef.current = null;
    };
  }, [applyCamera]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !cameraRef.current || !rendererRef.current) return;

    const filterType = activeItem?.ItemType || dominantType;
    const map = boxGroupsMapRef.current;
    const currentIds = new Set(boxes.map(b => b.id));

    // Remove boxes not in current data
    for (const [id, group] of map.entries()) {
        if (!currentIds.has(id)) {
            scene.remove(group);
            disposeGroup(group);
            map.delete(id);
        }
    }

    // Add/Update boxes
    boxes.forEach((box) => {
      const isMatch = filterType && box.itemType === filterType;
      const highlighted = isMatch;
      const dimmed = filterType && !isMatch;
      const selected = box.id === selectedBoxId;
      const flags = { highlighted, dimmed, selected, colorMode };
      
      let group = map.get(box.id);
      if (group) {
        const result = updateViewerBoxMesh(group, box, flags);
        if (result === 'REBUILD') {
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
  }, [boxes, dominantType, selectedBoxId, selectedItemType, activeItem, colorMode]);

  const onPointerDown = (e) => {
    ptrState.current = { down: true, button: e.button, lx: e.clientX, ly: e.clientY };
    
    // Debug raycasting
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.current.setFromCamera(ndc, cameraRef.current);
    
    const objects = Array.from(boxGroupsMapRef.current.values());
    const hits = raycaster.current.intersectObjects(objects, true);
    
    if (hits.length > 0) {
      let obj = hits[0].object;
      while(obj && !obj.userData?.boxId) {
        obj = obj.parent;
      }
      if(obj) {
        setSelectedBoxId(obj.userData.boxId);
        setSelectedItemType(obj.userData.itemType);
      }
    } else {
      setSelectedBoxId(null);
      setSelectedItemType(null);
    }
  };

  const onPointerMove = (e) => {
    const ps = ptrState.current;
    if (!ps.down) return;
    console.log("WarehouseViewer: onPointerMove dragging...");
    const dx = e.clientX - ps.lx;
    const dy = e.clientY - ps.ly;

    if (ps.button === 0) { // Rotate
        camSph.current.theta -= dx * 0.008;
        camSph.current.phi -= dy * 0.008;
    } else { // Pan
        const cam = cameraRef.current;
        const fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        camTarget.current.addScaledVector(right, -dx * 0.02);
        camTarget.current.addScaledVector(up, dy * 0.02);
    }
    applyCamera();
    ps.lx = e.clientX;
    ps.ly = e.clientY;
  };

  const onPointerUp = () => {
    ptrState.current.down = false;
  };

  const onWheel = (e) => {
    camSph.current.r = Math.max(3, Math.min(80, camSph.current.r + e.deltaY * 0.04));
    applyCamera();
  };

  return (
    <div style={{ position: 'relative', flex: 1, width: "100%", height: "100%" }}>
      <div ref={mountRef} 
        style={{ width: "100%", height: "100%", cursor: 'pointer', touchAction: 'none' }} 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />
      
      {/* Mode Toggle */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5 }}>
        <button 
          onClick={() => setColorMode('capacity')}
          style={{ 
            padding: '5px 10px', 
            background: colorMode === 'capacity' ? T.blue : T.bg2,
            color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer' 
          }}
        >
          Capacity
        </button>
        <button 
          onClick={() => setColorMode('item')}
          style={{ 
            padding: '5px 10px', 
            background: colorMode === 'item' ? T.blue : T.bg2,
            color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer' 
          }}
        >
          Item
        </button>
      </div>
    </div>
  );
}

const MODES = [
  { id: "inventory", label: "Manage Inventory" },
  { id: "builder", label: "⬡ Builder" },
];

export default function AppContainer() {
  const [activePage, setActivePage] = useState("inventory");
  const inv = useInventory();
  
  // Minimal state for required functionality
  const [activeItem, setActiveItem] = useState(null);
  const dominantType = inv.dominantType || activeItem?.ItemType || null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: T.bg0,
        fontFamily: T.font,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px",
          background: T.bg1,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ color: T.blue, fontWeight: 800, marginRight: 20 }}>
          Swedemom
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActivePage(mode.id)}
              style={{
                padding: "8px 16px",
                background: activePage === mode.id ? T.blue : T.bg2,
                color: activePage === mode.id ? "#fff" : T.textSecondary,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {activePage === "inventory" ? (
          <>
            <MockItemsPanel
              activeItemPartNum={activeItem?.PartNum || null}
              onSelectItem={(item) => setActiveItem(item)}
            />
            <div style={{ flex: 1, padding: 14 }}>
              <WarehouseViewer dominantType={dominantType} activeItem={activeItem} />
            </div>
          </>
        ) : (
          <WarehouseBuilder />
        )}
      </div>
    </div>
  );
}
