import { useRef, useState } from "react"
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

  // Add states to track current animation values
  const [currentHeight, setCurrentHeight] = useState(0)
  const [displayValue, setDisplayValue] = useState("0")

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return

    if (progressRef.current < 1) {
      // Update progress based on delta time and duration
      progressRef.current = Math.min(progressRef.current + delta / duration, 1)

      // Apply easing function for smooth animation
      const easedProgress =
        progressRef.current < 0.5
          ? 4 * progressRef.current ** 3
          : 1 - Math.pow(-2 * progressRef.current + 2, 3) / 2

      // Update mesh scaling
      if (meshRef.current) {
        meshRef.current.scale.y = easedProgress
        meshRef.current.position.y = (targetHeight * easedProgress) / 2
      }

      // Calculate current animated values
      const animatedValue = easedProgress * targetHeight
      setCurrentHeight(animatedValue)

      // Update label position if labelRef is provided
      if (labelRef?.current) {
        // Store initial z position on first frame if not already stored
        if (initialLabelZPos.current === null) {
          initialLabelZPos.current = labelRef.current.position.z
        }

        // Update position while PRESERVING the original z coordinate
        labelRef.current.position.y = animatedValue + 0.01

        // Don't override the z-position that was set in the Bar component
        // This ensures labels appear at the correct z-position for each row
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
    }
  })

  return {
    meshRef,
    progressRef,
    currentHeight,
    displayValue,
  }
}
