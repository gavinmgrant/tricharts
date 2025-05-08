# TriCharts

[![storybook](https://raw.githubusercontent.com/storybooks/brand/master/badge/badge-storybook.svg)](https://681bd8e0a76963348cb8ef98-kqozlcvgyv.chromatic.com/?path=/docs/introduction--docs)
[![npm version](https://img.shields.io/npm/v/tricharts.svg)](https://www.npmjs.com/package/tricharts)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/gavinmgrant/tricharts/blob/main/LICENSE)

Beautiful, interactive 3D charts for React — powered by Three.js and React Three Fiber

## Preview

![TriCharts Demo](assets/images/demo.gif)

This is a demo of the TriCharts library, showcasing a 3D bar chart rendering daily rainfall data for a year. With the days and months represented on the X and Z axes, and the rainfall amount on the Y axis, this chart provides a clear and interactive visualization of the data. The chart is fully interactive, allowing users to rotate, zoom, and click on individual bars to see detailed information.

## Features

- 🚀 Performant - Built with Three.js and React Three Fiber for hardware-accelerated rendering
- 🔄 Interactive - Rotate, zoom, and click on chart elements
- 📱 Responsive - Automatically scales to fit any container size
- 🎨 Customizable - Multiple color schemes with easy styling options
- 🛠️ Simple API - Easy to use with sensible defaults

## Installation

Install TriCharts along with required peer dependencies:

```bash
# Using npm
npm install tricharts react react-dom @react-three/fiber @react-three/drei three

# Using yarn
yarn add tricharts react react-dom @react-three/fiber @react-three/drei three

# Using pnpm
pnpm add tricharts react react-dom @react-three/fiber @react-three/drei three
```

## Basic Usage

```jsx
import { Bar3DChart } from "tricharts"

function App() {
  return (
    <div style={{ height: "500px", width: "100%" }}>
      <Bar3DChart data={[3, 5, 2, 7, 4]} />
    </div>
  )
}
```

## Using with Next.js App Router

When using TriCharts in Next.js App Router, you must add the `"use client"` directive at the top of your component file, as TriCharts requires client-side rendering:

```jsx
"use client" // Add this directive at the top of your file

import { Bar3DChart } from "tricharts"

function App() {
  return (
    <div style={{ height: "500px", width: "100%" }}>
      <Bar3DChart data={[3, 5, 2, 7, 4]} />
    </div>
  )
}
```

## Responsive Layout

The chart automatically fills 100% of its parent container. Simply wrap it in a div with the desired dimensions:

```jsx
<div style={{ height: "400px", width: "600px" }}>
  <Bar3DChart data={data} />
</div>
```

## Bar Chart Examples

There is only one chart type available at the moment, which is a 3D bar chart named `Bar3DChart`. Below are some examples of how to use it.

### Simple Bar Chart

```jsx
import { Bar3DChart } from "tricharts"

const data = [12, 19, 3, 5, 9, 3, 7]

function SingleRowBar() {
  return (
    <div style={{ height: "400px" }}>
      <Bar3DChart
        data={data}
        colorScheme="random"
        xLabel="Months"
        xLabels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
      />
    </div>
  )
}
```

### Multi-Series Bar Chart

```jsx
import { Bar3DChart } from "tricharts"

const multiRowData = [
  [12, 19, 3, 5, 2],
  [22, 12, 15, 5, 9],
  [8, 14, 12, 7, 11],
]

function MultiRowBar() {
  return (
    <div style={{ height: "500px" }}>
      <Bar3DChart
        data={multiRowData}
        colorScheme="rainbow"
        xLabel="Categories"
        yLabel="Values"
        zLabel="Year"
        xLabels={["A", "B", "C", "D", "E"]}
        zLabels={["2022", "2023", "2024"]}
        barSpacing={1.5}
      />
    </div>
  )
}
```

### Interactive Bar Chart with Click Handler

```jsx
import { useState } from "react"
import { Bar3DChart } from "tricharts"

function InteractiveChart() {
  const [selectedBar, setSelectedBar] = useState(null)

  const handleBarClick = (data) => {
    setSelectedBar(data)
    console.log(`Clicked on bar with value: ${data.value}`)
  }

  return (
    <div style={{ height: "400px" }}>
      <Bar3DChart
        data={[12, 19, 3, 5, 2, 3]}
        colorScheme="random"
        onBarClick={handleBarClick}
      />
      {selectedBar && (
        <div>
          Selected bar: {selectedBar.value} (index: {selectedBar.xIndex})
        </div>
      )}
    </div>
  )
}
```

## API Reference

### Bar3DChart Props

| Prop Name     | Type                     | Default     | Description                                                                                                                                                        |
| ------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data`        | `number[] or number[][]` | required    | Data to visualize. Can be a 1D array for a single series or a 2D array for multiple series.                                                                        |
| `colorScheme` | `String`                 | `"blue"`    | Color scheme for bars. Options: "blue", "green", "red", "purple", "orange", "rainbow", "random" or a hex color string like "#ff5733".                              |
| `barSpacing`  | `number`                 | `1`         | The spacing between the bars.                                                                                                                                      |
| `showGrid`    | `boolean`                | `true`      | Whether to show the grid lines.                                                                                                                                    |
| `showLabels`  | `boolean`                | `true`      | Whether to show value labels on top of each bar.                                                                                                                   |
| `xLabel`      | `string`                 | `undefined` | Label for the X-axis.                                                                                                                                              |
| `yLabel`      | `string`                 | `undefined` | Label for the Y-axis.                                                                                                                                              |
| `zLabel`      | `string`                 | `undefined` | Label for the Z-axis.                                                                                                                                              |
| `xLabels`     | `string[]`               | `undefined` | Labels for individual X-axis ticks.                                                                                                                                |
| `zLabels`     | `string[]`               | `undefined` | Labels for individual Z-axis ticks.                                                                                                                                |
| `maxHeight`   | `number`                 | `10`        | Maximum height of the tallest bar. Other bars are scaled proportionally.                                                                                           |
| `onBarClick`  | `function`               | `undefined` | Callback triggered when a bar is clicked. Receives an object with this shape: `{ value: number, xIndex: number, zIndex: number, xLabel: string, zLabel: string }`. |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
