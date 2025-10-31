import { useRef, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export const use3DScaling = (
  targetHeight: number,
  options?: {
    duration?: number
    labelRef?: React.RefObject<any>
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

  const meshRef = useRef<THREE.Mesh>(null!)
  const progressRef = useRef(0)
  const initialLabelZPos = useRef<number | null>(null)
  const previousTargetHeightRef = useRef(targetHeight)

  // Add states to track current animation values
  const [currentHeight, setCurrentHeight] = useState(0)
  const [displayValue, setDisplayValue] = useState("0")

  // Reset animation when targetHeight changes
  useEffect(() => {
    if (previousTargetHeightRef.current !== targetHeight) {
      progressRef.current = 0
      previousTargetHeightRef.current = targetHeight
    }
  }, [targetHeight])

  useFrame((_, delta) => {
    const isAnimating = progressRef.current < 1
    let easedProgress = 1
    let currentBarHeight = targetHeight

    if (isAnimating) {
      // Update progress based on delta time and duration
      progressRef.current = Math.min(progressRef.current + delta / duration, 1)

      // Apply easing function for smooth animation
      easedProgress =
        progressRef.current < 0.5
          ? 4 * progressRef.current ** 3
          : 1 - Math.pow(-2 * progressRef.current + 2, 3) / 2

      // Calculate current animated values
      currentBarHeight = easedProgress * targetHeight
      setCurrentHeight(currentBarHeight)

      // Update mesh scaling
      if (meshRef.current) {
        meshRef.current.scale.y = easedProgress
        meshRef.current.position.y = currentBarHeight / 2
      }

      // Format and set display value
      if (formatLabel) {
        const displayOriginalValue = easedProgress * originalValue
        setDisplayValue(
          Number.isInteger(displayOriginalValue)
            ? Math.round(displayOriginalValue).toString()
            : displayOriginalValue.toFixed(1).replace(/\.?0+$/, "")
        )
      }
    } else {
      // Animation complete - set final values
      currentBarHeight = targetHeight
      setCurrentHeight(targetHeight)
      if (meshRef.current) {
        meshRef.current.scale.y = 1
        meshRef.current.position.y = targetHeight / 2
      }
      if (formatLabel) {
        setDisplayValue(
          Number.isInteger(originalValue)
            ? Math.round(originalValue).toString()
            : originalValue.toFixed(1).replace(/\.?0+$/, "")
        )
      }
    }

    // Always update label position (even after animation completes)
    // This ensures the label stays at the top when height changes
    if (labelRef?.current) {
      // Store initial z position on first frame if not already stored
      if (initialLabelZPos.current === null) {
        initialLabelZPos.current = labelRef.current.position.z
      }

      // Update position while PRESERVING the original z coordinate
      // Position label at the top of the bar
      labelRef.current.position.y = currentBarHeight + 0.01
    }
  })

  return {
    meshRef,
    progressRef,
    currentHeight,
    displayValue,
  }
}
