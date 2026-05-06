import type { Item } from '@/types'
import { slotPosition } from '@/lib/geometry'

export interface LayoutPosition {
  x: number
  y: number
}

const DEFAULT_W = 90
const DEFAULT_H = 50
const MARGIN = 10

// Estimate rendered card height from text content (9px font, leading-tight ~11px/line, p-1 padding)
function estimateH(item: Item): number {
  if (item.height !== undefined) return item.height
  const w = item.width ?? DEFAULT_W
  const charsPerLine = Math.max(6, Math.floor(w / 6))
  const lines = Math.ceil(item.label.length / charsPerLine)
  return Math.max(DEFAULT_H, 4 + 13 + Math.max(1, lines) * 11 + 4)
}

// Fast layout for reactive use - just slot geometry + user offsets, no collision pass.
export function computeLayout(items: Item[], scale = 1): Map<string, LayoutPosition> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const key = `${item.sector}:${item.ring}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const positions = new Map<string, LayoutPosition>()
  for (const [, group] of groups) {
    group.forEach((item, index) => {
      const base = slotPosition(item.sector, item.ring, index, group.length, scale)
      positions.set(item.id, { x: base.x + item.dx, y: base.y + item.dy })
    })
  }
  return positions
}

// Force-directed layout: runs once on "Reset Layout", result baked into item.dx / item.dy.
// Separates every pair of overlapping items via spring repulsion while a weak spring
// pulls each item back toward its ideal slot position.
export function computeForceLayout(
  items: Item[],
  scale = 1,
): Map<string, { dx: number; dy: number }> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const key = `${item.sector}:${item.ring}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // Ideal positions from slot geometry (ignoring existing dx/dy)
  const ideal = new Map<string, { x: number; y: number }>()
  for (const [, group] of groups) {
    group.forEach((item, index) => {
      const p = slotPosition(item.sector, item.ring, index, group.length, scale)
      ideal.set(item.id, { x: p.x, y: p.y })
    })
  }

  // Working positions start at ideal
  const pos = new Map<string, { x: number; y: number }>()
  for (const [id, p] of ideal) pos.set(id, { x: p.x, y: p.y })

  // Position-based dynamics: no velocity, so items can't fly away.
  // Each iteration: pull items toward ideal slot, then push overlapping pairs apart.
  const K_ATTR = 0.04    // fraction of distance to ideal corrected per iteration
  const PUSH = 0.65      // fraction of overlap resolved per pair per iteration
  const ITERATIONS = 600

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Attraction toward ideal slot (direct position correction)
    for (const item of items) {
      const p = pos.get(item.id)!
      const ip = ideal.get(item.id)!
      p.x += K_ATTR * (ip.x - p.x)
      p.y += K_ATTR * (ip.y - p.y)
    }

    // Pairwise overlap correction
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = pos.get(items[i]!.id)!
        const b = pos.get(items[j]!.id)!
        const hw_a = (items[i]!.width ?? DEFAULT_W) / 2 + MARGIN / 2
        const hh_a = estimateH(items[i]!) / 2 + MARGIN / 2
        const hw_b = (items[j]!.width ?? DEFAULT_W) / 2 + MARGIN / 2
        const hh_b = estimateH(items[j]!) / 2 + MARGIN / 2

        const dx = b.x - a.x
        const dy = b.y - a.y
        const overlapX = hw_a + hw_b - Math.abs(dx)
        const overlapY = hh_a + hh_b - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX <= overlapY) {
            const push = overlapX * PUSH
            const sign = dx >= 0 ? 1 : -1
            a.x -= sign * push / 2
            b.x += sign * push / 2
          } else {
            const push = overlapY * PUSH
            const sign = dy >= 0 ? 1 : -1
            a.y -= sign * push / 2
            b.y += sign * push / 2
          }
        }
      }
    }
  }

  // Return per-item offset from ideal position so resetLayout can bake into dx/dy
  const result = new Map<string, { dx: number; dy: number }>()
  for (const item of items) {
    const p = pos.get(item.id)!
    const ip = ideal.get(item.id)!
    result.set(item.id, { dx: p.x - ip.x, dy: p.y - ip.y })
  }
  return result
}
