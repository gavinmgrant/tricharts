export type AxisLabel = {
  text: string
  color?: string
  fontFamily?: string
  fontSize?: number
  position?: [number, number, number]
  offset?: number
}

export type AxisLabels = {
  x?: string | AxisLabel
  y?: string | AxisLabel
  z?: string | AxisLabel
}

export type GridConfig = {
  size?: number
  color?: string
  offset?: number
}

export type SceneProps = {
  axisLabels?: AxisLabels
  showFloorGrid?: boolean
  showVerticalGrids?: boolean
  gridConfig?: GridConfig
  cameraPosition?: [number, number, number]
  cameraTarget?: [number, number, number]
  backgroundColor?: string
  children?: React.ReactNode
  chartDimensions?: {
    width: number
    height: number
    depth: number
  }
  autoPosition?: boolean
}
