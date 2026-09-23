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
import { boxCorners, computeFitView } from "./fitView"

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

type ControlsLike = THREE.EventDispatcher<any> & {
  target: THREE.Vector3
  maxDistance: number
  update: () => void
}

/**
 * Keeps the camera framed on the chart box plus every registered label,
 * refitting on resize and when content changes, until the user takes over
 * with the controls.
 */
export const CameraFit: React.FC<{
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  direction: THREE.Vector3
  contentKey: string
  children?: React.ReactNode
}> = ({ bounds, direction, contentKey, children }) => {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null

  const labels = useRef(new Set<TroikaText>())
  const dirty = useRef(true)
  const userInteracted = useRef(false)
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
    }
    controls.addEventListener("start", onStart)
    return () => controls.removeEventListener("start", onStart)
  }, [controls])

  useFrame(() => {
    if (!dirty.current || userInteracted.current || !controls) return
    if (!(camera instanceof THREE.PerspectiveCamera)) return

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

    if (
      pending &&
      performance.now() - mountedAt.current < LABEL_SYNC_TIMEOUT_MS
    ) {
      return
    }

    const pivot = bounds.min.clone().add(bounds.max).multiplyScalar(0.5)
    const fit = computeFitView({
      points,
      direction,
      up: camera.up,
      fovY: camera.fov,
      aspect: size.width / size.height,
      pivot,
    })
    dirty.current = false
    if (!fit) return

    camera.position.copy(fit.position)
    controls.target.copy(fit.target)
    controls.maxDistance = Math.max(controls.maxDistance, fit.distance * 3)
    camera.far = Math.max(camera.far, fit.distance * 10)
    camera.updateProjectionMatrix()
    controls.update()
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
