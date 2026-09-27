import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Returns an eased intro animation progress ref that goes 0 → 1 over `duration`.
 * Resets to 0 whenever `resetDeps` change.
 */
export function useIntroProgress(duration: number, resetDeps: unknown[]) {
  const invalidate = useThree((state) => state.invalidate)
  const progressRef = useRef(0)
  // With frameloop="demand" the first frame after a (re)start reports the
  // whole idle time as its delta, which would finish the animation in one
  // step, so that frame only starts the clock.
  const startingRef = useRef(true)
  const easedProgressRef = useRef(0)

  // Create a stable dependency key so callers can pass arrays/objects safely.
  // This avoids accidental resets when a parent re-renders without meaningful changes.
  const resetKey = useMemo(() => JSON.stringify(resetDeps), [resetDeps])

  useEffect(() => {
    progressRef.current = 0
    startingRef.current = true
    easedProgressRef.current = 0
    invalidate()
  }, [resetKey, invalidate])

  useFrame((state, delta) => {
    if (progressRef.current >= 1) return
    // Keep frames coming until the animation ends, plus one more: child
    // components' useFrame callbacks run before this one, so they read the
    // final value a frame late.
    state.invalidate()
    const step = startingRef.current ? 0 : delta
    startingRef.current = false
    const next = Math.min(progressRef.current + step / duration, 1)
    progressRef.current = next
    easedProgressRef.current = easeInOutCubic(next)
  })

  return { progressRef, easedProgressRef }
}

