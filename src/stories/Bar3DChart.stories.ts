import type { Meta, StoryObj } from "@storybook/react"
import { Bar3DChart } from "@/components/charts/Bar3DChart"
import { withContainer } from "@/stories/decorators"

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
    xLabel: "X Axis",
    yLabel: "Y Axis",
    zLabel: "Z Axis",
  },
}

export const RandomColor: Story = {
  args: {
    data: [3, 5, 2, 7, 4],
    colorScheme: "random",
  },
}

export const RainbowHighValues: Story = {
  args: {
    data: [
      [100, 1200, 300, 600, 500],
      [400, 500, 600, 1080, 800],
      [900, 300, 700, 200, 300],
    ],
    colorScheme: "rainbow",
    xLabel: "X Axis",
    yLabel: "Y Axis",
    zLabel: "Z Axis",
  },
}

const rainfallData = [
  // January - 31 days
  [
    0, 0.9, 0.8, 1.3, 1.3, 0.5, 0, 0, 0.3, 0, 0, 0.1, 0.2, 0.5, 0.3, 0.1, 0, 0,
    0.2, 0.4, 0.6, 0.8, 1.2, 1.5, 0.8, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5,
  ],
  // February - 28 days
  [
    0.2, 0.5, 0.8, 0.9, 0.4, 0.2, 0, 0, 0.1, 0.3, 0.5, 0.7, 1.0, 1.2, 0.5, 0.8,
    0, 0, 0.5, 0.8, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5,
  ],
  // March - 31 days
  [
    0.3, 0.5, 0.2, 0, 0, 0.4, 1.2, 0.6, 0, 0, 0.1, 0.2, 0.8, 1.0, 0.4, 0, 0.2,
    0.5, 0.7, 0.3, 0, 0, 0.1, 0.4, 1.2, 0.3, 0, 0, 0.2, 0.6, 0.1,
  ],
  // April - 30 days
  [
    0.8, 1.1, 1.3, 0.7, 0.2, 0, 0, 0.5, 1.7, 0.9, 0.2, 0, 0.1, 0.3, 1.6, 0.8,
    0.4, 0.1, 0, 0, 0.7, 1.9, 1.1, 0.5, 0.2, 0, 0.1, 0.6, 1.3, 0.8,
  ],
  // May - 31 days
  [
    0.2, 0.1, 0, 0, 0.3, 1.5, 2.1, 0.7, 0.3, 0.1, 0, 0, 0.2, 0.4, 1.8, 1.1, 0.5,
    0.2, 0, 0.1, 0.3, 0.6, 1.4, 0.9, 0.4, 0.1, 0, 0.2, 0.7, 1.6, 0.9,
  ],
  // June - 30 days
  [
    0.1, 0, 0, 0.8, 2.3, 1.5, 0.6, 0.2, 0, 0, 0.4, 1.9, 1.2, 0.5, 0.2, 0, 0.3,
    1.7, 2.4, 0.9, 0.3, 0.1, 0, 0.2, 1.1, 2.8, 1.3, 0.6, 0.3, 0.1,
  ],
  // July - 31 days
  [
    0, 0.2, 1.8, 2.7, 1.2, 0.4, 0.2, 0, 0.3, 1.6, 2.9, 1.3, 0.5, 0.2, 0, 0.1,
    0.4, 1.9, 3.2, 1.4, 0.6, 0.3, 0, 0, 0.5, 2.1, 3.5, 1.6, 0.7, 0.3, 0.1,
  ],
  // August - 31 days
  [
    0.2, 1.3, 2.6, 4.1, 1.8, 0.8, 0.4, 0.1, 0, 0.3, 1.7, 3.8, 5.2, 2.4, 1.1,
    0.5, 0.2, 0, 0.1, 0.6, 2.2, 4.5, 1.9, 0.9, 0.4, 0.1, 0, 0.2, 1.5, 3.4, 4.8,
  ],
  // September - 30 days
  [
    2.1, 0.9, 0.4, 0.1, 0, 0.2, 1.2, 3.1, 4.2, 1.7, 0.8, 0.3, 0.1, 0, 0.6, 2.4,
    3.7, 1.6, 0.7, 0.3, 0.1, 0, 0.2, 1.4, 2.9, 3.9, 1.5, 0.6, 0.3, 0.1,
  ],
  // October - 31 days
  [
    0, 0.1, 0.7, 1.9, 2.8, 1.2, 0.5, 0.2, 0, 0.1, 0.4, 1.1, 2.3, 0.9, 0.4, 0.1,
    0, 0, 0.3, 0.8, 1.7, 2.5, 1.1, 0.5, 0.2, 0.1, 0, 0.3, 0.7, 1.4, 2.1,
  ],
  // November - 30 days
  [
    0.8, 0.3, 0.1, 0, 0.1, 0.4, 0.8, 1.2, 0.5, 0.2, 0.1, 0, 0, 0.3, 0.7, 1.1,
    0.4, 0.2, 0.1, 0, 0, 0.2, 0.5, 0.9, 0.4, 0.1, 0, 0, 0.1, 0.3,
  ],
  // December - 31 days
  [
    0.6, 1.1, 0.5, 0.2, 0.1, 0, 0, 0.2, 0.6, 1.2, 0.6, 0.3, 0.1, 0, 0.1, 0.4,
    0.8, 1.4, 0.7, 0.3, 0.2, 0, 0, 0.1, 0.5, 0.9, 1.5, 0.8, 0.4, 0.2, 0.1,
  ],
]

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString())

export const DailyRainfall: Story = {
  args: {
    data: rainfallData,
    xLabel: "Day",
    yLabel: "Rainfall (in)",
    zLabel: "Month",
    zLabels: months,
    xLabels: days,
  },
}
