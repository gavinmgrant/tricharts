import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import type { CameraBridge } from "./cameraBridge"
import type { ControlsPosition, ScrollZoom, TouchRotate } from "./types"

const HINT_DURATION_MS = 4000
const SCROLL_NOTICE_DURATION_MS = 1500

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

// Themeable through the --tricharts-controls-* custom properties.
// With two-finger touch rotation, `touch-action: pan-x pan-y` lets the browser
// scroll the page on one-finger swipes; it overrides the `none` the orbit
// controls set inline (and applies to every descendant, since touch-action
// is intersected down the tree).
const STYLES = `
.tricharts-frame{position:relative;width:100%;height:100%}
.tricharts-frame[data-touch-rotate="two-finger"] *{touch-action:pan-x pan-y!important}
.tricharts-toolbar{position:absolute;z-index:1;display:flex;gap:6px}
.tricharts-toolbar[data-position="top-left"]{top:12px;left:12px}
.tricharts-toolbar[data-position="top-right"]{top:12px;right:12px}
.tricharts-toolbar[data-position="bottom-left"]{bottom:12px;left:12px}
.tricharts-toolbar[data-position="bottom-right"]{bottom:12px;right:12px}
.tricharts-group{display:flex;overflow:hidden;border-radius:8px;background:var(--tricharts-controls-bg,rgba(255,255,255,.92));border:1px solid var(--tricharts-controls-border,rgba(0,0,0,.12));box-shadow:0 1px 2px rgba(0,0,0,.08)}
.tricharts-button{all:unset;box-sizing:border-box;display:grid;place-items:center;width:32px;height:32px;color:var(--tricharts-controls-color,#374151);cursor:pointer}
.tricharts-button+.tricharts-button{border-left:1px solid var(--tricharts-controls-border,rgba(0,0,0,.12))}
.tricharts-button:hover:not(:disabled){background:var(--tricharts-controls-hover,rgba(0,0,0,.06))}
.tricharts-button:focus-visible{outline:2px solid var(--tricharts-controls-focus,#2563eb);outline-offset:-2px}
.tricharts-button:disabled{opacity:.35;cursor:default}
@media (pointer:coarse){.tricharts-button{width:40px;height:40px}}
.tricharts-notice{position:absolute;left:50%;top:50%;z-index:1;transform:translate(-50%,-50%);max-width:calc(100% - 32px);box-sizing:border-box;padding:8px 14px;border-radius:16px;background:rgba(17,24,39,.82);color:#fff;font:500 13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s}
.tricharts-notice[data-visible="true"]{opacity:1}
@media (prefers-reduced-motion:reduce){.tricharts-notice{transition:none}}
`

// 16px line icons (paths from Lucide, ISC licensed).
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const ControlButton: React.FC<{
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}> = ({ label, disabled, onClick, children }) => (
  <button
    type="button"
    className="tricharts-button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
)

type Notice = { text: string; kind: "hint" | "scroll" | "touch" }

/**
 * DOM layer around the chart canvas: the on-screen camera toolbar, a one-time
 * gesture hint, and letting plain scrolling (`scrollZoom="modifier"`) and
 * one-finger swipes (`touchRotate="two-finger"`) scroll the page instead of
 * moving the chart.
 */
