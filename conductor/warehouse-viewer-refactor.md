# Refactor WarehouseViewer.jsx

## Objective
Refactor `src/modules/inventory/WarehouseViewer.jsx` to adopt the robust Three.js patterns, scene management, and interaction handling found in `src/modules/builder/WarehouseBuilder.jsx`, ensuring it becomes fully functional and performant.

## Key Files & Context
- `@src/modules/builder/WarehouseBuilder.jsx` (Reference Architecture)
- `@src/modules/inventory/WarehouseViewer.jsx` (Target for Refactor)
- `@src/modules/builder/threeHelpers.js` (Shared helper utilities)

## Implementation Steps
1. **Align Scene & Renderer Management**:
   - Update `WarehouseViewer`'s `useEffect` hooks to mirror the robust cleanup and initialization logic in `WarehouseBuilder`.
   - Ensure proper disposal of `WebGLRenderer`, geometries, and materials.
2. **Standardize Camera & Interaction**:
   - Implement the same camera control logic (`camSph`, `camTarget`, `ptrState`) used in `WarehouseBuilder` to ensure consistent navigation.
   - Use the same `onPointerDown`, `onPointerMove`, `onPointerUp`, and `onWheel` patterns.
3. **Refine Mesh Management**:
   - Ensure `WarehouseViewer` correctly handles updating, adding, and removing box meshes as `boxes` or filters change.
   - Reuse `threeHelpers.js` functions more effectively.
4. **Clean up Interface**:
   - Retain viewer-specific features (Capacity/Item mode toggles) while ensuring they don't break the Three.js loop or interactions.

## Verification & Testing
- Verify 3D rendering initializes and cleans up without memory leaks.
- Confirm consistent camera interaction (rotation/panning) matching the `WarehouseBuilder`.
- Ensure interaction with boxes (selection) is responsive and accurate.
- Test toggling between Capacity and Item modes for correct visual updates.
