import AppContainer from "./modules/inventory/AppContainer.jsx";
import { T } from "./styles/theme.js";

export default function App() {
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
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AppContainer />
      </div>
    </div>
  );
}
