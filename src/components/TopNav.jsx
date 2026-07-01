// src/components/TopNav.jsx
import { T } from "../styles/theme.js";

export default function TopNav({ activePage, onNavigate }) {
  return (
    <div
      style={{
        height: 52,
        background: "#0c1628",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 32,
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div
        style={{
          color: T.blue,
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 0.5,
          marginRight: 4,
        }}
      >
        WH<span style={{ color: T.textSecondary, fontWeight: 400 }}> Hub</span>
      </div>

      {/* Primary nav links */}
      {[
        { id: "search", label: "Item Search" },
        { id: "production", label: "Production ▾" },
        { id: "warehouse", label: "Warehouse ▾" },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate?.(item.id)}
          style={{
            background: "none",
            border: "none",
            color: activePage === item.id ? T.textPrimary : T.textSecondary,
            fontSize: 13,
            fontWeight: activePage === item.id ? 600 : 400,
            cursor: "pointer",
            fontFamily: T.font,
            padding: "4px 2px",
            borderBottom:
              activePage === item.id
                ? `2px solid ${T.blue}`
                : "2px solid transparent",
          }}
        >
          {item.label}
        </button>
      ))}

      {/* Page switcher — Builder vs Inventory */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginLeft: 16,
          padding: "4px 6px",
          background: T.bg2,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
        }}
      >
        {[
          { id: "inventory", label: "Manage Inventory" },
          { id: "builder", label: "⬡ Builder" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigate?.(p.id)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: activePage === p.id ? T.blue : "transparent",
              color: activePage === p.id ? "#fff" : T.textSecondary,
              fontSize: 12,
              fontWeight: activePage === p.id ? 600 : 400,
              cursor: "pointer",
              fontFamily: T.font,
              transition: "all 0.12s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Part number search */}
      <div style={{ marginLeft: "auto", position: "relative" }}>
        <input
          placeholder="Search Part Number"
          style={{
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            color: T.textPrimary,
            fontSize: 13,
            padding: "6px 36px 6px 14px",
            outline: "none",
            width: 220,
            fontFamily: T.font,
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: T.textMuted,
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>
      </div>
    </div>
  );
}
