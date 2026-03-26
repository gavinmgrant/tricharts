import { FC, useEffect, useMemo, useRef, useState } from "react"
import type { ThreeEvent } from "@react-three/fiber"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { buildSurfaceGeometry } from "./SurfaceGeometry"
import { SurfacePointSpheres } from "./SurfacePointSpheres"
import { useIntroProgress } from "./useIntroProgress"

type SurfaceMeshProps = {
  normalizedData: number[][]
  scaleFactor: number
  barWidth: number
  barDepth: number
  barSpacing: number
  colorStops: string[]
  highlightColor: string
  showWireframe?: boolean
  showSurfacePoints?: boolean
  surfacePointColor?: string
  surfacePointRadius?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

export const SurfaceMesh: FC<SurfaceMeshProps> = ({
  normalizedData,
  scaleFactor,
  barWidth,
  barDepth,
  barSpacing,
  colorStops,
  highlightColor,
  showWireframe = false,
  showSurfacePoints = true,
  surfacePointColor,
  surfacePointRadius,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

  const { easedProgressRef } = useIntroProgress(0.5, [
    normalizedData,
    scaleFactor,
    barWidth,
    barDepth,
    barSpacing,
  ])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    g.scale.y = easedProgressRef.current
  })

  const geometry = useMemo(
    () =>
      buildSurfaceGeometry(
        normalizedData,
        scaleFactor,
        barWidth,
        barDepth,
        barSpacing,
        colorStops
      ),
    [normalizedData, scaleFactor, barWidth, barDepth, barSpacing, colorStops]
  )

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color="#ffffff"
          emissive={hovered ? highlightColor : "#000000"}
          emissiveIntensity={hovered ? 0.18 : 0}
          metalness={hovered ? 0.5 : 0.2}
          roughness={0.65}
          side={THREE.DoubleSide}
          vertexColors
          wireframe={showWireframe}
        />
      </mesh>
      {showSurfacePoints && (
        <SurfacePointSpheres
          normalizedData={normalizedData}
          scaleFactor={scaleFactor}
          barWidth={barWidth}
          barDepth={barDepth}
          barSpacing={barSpacing}
          colorStops={colorStops}
          pointColor={surfacePointColor}
          pointRadius={surfacePointRadius}
          easedProgressRef={easedProgressRef}
        />
      )}
    </group>
  )
}
