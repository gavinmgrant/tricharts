import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Returns an eased intro animation progress ref that goes 0 → 1 over `duration`.
 * Resets to 0 whenever `resetDeps` change.
 */
export function useIntroProgress(duration: number, resetDeps: unknown[]) {
  const progressRef = useRef(0)
  const easedProgressRef = useRef(0)

  // Create a stable dependency key so callers can pass arrays/objects safely.
  // This avoids accidental resets when a parent re-renders without meaningful changes.
  const resetKey = useMemo(() => JSON.stringify(resetDeps), [resetDeps])

  useEffect(() => {
    progressRef.current = 0
    easedProgressRef.current = 0
  }, [resetKey])

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return
    const next = Math.min(progressRef.current + delta / duration, 1)
    progressRef.current = next
    easedProgressRef.current = easeInOutCubic(next)
  })

  return { progressRef, easedProgressRef }
}

