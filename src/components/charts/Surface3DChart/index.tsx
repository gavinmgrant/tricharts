import { FC, useMemo, useState } from "react"
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
import { Shared3DScene } from "@/components/Shared3DScene"
import { Tooltip } from "@/components/helpers/Tooltip"
import { TooltipContent } from "@/components/helpers/Tooltip/TooltipContent"
import { Text } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { nearestBarCellFromWorldXZ } from "./nearestCell"
import { SurfaceMesh } from "./SurfaceMesh"
import type { Surface3DChartProps } from "./types"

export const Surface3DChart: FC<Surface3DChartProps> = ({
  data,
  barSpacing = 1,
  colorScheme = "blue",
  showGrid = true,
  showWireframe = false,
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
        barSpacing,
        maxHeight,
        xLabels,
        zLabels,
      }),
    [normalizedData, barSpacing, maxHeight, xLabels, zLabels]
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

  const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!surfaceGridOk) return

    const p = e.point
    const { xIndex, zIndex } = nearestBarCellFromWorldXZ(
      p.x,
      p.z,
      rows,
      cols,
      BAR_WIDTH,
      BAR_DEPTH,
      barSpacing
    )
    const value = normalizedData[zIndex][xIndex]

    const [xPos, zPos] = barCellCenterXZ(
      xIndex,
      zIndex,
      BAR_WIDTH,
      BAR_DEPTH,
      barSpacing
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
  }

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
          barSpacing={barSpacing}
          colorStops={surfaceColorStops}
          highlightColor={surfaceHighlightColor}
          showWireframe={showWireframe}
          showSurfacePoints={showSurfacePoints}
          surfacePointColor={surfacePointColor}
          surfacePointRadius={surfacePointRadius}
          onClick={handleSurfaceClick}
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
            normalizedData[0].length * (BAR_WIDTH + barSpacing)
          const zPos = zIndex * (BAR_DEPTH + barSpacing) + BAR_DEPTH / 2

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

          const xPos = xIndex * (BAR_WIDTH + barSpacing)
          const endEdgePosition =
            normalizedData.length * (BAR_DEPTH + barSpacing) -
            barSpacing +
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
