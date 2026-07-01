// src/data/mockData.js

export const ITEM_TYPES = {
  BIG: { id: "BIG", label: "Big Items", color: "#ff6b35", icon: "📦" },
  CLOTHES: { id: "CLOTHES", label: "Clothes", color: "#a78bfa", icon: "👕" },
  FRAGILE: { id: "FRAGILE", label: "Fragile", color: "#38bdf8", icon: "🔮" },
  BOOKS: { id: "BOOKS", label: "Books", color: "#fb923c", icon: "📚" },
  RECORDS: { id: "RECORDS", label: "Records", color: "#f472b6", icon: "💿" },
  DVDS: { id: "DVDS", label: "DVDs", color: "#34d399", icon: "📀" },
  MISC: { id: "MISC", label: "Misc", color: "#94a3b8", icon: "🗂️" },
};

export const REGIONS = ["MH", "CW", "AW"];

export const CAPACITY_COLORS = {
  Unset: { border: "#1a3a5a", label: "#3a6a8a" }, // dark/dim — truly unconfigured
  Empty: { border: "#1e4060", label: "#2a6090" }, // dim blue — slot is empty
  Plenty: { border: "#00ff88", label: "#00ff88" }, // green
  "Near Full": { border: "#ff8800", label: "#ff9922" }, // amber
  Full: { border: "#ff2244", label: "#ff4466" }, // red
};
// Unset = not configured in builder (never appears in loaded warehouse)
// Empty = configured slot, currently has nothing in it
export const CAPACITIES = ["Unset", "Empty", "Plenty", "Near Full", "Full"];

// ─── Mock scannable inventory items ──────────────────────────────────────────
export const MOCK_ITEMS = {
  // CLOTHES
  NMB7663: {
    ItemID: 433001,
    PartNum: "NMB7663",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Belt Buckle Set",
  },
  NMB7699: {
    ItemID: 433002,
    PartNum: "NMB7699",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Sewing Needles Kit",
  },
  NMB7665: {
    ItemID: 433004,
    PartNum: "NMB7665",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Suspender Clasps",
  },
  NRC18960: {
    ItemID: 433005,
    PartNum: "NRC18960",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Striped Suspenders",
  },
  CLT00312: {
    ItemID: 433014,
    PartNum: "CLT00312",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Vintage Denim Jacket",
  },
  CLT00444: {
    ItemID: 433015,
    PartNum: "CLT00444",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "CLOTHES",
    Description: "Wool Scarf Bundle",
  },
  // FRAGILE
  NMB7691: {
    ItemID: 433003,
    PartNum: "NMB7691",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "FRAGILE",
    Description: "Glass Beads Assortment",
  },
  FRG00182: {
    ItemID: 433016,
    PartNum: "FRG00182",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "FRAGILE",
    Description: "Crystal Vase Set",
  },
  FRG00239: {
    ItemID: 433017,
    PartNum: "FRG00239",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "FRAGILE",
    Description: "Antique Mirror",
  },
  // BOOKS
  BKS10042: {
    ItemID: 433010,
    PartNum: "BKS10042",
    ThumbnailImage: null,
    BinLocation: "A3",
    ItemType: "BOOKS",
    Description: "Vintage Cookbook 1978",
  },
  BKS10199: {
    ItemID: 433018,
    PartNum: "BKS10199",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "BOOKS",
    Description: "Encyclopedia Vol. 4",
  },
  BKS10277: {
    ItemID: 433019,
    PartNum: "BKS10277",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "BOOKS",
    Description: "Swedish Dictionary",
  },
  // DVDS
  DVX44821: {
    ItemID: 433011,
    PartNum: "DVX44821",
    ThumbnailImage: null,
    BinLocation: "B2",
    ItemType: "DVDS",
    Description: "Classic Movie Collection",
  },
  DVX44902: {
    ItemID: 433020,
    PartNum: "DVX44902",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "DVDS",
    Description: "Nature Documentary Box Set",
  },
  // RECORDS
  REC88312: {
    ItemID: 433012,
    PartNum: "REC88312",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "RECORDS",
    Description: "Vinyl Record — Jazz Compilation",
  },
  REC88401: {
    ItemID: 433021,
    PartNum: "REC88401",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "RECORDS",
    Description: "Classical 33rpm — Beethoven",
  },
  // BIG
  BIG00991: {
    ItemID: 433013,
    PartNum: "BIG00991",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "BIG",
    Description: "Large Decorative Lamp",
  },
  BIG01044: {
    ItemID: 433022,
    PartNum: "BIG01044",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "BIG",
    Description: "Wooden Bookcase (flat-pack)",
  },
  // MISC
  NSM31785: {
    ItemID: 433782,
    PartNum: "NSM31785",
    ThumbnailImage:
      "https://pictures.swedemom.com/pictures/2026-02/NSM31785a.jpg",
    BinLocation: "F0",
    ItemType: "MISC",
    Description: "Misc Hardware Part",
  },
  MSC00101: {
    ItemID: 433023,
    PartNum: "MSC00101",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "MISC",
    Description: "Assorted Cables Bundle",
  },
  MSC00209: {
    ItemID: 433024,
    PartNum: "MSC00209",
    ThumbnailImage: null,
    BinLocation: null,
    ItemType: "MISC",
    Description: "Tool Kit — Small",
  },
};

