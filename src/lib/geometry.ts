import type { Sector, Ring } from '@/types'

export const CANVAS_SIZE = 1000
export const CIRCUMRADIUS = 440
export const INRADIUS = CIRCUMRADIUS * Math.cos(Math.PI / 5) // cos(36deg)

const deg = (d: number) => (d * Math.PI) / 180

// Pentagon vertices: top vertex at 270 deg, going clockwise
export const VERTEX_ANGLES_DEG = [270, 342, 54, 126, 198]

export function pentagonPoints(scale = 1): { x: number; y: number }[] {
  return VERTEX_ANGLES_DEG.map((a) => ({
    x: CIRCUMRADIUS * scale * Math.cos(deg(a)),
    y: CIRCUMRADIUS * scale * Math.sin(deg(a)),
  }))
}

export function pointsToPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
}

// Sector axis angle = bisector of the edge between two adjacent vertices
// Items are placed along these rays from center
export const SECTOR_ANGLE_DEG: Record<Sector, number> = {
  individual: 306,   // between vertex 270 and 342
  technical: 18,     // between vertex 342 and 54 (wraps through 360)
  economic: 90,      // between vertex 54 and 126
  environmental: 162, // between vertex 126 and 198
  social: 234,       // between vertex 198 and 270
}

// Edge label midpoint position on pentagon boundary (for axis label placement)
export function edgeMidpoint(sectorAngle: number, scale = 1): { x: number; y: number } {
  const a = deg(sectorAngle)
  const r = INRADIUS * scale * 1.08 // just outside the ring boundary
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

// Ring radii as fraction of inradius
const RING_RADIUS_FRACTION: Record<Ring, number> = {
  immediate: 0.38,
  enabling: 0.63,
  structural: 0.85,
}

// Ring boundary scales (for drawing concentric pentagons)
// 4 boundaries create 3 zones; must bracket RING_RADIUS_FRACTION values
// immediate=0.38, enabling=0.63, structural=0.85
export const RING_BOUNDARY_SCALES = [1.0, 0.72, 0.50, 0.10]

export function ringRadius(ring: Ring, scale = 1): number {
  return INRADIUS * RING_RADIUS_FRACTION[ring] * scale
}

export function slotCenter(sector: Sector, ring: Ring, scale = 1): { x: number; y: number } {
  const a = deg(SECTOR_ANGLE_DEG[sector])
  const r = ringRadius(ring, scale)
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

// Spread multiple items in the same (sector, ring) slot using a 2D grid:
// columns spread perpendicular to sector axis, rows spread radially.
// This prevents items from fanning out too far laterally into adjacent sectors.
export function slotPosition(
  sector: Sector,
  ring: Ring,
  index: number,
  total: number,
  scale = 1,
): { x: number; y: number } {
  const center = slotCenter(sector, ring, scale)
  if (total <= 1) return center

  const a = deg(SECTOR_ANGLE_DEG[sector])
  const perp = { x: -Math.sin(a), y: Math.cos(a) }
  const radial = { x: Math.cos(a), y: Math.sin(a) }

  const cols = total <= 2 ? total : Math.ceil(Math.sqrt(total))
  const rows = Math.ceil(total / cols)

  const col = index % cols
  const row = Math.floor(index / cols)

  const perpOffset = (col - (cols - 1) / 2) * 130 * scale
  const radialOffset = (row - (rows - 1) / 2) * 120 * scale

  return {
    x: center.x + perp.x * perpOffset + radial.x * radialOffset,
    y: center.y + perp.y * perpOffset + radial.y * radialOffset,
  }
}

// Rotate text angle for axis labels (tangent to edge, readable)
export function labelRotation(sectorAngle: number): number {
  // Labels on edges should be rotated to follow the edge direction
  // Edge angle is perpendicular to sector axis + 90
  const edgeAngle = sectorAngle - 90
  // Keep text upright (not upside down)
  if (edgeAngle > 90 && edgeAngle < 270) return edgeAngle - 180
  return edgeAngle
}

export function svgToCanvas(svgX: number, svgY: number): { left: number; top: number } {
  return {
    left: svgX + CANVAS_SIZE / 2,
    top: svgY + CANVAS_SIZE / 2,
  }
}

export function canvasToSvg(left: number, top: number): { x: number; y: number } {
  return {
    x: left - CANVAS_SIZE / 2,
    y: top - CANVAS_SIZE / 2,
  }
}

// Sector boundary angles (vertex angles) in radians, sorted
const VERTEX_ANGLES_RAD = VERTEX_ANGLES_DEG.map(deg)

// Ring detection boundaries (midpoints between ring radii, matching RING_RADIUS_FRACTION)
// immediate=0.38, enabling=0.63, structural=0.85
const RING_BOUNDARIES_BASE = [
  INRADIUS * 0.505, // immediate / enabling midpoint: (0.38+0.63)/2
  INRADIUS * 0.74,  // enabling / structural midpoint: (0.63+0.85)/2
]

export function detectSectorRing(svgX: number, svgY: number, scale = 1): { sector: Sector; ring: Ring } {
  const r = Math.sqrt(svgX * svgX + svgY * svgY)
  const b0 = RING_BOUNDARIES_BASE[0]! * scale
  const b1 = RING_BOUNDARIES_BASE[1]! * scale
  const ring: Ring = r <= b0 ? 'immediate' : r <= b1 ? 'enabling' : 'structural'

  // Angle from center, 0 = right, CCW positive (Math.atan2 convention)
  let angle = Math.atan2(svgY, svgX)
  if (angle < 0) angle += 2 * Math.PI

  // Find which sector this angle falls in by comparing to vertex angles
  // Each sector spans the arc between two adjacent vertex angles (wrapping at 360)
  const sectors: Sector[] = ['individual', 'technical', 'economic', 'environmental', 'social']
  // Vertex angles in radians, same order as VERTEX_ANGLES_DEG [270, 342, 54, 126, 198]
  const verts = VERTEX_ANGLES_RAD.map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))

  let sector: Sector = 'social'
  for (let i = 0; i < verts.length; i++) {
    const a1 = verts[i]!
    const a2 = verts[(i + 1) % verts.length]!
    // Arc from a1 to a2 (going clockwise, i.e. increasing angle wrapping at 2pi)
    const inArc = a2 > a1
      ? angle >= a1 && angle < a2
      : angle >= a1 || angle < a2
    if (inArc) { sector = sectors[i]!; break }
  }

  return { sector, ring }
}

export function bezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = x1 + dx * 0.4
  const cy1 = y1 + dy * 0.1
  const cx2 = x1 + dx * 0.6
  const cy2 = y1 + dy * 0.9
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}
