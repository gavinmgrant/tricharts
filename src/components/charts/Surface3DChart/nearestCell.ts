/** Picks the data cell whose bar center in XZ is closest to the hit point (same centers as Bar.tsx). */
export function nearestBarCellFromWorldXZ(
  x: number,
  z: number,
  rows: number,
  cols: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number
): { xIndex: number; zIndex: number } {
  let xIndex = 0
  let bestDx = Infinity
  for (let xi = 0; xi < cols; xi++) {
    const cx = xi * (barWidth + barSpacing)
    const d = Math.abs(x - cx)
    if (d < bestDx) {
      bestDx = d
      xIndex = xi
    }
  }

  let zIndex = 0
  let bestDz = Infinity
  for (let zi = 0; zi < rows; zi++) {
    const cz = zi * (barDepth + barSpacing)
    const d = Math.abs(z - cz)
    if (d < bestDz) {
      bestDz = d
      zIndex = zi
    }
  }

  return { xIndex, zIndex }
}
