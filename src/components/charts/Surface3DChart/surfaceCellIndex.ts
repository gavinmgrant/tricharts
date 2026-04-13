/**
 * Maps instanced-sphere index ↔ grid cell. Must match iteration order in
 * `getSurfaceVertexPositions` / `SurfaceGeometry`: for zIndex 0..rows-1, for
 * xIndex 0..cols-1 → linear index = zIndex * cols + xIndex.
 */
export function surfaceInstanceIdToCell(
  instanceId: number,
  rows: number,
  cols: number
): { xIndex: number; zIndex: number } | null {
  if (
    !Number.isInteger(instanceId) ||
    instanceId < 0 ||
    instanceId >= rows * cols
  ) {
    return null
  }
  const zIndex = Math.floor(instanceId / cols)
  const xIndex = instanceId % cols
  return { xIndex, zIndex }
}
