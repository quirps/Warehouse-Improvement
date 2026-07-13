import { useState } from "react";
import { ITEM_TYPES, MOCK_ITEMS } from "../../data/mockData.js";
import { T } from "../../styles/theme.js";

export function ModeTabs({ active, onChange, MODES }) {
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

export function MockItemsPanel({ activeItemPartNum, onSelectItem }) {
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
