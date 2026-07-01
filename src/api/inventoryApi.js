// src/api/inventoryApi.js
// Toggle USE_MOCK=false + add a backend proxy for live calls (browser can't set Cookie headers directly).

import { MOCK_ITEMS, REGION_LAYOUTS } from "../data/mockData.js";

export const USE_MOCK = true;

const BASE = "https://np.swedemom.com/hub/InventoryItem";
const delay = (ms = 350) =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 150));

// ─── GetInventoryItemByPartNumber ─────────────────────────────────────────────
export async function getItemByPartNumber(partNum) {
  if (USE_MOCK) {
    await delay();
    const item = MOCK_ITEMS[partNum.toUpperCase()];
    if (!item)
      return {
        Success: false,
        Data: null,
        Messages: ["Part number not found"],
      };
    return { Success: true, Data: { ...item }, Messages: [] };
  }
  const res = await fetch(
    `${BASE}/GetInventoryItemByPartNumber?partNum=${encodeURIComponent(partNum)}`,
    {
      credentials: "include",
      headers: { accept: "*/*", "content-type": "application/json" },
    },
  );
  return res.json();
}

// ─── CheckBinLocation ─────────────────────────────────────────────────────────
export async function checkBinLocation(binLoc, region) {
  if (USE_MOCK) {
    await delay(200);
    // Check if any box in the region layout has this label
    const layout = REGION_LAYOUTS[region] || [];
    const exists = layout.some(
      (b) => b.label === binLoc || b.id.endsWith(`_${binLoc}`),
    );
    // Also accept raw label format like "F0", "A3" etc
    const labelMatch = layout.some((b) => b.label === binLoc);
    return {
      Success: true,
      Data: { BinExists: exists || labelMatch },
      Messages: [],
    };
  }
  const res = await fetch(
    `${BASE}/CheckBinLocation?binLoc=${encodeURIComponent(binLoc)}`,
    {
      credentials: "include",
      headers: { accept: "*/*" },
    },
  );
  return res.json();
}

// ─── BatchMoveInventoryItems ──────────────────────────────────────────────────
export async function batchMoveItems(binLoc, partNumbers) {
  if (USE_MOCK) {
    await delay(700);
    const moved = [],
      failed = [];
    for (const pn of partNumbers) {
      if (MOCK_ITEMS[pn]) {
        MOCK_ITEMS[pn].BinLocation = binLoc;
        moved.push(pn);
      } else failed.push(pn);
    }
    return {
      Success: true,
      Data: { MovedPartNumbers: moved, FailedMoves: failed },
      Messages: [],
    };
  }
  const res = await fetch(
    `${BASE}/BatchMoveInventoryItems?binLoc=${encodeURIComponent(binLoc)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { accept: "*/*", "content-type": "application/json" },
      body: JSON.stringify(partNumbers),
    },
  );
  return res.json();
}
