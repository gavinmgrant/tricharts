import { FC, useMemo, useState } from "react"
import { Shared3DScene } from "@/components/Shared3DScene"
import { Tooltip } from "@/components/helpers/Tooltip"
import { TooltipContent } from "@/components/helpers/Tooltip/TooltipContent"
import { generateRandomColor } from "@/utils/colors"
import { Text } from "@react-three/drei"
import Bar from "./Bar"
import type { Bar3DChartProps } from "./types"

const COLOR_SCHEMES = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#8b5cf6",
  orange: "#f97316",
  rainbow: ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"],
}
const BAR_WIDTH = 1
const BAR_DEPTH = 1

export const Bar3DChart: FC<Bar3DChartProps> = ({
  data,
  barSpacing = 1,
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

    // Calculate position for tooltip (top of the bar)
    const xPos = xIndex * (BAR_WIDTH + barSpacing) + BAR_WIDTH / 2
    const yPos = value * scaleFactor + 0.5 // Position above the bar
    const zPos = zIndex * (BAR_DEPTH + barSpacing) + BAR_DEPTH / 2

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

  // Normalize data to always be 2D (handles both 1D and 2D input)
  const normalizedData = useMemo(() => {
    if (!Array.isArray(data)) return [[]]
    if (!Array.isArray(data[0])) return [data as number[]]
    return data as number[][]
  }, [data])

  // Generate colors for bars
  const barColors = useMemo(() => {
    // Special case for random colors - each bar gets a unique color
    if (colorScheme === "random") {
      return normalizedData.map((row) => row.map(() => generateRandomColor()))
    }

    const colorValue = colorScheme as keyof typeof COLOR_SCHEMES

    // Handle hex color string
    if (typeof colorScheme === "string" && colorScheme.startsWith("#")) {
      // Single color for all bars
      return normalizedData.map((row) => row.map(() => colorScheme))
    }

    // Handle named scheme
    if (COLOR_SCHEMES[colorValue]) {
      if (colorScheme === "random") {
        // This is now handled by the special case above
        return normalizedData.map((row) => row.map(() => generateRandomColor()))
      } else if (Array.isArray(COLOR_SCHEMES[colorValue])) {
        // Array of colors - one per row
        const schemeColors = COLOR_SCHEMES[colorValue]
        return normalizedData.map((row, rowIndex) => {
          const rowColor = schemeColors[rowIndex % schemeColors.length]
          return row.map(() => rowColor)
        })
      } else {
        // Single color from scheme
        return normalizedData.map((row) =>
          row.map(() => COLOR_SCHEMES[colorValue])
        )
      }
    }

    // Fallback to default blue
    return normalizedData.map((row) => row.map(() => COLOR_SCHEMES.blue))
  }, [normalizedData, colorScheme])

  // Calculate the scaling factor for heights
  const scaleFactor = useMemo(() => {
    const maxValue = Math.max(...normalizedData.flat())
    return maxValue > maxHeight ? maxHeight / maxValue : 1
  }, [normalizedData, maxHeight])

  // Calculate chart dimensions for camera positioning and grid sizing
  const chartDimensions = useMemo(() => {
    if (normalizedData.length === 0 || normalizedData[0].length === 0) {
      return { width: 0, height: 0, depth: 0 }
    }

    // Calculate the scaling factor first (moved up from below)
    const maxDataValue = Math.max(...normalizedData.flat())
    const scaleFactor = maxDataValue > maxHeight ? maxHeight / maxDataValue : 1

    // X-axis spans all columns + padding for labels
    const width =
      normalizedData[0].length * (BAR_WIDTH + barSpacing) + // Base width
      (xLabels ? BAR_WIDTH : 0) - // Extra space for labels if present
      barSpacing // Subtract trailing spacing

    // Y-axis is the scaled height of tallest bar + padding for tooltips
    const scaledMaxHeight = Math.min(maxDataValue * scaleFactor, maxHeight)
    const height =
      scaledMaxHeight + // Base height is the scaled max value
      1 // Extra space for tooltips and labels

    // Z-axis spans all rows + padding for labels
    const depth =
      normalizedData.length * (BAR_DEPTH + barSpacing) + // Base depth
      (zLabels ? BAR_DEPTH : 0) - // Extra space for labels if present
      barSpacing // Subtract trailing spacing

    return { width, height, depth }
  }, [
    normalizedData,
    BAR_WIDTH,
    BAR_DEPTH,
    barSpacing,
    maxHeight,
    xLabels,
    zLabels,
  ])

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
            barSpacing={barSpacing}
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

      {/* X-axis column labels */}
      {xLabels &&
        normalizedData[0].map((_, xIndex) => {
          if (!xLabels[xIndex]) return null

          const xPos = xIndex * (BAR_WIDTH + barSpacing)
          const endEdgePosition =
            normalizedData.length * (BAR_DEPTH + barSpacing) - barSpacing + BAR_DEPTH

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
