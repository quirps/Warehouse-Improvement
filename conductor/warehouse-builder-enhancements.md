# Warehouse Builder Improvements Plan

## Objective
Enhance `WarehouseBuilder` to support batch selection of boxes by type, management (add/edit/remove) of box types (presets), and improve box labeling.

## Scope & Impact
- Modify `WarehouseBuilder.jsx` UI and state management.
- Update `presets` handling in the sidebar.
- Introduce a new dialog or reuse existing ones for editing/removing presets.

## Proposed Solution
1.  **Batch Selection:** Add `onClick` to preset items in the sidebar to highlight all boxes of that type.
2.  **Preset Management:**
    - Add "Edit" and "Delete" actions to preset items in the sidebar.
    - Implement a confirmation prompt ("REMOVE") when deleting a preset that is in use.
3.  **Label Editing:** Review and ensure label editing for individual boxes is consistent with the new workflow.

## Implementation Steps
1.  Create `selectBoxesByType(presetName)` function.
2.  Update the preset list rendering in `WarehouseBuilder.jsx` to include Edit/Delete buttons.
3.  Implement `deletePreset(preset)` with usage check and confirmation.
4.  Implement `editPreset(preset)` to update the preset name.
5.  Refactor sidebar layout to accommodate these new controls.

## Verification
- Click a preset in sidebar: verify all matching boxes in 3D view are highlighted.
- Delete a preset that is NOT in use: verify it is removed.
- Delete a preset that IS in use: verify prompt, require "REMOVE", verify deletion (or handling).
- Edit a preset: verify name update.
- Ensure label editing via E/double-click still works.
