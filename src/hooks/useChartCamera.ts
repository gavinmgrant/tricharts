import { useMemo } from "react"

export const useChartCamera = (
  chartDimensions?: { width: number; height: number; depth: number },
  autoPosition = false,
  cameraPosition = [12, 15, 16],
  cameraTarget = [6, 4, 0]
): {
  calculatedCameraPosition: [number, number, number]
  calculatedCameraTarget: [number, number, number]
} => {
  // Calculate optimal camera position based on chart dimensions
  const calculatedCameraPosition = useMemo(() => {
    if (!autoPosition || !chartDimensions) return cameraPosition

    const { width, height, depth } = chartDimensions

    // Calculate distance using the chart's diagonal as reference
    const diagonal = Math.sqrt(width * width + height * height + depth * depth)
    const distance = diagonal * 1.5

    // Position camera at an angle to see all dimensions
    const angle = Math.PI / 4 // 45 degrees
    const x = width / 2 + Math.cos(angle) * distance
    const y = height / 2 + distance * 0.7 // Position camera above chart
    const z = depth / 2 + Math.sin(angle) * distance

    return [x, y, z] as [number, number, number]
  }, [autoPosition, chartDimensions, cameraPosition])

  // Calculate optimal camera target based on chart dimensions
  const calculatedCameraTarget = useMemo(() => {
    if (!autoPosition || !chartDimensions) return cameraTarget as [number, number, number]

    // Target the center of the chart
    const { width, height, depth } = chartDimensions
    return [width / 2, height / 2, depth / 2] as [number, number, number]
  }, [autoPosition, chartDimensions, cameraTarget])

  return {
    calculatedCameraPosition: calculatedCameraPosition as [number, number, number],
    calculatedCameraTarget: calculatedCameraTarget as [number, number, number],
  }
}
