import type { Item } from '@/types'
import { slotPosition } from '@/lib/geometry'

export interface LayoutPosition {
  x: number
  y: number
}

const DEFAULT_W = 110
const DEFAULT_H = 64
const MARGIN = 14

// Estimate rendered card height: header(22) + body(lines*15 + 8px padding) + footer(18)
function estimateH(item: Item): number {
  if (item.height !== undefined) return item.height
  const w = item.width ?? DEFAULT_W
  const charsPerLine = Math.max(5, Math.floor(w / 6.5))
  const lines = Math.ceil(item.label.length / charsPerLine)
  return Math.max(DEFAULT_H, 22 + Math.max(1, lines) * 15 + 8 + 18)
}

// Find a non-overlapping starting offset for a newly added item.
// Operates on actual rendered positions so it respects where users moved existing cards.
// The new item must already be in allItems with dx=0, dy=0 so computeLayout places it
// at its ideal slot center - that becomes the reference point for the returned dx/dy.
export function findNewItemOffset(
  newItem: Item,
  allItems: Item[],
  scale: number,
): { dx: number; dy: number } {
  const layout = computeLayout(allItems, scale)
  const slot = layout.get(newItem.id) ?? { x: 0, y: 0 }
  let x = slot.x
  let y = slot.y
  const hw = (newItem.width ?? DEFAULT_W) / 2
  const hh = estimateH(newItem) / 2

  for (let iter = 0; iter < 40; iter++) {
    let pushX = 0
    let pushY = 0

    for (const other of allItems) {
      if (other.id === newItem.id) continue
      const op = layout.get(other.id)
      if (!op) continue
      const ohw = (other.width ?? DEFAULT_W) / 2 + MARGIN
      const ohh = estimateH(other) / 2 + MARGIN
      const dx = x - op.x
      const dy = y - op.y
      const overlapX = hw + ohw - Math.abs(dx)
      const overlapY = hh + ohh - Math.abs(dy)

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX <= overlapY) {
          pushX += dx >= 0 ? overlapX + 1 : -(overlapX + 1)
        } else {
          pushY += dy >= 0 ? overlapY + 1 : -(overlapY + 1)
        }
      }
    }

    if (pushX === 0 && pushY === 0) break
    x += pushX
    y += pushY
  }

  return { dx: x - slot.x, dy: y - slot.y }
}

// Returns true if placing `id` at (proposedDx, proposedDy) would overlap any other item.
export function wouldOverlap(
  id: string,
  proposedDx: number,
  proposedDy: number,
  items: Item[],
  layout: Map<string, LayoutPosition>,
): boolean {
  const moving = items.find((it) => it.id === id)
  if (!moving) return false
  const slot = layout.get(id)
  if (!slot) return false
  // Ideal slot for moving item is slot.x - moving.dx (base position without offset)
  const baseX = slot.x - moving.dx
  const baseY = slot.y - moving.dy
  const px = baseX + proposedDx
  const py = baseY + proposedDy
  const hw = (moving.width ?? DEFAULT_W) / 2
  const hh = estimateH(moving) / 2

  for (const other of items) {
    if (other.id === id) continue
    const op = layout.get(other.id)
    if (!op) continue
    const ohw = (other.width ?? DEFAULT_W) / 2 + MARGIN / 2
    const ohh = estimateH(other) / 2 + MARGIN / 2
    if (
      Math.abs(px - op.x) < hw + ohw &&
      Math.abs(py - op.y) < hh + ohh
    ) return true
  }
  return false
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
  const K_ATTR = 0.03    // fraction of distance to ideal corrected per iteration
  const PUSH = 0.72      // fraction of overlap resolved per pair per iteration
  const ITERATIONS = 800

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

  // Phase 2: deterministic constraint separation - push until no overlaps remain.
  // No attraction, full resolution per pair. Guarantees zero overlaps if space allows.
  let dirty = true
  let pass = 0
  while (dirty && pass < 1000) {
    dirty = false
    pass++
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
          dirty = true
          if (overlapX <= overlapY) {
            const half = overlapX / 2 + 0.5
            const sign = dx >= 0 ? 1 : -1
            a.x -= sign * half
            b.x += sign * half
          } else {
            const half = overlapY / 2 + 0.5
            const sign = dy >= 0 ? 1 : -1
            a.y -= sign * half
            b.y += sign * half
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
