# Plan: Implement Contiguous Box Selection and Movement

## Objective
Enable users to select a contiguous group of boxes (sharing faces) by holding Shift while clicking, and then translate the entire group using arrow keys.

## Scope & Impact
- Modify `WarehouseBuilder.jsx` state to support multiple selected boxes.
- Update `onPtrUp` to detect Shift+Click and perform a flood-fill search for contiguous boxes.
- Update `onKeyDown` to handle translation for a group of boxes.
- Add "finalization" logic (e.g., clicking again or pressing Enter to set the group).

## Implementation Steps

### 1. State Management
- Update `selectedId` (string | null) to `selectedIds` (Set<string>).
- Maintain the original relative positions of the selected group for translation.

### 2. Selection Logic
- In `onPtrUp`, check `e.shiftKey`.
- If true, implement a recursive "flood fill" function to find all connected boxes.
  - Two boxes are "connected" if they share a face or are directly adjacent in the grid (need to define exact "touching" criteria).
- Update `selectedIds` with the resulting set of IDs.

### 3. Translation Logic
- Modify the `ArrowKey` handler in `onKeyDown`.
- Calculate the offset for the entire group.
- Ensure all boxes in the group are translated as a unit.
- Prevent collisions with non-selected boxes (if desired, or keep simple).

### 4. Finalization
- Add a listener or state to detect "finalization" of a move (e.g., clicking outside the group or pressing Enter).

## Verification & Testing
- Test Shift+Click on a single box.
- Test Shift+Click on a contiguous group.
- Test arrow key translation of a group.
- Verify undo/redo still works for grouped actions.
