# Redesign WarehouseViewer

## Objective
Simplify `WarehouseViewer.jsx` to only contain:
- Swedemom branding (Top-left)
- Manage Inventory and Builder Tabs
- Mock Items panel
- 3D Preview (Canvas)

## Scope & Impact
- `src/modules/inventory/WarehouseViewer.jsx`: Will become the main container.
- `src/components/TopNav.jsx`: Needs to be modified or parts extracted to be used in `WarehouseViewer`.
- `src/modules/inventory/ManageInventory.jsx`: Will likely be simplified or removed as its functionality will be moved to `WarehouseViewer`.
- `src/App.jsx`: Needs to be updated to point to the new, integrated `WarehouseViewer`.

## Implementation Steps
1.  Extract `MockItemsPanel` and `ModeTabs` from `ManageInventory.jsx` to a shared utility or keep them in `WarehouseViewer` if exclusive.
2.  Redesign `WarehouseViewer.jsx` layout:
    - Top bar: "Swedemom" brand, "Manage Inventory" / "Builder" tabs.
    - Left side: Mock Items panel.
    - Center/Main: 3D Preview.
3.  Clean up `WarehouseViewer.jsx` of all extraneous legend/UI elements.
4.  Update `App.jsx` to route directly to the new `WarehouseViewer`.

## Verification
- Confirm the new UI has the branding, tabs, mock panel, and 3D preview.
- Ensure 3D interactions (click/orbit) still function.
- Ensure Mock Items selection filters the view correctly.
