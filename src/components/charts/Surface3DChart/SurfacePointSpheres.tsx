import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import {
  getSurfaceVertexColors,
  getSurfaceVertexPositions,
} from "./SurfaceGeometry"

export type SurfacePointSpheresProps = {
  normalizedData: number[][]
  scaleFactor: number
  barWidth: number
  barDepth: number
  barSpacing: number
  colorStops: string[]
  /** When omitted, points inherit the same height-based gradient as the surface. */
  pointColor?: string
  /** Sphere radius in world units. Defaults from bar footprint size. */
  pointRadius?: number
}

const DEFAULT_POINT_COLOR = "#f1f5f9"

/**
 * Instanced spheres at each surface grid vertex. Raycasting is disabled so
 * pointer events still hit the surface mesh beneath.
 */
export function SurfacePointSpheres({
  normalizedData,
  scaleFactor,
  barWidth,
  barDepth,
  barSpacing,
  colorStops,
  pointColor,
  pointRadius,
}: SurfacePointSpheresProps) {
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

  const count = positions.length
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const obj = useMemo(() => new THREE.Object3D(), [])
  const useGradientPointColors = pointColor == null
  const resolvedPointColor = pointColor ?? DEFAULT_POINT_COLOR

  const radius = pointRadius ?? Math.min(barWidth, barDepth) * 0.11
  const colors = useMemo(
    () =>
      useGradientPointColors
        ? getSurfaceVertexColors(normalizedData, colorStops)
        : positions.map(() => new THREE.Color(resolvedPointColor)),
    [
      normalizedData,
      colorStops,
      positions,
      resolvedPointColor,
      useGradientPointColors,
    ]
  )

  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, 10, 10),
    [radius]
  )

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: useGradientPointColors ? "#ffffff" : resolvedPointColor,
        emissiveIntensity: useGradientPointColors ? 0.16 : 0.1,
        metalness: 0.28,
        roughness: 0.35,
      }),
    [resolvedPointColor, useGradientPointColors]
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const lift = radius * 0.92
    positions.forEach((pos, i) => {
      obj.position.set(pos[0], pos[1] + lift, pos[2])
      obj.updateMatrix()
      mesh.setMatrixAt(i, obj.matrix)
      if (colors[i]) {
        mesh.setColorAt(i, colors[i])
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [colors, positions, obj, radius])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.raycast = () => {
      /* visual only */
    }
  }, [count])

  if (count === 0) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  )
}
