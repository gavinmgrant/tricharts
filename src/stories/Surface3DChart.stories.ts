import type { Meta, StoryObj } from "@storybook/react"
import { Surface3DChart } from "@/components/charts/Surface3DChart"
import { withContainer } from "@/stories/decorators"
import {
  rainfallDayLabels,
  rainfallMonths,
  rainfallRectangularGrid,
} from "@/stories/rainfallChartData"

/** Sample height field for demos: large, smooth surface with visible extent. */
function waveSurfaceData(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, (_, zi) =>
    Array.from({ length: cols }, (_, xi) => {
      const u = cols > 1 ? xi / (cols - 1) : 0
      const v = rows > 1 ? zi / (rows - 1) : 0
      return (
        3 +
        6 * Math.sin(u * Math.PI * 3) * Math.cos(v * Math.PI * 2) +
        2 * Math.sin((u + v) * Math.PI * 4)
      )
    })
  )
}

const meta = {
  title: "Charts/Surface3DChart",
  component: Surface3DChart,
  parameters: {
    layout: "fullscreen",
    containerStyle: {
      width: "100%",
      height: "min(90vh, 960px)",
      border: "1px dashed #ccc",
      position: "relative",
    },
  },
  tags: ["autodocs"],
  argTypes: {
    colorScheme: {
      description: "Color scheme for the surface (representative cell)",
      defaultValue: "blue",
      control: {
        type: "select",
      },
      options: [
        "blue",
        "green",
        "red",
        "purple",
        "orange",
        "rainbow",
        "random",
      ],
      table: {
        type: { summary: "string" },
        defaultValue: { summary: "blue" },
      },
    },
    barSpacing: { control: { type: "range", min: 0, max: 2, step: 0.1 } },
    showWireframe: { control: { type: "boolean" } },
    showSurfacePoints: { control: { type: "boolean" } },
    surfacePointRadius: { control: { type: "range", min: 0.04, max: 0.3, step: 0.01 } },
  },
  decorators: [withContainer],
} satisfies Meta<typeof Surface3DChart>

export default meta
type Story = StoryObj<typeof meta>

const defaultRows = 14
const defaultCols = 18

export const Default: Story = {
  args: {
    data: waveSurfaceData(defaultRows, defaultCols),
    xLabel: "X",
    yLabel: "Value",
    zLabel: "Z",
    xLabels: Array.from({ length: defaultCols }, (_, i) => `${i + 1}`),
    zLabels: Array.from({ length: defaultRows }, (_, i) => `${i + 1}`),
    barSpacing: 0.85,
    colorScheme: "blue",
    surfacePointRadius: 0.12,
  },
}

/** Same daily rainfall series as `Bar3DChart` → DailyRainfallBar (rectangular 12×31 grid for the surface mesh). */
export const DailyRainfallSurface: Story = {
  args: {
    data: rainfallRectangularGrid,
    xLabel: "Day",
    yLabel: "Rainfall (in)",
    zLabel: "Month",
    zLabels: rainfallMonths,
    xLabels: rainfallDayLabels,
    barSpacing: 0.85,
    colorScheme: "rainbow",
    surfacePointRadius: 0.12,
    surfacePointColor: "black",
  },
}

export const MultiRowSurface: Story = {
  args: {
    data: waveSurfaceData(10, 24),
    colorScheme: "rainbow",
    xLabel: "Categories",
    yLabel: "Values",
    zLabel: "Series",
    xLabels: Array.from({ length: 24 }, (_, i) => `C${i + 1}`),
    zLabels: Array.from({ length: 10 }, (_, i) => `S${i + 1}`),
    barSpacing: 0.75,
    surfacePointRadius: 0.1,
  },
}

export const Wireframe: Story = {
  args: {
    data: waveSurfaceData(12, 16),
    showWireframe: true,
    colorScheme: "purple",
    yLabel: "Height",
    xLabels: Array.from({ length: 16 }, (_, i) => `${i + 1}`),
    zLabels: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
    barSpacing: 0.8,
    surfacePointRadius: 0.12,
  },
}
