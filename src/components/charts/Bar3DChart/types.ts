export type BarProps = {
  height: number
  originalValue: number
  xIndex: number
  zIndex: number
  barWidth: number
  barDepth: number
  barSpacing: number
  color: string
  showLabel?: boolean
  onClick?: (value: number) => void
  showEdges?: boolean
  edgeColor?: string
  edgeThickness?: number
}

export type BarChartData = number[][] | number[]

export type Bar3DChartProps = {
  data: BarChartData
  /** Spacing between bar footprints on the X and Z axes. */
  gridSpacing?: number
  /** @deprecated Use `gridSpacing` instead. */
  barSpacing?: number
  colorScheme?: string | string[] | string[][]
  showGrid?: boolean
  showLabels?: boolean
  xLabel?: string
  yLabel?: string
  zLabel?: string
  xLabels?: string[]
  zLabels?: string[]
  maxHeight?: number
  onBarClick?: (data: {
    value: number
    xIndex: number
    zIndex: number
    xLabel?: string
    zLabel?: string
  }) => void
}