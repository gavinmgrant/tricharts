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

type ControlsLike = THREE.EventDispatcher<any> & {
  target: THREE.Vector3
  minDistance: number
  maxDistance: number
  update: () => void
}

type ResetAnimation = {
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toPosition: THREE.Vector3
  toTarget: THREE.Vector3
  startedAt: number
}

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
 */
export const CameraFit: React.FC<{
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  direction: THREE.Vector3
  contentKey: string
  children?: React.ReactNode
}> = ({ bounds, direction, contentKey, children }) => {
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
  const reset = useRef<ResetAnimation | null>(null)
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
      reset.current = null
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

  useEffect(() => {
    if (!controls) return
    const element = gl.domElement
    const onDoubleClick = () => {
      const fit = computeFit()
      if (!fit) return
      reset.current = {
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: fit.position,
        toTarget: fit.target,
        startedAt: performance.now(),
      }
    }
    element.addEventListener("dblclick", onDoubleClick)
    return () => element.removeEventListener("dblclick", onDoubleClick)
  }, [gl, controls, camera, computeFit])

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
          reset.current = null
          camera.position.copy(fit.position)
          controls.target.copy(fit.target)
          camera.far = Math.max(camera.far, fit.distance * 10)
          camera.updateProjectionMatrix()
        }
      }
    }

    if (reset.current) {
      const { fromPosition, fromTarget, toPosition, toTarget, startedAt } =
        reset.current
      const t = Math.min((performance.now() - startedAt) / RESET_DURATION_MS, 1)
      const k = easeInOutCubic(t)
      camera.position.lerpVectors(fromPosition, toPosition, k)
      controls.target.lerpVectors(fromTarget, toTarget, k)
      camera.lookAt(controls.target)
      if (t === 1) {
        reset.current = null
        // Back at the fitted view, so resizes refit again.
        userInteracted.current = false
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
