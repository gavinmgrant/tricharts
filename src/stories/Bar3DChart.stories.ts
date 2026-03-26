import type { Meta, StoryObj } from "@storybook/react"
import { Bar3DChart } from "@/components/charts/Bar3DChart"
import { withContainer } from "@/stories/decorators"
import {
  rainfallData,
  rainfallDayLabels,
  rainfallMonths,
} from "@/stories/rainfallChartData"

const meta = {
  title: "Charts/Bar3DChart",
  component: Bar3DChart,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    colorScheme: {
      description: "Color scheme for the bars",
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
  },
  decorators: [withContainer],
} satisfies Meta<typeof Bar3DChart>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    data: [3, 5, 2, 7, 4],
  },
}

export const SingleRowBar: Story = {
  args: {
    data: [12, 19, 3, 5, 9, 3, 7],
    colorScheme: "random",
    xLabel: "Months",
    xLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  },
}

export const MultiRowBar: Story = {
  args: {
    data: [
      [12, 19, 3, 5, 2],
      [22, 12, 15, 5, 9],
      [8, 14, 12, 7, 11],
    ],
    colorScheme: "rainbow",
    xLabel: "Categories",
    yLabel: "Values",
    zLabel: "Year",
    xLabels: ["A", "B", "C", "D", "E"],
    zLabels: ["2022", "2023", "2024"],
    barSpacing: 1.5,
  },
}

export const DailyRainfallBar: Story = {
  args: {
    data: rainfallData,
    xLabel: "Day",
    yLabel: "Rainfall (in)",
    zLabel: "Month",
    zLabels: rainfallMonths,
    xLabels: rainfallDayLabels,
  },
}
