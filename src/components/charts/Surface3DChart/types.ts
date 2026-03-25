import type { BarChartData } from "@/components/charts/Bar3DChart/types"

export type Surface3DChartProps = {
  /** Two-dimensional grid of values. Requires at least 2×2 points (each axis ≥ 2). */
  data: BarChartData
  barSpacing?: number
  colorScheme?: string | string[] | string[][]
  showGrid?: boolean
  showWireframe?: boolean
  /** When true (default), small spheres mark each grid vertex on the surface */
  showSurfacePoints?: boolean
  /** Optional sphere color override. When omitted, points use the surface gradient. */
  surfacePointColor?: string
  /** Sphere radius in world units (default scales with bar width/depth). */
  surfacePointRadius?: number
  xLabel?: string
  xLabels?: string[]
  yLabel?: string
  zLabel?: string
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
