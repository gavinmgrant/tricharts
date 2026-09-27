import { useEffect, useLayoutEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function formatDisplayValue(value: number): string {
  if (Number.isInteger(value)) return Math.round(value).toString()
  return value.toFixed(1).replace(/\.?0+$/, "")
}

type TroikaLabel = THREE.Object3D & { text?: string }

export const use3DScaling = (
  targetHeight: number,
  options?: {
    duration?: number
    labelRef?: React.RefObject<TroikaLabel | null>
    formatLabel?: boolean
    originalValue?: number
  }
) => {
  const {
    duration = 1.5,
    labelRef,
    formatLabel = true,
    originalValue = targetHeight,
  } = options || {}

  const invalidate = useThree((state) => state.invalidate)
  const meshRef = useRef<THREE.Mesh>(null!)
  const progressRef = useRef(0)
  // With frameloop="demand" the first frame after a (re)start reports the
  // whole idle time as its delta, which would finish the animation in one
  // step, so that frame only starts the clock.
  const startingRef = useRef(true)
  const previousTargetHeightRef = useRef(targetHeight)
  const lastDisplayValueRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousTargetHeightRef.current !== targetHeight) {
      progressRef.current = 0
      startingRef.current = true
      lastDisplayValueRef.current = null
      previousTargetHeightRef.current = targetHeight
      invalidate()
    }
  }, [targetHeight, invalidate])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.scale.y = 0
    mesh.position.y = 0
  }, [targetHeight])

  useFrame((state, delta) => {
    if (progressRef.current >= 1) return
    // Keep frames coming until the animation ends.
    state.invalidate()

    const step = startingRef.current ? 0 : delta
    startingRef.current = false
    progressRef.current = Math.min(progressRef.current + step / duration, 1)
    const easedProgress = easeInOutCubic(progressRef.current)
    const currentBarHeight = easedProgress * targetHeight

    const mesh = meshRef.current
    if (mesh) {
      mesh.scale.y = easedProgress
      mesh.position.y = currentBarHeight / 2
    }

    const label = labelRef?.current
    if (label) {
      label.position.y = currentBarHeight + 0.01

      if (formatLabel) {
        const displayValue = formatDisplayValue(easedProgress * originalValue)
        if (displayValue !== lastDisplayValueRef.current) {
          lastDisplayValueRef.current = displayValue
          if (label.text !== undefined) {
            label.text = displayValue
          }
        }
      }
    }

    if (progressRef.current >= 1) {
      if (mesh) {
        mesh.scale.y = 1
        mesh.position.y = targetHeight / 2
      }
      if (label) {
        label.position.y = targetHeight + 0.01
        if (formatLabel) {
          const finalValue = formatDisplayValue(originalValue)
          if (finalValue !== lastDisplayValueRef.current) {
            lastDisplayValueRef.current = finalValue
            if (label.text !== undefined) {
              label.text = finalValue
            }
          }
        }
      }
    }
  })

  return {
    meshRef,
    progressRef,
  }
}
