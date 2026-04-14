import type { Diagram, Item, Edge, Sector, Ring, Polarity, Locale } from '@/types'
import { SECTORS, RINGS } from '@/types'
import { computeLayout } from '@/lib/layout'
import {
  CANVAS_SIZE,
  CIRCUMRADIUS,
  VERTEX_ANGLES_DEG,
  RING_BOUNDARY_SCALES,
  INRADIUS,
  SECTOR_ANGLE_DEG,
  labelRotation,
  bezierPath,
  edgeMidpoint,
} from '@/lib/geometry'
import { SECTOR_LABELS, RING_LABELS } from '@/types'

// ---------- Validation ----------

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isSector(v: unknown): v is Sector {
  return SECTORS.includes(v as Sector)
}

function isRing(v: unknown): v is Ring {
  return RINGS.includes(v as Ring)
}

function isPolarity(v: unknown): v is Polarity {
  return v === 'positive' || v === 'negative'
}

function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'no'
}

function validateItem(raw: unknown, index: number): Item {
  if (typeof raw !== 'object' || raw === null) throw new Error(`Item ${index}: not an object`)
  const r = raw as Record<string, unknown>

  if (!isString(r.id) || !r.id) throw new Error(`Item ${index}: missing "id"`)
  if (!isString(r.code)) throw new Error(`Item ${index}: missing "code"`)
  if (!isString(r.label)) throw new Error(`Item ${index}: missing "label"`)
  if (!isSector(r.sector)) throw new Error(`Item ${index} (${r.id}): invalid "sector"`)
  if (!isRing(r.ring)) throw new Error(`Item ${index} (${r.id}): invalid "ring"`)
  if (!isPolarity(r.polarity)) throw new Error(`Item ${index} (${r.id}): invalid "polarity"`)

  return {
    id: r.id as string,
    code: r.code as string,
    label: r.label as string,
    sector: r.sector as Sector,
    ring: r.ring as Ring,
    polarity: r.polarity as Polarity,
    dx: typeof r.dx === 'number' ? r.dx : 0,
    dy: typeof r.dy === 'number' ? r.dy : 0,
    ...(typeof r.width === 'number' ? { width: r.width } : {}),
    ...(typeof r.height === 'number' ? { height: r.height } : {}),
    ...(typeof r.color === 'string' && r.color ? { color: r.color } : {}),
  }
}

function validateEdge(raw: unknown, index: number, itemIds: Set<string>): Edge {
  if (typeof raw !== 'object' || raw === null) throw new Error(`Edge ${index}: not an object`)
  const r = raw as Record<string, unknown>

  if (!isString(r.id) || !r.id) throw new Error(`Edge ${index}: missing "id"`)
  if (!isString(r.from)) throw new Error(`Edge ${index}: missing "from"`)
  if (!isString(r.to)) throw new Error(`Edge ${index}: missing "to"`)

  const validNode = (v: string) => v === 'system' || itemIds.has(v)
  if (!validNode(r.from as string))
    throw new Error(`Edge ${index}: "from" references unknown id "${r.from}"`)
  if (!validNode(r.to as string))
    throw new Error(`Edge ${index}: "to" references unknown id "${r.to}"`)

  return { id: r.id as string, from: r.from as string, to: r.to as string }
}

export function parseDiagram(raw: unknown): Diagram {
  if (typeof raw !== 'object' || raw === null) throw new Error('File is not a JSON object')
  const r = raw as Record<string, unknown>

  if (r.version !== 1) throw new Error(`Unsupported version: ${r.version}`)
  if (!isString(r.system)) throw new Error('Missing "system" label')

  const locale: Locale = isLocale(r.locale) ? r.locale : 'no'

  if (!Array.isArray(r.items)) throw new Error('"items" must be an array')
  const items: Item[] = r.items.map((item, i) => validateItem(item, i))

  const ids = new Set(items.map((it) => it.id))
  if (ids.size !== items.length) throw new Error('Duplicate item ids found')

  const edges: Edge[] = Array.isArray(r.edges)
    ? r.edges.map((e, i) => validateEdge(e, i, ids))
    : []

  const diagramScale = typeof r.diagramScale === 'number' ? r.diagramScale : 1

  return { version: 1, system: r.system as string, locale, diagramScale, items, edges }
}

export function parseFile(text: string): Diagram {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON')
  }
  return parseDiagram(raw)
}

export function diagramToJson(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2)
}

// ---------- SVG Export ----------

const deg = (d: number) => (d * Math.PI) / 180

