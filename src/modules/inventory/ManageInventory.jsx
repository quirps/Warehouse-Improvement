// src/modules/inventory/ManageInventory.jsx
import { useState, useEffect, useCallback } from "react";
import { useInventory } from "../../hooks/useInventory.js";
import WarehouseViewer from "./WarehouseViewer.jsx";
import { ScannedItemCard } from "./ScannedItemCard.jsx";
import {
  ITEM_TYPES,
  MOCK_ITEMS,
  REGION_LAYOUTS,
  generateLayoutData,
} from "../../data/mockData.js";
import { T } from "../../styles/theme.js";

// ── Mode tabs ─────────────────────────────────────────────────────────────────
const MODES = [
  {
    id: "putaway",
    icon: "⬡",
    label: "Put Away",
    desc: "Put items into a bin",
    col: "#3b82f6",
  },
  {
    id: "verify",
    icon: "✓",
    label: "Verify",
    desc: "Verify bin contents",
    col: "#22c55e",
  },
  {
    id: "update",
    icon: "+",
    label: "Update",
    desc: "Update quantities",
    col: "#f59e0b",
  },
];

function ModeTabs({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}
    >
      {MODES.map((m) => {
        const a = active === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 20px",
              background: "transparent",
              border: "none",
              borderBottom: a ? `2px solid ${m.col}` : "2px solid transparent",
              color: a ? T.textPrimary : T.textMuted,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: a ? m.col : T.bg3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: a ? "#fff" : T.textMuted,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {m.icon}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: a ? 700 : 400, fontSize: 13 }}>
                {m.label}
              </div>
              <div style={{ color: T.textMuted, fontSize: 10 }}>{m.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Mock Items sidebar panel ──────────────────────────────────────────────────
// Shows all MOCK_ITEMS grouped by type. Click one → becomes the "active item"
// which sets dominantType and filters the 3D view.
function MockItemsPanel({ activeItemPartNum, onSelectItem }) {
  const [expanded, setExpanded] = useState(null);
  const byType = {};
  for (const item of Object.values(MOCK_ITEMS)) {
    if (!byType[item.ItemType]) byType[item.ItemType] = [];
    byType[item.ItemType].push(item);
  }

  return (
    <div
      style={{
        width: 200,
        minWidth: 200,
        flexShrink: 0,
        background: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 13 }}>
          Mock Items
        </div>
        <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>
          Click to filter 3D view
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Clear filter */}
        {activeItemPartNum && (
          <button
            onClick={() => onSelectItem(null)}
            style={{
              width: "100%",
              padding: "7px 14px",
              background: T.blue + "18",
              border: "none",
              borderBottom: `1px solid ${T.border}`,
              color: T.blue,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: T.font,
              textAlign: "left",
            }}
          >
            ✕ Clear filter
          </button>
        )}

        {Object.entries(byType).map(([type, items]) => {
          const info = ITEM_TYPES[type];
          const tc = T.types[type] || T.types.MISC;
          const isOpen = expanded === type;
          return (
            <div key={type}>
              {/* Type header */}
              <button
                onClick={() => setExpanded(isOpen ? null : type)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 14 }}>{info?.icon}</span>
                <span
                  style={{
                    color: tc,
                    fontSize: 12,
                    fontWeight: 600,
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {info?.label}
                </span>
                <span style={{ color: T.textMuted, fontSize: 10 }}>
                  {items.length}
                </span>
                <span style={{ color: T.textMuted, fontSize: 11 }}>
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>

              {/* Items list */}
              {isOpen &&
                items.map((item) => {
                  const active = activeItemPartNum === item.PartNum;
                  return (
                    <button
                      key={item.PartNum}
                      onClick={() => onSelectItem(active ? null : item)}
                      style={{
                        width: "100%",
                        padding: "7px 14px 7px 28px",
                        background: active ? tc + "20" : "transparent",
                        border: "none",
                        borderBottom: `1px solid ${T.border}22`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        cursor: "pointer",
                        borderLeft: active
                          ? `3px solid ${tc}`
                          : "3px solid transparent",
                      }}
                    >
                      <span
                        style={{
                          color: active ? tc : T.textPrimary,
                          fontSize: 11,
                          fontWeight: active ? 700 : 400,
                          fontFamily: "'Courier New',monospace",
                          textAlign: "left",
                        }}
                      >
                        {item.PartNum}
                      </span>
                      <span
                        style={{
                          color: T.textMuted,
                          fontSize: 10,
                          textAlign: "left",
                        }}
                      >
                        {item.Description}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Left panel: Bin Selector ──────────────────────────────────────────────────
function BinSelector({ inv, onLoadLayout }) {
  const tc = inv.dominantType ? T.types[inv.dominantType] : null;

  const handleLoadFile = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,.wh.json";
    inp.onchange = (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (e2) => {
        try {
          const parsed = JSON.parse(e2.target.result);
          const rawBoxes =
            parsed.boxes || (Array.isArray(parsed) ? parsed : null);
          if (rawBoxes) {
            // Enrich with generated itemTypes, capacities, and mock items
            const enriched = generateLayoutData(rawBoxes);
            const fileRegion = parsed.region || null; // use region saved by builder
            onLoadLayout(enriched, f.name, fileRegion);
          } else {
            alert("Invalid .wh.json — no boxes array found.");
          }
        } catch {
          alert("Failed to parse file.");
        }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  return (
    <div
      style={{
        width: 210,
        minWidth: 210,
        flexShrink: 0,
        background: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflowY: "auto",
      }}
    >
      <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14 }}>
        Destination Bin
      </div>

      {/* Region buttons */}
      <div>
        <div
          style={{
            color: T.textSecondary,
            fontSize: 10,
            marginBottom: 7,
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          WAREHOUSE
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {["MH", "CW", "AW"].map((r) => (
            <button
              key={r}
              onClick={() => inv.setRegion(r)}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: inv.region === r ? T.blue : T.bg2,
                border: `1px solid ${inv.region === r ? T.blue : T.border}`,
                borderRadius: 20,
                color: inv.region === r ? "#fff" : T.textSecondary,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Load .wh.json into viewer */}
      <div>
        <div
          style={{
            color: T.textSecondary,
            fontSize: 10,
            marginBottom: 7,
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          LAYOUT
        </div>
        <button
          onClick={handleLoadFile}
          style={{
            width: "100%",
            padding: "9px 12px",
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.textSecondary,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: T.font,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⬆</span> Load .wh.json
        </button>
      </div>

      {/* Type hint */}
      {inv.dominantType && tc && (
        <div
          style={{
            padding: "8px 10px",
            background: tc + "15",
            border: `1px solid ${tc}44`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>
            {ITEM_TYPES[inv.dominantType]?.icon}
          </span>
          <div>
            <div style={{ color: tc, fontSize: 11, fontWeight: 700 }}>
              {ITEM_TYPES[inv.dominantType]?.label}
            </div>
            <div style={{ color: T.textMuted, fontSize: 10 }}>
              3D view filtered
            </div>
          </div>
        </div>
      )}

      {/* Bin location input — always enabled */}
      <div>
        <div
          style={{
            color: T.textSecondary,
            fontSize: 10,
            marginBottom: 7,
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          BIN LOCATION
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={inv.binInput}
            onChange={(e) => inv.setBinInput(e.target.value.toUpperCase())}
            onKeyDown={(e) =>
              e.key === "Enter" && inv.resolveBin(inv.binInput, inv.region)
            }
            placeholder="e.g. F0 or A3"
            style={{
              flex: 1,
              background: T.bg2,
              border: `1px solid ${inv.binStatus === "valid" ? T.green : inv.binStatus === "invalid" ? T.red : T.border}`,
              borderRadius: 6,
              color: T.textPrimary,
              padding: "9px 11px",
              fontSize: 15,
              fontFamily: "'Courier New',monospace",
              fontWeight: 700,
              outline: "none",
              letterSpacing: 1,
            }}
          />
          <button
            onClick={() => inv.resolveBin(inv.binInput, inv.region)}
            style={{
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.blue,
              width: 36,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {inv.binStatus === "checking" ? "⟳" : "⌕"}
          </button>
        </div>
        {inv.binStatus === "invalid" && (
          <div style={{ color: T.red, fontSize: 11, marginTop: 5 }}>
            Bin not found in {inv.region}
          </div>
        )}
      </div>

      {/* Recents */}
      {inv.recentLocs.length > 0 && (
        <div>
          <div
            style={{
              color: T.textMuted,
              fontSize: 10,
              marginBottom: 7,
              letterSpacing: 1,
            }}
          >
            RECENT
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {inv.recentLocs.map((loc) => (
              <button
                key={loc}
                onClick={() => inv.resolveBin(loc, inv.region)}
                style={{
                  background:
                    inv.selectedBin?.label === loc ? T.blue + "33" : T.bg2,
                  border: `1px solid ${inv.selectedBin?.label === loc ? T.blue : T.border}`,
                  borderRadius: 20,
                  color:
                    inv.selectedBin?.label === loc ? T.blue : T.textSecondary,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontFamily: "'Courier New',monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected bin */}
      {inv.selectedBin && (
        <div
          style={{
            background: T.blueGlow,
            border: `1px solid ${T.blue}50`,
            borderRadius: 10,
            padding: "12px",
          }}
        >
          <div
            style={{
              color: T.textMuted,
              fontSize: 10,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            SELECTED BIN
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                background: T.blue + "28",
                border: `2px solid ${T.blue}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ⬡
            </div>
            <div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  fontFamily: "'Courier New',monospace",
                  letterSpacing: 1,
                }}
              >
                {inv.region}
                {inv.selectedBin.label}
              </div>
              {inv.selectedBin.itemType && (
                <div style={{ color: T.textMuted, fontSize: 10 }}>
                  {ITEM_TYPES[inv.selectedBin.itemType]?.icon}{" "}
                  {ITEM_TYPES[inv.selectedBin.itemType]?.label}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Put Away right panel ──────────────────────────────────────────────────────
function PutAwayPanel({ inv }) {
  useEffect(() => {
    if (inv.scanInputRef?.current && inv.moveStatus !== "moving")
      inv.scanInputRef.current.focus();
  }, [inv.moveStatus]);

  const tc = inv.dominantType ? T.types[inv.dominantType] : null;
  const canCommit =
    inv.selectedBin &&
    inv.scannedItems.length > 0 &&
    inv.moveStatus !== "moving";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Scan bar — always active */}
      <div
        style={{
          padding: "12px 16px",
          background: T.bg1,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.textMuted,
              fontSize: 15,
            }}
          >
            ⌕
          </span>
          <input
            ref={inv.scanInputRef}
            value={inv.scanInput}
            onChange={(e) => inv.setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inv.scanItem(inv.scanInput)}
            placeholder="Scan or enter part number..."
            style={{
              width: "100%",
              background: T.bg2,
              border: `1px solid ${inv.scanning ? T.blue : T.border}`,
              borderRadius: 8,
              color: T.textPrimary,
              padding: "11px 12px 11px 34px",
              fontSize: 14,
              outline: "none",
              fontFamily: T.font,
            }}
          />
          {inv.scanning && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.blue,
                fontSize: 12,
              }}
            >
              looking up…
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {["⊞", "☰"].map((ic, i) => (
            <button
              key={i}
              style={{
                width: 36,
                height: 36,
                background: i === 0 ? T.bg3 : T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                color: i === 0 ? T.blue : T.textMuted,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Success */}
      {inv.moveStatus === "success" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: T.green + "22",
              border: `2px solid ${T.green}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 16, color: T.green, fontWeight: 700 }}>
            Items moved successfully!
          </div>
          <div style={{ color: T.textMuted, fontSize: 12 }}>
            Clearing queue…
          </div>
        </div>
      )}

      {inv.moveStatus !== "success" && (
        <>
          {/* Header row */}
          <div
            style={{
              padding: "10px 16px 6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                color: T.textSecondary,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Scanned Items
              <span
                style={{
                  background: T.bg3,
                  color: T.textPrimary,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {inv.scannedItems.length}
              </span>
              {inv.dominantType && tc && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: tc + "20",
                    color: tc,
                  }}
                >
                  {ITEM_TYPES[inv.dominantType]?.icon}{" "}
                  {ITEM_TYPES[inv.dominantType]?.label}
                </span>
              )}
            </div>
            {inv.scannedItems.length > 0 && (
              <button
                onClick={inv.clearScanned}
                style={{
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  color: T.textMuted,
                  cursor: "pointer",
                  fontSize: 11,
                  padding: "3px 9px",
                  fontFamily: T.font,
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {inv.errorMsg && (
            <div
              style={{
                margin: "0 16px 8px",
                padding: "7px 11px",
                background: T.red + "18",
                border: `1px solid ${T.red}44`,
                borderRadius: 7,
                color: T.red,
                fontSize: 12,
              }}
            >
              ⚠ {inv.errorMsg}
            </div>
          )}

          {!inv.selectedBin && inv.scannedItems.length === 0 && (
            <div
              style={{
                margin: "0 16px 8px",
                padding: "10px 14px",
                background: T.blue + "0d",
                border: `1px solid ${T.blue}30`,
                borderRadius: 8,
                color: T.textSecondary,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              💡 Scan items first — or click an item in the left panel to filter
              the 3D view, then click a bin to select it.
            </div>
          )}

          {inv.scannedItems.length === 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: T.textMuted,
                gap: 10,
                padding: 40,
              }}
            >
              <div style={{ fontSize: 34, opacity: 0.2 }}>⊞</div>
              <div style={{ fontSize: 13 }}>No items scanned yet</div>
              <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center" }}>
                Type a part number above and press Enter
                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: T.textMuted + "60",
                  }}
                >
                  NMB7663 · BKS10042 · DVX44821 · BIG00991 · NSM31785
                </span>
              </div>
            </div>
          )}

          {inv.scannedItems.length > 0 && (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 16px 14px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {inv.scannedItems.map((item) => (
                <ScannedItemCard
                  key={item.PartNum}
                  item={item}
                  onRemove={inv.removeItem}
                />
              ))}
            </div>
          )}

          {inv.scannedItems.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderTop: `1px solid ${T.border}`,
                background: T.bg1,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1 }}>
                {inv.selectedBin ? (
                  <div
                    style={{
                      color: T.textPrimary,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {inv.scannedItems.length} item
                    {inv.scannedItems.length !== 1 ? "s" : ""}
                    {" → "}
                    <span
                      style={{
                        color: T.blue,
                        fontFamily: "'Courier New',monospace",
                        fontWeight: 800,
                      }}
                    >
                      {inv.region}
                      {inv.selectedBin.label}
                    </span>
                  </div>
                ) : (
                  <div style={{ color: T.orange, fontSize: 12 }}>
                    ⚠ Select a destination bin first
                  </div>
                )}
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                  {inv.moveStatus === "moving"
                    ? "Moving…"
                    : inv.selectedBin
                      ? "Ready to put away"
                      : "Bin not selected"}
                </div>
              </div>
              <button
                onClick={inv.commitMove}
                disabled={!canCommit}
                style={{
                  background: canCommit ? T.blue : T.bg3,
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "11px 22px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: canCommit ? "pointer" : "default",
                  opacity: canCommit ? 1 : 0.5,
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {inv.moveStatus === "moving" ? "⟳ Moving…" : "⬡ Put Away"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function ManageInventory() {
  const inv = useInventory();
  const [activeMode, setActiveMode] = useState("putaway");
  const [activeItem, setActiveItem] = useState(null); // clicked mock item
  const [customLayout, setCustomLayout] = useState(null); // loaded from .wh.json
  const [layoutName, setLayoutName] = useState(null);

  // When an item is clicked in the mock panel, set as dominantType filter
  const handleSelectItem = useCallback((item) => {
    setActiveItem(item || null);
  }, []);

  // dominantType comes from either: scanned items queue OR clicked mock item
  const dominantType = inv.dominantType || activeItem?.ItemType || null;

  // Layout to show in 3D viewer — custom upload wins over built-in region layouts
  const viewerLayout = customLayout || null; // null = WarehouseViewer uses its own REGION_LAYOUTS

  const handleLoadLayout = (enrichedBoxes, filename, fileRegion) => {
    setCustomLayout(enrichedBoxes);
    setLayoutName(filename);
    // Switch the viewer region to match what was saved in the file
    if (fileRegion && ["MH", "CW", "AW"].includes(fileRegion)) {
      inv.setRegion(fileRegion);
    }
  };

  const handleViewerSelect = (binInfo) => {
    inv.setSelectedBin({ ...binInfo, region: inv.region });
    inv.setBinInput(binInfo.label);
    inv.setBinStatus("valid");
    inv.setErrorMsg(null);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: T.bg0,
        fontFamily: T.font,
        color: T.textPrimary,
        overflow: "hidden",
      }}
    >
      {/* Header + tabs — "Move" removed */}
      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Manage Inventory
          </h1>
          {layoutName && (
            <span
              style={{
                fontSize: 11,
                color: T.textMuted,
                background: T.bg2,
                padding: "2px 10px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
              }}
            >
              📂 {layoutName}
            </span>
          )}
        </div>
        <ModeTabs active={activeMode} onChange={setActiveMode} />
      </div>

      {/* 4-column body: [MockItems] [BinSelector] [3D viewer] [PutAway] */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 14,
          overflow: "hidden",
          padding: "14px 24px 20px",
        }}
      >
        {/* Far left: mock items panel */}
        <MockItemsPanel
          activeItemPartNum={activeItem?.PartNum || null}
          onSelectItem={handleSelectItem}
        />

        {/* Left: bin selector */}
        <BinSelector inv={inv} onLoadLayout={handleLoadLayout} />

        {/* Center: 3D viewer */}
        <div
          style={{
            flex: 1,
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <WarehouseViewer
            region={inv.region}
            dominantType={dominantType}
            selectedBinLabel={inv.selectedBin?.label ?? null}
            onSelectBin={handleViewerSelect}
            customLayout={viewerLayout}
          />
        </div>

        {/* Right: put away / other modes */}
        <div
          style={{
            flex: "0 0 400px",
            minWidth: 340,
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeMode === "putaway" ? (
            <PutAwayPanel inv={inv} />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: T.textMuted,
              }}
            >
              <div style={{ fontSize: 36, opacity: 0.2 }}>
                {{ verify: "✓", update: "+" }[activeMode]}
              </div>
              <div style={{ fontSize: 14 }}>
                {{ verify: "Verify", update: "Update" }[activeMode]} — coming
                soon
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
