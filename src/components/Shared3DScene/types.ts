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

export type ControlsPosition =
  "top-left" | "top-right" | "bottom-left" | "bottom-right"

export type ScrollZoom = "modifier" | "always"

export type TouchRotate = "two-finger" | "one-finger"

/** Interaction options shared by every chart. */
export type ChartControlsProps = {
  /** Show the on-screen rotate, zoom and reset buttons. Defaults to `true`. */
  showControls?: boolean
  /** Corner for the on-screen controls. Defaults to `"bottom-right"`. */
  controlsPosition?: ControlsPosition
  /**
   * `"modifier"` (default): plain scrolling scrolls the page and ⌘/Ctrl +
   * scroll or pinch zooms. `"always"`: scrolling over the chart zooms it.
   */
  scrollZoom?: ScrollZoom
  /**
   * `"two-finger"` (default): one-finger swipes scroll the page; two fingers
   * rotate and pinch to zoom. `"one-finger"`: one finger rotates the chart.
   */
  touchRotate?: TouchRotate
}

export type SceneProps = ChartControlsProps & {
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