function pentagonsPath(scale: number): string {
  const pts = VERTEX_ANGLES_DEG.map((a) => ({
    x: CIRCUMRADIUS * scale * Math.cos(deg(a)),
    y: CIRCUMRADIUS * scale * Math.sin(deg(a)),
  }))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

const RING_COLORS = ['#dbeafe', '#bfdbfe', '#93c5fd', '#dbeafe']
const POLARITY_COLORS: Record<Polarity, string> = { positive: '#15803d', negative: '#b45309' }
const SYSTEM_COLOR = '#be185d'
const ITEM_W = 90
const ITEM_H = 50

export function buildExportSvg(diagram: Diagram): string {
  const cs = CANVAS_SIZE
  const half = cs / 2
  const positions = computeLayout(diagram.items)
  const locale = diagram.locale

  // Sector lines from center to each vertex
  const sectorLines = VERTEX_ANGLES_DEG.map((a) => {
    const x = CIRCUMRADIUS * Math.cos(deg(a))
    const y = CIRCUMRADIUS * Math.sin(deg(a))
    return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#262626" stroke-width="1.5"/>`
  }).join('\n  ')

  // Pentagon rings (from outer to inner for layering)
  const ringBgs = [...RING_BOUNDARY_SCALES].reverse().map((scale, i) => {
    const color = RING_COLORS[RING_BOUNDARY_SCALES.length - 1 - i] ?? '#dbeafe'
    return `<path d="${pentagonsPath(scale)}" fill="${color}" stroke="#262626" stroke-width="1"/>`
  }).join('\n  ')

  // Axis label positions
  const axisLabels = (Object.entries(SECTOR_ANGLE_DEG) as [Sector, number][]).map(([sector, angle]) => {
    const pt = edgeMidpoint(angle, 1.0)
    const rot = labelRotation(angle)
    const label = SECTOR_LABELS[locale][sector]
    const isBold = true
    return `<text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="${isBold ? 'bold' : 'normal'}" font-family="sans-serif" transform="rotate(${rot}, ${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})">${label}</text>`
  }).join('\n  ')

  // Ring labels in Economic sector (bottom)
  const ringLabelLines = RINGS.map((ring, i) => {
    const radii = [0.30, 0.57, 0.83]
    const r = INRADIUS * radii[i]
    const a = deg(SECTOR_ANGLE_DEG.economic)
    const x = r * Math.cos(a)
    const y = r * Math.sin(a) - 14
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="#374151">${RING_LABELS[locale][ring]}</text>`
  }).join('\n  ')

  // Arrowhead marker
  const marker = `<defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M 0 0 L 6 3 L 0 6 Z" fill="#171717"/>
    </marker>
  </defs>`

  // System node
  const systemNode = `<ellipse cx="0" cy="0" rx="55" ry="35" fill="${SYSTEM_COLOR}"/>
  <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" font-family="sans-serif" fill="white">${escapeXml(diagram.system)}</text>`

  // Edges
  const edgePaths = diagram.edges.map((edge) => {
    const fromPos = edge.from === 'system' ? { x: 0, y: 0 } : positions.get(edge.from)
    const toPos = edge.to === 'system' ? { x: 0, y: 0 } : positions.get(edge.to)
    if (!fromPos || !toPos) return ''
    return `<path d="${bezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y)}" fill="none" stroke="#171717" stroke-width="2" marker-end="url(#arrow)"/>`
  }).filter(Boolean).join('\n  ')

  // Item nodes
  const itemNodes = diagram.items.map((item) => {
    const pos = positions.get(item.id)
    if (!pos) return ''
    const color = POLARITY_COLORS[item.polarity]
    const x = pos.x - ITEM_W / 2
    const y = pos.y - ITEM_H / 2
    const text = `${item.code}) ${item.label} (${item.polarity === 'positive' ? '+' : '-'})`
    const words = text.split(' ')
    // Split into 2 lines roughly
    const mid = Math.ceil(words.length / 2)
    const line1 = words.slice(0, mid).join(' ')
    const line2 = words.slice(mid).join(' ')
    return `<g>
    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ITEM_W}" height="${ITEM_H}" rx="4" fill="${color}"/>
    <text x="${pos.x.toFixed(1)}" y="${(pos.y - 8).toFixed(1)}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="white">${escapeXml(line1)}</text>
    <text x="${pos.x.toFixed(1)}" y="${(pos.y + 6).toFixed(1)}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="white">${escapeXml(line2)}</text>
  </g>`
  }).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cs}" height="${cs}" viewBox="${-half} ${-half} ${cs} ${cs}">
  <title>SusAD: ${escapeXml(diagram.system)}</title>
  ${marker}
  ${ringBgs}
  ${sectorLines}
  ${edgePaths}
  ${axisLabels}
  ${ringLabelLines}
  ${systemNode}
  ${itemNodes}
</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function downloadSvg(diagram: Diagram): void {
  const svg = buildExportSvg(diagram)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  triggerDownload(blob, `${diagram.system || 'susad'}.svg`)
}

export function downloadPng(diagram: Diagram): void {
  const svg = buildExportSvg(diagram)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob((pngBlob) => {
      if (pngBlob) triggerDownload(pngBlob, `${diagram.system || 'susad'}.png`)
    }, 'image/png')
  }
  img.src = url
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Helper for CSV import (optional enhancement path)
export type CsvRow = Pick<Item, 'code' | 'label' | 'sector' | 'ring' | 'polarity'>

export function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) throw new Error('CSV needs header + at least one row')
  // Expect: code,label,sector,ring,polarity
  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map((c) => c.trim())
    if (cols.length < 5) throw new Error(`CSV row ${i + 2}: expected 5 columns`)
    const [code, label, sector, ring, polarity] = cols
    if (!isSector(sector)) throw new Error(`CSV row ${i + 2}: invalid sector "${sector}"`)
    if (!isRing(ring)) throw new Error(`CSV row ${i + 2}: invalid ring "${ring}"`)
    if (!isPolarity(polarity)) throw new Error(`CSV row ${i + 2}: invalid polarity "${polarity}"`)
    return { code: code!, label: label!, sector, ring, polarity }
  })
}
