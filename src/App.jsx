// src/App.jsx
import { useState } from "react";
import TopNav from "./components/TopNav.jsx";
import ManageInventory from "./modules/inventory/ManageInventory.jsx";
import WarehouseBuilder from "./modules/builder/WarehouseBuilder.jsx";
import { T } from "./styles/theme.js";

export default function App() {
  // Simple state-based routing — no react-router needed yet
  const [page, setPage] = useState("inventory"); // "inventory" | "builder"

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: T.bg0,
        overflow: "hidden",
        fontFamily: T.font,
      }}
    >
      <TopNav activePage={page} onNavigate={setPage} />

      <div style={{ flex: 1, overflow: "hidden" }}>
        {page === "inventory" && <ManageInventory />}
        {page === "builder" && <WarehouseBuilder />}
      </div>
    </div>
  );
}
