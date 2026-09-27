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

export type FrameLoop = "demand" | "always"

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

/** Rendering options shared by every chart. */
export type ChartRenderProps = {
  /**
   * `"demand"` (default): redraw only while something is changing (intro
   * animation, orbiting, hover). `"always"`: redraw every frame.
   * Rendering pauses entirely while the chart is scrolled off-screen.
   */
  frameloop?: FrameLoop
  /**
   * Device pixel ratio, or a `[min, max]` range clamped to the screen's.
   * Defaults to `[1, 1.5]`, which keeps high-DPI phones from rendering
   * at 3x.
   */
  dpr?: number | [number, number]
}

export type SceneProps = ChartControlsProps & ChartRenderProps & {
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
