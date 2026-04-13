import { FC, useEffect, useMemo, useState } from "react"
import { Shared3DScene } from "@/components/Shared3DScene"
import {
  BAR_DEPTH,
  BAR_WIDTH,
  barCellCenterXZ,
  computeBarColors,
  computeChartDimensions,
  computeScaleFactor,
  normalizeBarChartData,
} from "@/components/charts/shared/grid3DChartLayout"
import {
  resolveGridSpacing,
  warnDeprecatedBarSpacingOnce,
} from "@/components/charts/shared/resolveGridSpacing"
import { Tooltip } from "@/components/helpers/Tooltip"
import { TooltipContent } from "@/components/helpers/Tooltip/TooltipContent"
import { Text } from "@react-three/drei"
import Bar from "./Bar"
import type { Bar3DChartProps } from "./types"

export const Bar3DChart: FC<Bar3DChartProps> = ({
  data,
  gridSpacing,
  barSpacing,
  colorScheme = "blue",
  showGrid = true,
  showLabels = true,
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

  const handleBarClick = (value: number, xIndex: number, zIndex: number) => {
    const xBarLabel = xLabels ? xLabels[xIndex] : ""
    const zBarLabel = zLabels ? zLabels[zIndex] : ""

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
          xLabel={xBarLabel}
          yLabel={yLabel}
          zLabel={zBarLabel}
        />
      ),
    })

    if (onBarClick) {
      onBarClick({
        value,
        xIndex,
        zIndex,
        xLabel: xLabels?.[xIndex],
        zLabel: zLabels?.[zIndex],
      })
    }
  }

  const closeTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const normalizedData = useMemo(() => normalizeBarChartData(data), [data])

  const barColors = useMemo(
    () => computeBarColors(normalizedData, colorScheme),
    [normalizedData, colorScheme]
  )

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

  return (
    <Shared3DScene
      chartDimensions={chartDimensions}
      showVerticalGrids={showGrid}
      showFloorGrid={showGrid}
      cameraTarget={centerPoint}
      autoPosition={true}
      axisLabels={axisLabels}
    >
      {normalizedData.map((row, zIndex) =>
        // For each row (z-axis)
        row.map((value, xIndex) => (
          // For each column (x-axis)
          <Bar
            key={`${zIndex}-${xIndex}`}
            height={value * scaleFactor}
            originalValue={value}
            xIndex={xIndex}
            zIndex={zIndex}
            barWidth={BAR_WIDTH}
            barDepth={BAR_DEPTH}
            barSpacing={spacing}
            color={barColors[zIndex][xIndex]}
            showLabel={showLabels}
            onClick={(value) => handleBarClick(value, xIndex, zIndex)}
          />
        ))
      )}

      <Tooltip
        visible={tooltip.visible}
        content={tooltip.content}
        position={tooltip.position}
        onClose={closeTooltip}
      />

      {/* Z-axis row labels */}
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

      {/* X-axis column labels */}
      {xLabels &&
        normalizedData[0].map((_, xIndex) => {
          if (!xLabels[xIndex]) return null

          const xPos = xIndex * (BAR_WIDTH + spacing)
          const endEdgePosition =
            normalizedData.length * (BAR_DEPTH + spacing) - spacing + BAR_DEPTH

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
