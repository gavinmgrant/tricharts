/**
 * Resolves spacing between grid cells / bar footprints. Prefer `gridSpacing`;
 * `barSpacing` is supported for backward compatibility.
 */
export function resolveGridSpacing(
  gridSpacing: number | undefined,
  barSpacing: number | undefined,
  defaultValue = 1
): number {
  return gridSpacing ?? barSpacing ?? defaultValue
}

let warnedBarSpacingDeprecated = false

/** Logs once per session when the deprecated `barSpacing` prop is used (dev only). */
export function warnDeprecatedBarSpacingOnce(): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return
  }
  if (warnedBarSpacingDeprecated) return
  warnedBarSpacingDeprecated = true
  console.warn(
    "[tricharts] `barSpacing` is deprecated and will be removed in a future major version. Use `gridSpacing` instead."
  )
}
