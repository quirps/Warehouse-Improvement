// src/hooks/useInventory.js
import { useState, useCallback, useRef, useMemo } from "react";
import {
  getItemByPartNumber,
  checkBinLocation,
  batchMoveItems,
} from "../api/inventoryApi.js";
import { REGION_LAYOUTS } from "../data/mockData.js";

export function useInventory() {
  const [region, setRegionState] = useState("MH");
  const [binInput, setBinInput] = useState("");
  const [selectedBin, setSelectedBin] = useState(null); // { label, boxId, itemType }
  const [binStatus, setBinStatus] = useState(null); // null | "checking" | "valid" | "invalid"
  const [scannedItems, setScannedItems] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [moveStatus, setMoveStatus] = useState(null); // null | "moving" | "success" | "error"
  const [recentLocs, setRecentLocs] = useState([
    "MHS0",
    "MHTZ",
    "MHVS",
    "MHW8",
  ]);
  const [errorMsg, setErrorMsg] = useState(null);
  const scanInputRef = useRef(null);

  // Switch region — clear selected bin (it belongs to old region)
  const setRegion = useCallback((r) => {
    setRegionState(r);
    setSelectedBin(null);
    setBinStatus(null);
    setBinInput("");
    setErrorMsg(null);
  }, []);

  // ── Resolve a bin by label (e.g. "F0", "A3", "MHF0") ──
  const resolveBin = useCallback(async (raw, currentRegion) => {
    if (!raw?.trim()) return;
    // Strip region prefix if user typed full label like "MHF0"
    let label = raw.trim().toUpperCase();
    if (label.startsWith(currentRegion))
      label = label.slice(currentRegion.length);

    setBinStatus("checking");
    setErrorMsg(null);

    const res = await checkBinLocation(label, currentRegion);
    if (res.Data?.BinExists) {
      // Find the box in the layout for metadata
      const layout = REGION_LAYOUTS[currentRegion] || [];
      const box = layout.find((b) => b.label === label);
      setSelectedBin({
        label,
        boxId: box?.id || null,
        itemType: box?.itemType || null,
        region: currentRegion,
      });
      setBinStatus("valid");
      setBinInput(label);
      setRecentLocs((prev) =>
        [label, ...prev.filter((r) => r !== label)].slice(0, 8),
      );
    } else {
      setBinStatus("invalid");
      setSelectedBin(null);
      setErrorMsg(`Bin "${label}" not found in region ${currentRegion}`);
    }
  }, []);

  // ── Scan/look up a part number ──
  const scanItem = useCallback(async (partNum) => {
    if (!partNum?.trim()) return;
    setScanning(true);
    setErrorMsg(null);
    const res = await getItemByPartNumber(partNum.trim());
    setScanning(false);
    if (res.Success && res.Data) {
      setScannedItems((prev) => {
        const existing = prev.find((i) => i.PartNum === res.Data.PartNum);
        if (existing)
          return prev.map((i) =>
            i.PartNum === res.Data.PartNum
              ? { ...i, ScanQty: (i.ScanQty || 1) + 1 }
              : i,
          );
        return [...prev, { ...res.Data, ScanQty: 1 }];
      });
      setScanInput("");
    } else {
      setErrorMsg(`"${partNum}" not found in system`);
    }
  }, []);

  const removeItem = useCallback(
    (pn) => setScannedItems((prev) => prev.filter((i) => i.PartNum !== pn)),
    [],
  );
  const clearScanned = useCallback(() => {
    setScannedItems([]);
    setScanInput("");
    setMoveStatus(null);
  }, []);

  // ── Commit batch move ──
  const commitMove = useCallback(async () => {
    if (!selectedBin || !scannedItems.length) return;
    setMoveStatus("moving");
    setErrorMsg(null);
    const fullLabel = selectedBin.region + selectedBin.label;
    const res = await batchMoveItems(
      fullLabel,
      scannedItems.map((i) => i.PartNum),
    );
    if (res.Success) {
      setMoveStatus("success");
      setTimeout(() => {
        setScannedItems([]);
        setMoveStatus(null);
        setScanInput("");
      }, 2500);
    } else {
      setMoveStatus("error");
      setErrorMsg("Move failed — please retry.");
    }
  }, [selectedBin, scannedItems]);

  // ── Dominant item type in scanned queue (drives 3D highlight) ──
  const dominantType = useMemo(() => {
    if (!scannedItems.length) return null;
    const counts = {};
    scannedItems.forEach((i) => {
      counts[i.ItemType] = (counts[i.ItemType] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [scannedItems]);

  return {
    region,
    setRegion,
    binInput,
    setBinInput,
    selectedBin,
    setSelectedBin,
    binStatus,
    setBinStatus,
    scannedItems,
    scanInput,
    setScanInput,
    scanning,
    moveStatus,
    recentLocs,
    errorMsg,
    setErrorMsg,
    dominantType,
    scanInputRef,
    resolveBin,
    scanItem,
    removeItem,
    clearScanned,
    commitMove,
  };
}
