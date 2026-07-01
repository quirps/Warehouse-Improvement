// src/modules/inventory/ScannedItemCard.jsx
import { useState } from "react";
import { ITEM_TYPES } from "../../data/mockData.js";
import { T } from "../../styles/theme.js";

export function ScannedItemCard({ item, onRemove }) {
  const [hov, setHov] = useState(false);
  const info = ITEM_TYPES[item.ItemType] || ITEM_TYPES.MISC;
  const tc = T.types[item.ItemType] || T.types.MISC;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.bg1,
        border: `1px solid ${hov ? T.blue : T.border}`,
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s",
        borderLeft: `3px solid ${tc}`,
      }}
    >
      <button
        onClick={() => onRemove(item.PartNum)}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          background: T.bg3 + "cc",
          border: "none",
          color: T.textSecondary,
          borderRadius: "50%",
          width: 20,
          height: 20,
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        ×
      </button>

      {/* Thumbnail */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {item.ThumbnailImage ? (
          <img
            src={item.ThumbnailImage}
            alt={item.PartNum}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <span style={{ fontSize: 28, opacity: 0.35 }}>{info.icon}</span>
        )}
      </div>

      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            fontWeight: 700,
            color: T.textPrimary,
            fontSize: 12,
            fontFamily: T.fontMono,
            marginBottom: 2,
          }}
        >
          {item.PartNum}
          {item.ScanQty > 1 && (
            <span style={{ color: T.blue, marginLeft: 4 }}>
              ×{item.ScanQty}
            </span>
          )}
        </div>
        <div
          style={{
            color: T.textMuted,
            fontSize: 10,
            marginBottom: 5,
            lineHeight: 1.3,
          }}
        >
          {item.Description || "No description"}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 8,
            background: tc + "18",
            color: tc,
            border: `1px solid ${tc}44`,
          }}
        >
          {info.icon} {info.label}
        </span>
        <div style={{ marginTop: 5, fontSize: 10, color: T.textMuted }}>
          Bin:{" "}
          <span
            style={{
              color: item.BinLocation ? T.green : T.textMuted,
              fontFamily: T.fontMono,
              fontWeight: 700,
            }}
          >
            {item.BinLocation || "None"}
          </span>
          {" · "}Avail:{" "}
          <span
            style={{
              color: item.QuantityAvailable > 0 ? T.green : T.red,
              fontWeight: 700,
            }}
          >
            {item.QuantityAvailable}
          </span>
        </div>
      </div>
    </div>
  );
}
