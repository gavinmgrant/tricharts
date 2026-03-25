export const generateRandomColor = (): string => {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  )
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseHexColor(color: string): [number, number, number] {
  const normalized = color.replace("#", "")
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized

  if (hex.length !== 6) {
    throw new Error(`Unsupported color format: ${color}`)
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

export function mixColors(
  from: string,
  to: string,
  weight: number
): string {
  const [fromR, fromG, fromB] = parseHexColor(from)
  const [toR, toG, toB] = parseHexColor(to)
  const t = Math.max(0, Math.min(1, weight))

  const r = clampChannel(fromR + (toR - fromR) * t)
  const g = clampChannel(fromG + (toG - fromG) * t)
  const b = clampChannel(fromB + (toB - fromB) * t)

  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
