import * as THREE from "three"

export type FitViewResult = {
  position: THREE.Vector3
  target: THREE.Vector3
  distance: number
}

/**
 * Finds the closest camera position that keeps every point inside a
 * perspective frustum, keeping the view direction fixed.
 *
 * In camera space (right r, up u, forward d) a point p is visible when
 * |p·r - cx| <= tan(hFov/2) * (p·d - cz), and likewise for the vertical axis.
 * Those constraints are linear, so the best (cx, cy, cz) has a closed form:
 * the largest cz that still satisfies both axes, with cx/cy centred between
 * the extreme points.
 */
export function computeFitView(params: {
  points: THREE.Vector3[]
  direction: THREE.Vector3
  up: THREE.Vector3
  fovY: number
  aspect: number
  padding?: number
  pivot: THREE.Vector3
}): FitViewResult | null {
  const { points, direction, up, fovY, aspect, padding = 0.06, pivot } = params
  if (points.length === 0 || !(aspect > 0)) return null

  const d = direction.clone().normalize()
  const r = new THREE.Vector3().crossVectors(d, up).normalize()
  const u = new THREE.Vector3().crossVectors(r, d).normalize()

  const ty = Math.tan(THREE.MathUtils.degToRad(fovY) / 2) * (1 - padding)
  const tx = ty * aspect

  let ax = -Infinity
  let bx = Infinity
  let ay = -Infinity
  let by = Infinity
  for (const p of points) {
    const px = p.dot(r)
    const py = p.dot(u)
    const pz = p.dot(d)
    ax = Math.max(ax, px - tx * pz)
    bx = Math.min(bx, px + tx * pz)
    ay = Math.max(ay, py - ty * pz)
    by = Math.min(by, py + ty * pz)
  }

  const cz = Math.min((bx - ax) / (2 * tx), (by - ay) / (2 * ty))
  const cx = (ax + bx) / 2
  const cy = (ay + by) / 2

  const position = new THREE.Vector3()
    .addScaledVector(r, cx)
    .addScaledVector(u, cy)
    .addScaledVector(d, cz)

  // Orbit around the point on the view ray level with the chart's centre so
  // rotating still feels anchored to the chart.
  const distance = Math.max(pivot.clone().sub(position).dot(d), 1)
  const target = position.clone().addScaledVector(d, distance)

  return { position, target, distance }
}

export function boxCorners(min: THREE.Vector3, max: THREE.Vector3) {
  const corners: THREE.Vector3[] = []
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y])
      for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z))
  return corners
}

/**
 * The farthest the camera can be from `target`, looking along `direction`,
 * while every point is still inside the frustum. Beyond this the chart only
 * gets smaller, so it is used as the zoom-out limit.
 *
 * With the camera at target - direction * D, a point p (relative to target:
 * right qx, up qy, depth qz) is visible when |qx| <= tan(hFov/2) * (qz + D),
 * so D >= |qx| / tan(hFov/2) - qz, and likewise vertically.
 */
export function computeMaxDistance(params: {
  points: THREE.Vector3[]
  target: THREE.Vector3
  direction: THREE.Vector3
  up: THREE.Vector3
  fovY: number
  aspect: number
  padding?: number
}): number {
  const { points, target, direction, up, fovY, aspect, padding = 0.06 } = params

  const d = direction.clone().normalize()
  const r = new THREE.Vector3().crossVectors(d, up).normalize()
  const u = new THREE.Vector3().crossVectors(r, d).normalize()

  const ty = Math.tan(THREE.MathUtils.degToRad(fovY) / 2) * (1 - padding)
  const tx = ty * aspect

  const q = new THREE.Vector3()
  let distance = 0
  for (const p of points) {
    q.subVectors(p, target)
    const needed =
      Math.max(Math.abs(q.dot(r)) / tx, Math.abs(q.dot(u)) / ty) - q.dot(d)
    distance = Math.max(distance, needed)
  }
  return distance
}
