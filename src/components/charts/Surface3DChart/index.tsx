import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  BAR_DEPTH,
  BAR_WIDTH,
  barCellCenterXZ,
  computeChartDimensions,
  computeScaleFactor,
  hasMinimumSurfaceGrid,
  normalizeSurfaceChartData,
  resolveSurfaceGradientPalette,
} from "@/components/charts/shared/grid3DChartLayout"
import {
  resolveGridSpacing,
  warnDeprecatedBarSpacingOnce,
} from "@/components/charts/shared/resolveGridSpacing"
import { Shared3DScene } from "@/components/Shared3DScene"
import { Tooltip } from "@/components/helpers/Tooltip"
import { TooltipContent } from "@/components/helpers/Tooltip/TooltipContent"
import { Text } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { surfaceInstanceIdToCell } from "./surfaceCellIndex"
import { SurfaceMesh } from "./SurfaceMesh"
import type { Surface3DChartProps } from "./types"

export const Surface3DChart: FC<Surface3DChartProps> = ({
  data,
  gridSpacing,
  barSpacing,
  colorScheme = "blue",
  showGrid = true,
  showWireframe = false,
  showLabels = true,
  showSurfacePoints = true,
  surfacePointColor,
  surfacePointRadius,
  xLabel,
  xLabels,
  yLabel,
  zLabel,
  zLabels,
  maxHeight = 10,
  onBarClick,
}) => {
  const spacing = resolveGridSpacing(gridSpacing, barSpacing, 1)

  useEffect(() => {
    if (barSpacing !== undefined && gridSpacing === undefined) {
      warnDeprecatedBarSpacingOnce()
    }
  }, [barSpacing, gridSpacing])
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    position: [number, number, number]
    content: React.ReactNode
  }>({
    visible: false,
    position: [0, 0, 0],
    content: null,
  })

  const normalizedData = useMemo(() => normalizeSurfaceChartData(data), [data])

  const surfaceColorStops = useMemo(
    () => resolveSurfaceGradientPalette(colorScheme),
    [colorScheme]
  )

  const surfaceHighlightColor = surfaceColorStops[surfaceColorStops.length - 1]

  const scaleFactor = useMemo(
    () => computeScaleFactor(normalizedData, maxHeight),
    [normalizedData, maxHeight]
  )

  const chartDimensions = useMemo(
    () =>
      computeChartDimensions({
        normalizedData,
        barWidth: BAR_WIDTH,
        barDepth: BAR_DEPTH,
        barSpacing: spacing,
        maxHeight,
        xLabels,
        zLabels,
      }),
    [normalizedData, spacing, maxHeight, xLabels, zLabels]
  )

  const centerPoint = useMemo(() => {
    const { width, height, depth } = chartDimensions
    return [width / 2, height / 2, depth / 2] as [number, number, number]
  }, [chartDimensions])

  const axisLabels = useMemo(
    () => ({
      x: xLabel,
      y: yLabel,
      z: zLabel,
    }),
    [xLabel, yLabel, zLabel]
  )

  const rows = normalizedData.length
  const cols = rows > 0 ? normalizedData[0].length : 0
  const surfaceGridOk = hasMinimumSurfaceGrid(normalizedData)

  const openDisplayForCell = useCallback(
    (xIndex: number, zIndex: number) => {
      const value = normalizedData[zIndex][xIndex]

      const [xPos, zPos] = barCellCenterXZ(
        xIndex,
        zIndex,
        BAR_WIDTH,
        BAR_DEPTH,
        spacing
      )
      const yPos = value * scaleFactor + 0.5

      setTooltip({
        visible: true,
        position: [xPos, yPos, zPos],
        content: (
          <TooltipContent
            value={value}
            xLabel={xLabels?.[xIndex] ?? ""}
            yLabel={yLabel}
            zLabel={zLabels?.[zIndex] ?? ""}
          />
        ),
      })

      onBarClick?.({
        value,
        xIndex,
        zIndex,
        xLabel: xLabels?.[xIndex],
        zLabel: zLabels?.[zIndex],
      })
    },
    [
      normalizedData,
      onBarClick,
      scaleFactor,
      xLabels,
      yLabel,
      zLabels,
      spacing,
    ]
  )

  const handleSurfacePointClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!surfaceGridOk) return
      const id = e.instanceId
      if (id === undefined) return
      const cell = surfaceInstanceIdToCell(id, rows, cols)
      if (!cell) return
      openDisplayForCell(cell.xIndex, cell.zIndex)
    },
    [cols, openDisplayForCell, rows, surfaceGridOk]
  )

  const closeTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  return (
    <Shared3DScene
      chartDimensions={chartDimensions}
      showVerticalGrids={showGrid}
      showFloorGrid={showGrid}
      cameraTarget={centerPoint}
      autoPosition={true}
      axisLabels={axisLabels}
    >
      {surfaceGridOk && (
        <SurfaceMesh
          normalizedData={normalizedData}
          scaleFactor={scaleFactor}
          barWidth={BAR_WIDTH}
          barDepth={BAR_DEPTH}
          barSpacing={spacing}
          colorStops={surfaceColorStops}
          highlightColor={surfaceHighlightColor}
          showWireframe={showWireframe}
          showLabels={showLabels}
          showSurfacePoints={showSurfacePoints}
          surfacePointColor={surfacePointColor}
          surfacePointRadius={surfacePointRadius}
          onSurfacePointClick={handleSurfacePointClick}
        />
      )}

      <Tooltip
        visible={tooltip.visible}
        content={tooltip.content}
        position={tooltip.position}
        onClose={closeTooltip}
      />

      {zLabels &&
        normalizedData.map((_, zIndex) => {
          if (!zLabels[zIndex]) return null

          const rightEdgePosition =
            normalizedData[0].length * (BAR_WIDTH + spacing)
          const zPos = zIndex * (BAR_DEPTH + spacing) + BAR_DEPTH / 2

          return (
            <Text
              key={`z-label-${zIndex}`}
              position={[rightEdgePosition, 0, zPos - BAR_DEPTH / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={BAR_DEPTH / 2}
              fontWeight={700}
              color="black"
              anchorX="left"
              anchorY="middle"
            >
              {zLabels[zIndex]}
            </Text>
          )
        })}

      {xLabels &&
        normalizedData[0]?.map((_, xIndex) => {
          if (!xLabels[xIndex]) return null

          const xPos = xIndex * (BAR_WIDTH + spacing)
          const endEdgePosition =
            normalizedData.length * (BAR_DEPTH + spacing) -
            spacing +
            BAR_DEPTH

          return (
            <Text
              key={`x-label-${xIndex}`}
              position={[xPos, 0, endEdgePosition]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              fontSize={BAR_WIDTH / 2}
              fontWeight={700}
              color="black"
              anchorX="right"
              anchorY="middle"
            >
              {xLabels[xIndex]}
            </Text>
          )
        })}
    </Shared3DScene>
  )
}
