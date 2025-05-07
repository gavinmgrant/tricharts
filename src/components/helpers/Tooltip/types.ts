export type TooltipProps = {
  visible: boolean
  content: React.ReactNode
  position: [number, number, number]
  onClose: () => void
}

export type TooltipContentProps = {
  value: number
  xLabel?: string
  yLabel?: string
  zLabel?: string
}