export const ChartFrame: React.FC<{
  bridge: CameraBridge
  showControls: boolean
  controlsPosition: ControlsPosition
  scrollZoom: ScrollZoom
  touchRotate: TouchRotate
  children: React.ReactNode
}> = ({
  bridge,
  showControls,
  controlsPosition,
  scrollZoom,
  touchRotate,
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const view = useSyncExternalStore(
    bridge.subscribe,
    bridge.getState,
    bridge.getState
  )

  const [notice, setNotice] = useState<Notice | null>(null)
  const [noticeVisible, setNoticeVisible] = useState(false)
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hintShown = useRef(false)
  // Kind of the notice on screen, if any; read by event handlers.
  const visibleKind = useRef<Notice["kind"] | null>(null)

  const hideNotice = useCallback(() => {
    clearTimeout(noticeTimer.current)
    visibleKind.current = null
    setNoticeVisible(false)
  }, [])

  const showNotice = useCallback(
    (next: Notice, duration: number) => {
      clearTimeout(noticeTimer.current)
      visibleKind.current = next.kind
      setNotice(next)
      setNoticeVisible(true)
      noticeTimer.current = setTimeout(hideNotice, duration)
    },
    [hideNotice]
  )

  const dismissNotice = useCallback(
    (kind?: Notice["kind"]) => {
      if (visibleKind.current && (!kind || visibleKind.current === kind)) {
        hideNotice()
      }
    },
    [hideNotice]
  )

  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const modifier = isMac() ? "⌘" : "Ctrl"

    // Capture phase on the frame runs before the controls' own wheel listener,
    // so stopping propagation keeps the chart from zooming while the page
    // scrolls as usual. Trackpad pinch arrives with ctrlKey set, so it zooms.
    const onWheel = (event: WheelEvent) => {
      if (scrollZoom === "always" || event.ctrlKey || event.metaKey) {
        dismissNotice()
        return
      }
      event.stopPropagation()
      showNotice(
        { text: `Use ${modifier} + scroll to zoom`, kind: "scroll" },
        SCROLL_NOTICE_DURATION_MS
      )
    }

    const onPointerEnter = (event: PointerEvent) => {
      if (hintShown.current) return
      hintShown.current = true
      const zoom = scrollZoom === "always" ? "Scroll" : `${modifier} + scroll`
      const touchText =
        touchRotate === "two-finger"
          ? "Two fingers to rotate · Pinch to zoom"
          : "Drag to rotate · Pinch to zoom · Two fingers to pan"
      const text =
        event.pointerType === "touch"
          ? touchText
          : `Drag to rotate · ${zoom} to zoom · Right-drag to pan`
      showNotice({ text, kind: "hint" }, HINT_DURATION_MS)
    }

    // A touch both shows the hint and starts a drag, so only mouse and pen
    // interactions dismiss it early; on touch it times out.
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") dismissNotice("hint")
    }

    // One finger scrolls the page (touch-action allows it); a second finger
    // cancels the scroll so the controls get the rotate/pinch. The browser
    // only honours this before a scroll has started, which is fine since
    // both fingers normally land together.
    const onTouchMove = (event: TouchEvent) => {
      if (touchRotate !== "two-finger") return
      if (event.touches.length > 1) {
        if (event.cancelable) event.preventDefault()
        dismissNotice("touch")
        return
      }
      showNotice(
        { text: "Use two fingers to rotate", kind: "touch" },
        SCROLL_NOTICE_DURATION_MS
      )
    }

    frame.addEventListener("wheel", onWheel, { capture: true, passive: true })
    frame.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: false,
    })
    frame.addEventListener("pointerenter", onPointerEnter)
    frame.addEventListener("pointerdown", onPointerDown, { capture: true })
    return () => {
      frame.removeEventListener("wheel", onWheel, { capture: true })
      frame.removeEventListener("touchmove", onTouchMove, { capture: true })
      frame.removeEventListener("pointerenter", onPointerEnter)
      frame.removeEventListener("pointerdown", onPointerDown, { capture: true })
    }
  }, [scrollZoom, touchRotate, showNotice, dismissNotice])

  const api = () => bridge.api

  return (
    <div
      ref={frameRef}
      className="tricharts-frame"
      data-touch-rotate={touchRotate}
    >
      <style>{STYLES}</style>
      {children}

      {showControls && (
        <div
          className="tricharts-toolbar"
          data-position={controlsPosition}
          role="toolbar"
          aria-label="Chart view controls"
        >
          <div className="tricharts-group">
            <ControlButton
              label="Rotate left"
              disabled={!view.canRotateLeft}
              onClick={() => api()?.rotateLeft()}
            >
              <Icon>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </Icon>
            </ControlButton>
            <ControlButton
              label="Rotate right"
              disabled={!view.canRotateRight}
              onClick={() => api()?.rotateRight()}
            >
              <Icon>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </Icon>
            </ControlButton>
          </div>
          <div className="tricharts-group">
            <ControlButton
              label="Zoom out"
              disabled={!view.canZoomOut}
              onClick={() => api()?.zoomOut()}
            >
              <Icon>
                <path d="M5 12h14" />
              </Icon>
            </ControlButton>
            <ControlButton
              label="Zoom in"
              disabled={!view.canZoomIn}
              onClick={() => api()?.zoomIn()}
            >
              <Icon>
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </Icon>
            </ControlButton>
          </div>
          <div className="tricharts-group">
            <ControlButton
              label="Reset view"
              disabled={!view.canReset}
              onClick={() => api()?.reset()}
            >
              <Icon>
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              </Icon>
            </ControlButton>
          </div>
        </div>
      )}

      <div
        className="tricharts-notice"
        data-visible={noticeVisible && !!notice}
        role="status"
        aria-live="polite"
      >
        {notice?.text}
      </div>
    </div>
  )
}
