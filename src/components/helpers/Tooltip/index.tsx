import { Html } from "@react-three/drei"
import styled, { keyframes, css } from "styled-components"
import { useState, useEffect } from "react"
import type { TooltipProps } from "./types"

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translate3d(-50%, -90%, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(-50%, -100%, 0);
  }
`

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translate3d(-50%, -100%, 0);
  }
  to {
    opacity: 0;
    transform: translate3d(-50%, -90%, 0);
  }
`

const TooltipContainer = styled.div<{ $isLeaving: boolean }>`
  background-color: white;
  color: #333;
  padding: 16px 36px 16px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  font-size: 14px;
  transform: translate3d(-50%, -100%, 0);
  margin-top: -10px;
  pointer-events: auto;
  min-width: 60px;
  z-index: 1000;

  ${(props) =>
    props.$isLeaving
      ? css`
          animation: ${fadeOut} 0.2s ease-out forwards;
        `
      : css`
          animation: ${fadeIn} 0.2s ease-out forwards;
        `}
`

const CloseButton = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  cursor: pointer;
  width: 24px;
  height: 24px;
`

export const Tooltip = ({
  visible,
  content,
  position,
  onClose,
}: TooltipProps) => {
  const [show, setShow] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setIsLeaving(false)
      setShow(true)
    } else if (show) {
      setIsLeaving(true)
      const timer = setTimeout(() => {
        setShow(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [visible, position, show])

  if (!show) return null

  return (
    <Html position={position} zIndexRange={[100, 0]}>
      <TooltipContainer $isLeaving={isLeaving}>
        <div className="tooltip">
          <div>{content}</div>
          <CloseButton onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </CloseButton>
        </div>
      </TooltipContainer>
    </Html>
  )
}
