import { generateRandomColor, mixColors } from "@/utils/colors"

export const BAR_WIDTH = 1
export const BAR_DEPTH = 1

export const COLOR_SCHEMES = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#8b5cf6",
  orange: "#f97316",
  rainbow: ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"],
} as const

export type ColorSchemeName = keyof typeof COLOR_SCHEMES

export function normalizeBarChartData(data: unknown): number[][] {
  if (!Array.isArray(data)) return [[]]
  if (!Array.isArray(data[0])) return [data as number[]]
  return data as number[][]
}

export function normalizeSurfaceChartData(data: unknown): number[][] {
  const normalized = normalizeBarChartData(data)
  const numericRows = normalized.filter((row) => Array.isArray(row) && row.length > 0)

  if (numericRows.length === 0) {
    return [[]]
  }

  const columnCount = Math.min(...numericRows.map((row) => row.length))
  if (columnCount <= 0) {
    return [[]]
  }

  return numericRows.map((row) =>
    row.slice(0, columnCount).map((value) =>
      Number.isFinite(value) ? value : 0
    )
  )
}

/** Surface charts require at least this many samples on each axis (a 2×2 grid minimum). */
export const MIN_SURFACE_AXIS_POINTS = 2

export function hasMinimumSurfaceGrid(normalizedData: number[][]): boolean {
  const rows = normalizedData.length
  if (rows < MIN_SURFACE_AXIS_POINTS) return false
  const cols = normalizedData[0]?.length ?? 0
  return cols >= MIN_SURFACE_AXIS_POINTS
}

export function computeScaleFactor(
  normalizedData: number[][],
  maxHeight: number
): number {
  const flat = normalizedData.flat()
  if (flat.length === 0) return 1
  const maxValue = Math.max(...flat)
  if (maxValue <= 0) return 1
  return maxValue > maxHeight ? maxHeight / maxValue : 1
}

export type ChartDimensions3D = { width: number; height: number; depth: number }

export function computeChartDimensions(params: {
  normalizedData: number[][]
  barWidth: number
  barDepth: number
  barSpacing: number
  maxHeight: number
  xLabels?: string[]
  zLabels?: string[]
}): ChartDimensions3D {
  const {
    normalizedData,
    barWidth,
    barDepth,
    barSpacing,
    maxHeight,
    xLabels,
    zLabels,
  } = params

  if (normalizedData.length === 0 || normalizedData[0].length === 0) {
    return { width: 0, height: 0, depth: 0 }
  }

  const maxDataValue = Math.max(...normalizedData.flat())
  const scaleFactor =
    maxDataValue > maxHeight ? maxHeight / maxDataValue : 1

  const width =
    normalizedData[0].length * (barWidth + barSpacing) +
    (xLabels ? barWidth : 0) -
    barSpacing

  const scaledMaxHeight = Math.min(maxDataValue * scaleFactor, maxHeight)
  const height = scaledMaxHeight + 1

  const depth =
    normalizedData.length * (barDepth + barSpacing) +
    (zLabels ? barDepth : 0) -
    barSpacing

  return { width, height, depth }
}

/** Bar footprint center in XZ (matches Bar.tsx mesh position x/z). */
export function barCellCenterXZ(
  xIndex: number,
  zIndex: number,
  barWidth: number,
  barDepth: number,
  barSpacing: number
): [number, number] {
  const x = xIndex * (barWidth + barSpacing)
  const z = zIndex * (barDepth + barSpacing)
  return [x, z]
}

export function computeBarColors(
  normalizedData: number[][],
  colorScheme: string | string[] | string[][]
): string[][] {
  if (colorScheme === "random") {
    return normalizedData.map((row) => row.map(() => generateRandomColor()))
  }

  const colorValue = colorScheme as ColorSchemeName

  if (typeof colorScheme === "string" && colorScheme.startsWith("#")) {
    return normalizedData.map((row) => row.map(() => colorScheme))
  }

  if (COLOR_SCHEMES[colorValue]) {
    if (Array.isArray(COLOR_SCHEMES[colorValue])) {
      const schemeColors = COLOR_SCHEMES[colorValue]
      return normalizedData.map((row, rowIndex) => {
        const rowColor = schemeColors[rowIndex % schemeColors.length]
        return row.map(() => rowColor)
      })
    }
    return normalizedData.map((row) =>
      row.map(() => COLOR_SCHEMES[colorValue] as string)
    )
  }

  return normalizedData.map((row) => row.map(() => COLOR_SCHEMES.blue))
}

function deriveGradientPalette(baseColor: string): string[] {
  return [
    mixColors(baseColor, "#0f172a", 0.55),
    baseColor,
    mixColors(baseColor, "#f8fafc", 0.4),
  ]
}

const SURFACE_NAMED_GRADIENTS: Partial<Record<ColorSchemeName, string[]>> = {
  blue: [COLOR_SCHEMES.blue, COLOR_SCHEMES.red],
  red: [COLOR_SCHEMES.red, COLOR_SCHEMES.blue],
  green: [COLOR_SCHEMES.green, COLOR_SCHEMES.purple],
  purple: [COLOR_SCHEMES.purple, COLOR_SCHEMES.green],
  orange: [COLOR_SCHEMES.orange, COLOR_SCHEMES.blue],
}

export function resolveSurfaceGradientPalette(
  colorScheme: string | string[] | string[][]
): string[] {
  if (Array.isArray(colorScheme)) {
    const flattened = colorScheme.flat()
    return flattened.length > 0
      ? flattened
      : deriveGradientPalette(COLOR_SCHEMES.blue)
  }

  if (colorScheme === "random") {
    return [
      generateRandomColor(),
      generateRandomColor(),
      generateRandomColor(),
    ]
  }

  if (typeof colorScheme === "string" && colorScheme.startsWith("#")) {
    return deriveGradientPalette(colorScheme)
  }

  const schemeName = colorScheme as ColorSchemeName
  const namedGradient = SURFACE_NAMED_GRADIENTS[schemeName]
  if (namedGradient) return namedGradient

  const namedScheme = COLOR_SCHEMES[schemeName]
  if (Array.isArray(namedScheme)) {
    return namedScheme
  }

  if (typeof namedScheme === "string") {
    // Fallback for any future named schemes: still treat as gradient
    return deriveGradientPalette(namedScheme)
  }

  return deriveGradientPalette(COLOR_SCHEMES.blue)
}
