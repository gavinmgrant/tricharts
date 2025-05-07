import React from "react"
import { Canvas } from "@react-three/fiber"
import { MapControls, Grid, Text } from "@react-three/drei"
import { normalizeLabel } from "@/utils/labels"
import { useChartCamera } from "@/hooks/useChartCamera"
import type { SceneProps } from "./types"

export const Shared3DScene: React.FC<SceneProps> = ({
  axisLabels = {},
  showFloorGrid = true,
  showVerticalGrids = true,
  gridConfig = { size: 10, color: "#999", offset: 0.5 },
  cameraPosition = [12, 15, 16],
  cameraTarget = [6, 4, 0],
  backgroundColor = "transparent",
  children,
  chartDimensions,
  autoPosition = false,
}) => {
  const gridWidth = chartDimensions?.width ?? gridConfig.size ?? 10
  const gridHeight = chartDimensions?.height ?? gridConfig.size ?? 10
  const gridDepth = chartDimensions?.depth ?? gridConfig.size ?? 10
  const offset = gridConfig.offset ?? 0.5

  const { calculatedCameraPosition, calculatedCameraTarget } = useChartCamera(
    chartDimensions,
    autoPosition,
    cameraPosition,
    cameraTarget
  )

  // Calculate label positions based on chart dimensions and grid size
  const getLabelPosition = (
    axisType: "x" | "y" | "z",
    basePos: [number, number, number],
    offset: number
  ) => {
    if (autoPosition && chartDimensions) {
      const { width, height, depth } = chartDimensions

      switch (axisType) {
        case "x":
          return [basePos[1] - 1.5, basePos[1], depth]
        case "y":
          return [basePos[0] - offset, height, basePos[2] - offset]
        case "z":
          return [width, basePos[1], basePos[1] - 1.5]
        default:
          return basePos
      }
    }

    return [
      basePos[0] + (axisType === "z" ? offset : 0),
      basePos[1] + (axisType === "y" ? offset : 0),
      basePos[2] + (axisType === "x" ? offset : 0),
    ]
  }

  // Helper function to get rotation based on axis type
  const getLabelRotation = (
    axisType: "x" | "y" | "z"
  ): [number, number, number] => {
    switch (axisType) {
      case "x":
        return [-Math.PI / 2, 0, 0]
      case "y":
        return [0, 0, Math.PI / 2]
      case "z":
        return [-Math.PI / 2, 0, Math.PI / 2]
      default:
        return [0, 0, 0]
    }
  }

  return (
    <Canvas
      camera={{
        fov: 30,
        near: 1,
        far: 1000,
        position: autoPosition ? calculatedCameraPosition : cameraPosition,
      }}
      style={{
        height: "100%",
        width: "100%",
        background: backgroundColor || "transparent",
      }}
    >
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 20]} intensity={1} />

      {/* Controls */}
      <MapControls
        target={autoPosition ? calculatedCameraTarget : cameraTarget}
        maxPolarAngle={Math.PI / 2}
        minAzimuthAngle={0}
        maxAzimuthAngle={Math.PI / 2}
        screenSpacePanning={true}
        enableDamping={true}
        dampingFactor={0.1}
        maxDistance={200}
        enableZoom
      />

      {/* Grids */}
      {showFloorGrid && (
        <Grid
          args={[gridWidth, gridDepth]}
          sectionColor={gridConfig.color ?? "#999"}
          cellSize={1}
          sectionSize={0.5}
          cellColor="#ccc"
          fadeDistance={40}
          fadeStrength={1}
          position={[-offset + gridWidth / 2, 0, -offset + gridDepth / 2]}
        />
      )}

      {showVerticalGrids && (
        <>
          <Grid
            args={[gridWidth, gridHeight]}
            sectionColor={gridConfig.color ?? "#999"}
            cellSize={1}
            sectionSize={0.5}
            cellColor="#ccc"
            rotation={[Math.PI / 2, 0, 0]}
            position={[gridWidth / 2 - offset, gridHeight / 2, -offset]}
          />
          <Grid
            args={[gridHeight, gridDepth]}
            sectionColor={gridConfig.color ?? "#999"}
            cellSize={1}
            sectionSize={0.5}
            cellColor="#ccc"
            rotation={[0, Math.PI, Math.PI / 2]}
            position={[-offset, gridHeight / 2, -offset + gridDepth / 2]}
          />
        </>
      )}

      {/* Axis Labels */}
      {Object.entries(axisLabels).map(([axis, labelData]) => {
        const axisType = axis as "x" | "y" | "z"
        const basePosition: [number, number, number] = (() => {
          switch (axisType) {
            case "x":
              return [gridWidth + 20 - offset, 0, 0]
            case "y":
              return [-offset, gridHeight, 0]
            case "z":
              return [-offset, 0, gridDepth]
            default:
              return [0, 0, 0]
          }
        })()

        const label = normalizeLabel(labelData, basePosition)
        if (!label) return null

        const position = getLabelPosition(
          axisType,
          label.position,
          label.offset
        )

        return (
          <Text
            key={axis}
            position={position as [number, number, number]}
            rotation={getLabelRotation(axisType)}
            fontSize={0.75}
            fontWeight={700}
            color={label.color}
            anchorX={axis === "x" ? "right" : "left"}
            anchorY="middle"
          >
            {label.text}
          </Text>
        )
      })}

      {/* Chart-specific children */}
      {children}
    </Canvas>
  )
}
