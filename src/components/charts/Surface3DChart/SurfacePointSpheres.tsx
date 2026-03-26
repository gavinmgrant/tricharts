import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
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
  /** Shared intro animation progress (0 → 1) from the parent surface mesh. */
  easedProgressRef?: React.MutableRefObject<number>
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
  easedProgressRef,
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

  const lastEasedRef = useRef<number>(-1)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const lift = radius * 0.92
    const eased = easedProgressRef?.current ?? 1
    positions.forEach((pos, i) => {
      obj.position.set(pos[0], pos[1] * eased + lift, pos[2])
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
    lastEasedRef.current = eased
  }, [colors, positions, obj, radius, easedProgressRef])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    if (count === 0) return
    if (!easedProgressRef) return

    const eased = easedProgressRef.current
    if (eased === lastEasedRef.current) return

    const lift = radius * 0.92
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      obj.position.set(pos[0], pos[1] * eased + lift, pos[2])
      obj.updateMatrix()
      mesh.setMatrixAt(i, obj.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    lastEasedRef.current = eased
  })

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
