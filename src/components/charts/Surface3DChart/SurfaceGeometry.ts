import * as THREE from "three"

/**
 * Builds a BufferGeometry for a height field on the same grid as Bar3DChart bar centers.
 * Vertices sit at bar footprint centers in XZ with Y = scaled value (top of bar).
 * Requires at least a 2×2 grid; otherwise returns an empty geometry.
 */
export function buildSurfaceGeometry(
  normalizedData: number[][],
  scaleFactor: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number,
  colorStops?: string[]
): THREE.BufferGeometry {
  const rows = normalizedData.length
  const cols = rows > 0 ? normalizedData[0].length : 0

  if (rows < 2 || cols < 2) {
    return new THREE.BufferGeometry()
  }

  return buildGridSurfaceGeometry(
    normalizedData,
    scaleFactor,
    barWidth,
    barDepth,
    barSpacing,
    colorStops
  )
}

function cellCenter(
  xIndex: number,
  zIndex: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number
): [number, number] {
  const x = xIndex * (barWidth + barSpacing)
  const z = zIndex * (barDepth + barSpacing)
  return [x, z]
}

/** Grid vertex positions (same as surface mesh corners). Empty if fewer than 2×2 cells. */
export function getSurfaceVertexPositions(
  normalizedData: number[][],
  scaleFactor: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number
): [number, number, number][] {
  const rows = normalizedData.length
  const cols = rows > 0 ? normalizedData[0].length : 0
  if (rows < 2 || cols < 2) return []

  const out: [number, number, number][] = []
  for (let zi = 0; zi < rows; zi++) {
    for (let xi = 0; xi < cols; xi++) {
      const [cx, cz] = cellCenter(xi, zi, barWidth, barDepth, barSpacing)
      const y = normalizedData[zi][xi] * scaleFactor
      out.push([cx, y, cz])
    }
  }
  return out
}

function sampleGradientColor(
  gradientStops: THREE.Color[],
  value: number
): THREE.Color {
  if (gradientStops.length === 0) {
    return new THREE.Color("#3b82f6")
  }

  if (gradientStops.length === 1) {
    return gradientStops[0].clone()
  }

  const scaled = Math.max(0, Math.min(1, value)) * (gradientStops.length - 1)
  const lowerIndex = Math.floor(scaled)
  const upperIndex = Math.min(lowerIndex + 1, gradientStops.length - 1)
  const mix = scaled - lowerIndex
  return new THREE.Color().lerpColors(
    gradientStops[lowerIndex],
    gradientStops[upperIndex],
    mix
  )
}

export function getSurfaceVertexColors(
  normalizedData: number[][],
  colorStops: string[]
): THREE.Color[] {
  const rows = normalizedData.length
  const cols = rows > 0 ? normalizedData[0].length : 0
  if (rows === 0 || cols === 0) return []

  const values = normalizedData.flat()
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const gradientStops = colorStops.map((color) => new THREE.Color(color))

  const colors: THREE.Color[] = []
  for (let zi = 0; zi < rows; zi++) {
    for (let xi = 0; xi < cols; xi++) {
      const value = normalizedData[zi][xi]
      const normalizedValue = range === 0 ? 0.5 : (value - minValue) / range
      colors.push(sampleGradientColor(gradientStops, normalizedValue))
    }
  }

  return colors
}

function buildGridSurfaceGeometry(
  normalizedData: number[][],
  scaleFactor: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number,
  colorStops?: string[]
): THREE.BufferGeometry {
  const rows = normalizedData.length
  const cols = normalizedData[0].length
  const vertexCount = rows * cols
  const positions = new Float32Array(vertexCount * 3)

  let p = 0
  for (let zi = 0; zi < rows; zi++) {
    for (let xi = 0; xi < cols; xi++) {
      const [cx, cz] = cellCenter(xi, zi, barWidth, barDepth, barSpacing)
      positions[p++] = cx
      positions[p++] = normalizedData[zi][xi] * scaleFactor
      positions[p++] = cz
    }
  }

  const quadCount = (rows - 1) * (cols - 1)
  const indices = new Uint32Array(quadCount * 6)
  let q = 0
  for (let zi = 0; zi < rows - 1; zi++) {
    for (let xi = 0; xi < cols - 1; xi++) {
      const a = zi * cols + xi
      const b = zi * cols + xi + 1
      const c = (zi + 1) * cols + xi + 1
      const d = (zi + 1) * cols + xi
      indices[q++] = a
      indices[q++] = b
      indices[q++] = c
      indices[q++] = a
      indices[q++] = c
      indices[q++] = d
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(Array.from(indices))

  if (colorStops && colorStops.length > 0) {
    const vertexColors = getSurfaceVertexColors(normalizedData, colorStops)
    const colorAttribute = new Float32Array(vertexColors.length * 3)

    vertexColors.forEach((color, index) => {
      const offset = index * 3
      colorAttribute[offset] = color.r
      colorAttribute[offset + 1] = color.g
      colorAttribute[offset + 2] = color.b
    })

    geometry.setAttribute("color", new THREE.BufferAttribute(colorAttribute, 3))
  }

  geometry.computeVertexNormals()
  return geometry
}
