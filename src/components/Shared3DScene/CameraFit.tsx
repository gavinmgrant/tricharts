import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import { boxCorners, computeFitView, computeMaxDistance } from "./fitView"
import type { CameraBridge } from "./cameraBridge"

type TroikaText = THREE.Mesh & {
  textRenderInfo?: { blockBounds: [number, number, number, number] }
}

type FitRegistry = {
  register: (mesh: TroikaText) => () => void
  invalidate: () => void
}

const FitContext = createContext<FitRegistry | null>(null)

// Labels that haven't synced after this long are ignored so a slow font load
// doesn't hold the camera in its unfitted position.
const LABEL_SYNC_TIMEOUT_MS = 1000

// Closest zoom, as a fraction of the zoom-out limit.
const MIN_DISTANCE_RATIO = 0.2

const RESET_DURATION_MS = 600
const STEP_DURATION_MS = 300

// One press of a rotate or zoom button.
const ROTATE_STEP = Math.PI / 12
const ZOOM_STEP = 0.8

// Matches the controls' azimuth limits.
const MIN_AZIMUTH = 0
const MAX_AZIMUTH = Math.PI / 2

// Tolerance for "already at the limit" when enabling buttons.
const LIMIT_EPSILON = 1e-3

type ControlsLike = THREE.EventDispatcher<any> & {
  target: THREE.Vector3
  minDistance: number
  maxDistance: number
  update: () => void
}

