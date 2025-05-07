import type { TooltipContentProps } from "./types"
import styled from "styled-components"

const TooltipContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
  max-width: 200px;
`

const LabelRow = styled.div`
  display: flex;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const StrongLabel = styled.strong`
  flex-shrink: 0;
  margin-right: 4px;
`

const ValueText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TooltipContent = ({
  value,
  xLabel,
  yLabel,
  zLabel,
}: TooltipContentProps) => {
  return (
    <TooltipContentContainer>
      {zLabel && xLabel && (
        <LabelRow>
          <StrongLabel>{zLabel || ""}</StrongLabel>
          <ValueText>{xLabel || ""}</ValueText>
        </LabelRow>
      )}
      <LabelRow>
        <StrongLabel>{yLabel || ""}</StrongLabel>
        <ValueText>{value}</ValueText>
      </LabelRow>
    </TooltipContentContainer>
  )
}
