import { FC, useRef, memo, useState } from "react"
import { use3DScaling } from "@/hooks/use3DScaling"
import { Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { BarProps } from "./types"

const ANIMATION_DURATION = 0.5

const Bar: FC<BarProps> = memo(
  ({
    height,
    originalValue,
    xIndex,
    zIndex,
    barWidth,
    barDepth,
    barSpacing,
    color,
    showLabel = true,
    onClick,
    showEdges = true,
    edgeColor = "black",
    edgeThickness = 1,
  }) => {
    const xPos = xIndex * (barWidth + barSpacing)
    const zPos = zIndex * (barDepth + barSpacing)
    const textRef = useRef<THREE.Mesh>(null)
    const edgesRef = useRef<THREE.LineSegments>(null)
    const [hovered, setHovered] = useState(false)

    const { meshRef, displayValue, currentHeight } = use3DScaling(height, {
      duration: ANIMATION_DURATION,
      labelRef: showLabel ? textRef : undefined,
      originalValue,
    })

    useFrame(() => {
      if (edgesRef.current && meshRef.current) {
        edgesRef.current.position.copy(meshRef.current.position)
        edgesRef.current.scale.copy(meshRef.current.scale)
      }
    })

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      if (onClick) {
        onClick(originalValue)
      }
    }

    return (
      <>
        <mesh
          ref={meshRef}
          position={[xPos, height / 2, zPos]}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[barWidth, height, barDepth]} />
          <meshStandardMaterial
            color={color}
            emissive={hovered ? color : "#000000"}
            emissiveIntensity={hovered ? 0.5 : 0}
            metalness={hovered ? 0.8 : 0.2}
          />
        </mesh>

        {showEdges && (
          <lineSegments ref={edgesRef} position={[xPos, height / 2, zPos]}>
            <edgesGeometry
              args={[new THREE.BoxGeometry(barWidth, height, barDepth)]}
            />
            <lineBasicMaterial color={edgeColor} linewidth={edgeThickness} />
          </lineSegments>
        )}

        {showLabel && (
          <Text
            ref={textRef}
            position={[xPos, currentHeight || height, zPos]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={barDepth / 3}
            fontWeight={700}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={barDepth * 0.025}
            outlineColor="black"
          >
            {displayValue}
          </Text>
        )}
      </>
    )
  }
)

export default Bar
