# Plan: Finer Scale and View-Relative Movement

## Objective
Enable finer-scale translation (e.g., by 1 ATOM) and make the arrow key translation directions relative to the current camera view angle.

## Scope & Impact
- Modify `onKeyDown` to calculate camera-relative movement vectors.
- Replace the absolute grid-based `NUDGE` mapping.
- Update step size to be a fixed finer scale (e.g., `1 * ATOM`).

## Implementation Steps

### 1. View-Relative Vector Calculation
- In `onKeyDown`, access the current camera direction via `camRef`.
- Project the camera's `forward` vector onto the XZ plane to get the "camera forward" direction on the floor.
- Calculate "camera right" as the vector perpendicular to camera forward on the floor.
- Create a mapping for Arrow keys to these calculated relative vectors instead of static `[1, 0]` coordinates.

### 2. Fine-Scale Translation
- Instead of using `Math.max(ATOM, box.size.w)`, use a constant `STEP = 1 * ATOM` for the movement delta.
- Ensure that the final position is still snapped to the ATOM grid using `snapAtom`.

### 3. Updated Movement Logic
- For each arrow key, calculate:
  - `deltaX = (directionVector.x * STEP)`
  - `deltaZ = (directionVector.z * STEP)`
- Apply `deltaX` and `deltaZ` to each box in the selected group.

## Verification & Testing
- Verify that moving with arrow keys corresponds to the user's perception of "forward" (towards the horizon), "left", "right", and "backwards" based on their current camera angle.
- Confirm that movement is on a finer scale (1 ATOM) and respects the overall grid.
