import type { Item } from '@/types'
import { slotPosition } from '@/lib/geometry'

export interface LayoutPosition {
  x: number
  y: number
}

// Compute all item positions, accounting for slot crowding + user dx/dy offsets
export function computeLayout(items: Item[], scale = 1): Map<string, LayoutPosition> {
  // Group items by (sector, ring)
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
      positions.set(item.id, {
        x: base.x + item.dx,
        y: base.y + item.dy,
      })
    })
  }

  return positions
}
