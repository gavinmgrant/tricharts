/** Camera actions the on-screen controls can trigger (set by CameraFit). */
export type CameraControlsApi = {
  rotateLeft: () => void
  rotateRight: () => void
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

/** Which controls currently have room to act, for enabling/disabling buttons. */
export type ViewState = {
  canRotateLeft: boolean
  canRotateRight: boolean
  canZoomIn: boolean
  canZoomOut: boolean
  canReset: boolean
}

const INITIAL_VIEW_STATE: ViewState = {
  canRotateLeft: true,
  canRotateRight: true,
  canZoomIn: true,
  canZoomOut: false,
  canReset: false,
}

/**
 * Connects the DOM overlay (outside the R3F canvas) with CameraFit (inside it)
 * without re-rendering the scene: CameraFit publishes view state every frame,
 * but subscribers are only notified when a value actually changes.
 */
export class CameraBridge {
  api: CameraControlsApi | null = null
  private state = INITIAL_VIEW_STATE
  private listeners = new Set<() => void>()

  getState = () => this.state

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setState(next: ViewState) {
    const prev = this.state
    if (
      prev.canRotateLeft === next.canRotateLeft &&
      prev.canRotateRight === next.canRotateRight &&
      prev.canZoomIn === next.canZoomIn &&
      prev.canZoomOut === next.canZoomOut &&
      prev.canReset === next.canReset
    ) {
      return
    }
    this.state = next
    this.listeners.forEach((listener) => listener())
  }
}
