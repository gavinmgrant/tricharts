import React from "react"

export const withContainer = (
  Story: React.ComponentType,
  { parameters }: { parameters: { containerStyle?: React.CSSProperties } }
) => {
  const containerStyle = parameters.containerStyle || {
    width: "100%",
    height: "600px",
    border: "1px dashed #ccc",
    position: "relative",
  }

  return (
    <div style={containerStyle}>
      <Story />
    </div>
  )
}
