import { describe, it, expect } from 'vitest'
import { slotCenter, slotPosition, ringRadius, INRADIUS } from '../src/lib/geometry'
import { computeLayout } from '../src/lib/layout'
import type { Item } from '../src/types'

describe('slotCenter', () => {
  it('places economic items straight down', () => {
    const pos = slotCenter('economic', 'immediate')
    // Economic axis is at 90deg (straight down in SVG)
    expect(pos.x).toBeCloseTo(0, 1)
    expect(pos.y).toBeGreaterThan(0)
  })

  it('immediate ring is closer to center than structural', () => {
    const imm = slotCenter('social', 'immediate')
    const str = slotCenter('social', 'structural')
    const rImm = Math.hypot(imm.x, imm.y)
    const rStr = Math.hypot(str.x, str.y)
    expect(rImm).toBeLessThan(rStr)
  })

  it('ring radii are within inradius', () => {
    const r = ringRadius('structural')
    expect(r).toBeLessThanOrEqual(INRADIUS)
  })
})

describe('slotPosition spread', () => {
  it('spreads two items in same slot perpendicular to axis', () => {
    const p0 = slotPosition('social', 'enabling', 0, 2)
    const p1 = slotPosition('social', 'enabling', 1, 2)
    const center = slotCenter('social', 'enabling')
    // They should be on opposite sides of center
    expect(p0.x + p1.x).toBeCloseTo(center.x * 2, 1)
    expect(p0.y + p1.y).toBeCloseTo(center.y * 2, 1)
  })

  it('single item returns exact slot center', () => {
    const p = slotPosition('technical', 'structural', 0, 1)
    const c = slotCenter('technical', 'structural')
    expect(p.x).toBeCloseTo(c.x, 5)
    expect(p.y).toBeCloseTo(c.y, 5)
  })
})

describe('computeLayout', () => {
  const makeItem = (id: string, sector: Item['sector'], ring: Item['ring']): Item => ({
    id,
    code: id,
    label: id,
    sector,
    ring,
    polarity: 'positive',
    dx: 0,
    dy: 0,
  })

  it('returns positions for all items', () => {
    const items: Item[] = [
      makeItem('A', 'social', 'immediate'),
      makeItem('B', 'technical', 'structural'),
    ]
    const layout = computeLayout(items)
    expect(layout.has('A')).toBe(true)
    expect(layout.has('B')).toBe(true)
  })

  it('applies dx/dy offsets', () => {
    const items: Item[] = [{ ...makeItem('A', 'economic', 'immediate'), dx: 10, dy: -5 }]
    const layout = computeLayout(items)
    const pos = layout.get('A')!
    const base = slotCenter('economic', 'immediate')
    expect(pos.x).toBeCloseTo(base.x + 10, 5)
    expect(pos.y).toBeCloseTo(base.y - 5, 5)
  })
})
