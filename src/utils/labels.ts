import { AxisLabel } from "../components/Shared3DScene/types"

export const normalizeLabel = (
  label: string | AxisLabel | undefined,
  defaultPos: [number, number, number]
) => {
  if (!label) return null

  if (typeof label === "string") {
    return {
      text: label,
      color: "#000",
      fontFamily: "Arial",
      fontSize: 14,
      position: defaultPos,
      offset: 1,
    }
  }

  return {
    color: "#000",
    fontFamily: "Arial",
    fontSize: 14,
    position: defaultPos,
    offset: 1,
    ...label,
  }
}