type CameraAnimation = {
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toPosition: THREE.Vector3
  toTarget: THREE.Vector3
  startedAt: number
  duration: number
  // Ends on the fitted view, so auto-refitting resumes afterwards.
  endsFitted: boolean
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

// Parametric range [enter, exit] where origin + dir * t is inside the box;
// enter > exit means the ray misses it.
function raySlab(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  box: THREE.Box3
): [number, number] {
  let enter = -Infinity
  let exit = Infinity
  for (const axis of ["x", "y", "z"] as const) {
    const o = origin[axis]
    const d = dir[axis]
    const lo = box.min[axis]
    const hi = box.max[axis]
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return [1, 0]
      continue
    }
    const t1 = (lo - o) / d
    const t2 = (hi - o) / d
    enter = Math.max(enter, Math.min(t1, t2))
    exit = Math.min(exit, Math.max(t1, t2))
  }
  return [enter, exit]
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * Frames the camera on the chart box plus every registered label and keeps
 * the controls within useful limits:
 * - refits on resize and content changes until the user takes over
 * - zoom-out stops where the whole chart just fits from the current angle
 * - the orbit target (and so panning) stays inside the chart box
 * - double-click eases back to the fitted view
 * - exposes rotate/zoom/reset actions and their limits through `bridge`
 */
export const CameraFit: React.FC<{
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  direction: THREE.Vector3
  contentKey: string
  bridge?: CameraBridge
  children?: React.ReactNode
}> = ({ bounds, direction, contentKey, bridge, children }) => {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null

  const labels = useRef(new Set<TroikaText>())
  const fitPoints = useRef<THREE.Vector3[]>([])
  // Chart box grown to include the fitted target, which can sit just outside
  // the box when labels are lopsided.
  const panBounds = useRef(new THREE.Box3())
  const dirty = useRef(true)
  const userInteracted = useRef(false)
  const animation = useRef<CameraAnimation | null>(null)
  const lastDistance = useRef(0)
  const mountedAt = useRef(performance.now())

  const registry = useMemo<FitRegistry>(
    () => ({
      register: (mesh) => {
        labels.current.add(mesh)
        dirty.current = true
        return () => {
          labels.current.delete(mesh)
          dirty.current = true
        }
      },
      invalidate: () => {
        dirty.current = true
      },
    }),
    []
  )

  // New content gets a fresh fit, even if the user moved the camera before.
  useEffect(() => {
    userInteracted.current = false
    dirty.current = true
  }, [contentKey])

  useEffect(() => {
    dirty.current = true
  }, [size.width, size.height, bounds, direction])

  useEffect(() => {
    if (!controls) return
    const onStart = () => {
      userInteracted.current = true
      animation.current = null
    }
    controls.addEventListener("start", onStart)
    return () => controls.removeEventListener("start", onStart)
  }, [controls])

  const computeFit = useCallback(
    (viewDirection: THREE.Vector3 = direction) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return null
      return computeFitView({
        points: fitPoints.current,
        direction: viewDirection,
        up: camera.up,
        fovY: camera.fov,
        aspect: size.width / size.height,
        pivot: bounds.min.clone().add(bounds.max).multiplyScalar(0.5),
      })
    },
    [camera, direction, size.width, size.height, bounds]
  )

  const maxDistanceFor = (
    target: THREE.Vector3,
    viewDirection: THREE.Vector3
  ) =>
    computeMaxDistance({
      points: fitPoints.current,
      target,
      direction: viewDirection,
      up: camera.up,
      fovY: (camera as THREE.PerspectiveCamera).fov,
      aspect: size.width / size.height,
    })

  // Where the camera is headed: the end of a running animation, so repeated
  // button presses accumulate instead of restarting from mid-flight.
  const goal = () =>
    animation.current
      ? {
          position: animation.current.toPosition.clone(),
          target: animation.current.toTarget.clone(),
        }
      : {
          position: camera.position.clone(),
          target: controls!.target.clone(),
        }

  const animateTo = (
    toPosition: THREE.Vector3,
    toTarget: THREE.Vector3,
    duration: number,
    endsFitted = false
  ) => {
    if (!controls) return
    if (!endsFitted) userInteracted.current = true
    animation.current = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition,
      toTarget,
      startedAt: performance.now(),
      duration: prefersReducedMotion() ? 0 : duration,
      endsFitted,
    }
  }

  const resetView = () => {
    const fit = computeFit()
    if (fit) animateTo(fit.position, fit.target, RESET_DURATION_MS, true)
  }

  // Orbit around the target, clamped to the azimuth limits. The distance is
  // capped at the new angle's zoom-out limit so the controls don't snap
  // inward once the animation ends.
  const rotateBy = (angle: number) => {
    if (!controls || fitPoints.current.length === 0) return
    const { position, target } = goal()
    const spherical = new THREE.Spherical().setFromVector3(
      position.clone().sub(target)
    )
    const theta = THREE.MathUtils.clamp(
      spherical.theta + angle,
      MIN_AZIMUTH,
      MAX_AZIMUTH
    )
    if (Math.abs(theta - spherical.theta) < 1e-6) return
    spherical.theta = theta

    const offset = new THREE.Vector3().setFromSpherical(spherical)
    spherical.radius = Math.min(
      spherical.radius,
      maxDistanceFor(target, offset.clone().negate())
    )
    const toPosition = target.clone().add(offset.setFromSpherical(spherical))
    animateTo(toPosition, target, STEP_DURATION_MS)
  }

  // Zoom toward/away from the target. Zooming out eases back toward the
  // centred fit the same way wheel zoom does, landing on it at the limit.
  const zoomBy = (scale: number) => {
    if (!controls || fitPoints.current.length === 0) return
    const { position, target } = goal()
    const viewDirection = target.clone().sub(position)
    const distance = viewDirection.length()
    viewDirection.divideScalar(distance)
    const maxDistance = maxDistanceFor(target, viewDirection)

    if (scale < 1) {
      const next = Math.max(distance * scale, maxDistance * MIN_DISTANCE_RATIO)
      if (next >= distance - 1e-6) return
      const toPosition = target.clone().addScaledVector(viewDirection, -next)
      animateTo(toPosition, target, STEP_DURATION_MS)
      return
    }

    const fit = computeFit(viewDirection)
    if (!fit) return
    const next = distance * scale
    if (next >= maxDistance) {
      animateTo(fit.position, fit.target, STEP_DURATION_MS)
      return
    }
    const k = (next - distance) / (maxDistance - distance)
    const toTarget = target.clone().lerp(fit.target, k)
    const toPosition = toTarget
      .clone()
      .addScaledVector(
        viewDirection,
        -THREE.MathUtils.lerp(next, fit.distance, k)
      )
    animateTo(toPosition, toTarget, STEP_DURATION_MS)
  }

  // Refreshed every render so the actions always see current props.
  useEffect(() => {
    if (!bridge) return
    bridge.api = {
      // Same direction as dragging left/right.
      rotateLeft: () => rotateBy(ROTATE_STEP),
      rotateRight: () => rotateBy(-ROTATE_STEP),
      zoomIn: () => zoomBy(ZOOM_STEP),
      zoomOut: () => zoomBy(1 / ZOOM_STEP),
      reset: resetView,
    }
  })

  useEffect(() => {
    if (!bridge) return
    return () => {
      bridge.api = null
    }
  }, [bridge])

  useEffect(() => {
    const element = gl.domElement
    const onDoubleClick = () => resetView()
    element.addEventListener("dblclick", onDoubleClick)
    return () => element.removeEventListener("dblclick", onDoubleClick)
  })

  // Tell the on-screen controls which actions still have room to move,
  // measured at the goal so buttons update as soon as they're pressed.
  const publishViewState = () => {
    if (!bridge || !controls || fitPoints.current.length === 0) return
    const { position, target } = goal()
    const offset = position.clone().sub(target)
    const distance = offset.length()
    const theta = new THREE.Spherical().setFromVector3(offset).theta
    const viewDirection = offset.negate().divideScalar(distance)
    const maxDistance = maxDistanceFor(target, viewDirection)
    const fit = computeFit(viewDirection)
    const offCentre =
      !!fit && target.distanceTo(fit.target) > maxDistance * LIMIT_EPSILON

    bridge.setState({
      canRotateLeft: theta < MAX_AZIMUTH - LIMIT_EPSILON,
      canRotateRight: theta > MIN_AZIMUTH + LIMIT_EPSILON,
      canZoomIn:
        distance > maxDistance * MIN_DISTANCE_RATIO * (1 + LIMIT_EPSILON),
      canZoomOut: distance < maxDistance * (1 - LIMIT_EPSILON) || offCentre,
      canReset: userInteracted.current,
    })
  }

  // Chart box corners plus the rendered corners of every synced label.
  const collectPoints = () => {
    const points = boxCorners(bounds.min, bounds.max)
    let pending = false
    labels.current.forEach((mesh) => {
      const info = mesh.textRenderInfo
      if (!info) {
        pending = true
        return
      }
      const [x0, y0, x1, y1] = info.blockBounds
      mesh.updateWorldMatrix(true, false)
      for (const [x, y] of [
        [x0, y0],
        [x1, y0],
        [x0, y1],
        [x1, y1],
      ]) {
        points.push(new THREE.Vector3(x, y, 0).applyMatrix4(mesh.matrixWorld))
      }
    })
    return { points, pending }
  }

  // Zoom-to-cursor and panning move the target, so zooming out from there
  // would end off-centre. Ease the target and distance toward the centred fit
  // for the current angle in proportion to how much of the remaining zoom-out
  // range this step used, so fully zoomed out always lands on the fitted view.
  const recenterOnZoomOut = () => {
    if (!controls) return
    const distance = camera.position.distanceTo(controls.target)
    const previous = lastDistance.current
    if (!(distance > previous) || previous === 0) return

    const viewDirection = controls.target.clone().sub(camera.position)
    const fit = computeFit(viewDirection)
    if (!fit) return

    // Progress toward the zoom-out limit the controls are clamping to, so the
    // target and distance both arrive at the fitted view as zoom-out bottoms out.
    const remaining = controls.maxDistance - previous
    const k =
      remaining > 1e-6 ? Math.min((distance - previous) / remaining, 1) : 1
    const newDistance = THREE.MathUtils.lerp(distance, fit.distance, k)
    controls.target.lerp(fit.target, k)
    camera.position
      .copy(controls.target)
      .addScaledVector(viewDirection.normalize(), -newDistance)
  }

  // Keep panning on the chart by holding the orbit target inside the chart
  // box. Sliding it along the line of sight doesn't change the view, so try
  // that first; only once the centre of view has left the chart push back
  // sideways (within the screen plane, so the chart doesn't recede).
  const keepTargetOnChart = () => {
    if (!controls) return
    const box = panBounds.current
    if (box.containsPoint(controls.target)) return

    const origin = camera.position
    const dir = controls.target.clone().sub(origin)
    const distance = dir.length()
    dir.divideScalar(distance)

    const [enter, exit] = raySlab(origin, dir, box)
    if (enter <= exit && exit > 0) {
      // Not closer than minDistance, or the controls would push the camera back.
      const nearest = Math.min(Math.max(enter, controls.minDistance), exit)
      const t = THREE.MathUtils.clamp(distance, nearest, exit)
      controls.target.copy(origin).addScaledVector(dir, t)
      return
    }

    const push = box.clampPoint(controls.target, new THREE.Vector3())
    push.sub(controls.target)
    push.addScaledVector(dir, -push.dot(dir))
    controls.target.add(push)
    camera.position.add(push)
  }

  // Runs after the controls' own update (priority -1), so it has the last word.
  useFrame(() => {
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return

    if (dirty.current) {
      const { points, pending } = collectPoints()
      // Limits apply straight away, even before every label has synced.
      fitPoints.current = points
      const waiting =
        pending && performance.now() - mountedAt.current < LABEL_SYNC_TIMEOUT_MS
      if (!waiting) {
        dirty.current = false
        const fit = computeFit()
        panBounds.current.set(bounds.min, bounds.max)
        if (fit) panBounds.current.expandByPoint(fit.target)
        // After the user takes over, keep their view; the new points still
        // feed the zoom limit and pan bounds.
        if (fit && !userInteracted.current) {
          animation.current = null
          camera.position.copy(fit.position)
          controls.target.copy(fit.target)
          camera.far = Math.max(camera.far, fit.distance * 10)
          camera.updateProjectionMatrix()
        }
      }
    }

    if (animation.current) {
      const {
        fromPosition,
        fromTarget,
        toPosition,
        toTarget,
        startedAt,
        duration,
        endsFitted,
      } = animation.current
      const elapsed = performance.now() - startedAt
      const t = duration > 0 ? Math.min(elapsed / duration, 1) : 1
      const k = easeInOutCubic(t)
      camera.position.lerpVectors(fromPosition, toPosition, k)
      controls.target.lerpVectors(fromTarget, toTarget, k)
      camera.lookAt(controls.target)
      if (t === 1) {
        animation.current = null
        // Back at the fitted view, so resizes refit again.
        if (endsFitted) userInteracted.current = false
      }
    } else if (userInteracted.current) {
      recenterOnZoomOut()

      keepTargetOnChart()
    }

    if (fitPoints.current.length === 0) return

    const maxDistance = computeMaxDistance({
      points: fitPoints.current,
      target: controls.target,
      direction: controls.target.clone().sub(camera.position),
      up: camera.up,
      fovY: camera.fov,
      aspect: size.width / size.height,
    })
    controls.maxDistance = maxDistance
    controls.minDistance = maxDistance * MIN_DISTANCE_RATIO
    lastDistance.current = camera.position.distanceTo(controls.target)

    publishViewState()
  })

  return <FitContext.Provider value={registry}>{children}</FitContext.Provider>
}

/**
 * drei `<Text>` whose rendered bounds are kept in view by `CameraFit`.
 * Use it for axis titles and tick labels that sit outside the chart box.
 */
export const SceneLabel: React.FC<React.ComponentProps<typeof Text>> = ({
  onSync,
  ...props
}) => {
  const registry = useContext(FitContext)
  const unregister = useRef<(() => void) | null>(null)

  const ref = useCallback(
    (mesh: TroikaText | null) => {
      unregister.current?.()
      unregister.current = mesh && registry ? registry.register(mesh) : null
    },
    [registry]
  )

  const handleSync = useCallback(
    (mesh: THREE.Mesh) => {
      registry?.invalidate()
      onSync?.(mesh)
    },
    [registry, onSync]
  )

  return <Text ref={ref} onSync={handleSync} {...props} />
}
