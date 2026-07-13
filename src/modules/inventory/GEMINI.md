# WarehouseViewer Architecture Guidelines

## Critical Architecture & Design Patterns
The `WarehouseViewer` shares the same core architectural patterns as `WarehouseBuilder`. **Do not deviate from these patterns.**

### 1. Scene & Lifecycle Management
- **Initialization:** Scene initialization MUST happen in a dedicated `useEffect` hook. 
- **Auto-Loading:** The rendering loop MUST NOT attempt to build meshes until the scene is initialized. Use an `initialized` state (boolean) to guard `useEffect` hooks that manipulate meshes.
- **Cleanup:** Always use the return function of `useEffect` to:
  - `cancelAnimationFrame`
  - `renderer.dispose()`
  - Remove renderer DOM element.
  - Remove resize event listeners.

### 2. Interaction Handling
- **Consistency:** Interaction patterns (camera rotation, panning, zooming) MUST mirror `WarehouseBuilder` to ensure a consistent user experience.
- **Pointers:** Use `useCallback` for `onPointerDown`, `onPointerMove`, and `onPointerUp` to ensure dependencies remain stable.
- **Raycasting:** Use a single `THREE.Raycaster` instance via `useRef`. Always check `userData.boxId` on intersected objects or their parents to identify boxes.

### 3. Mesh Management
- **Declarative Updates:** The list of boxes should be mapped to the scene reactively. Use a `Map` (`meshMapRef`) to track existing meshes.
- **Lifecycle:** 
  - Compare the new list of boxes against the `Map` to identify:
    1. Boxes to remove (present in `Map` but not in new list).
    2. Boxes to update (present in `Map` and new list).
    3. Boxes to add (present in new list but not in `Map`).
  - ALWAYS call `disposeGroup` on removed meshes to prevent memory leaks.
- **Helpers:** Use `threeHelpers.js` for building and updating meshes.

### 4. State Constraints
- **Responsiveness:** Keep heavy calculations out of the rendering loop. Memoize data transformations (`generateLayoutData`) using `useMemo`.
- **Labels:** Ensure text label textures are created using the optimized `makeLabelTexture` function to maintain crispness at low resolutions.

## Future Maintenance
- **Regression:** If the warehouse is not loading automatically, check the `initialized` state guard in the mesh-building `useEffect`.
- **Refactoring:** When modifying interaction, update `WarehouseViewer` and `WarehouseBuilder` concurrently to keep them in sync.
