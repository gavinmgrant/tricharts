import React, { useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid } from "@react-three/drei"
import * as THREE from "three"
import { normalizeLabel } from "@/utils/labels"
import { useChartCamera } from "@/hooks/useChartCamera"
import { CameraFit, SceneLabel } from "./CameraFit"
import { CameraBridge } from "./cameraBridge"
import { ChartFrame } from "./ChartFrame"
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
  showControls = true,
  controlsPosition = "bottom-right",
  scrollZoom = "modifier",
}) => {
  const bridge = useMemo(() => new CameraBridge(), [])
  const cameraFitEnabled = autoPosition && !!chartDimensions

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

  // Everything inside the grid walls; labels are added by CameraFit itself.
  const fitBounds = useMemo(
    () => ({
      min: new THREE.Vector3(-offset, 0, -offset),
      max: new THREE.Vector3(
        gridWidth - offset,
        gridHeight,
        gridDepth - offset
      ),
    }),
    [gridWidth, gridHeight, gridDepth, offset]
  )

  // Keep the existing viewing angle; CameraFit only solves for distance/centre.
  const [cx, cy, cz] = calculatedCameraPosition
  const [tx, ty, tz] = calculatedCameraTarget
  const fitDirection = useMemo(
    () => new THREE.Vector3(tx - cx, ty - cy, tz - cz).normalize(),
    [cx, cy, cz, tx, ty, tz]
  )

  const fitContentKey = JSON.stringify([
    gridWidth,
    gridHeight,
    gridDepth,
    axisLabels,
  ])

  // Calculate label positions based on chart dimensions and grid size
  const getLabelPosition = (
    axisType: "x" | "y" | "z",
    basePos: [number, number, number],
    labelOffset: number
  ) => {
    if (autoPosition && chartDimensions) {
      const { width, height, depth } = chartDimensions

      switch (axisType) {
        case "x":
          return [basePos[1] - 1.5, basePos[1], depth]
        case "y": {
          // Beside the left wall's front vertical edge, nudged toward screen-left.
          const nudge = labelOffset / Math.SQRT2
          return [-offset - nudge, height / 2, depth - offset + nudge]
        }
        case "z":
          return [width, basePos[1], basePos[1] - 1.5]
        default:
          return basePos
      }
    }

    return [
      basePos[0] + (axisType === "z" ? labelOffset : 0),
      basePos[1] + (axisType === "y" ? labelOffset : 0),
      basePos[2] + (axisType === "x" ? labelOffset : 0),
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
        // Reads bottom-to-top, turned to face the default 45° camera.
        return [0, Math.PI / 4, Math.PI / 2]
      case "z":
        return [-Math.PI / 2, 0, Math.PI / 2]
      default:
        return [0, 0, 0]
    }
  }

  return (
    <ChartFrame
      bridge={bridge}
      // The buttons drive CameraFit, so they need it running.
      showControls={showControls && cameraFitEnabled}
      controlsPosition={controlsPosition}
      scrollZoom={scrollZoom}
    >
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
        <OrbitControls
          makeDefault
          // With autoPosition, CameraFit owns the target and distance limits.
          {...(!autoPosition && { target: cameraTarget, maxDistance: 200 })}
          // Between near-overhead and a view where floor labels stay readable.
          minPolarAngle={Math.PI / 18}
          maxPolarAngle={(5 * Math.PI) / 12}
          // Keep the grid walls behind the chart.
          minAzimuthAngle={0}
          maxAzimuthAngle={Math.PI / 2}
          rotateSpeed={0.6}
          enableDamping
          dampingFactor={0.08}
          screenSpacePanning
          zoomToCursor
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

        <MaybeCameraFit
          enabled={cameraFitEnabled}
          bridge={bridge}
          bounds={fitBounds}
          direction={fitDirection}
          contentKey={fitContentKey}
        >
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
              <SceneLabel
                key={axis}
                position={position as [number, number, number]}
                rotation={getLabelRotation(axisType)}
                fontSize={0.75}
                fontWeight={700}
                color={label.color}
                anchorX={
                  axis === "x" ? "right" : axis === "y" ? "center" : "left"
                }
                anchorY="middle"
              >
                {label.text}
              </SceneLabel>
            )
          })}

          {/* Chart-specific children */}
          {children}
        </MaybeCameraFit>
      </Canvas>
    </ChartFrame>
  )
}

const MaybeCameraFit: React.FC<
  React.ComponentProps<typeof CameraFit> & { enabled: boolean }
> = ({ enabled, children, ...props }) =>
  enabled ? <CameraFit {...props}>{children}</CameraFit> : <>{children}</>