// ─── Per-type item pools for layout generation ────────────────────────────────
// Used by generateLayoutData() when a .wh.json is uploaded
const ITEM_POOLS = {
  CLOTHES: [
    "NMB7663",
    "NMB7699",
    "NMB7665",
    "NRC18960",
    "CLT00312",
    "CLT00444",
  ],
  FRAGILE: ["NMB7691", "FRG00182", "FRG00239"],
  BOOKS: ["BKS10042", "BKS10199", "BKS10277"],
  DVDS: ["DVX44821", "DVX44902"],
  RECORDS: ["REC88312", "REC88401"],
  BIG: ["BIG00991", "BIG01044"],
  MISC: ["NSM31785", "MSC00101", "MSC00209"],
};

/**
 * generateLayoutData(boxes)
 *
 * Called once when a .wh.json is uploaded into ManageInventory.
 * The file only contains slot GEOMETRY (position, size) — labels may be
 * empty, inconsistent, or freeform, so we deliberately do NOT rely on
 * parsing the label string to figure out zoning. Instead we group boxes
 * by spatial clustering (their actual x/z position), which always works
 * regardless of how the warehouse was built or labeled.
 *
 * Algorithm:
 *  1. Cluster boxes into "sections" by snapping their (x,z) position to a
 *     coarse cell grid (every ~4 floor units = one section). Boxes that are
 *     near each other in the actual 3D layout end up in the same section —
 *     this mirrors how real warehouses are zoned by physical aisle/area.
 *  2. Shuffle the non-MISC item types and assign one type per section so
 *     there's a genuine MIX across the warehouse (not everything MISC).
 *     ~20% of sections are explicitly MISC (accept-anything zones).
 *  3. Every individual slot gets an independent weighted-random capacity.
 *  4. Each slot gets 0–3 mock items matching its section's type.
 *
 * Uses Math.random() — intentionally non-deterministic, simulating live
 * data arriving fresh each time a warehouse file is loaded.
 */
