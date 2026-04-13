import { useMemo, useRef } from "react"
import { Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { getSurfaceVertexPositions } from "./SurfaceGeometry"

/** Matches `use3DScaling` / Bar label formatting. */
function formatVertexValue(value: number): string {
  if (Number.isInteger(value)) return Math.round(value).toString()
  return value.toFixed(1).replace(/\.?0+$/, "")
}

export type SurfaceValueLabelsProps = {
  normalizedData: number[][]
  scaleFactor: number
  barWidth: number
  barDepth: number
  barSpacing: number
  /** Align vertical offset with `SurfacePointSpheres` (default scales with bar footprint). */
  surfacePointRadius?: number
  easedProgressRef: React.MutableRefObject<number>
}

/**
 * Value labels at each grid vertex, positioned to track the intro animation (same Y logic as
 * surface spheres). Transforms are updated imperatively in `useFrame` so we avoid per-frame troika
 * `sync()` work across hundreds of labels.
 */
export function SurfaceValueLabels({
  normalizedData,
  scaleFactor,
  barWidth,
  barDepth,
  barSpacing,
  surfacePointRadius,
  easedProgressRef,
}: SurfaceValueLabelsProps) {
  const positions = useMemo(
    () =>
      getSurfaceVertexPositions(
        normalizedData,
        scaleFactor,
        barWidth,
        barDepth,
        barSpacing
      ),
    [normalizedData, scaleFactor, barWidth, barDepth, barSpacing]
  )

  const labels = useMemo(() => {
    const rows = normalizedData.length
    const cols = rows > 0 ? normalizedData[0].length : 0
    const out: string[] = []
    for (let zi = 0; zi < rows; zi++) {
      for (let xi = 0; xi < cols; xi++) {
        out.push(formatVertexValue(normalizedData[zi][xi]))
      }
    }
    return out
  }, [normalizedData])

  const radius = surfacePointRadius ?? Math.min(barWidth, barDepth) * 0.11
  const lift = radius * 0.92
  const labelAboveSphere = radius * 1.35
  const fontSize = Math.min(barWidth, barDepth) / 3
  const outlineW = barDepth * 0.025

  const meshRefs = useRef<Array<{ position: { set: (x: number, y: number, z: number) => void } }>>(
    []
  )

  useFrame(() => {
    const eased = easedProgressRef.current
    for (let i = 0; i < positions.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const pos = positions[i]
      const y = pos[1] * eased + lift + labelAboveSphere
      mesh.position.set(pos[0], y, pos[2])
    }
  })

  return (
    <>
      {positions.map((pos, i) => (
        <Text
          key={`svl-${i}`}
          ref={(el) => {
            meshRefs.current[i] = el
          }}
          position={[pos[0], lift + labelAboveSphere, pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={fontSize}
          fontWeight={700}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={outlineW}
          outlineColor="black"
        >
          {labels[i]}
        </Text>
      ))}
    </>
  )
}
