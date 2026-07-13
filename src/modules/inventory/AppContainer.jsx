import { useState } from "react";
import { T } from "../../styles/theme.js";
import { MockItemsPanel } from "./InventoryUI.jsx";
import WarehouseViewer from "./WarehouseViewer.jsx";
import WarehouseBuilder from "../builder/WarehouseBuilder.jsx";
import { useInventory } from "../../hooks/useInventory.js";

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