export function generateLayoutData(boxes) {
  if (!boxes.length) return [];

  // ── Step 1: cluster boxes spatially into sections ─────────────────────────
  // Cell size big enough to bucket a "row of bins" together; tune via divisor.
  const CELL = 4;
  const cellKey = (b) => {
    const cx = Math.floor(b.position.x / CELL);
    const cz = Math.floor(b.position.z / CELL);
    return `${cx},${cz}`;
  };
  const sectionKeys = [...new Set(boxes.map(cellKey))];

  // ── Step 2: assign one random item type per section — guarantees a mix ────
  const nonMiscTypes = Object.keys(ITEM_TYPES).filter((t) => t !== "MISC");
  // Fisher-Yates shuffle for genuine randomness (not just .sort(()=>random()))
  const shuffled = [...nonMiscTypes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const sectionTypeMap = {};
  sectionKeys.forEach((key, i) => {
    sectionTypeMap[key] =
      Math.random() < 0.2 ? "MISC" : shuffled[i % shuffled.length];
  });

  // Safety net: if every section randomly rolled MISC (unlucky but possible
  // with few sections), force at least one section per available type so
  // filtering always has something real to show.
  const usedTypes = new Set(Object.values(sectionTypeMap));
  if (usedTypes.size <= 1 && sectionKeys.length > 1) {
    sectionKeys.forEach((key, i) => {
      sectionTypeMap[key] = nonMiscTypes[i % nonMiscTypes.length];
    });
  }

  // ── Step 3: weighted-random capacity per slot ──────────────────────────────
  const CAP_POOL = [
    ...Array(40).fill("Plenty"),
    ...Array(35).fill("Near Full"),
    ...Array(15).fill("Full"),
    ...Array(10).fill("Empty"),
  ];
  const randCap = () => CAP_POOL[Math.floor(Math.random() * CAP_POOL.length)];

  // ── Step 4: enrich every box ────────────────────────────────────────────────
  return boxes.map((box) => {
    const itemType = sectionTypeMap[cellKey(box)] || "MISC";
    const capacity = randCap();

    const pool = ITEM_POOLS[itemType] || ITEM_POOLS.MISC;
    const count = Math.floor(Math.random() * 4); // 0–3 items
    const items = Array.from({ length: count }, () => {
      const pn = pool[Math.floor(Math.random() * pool.length)];
      return MOCK_ITEMS[pn]
        ? { ...MOCK_ITEMS[pn], BinLocation: box.label || box.id }
        : null;
    }).filter(Boolean);

    return { ...box, itemType, capacity, items };
  });
}

export const CAPACITY_POOL_WEIGHTS = {
  Plenty: 40,
  "Near Full": 35,
  Full: 15,
  Empty: 10,
};

// ─── Pre-built region layouts (used when no .wh.json is loaded) ──────────────
function buildSection({
  region,
  section,
  startZ,
  itemType,
  rows,
  cols,
  size,
  gapX = 0.08,
  gapZ = 0.1,
}) {
  const boxes = [];
  const { w, h, d } = size;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const label = col === 0 ? `${section}${row}` : `${section}${row}${col}`;
      boxes.push({
        id: `${region}_${section}${row}_${col}`,
        label,
        position: {
          x: col * (w + gapX),
          y: h / 2,
          z: startZ + row * (d + gapZ),
        },
        size: { w, h, d },
        capacity: ["Plenty", "Plenty", "Near Full", "Full", "Empty"][
          Math.floor(Math.random() * 5)
        ],
        itemType,
        items: [],
      });
    }
  }
  return boxes;
}

function makeMHLayout() {
  const defs = [
    {
      section: "A",
      startZ: 0,
      itemType: "BOOKS",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "B",
      startZ: 8,
      itemType: "DVDS",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "C",
      startZ: 16,
      itemType: "RECORDS",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 0.5, d: 1 },
    },
    {
      section: "D",
      startZ: 24,
      itemType: "FRAGILE",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 0.5, d: 1 },
    },
    {
      section: "E",
      startZ: 32,
      itemType: "CLOTHES",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "F",
      startZ: 40,
      itemType: "MISC",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "G",
      startZ: 48,
      itemType: "BIG",
      rows: 4,
      cols: 4,
      size: { w: 2, h: 1.5, d: 2 },
    },
    {
      section: "H",
      startZ: 56,
      itemType: "CLOTHES",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
  ];
  return defs.flatMap((def) => buildSection({ region: "MH", ...def }));
}
function makeCWLayout() {
  const defs = [
    {
      section: "A",
      startZ: 0,
      itemType: "CLOTHES",
      rows: 8,
      cols: 10,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "B",
      startZ: 10,
      itemType: "CLOTHES",
      rows: 8,
      cols: 10,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "C",
      startZ: 20,
      itemType: "MISC",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "D",
      startZ: 28,
      itemType: "FRAGILE",
      rows: 4,
      cols: 6,
      size: { w: 1, h: 0.5, d: 1 },
    },
    {
      section: "E",
      startZ: 34,
      itemType: "BIG",
      rows: 3,
      cols: 4,
      size: { w: 2, h: 1.5, d: 2 },
    },
  ];
  return defs.flatMap((def) => buildSection({ region: "CW", ...def }));
}
function makeAWLayout() {
  const defs = [
    {
      section: "A",
      startZ: 0,
      itemType: "BIG",
      rows: 4,
      cols: 4,
      size: { w: 2, h: 2, d: 2 },
    },
    {
      section: "B",
      startZ: 12,
      itemType: "MISC",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "C",
      startZ: 20,
      itemType: "MISC",
      rows: 6,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
    {
      section: "D",
      startZ: 28,
      itemType: "BOOKS",
      rows: 4,
      cols: 8,
      size: { w: 1, h: 1, d: 1 },
    },
  ];
  return defs.flatMap((def) => buildSection({ region: "AW", ...def }));
}

export const REGION_LAYOUTS = {
  MH: makeMHLayout(),
  CW: makeCWLayout(),
  AW: makeAWLayout(),
};
