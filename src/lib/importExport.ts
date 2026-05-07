import type { Diagram, Item, Edge, Sector, Ring, Polarity, Locale } from '@/types'
import { SECTORS, RINGS } from '@/types'
import { computeLayout } from '@/lib/layout'
import {
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
const EXPORT_ITEM_W = 110
const FONT_FAMILY = 'system-ui, -apple-system, sans-serif'
const EXPORT_HEADER_H = 28
const EXPORT_FOOTER_H = 20
const CARD_PAD_X = 10
const CARD_PAD_Y = 6

function wrapText(text: string, maxWidth: number): string[] {
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.font = `500 12px ${FONT_FAMILY}`
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function estimateExportH(item: Item): number {
  if (item.height !== undefined) return item.height
  const w = item.width ?? EXPORT_ITEM_W
  const lines = wrapText(item.label, w - CARD_PAD_X * 2)
  return Math.max(64, EXPORT_HEADER_H + CARD_PAD_Y + Math.max(1, lines.length) * 17 + CARD_PAD_Y + EXPORT_FOOTER_H)
}

export function buildExportSvg(diagram: Diagram): string {
  const sc = diagram.diagramScale ?? 1
  const positions = computeLayout(diagram.items, sc)
  const locale = diagram.locale

  // Sector lines from center to each vertex
  const sectorLines = VERTEX_ANGLES_DEG.map((a) => {
    const x = CIRCUMRADIUS * sc * Math.cos(deg(a))
    const y = CIRCUMRADIUS * sc * Math.sin(deg(a))
    return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#262626" stroke-width="1.5"/>`
  }).join('\n  ')

  // Pentagon rings (from outer to inner for layering), scaled by diagramScale
  const ringBgs = [...RING_BOUNDARY_SCALES].reverse().map((ringScale, i) => {
    const color = RING_COLORS[RING_BOUNDARY_SCALES.length - 1 - i] ?? '#dbeafe'
    return `<path d="${pentagonsPath(ringScale * sc)}" fill="${color}" stroke="#262626" stroke-width="1"/>`
  }).join('\n  ')

  // Axis label positions
  const axisLabels = (Object.entries(SECTOR_ANGLE_DEG) as [Sector, number][]).map(([sector, angle]) => {
    const pt = edgeMidpoint(angle, sc)
    const rot = labelRotation(angle)
    const label = SECTOR_LABELS[locale][sector]
    return `<text x="${pt.x.toFixed(1)}" y="${pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" font-family="${FONT_FAMILY}" transform="rotate(${rot}, ${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})">${label}</text>`
  }).join('\n  ')

  // Ring labels in Economic sector
  const ringLabelLines = RINGS.map((ring, i) => {
    const radii = [0.30, 0.57, 0.83]
    const r = INRADIUS * (radii[i] ?? 0.5) * sc
    const a = deg(SECTOR_ANGLE_DEG.economic)
    const x = r * Math.cos(a)
    const y = r * Math.sin(a) - 14
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="11" font-family="${FONT_FAMILY}" fill="#374151">${RING_LABELS[locale][ring]}</text>`
  }).join('\n  ')

  // Arrowhead marker
  const marker = `<defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M 0 0 L 6 3 L 0 6 Z" fill="#171717"/>
    </marker>
  </defs>`

  // System node (fixed size, not scaled with diagramScale)
  const systemNode = `<ellipse cx="0" cy="0" rx="60" ry="38" fill="${SYSTEM_COLOR}"/>
  <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold" font-family="${FONT_FAMILY}" fill="white">${escapeXml(diagram.system)}</text>`

  // Edges
  const edgePaths = diagram.edges.map((edge) => {
    const fromPos = edge.from === 'system' ? { x: 0, y: 0 } : positions.get(edge.from)
    const toPos = edge.to === 'system' ? { x: 0, y: 0 } : positions.get(edge.to)
    if (!fromPos || !toPos) return ''
    return `<path d="${bezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y)}" fill="none" stroke="#171717" stroke-width="2" marker-end="url(#arrow)"/>`
  }).filter(Boolean).join('\n  ')

  // Item nodes: auto-height, canvas-accurate text-wrapping
  const itemNodes = diagram.items.map((item) => {
    const pos = positions.get(item.id)
    if (!pos) return ''
    const color = item.color ?? POLARITY_COLORS[item.polarity]
    const w = item.width ?? EXPORT_ITEM_W
    const h = estimateExportH(item)
    const cx = pos.x
    const rx = cx - w / 2
    const ry = pos.y - h / 2
    const clipId = `clip-${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`
    const polaritySign = item.polarity === 'positive' ? '+' : '-'
    const labelLines = wrapText(item.label, w - CARD_PAD_X * 2)
    // header: ry to ry+EXPORT_HEADER_H
    const headerMidY = ry + EXPORT_HEADER_H / 2
    // body text: after header + CARD_PAD_Y top, centered per line
    const labelStartY = ry + EXPORT_HEADER_H + CARD_PAD_Y + 8.5
    const labelEls = labelLines.map((line, i) =>
      `<text x="${cx.toFixed(1)}" y="${(labelStartY + i * 17).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="500" font-family="${FONT_FAMILY}" fill="white">${escapeXml(line)}</text>`
    ).join('\n    ')
    // footer: ry+h-EXPORT_FOOTER_H to ry+h
    const footerMidY = ry + h - EXPORT_FOOTER_H / 2
    return `<g>
    <defs><clipPath id="${clipId}"><rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w}" height="${h}" rx="4"/></clipPath></defs>
    <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w}" height="${h}" rx="4" fill="${color}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    <g clip-path="url(#${clipId})">
    <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w}" height="${EXPORT_HEADER_H}" fill="rgba(0,0,0,0.2)"/>
    <text x="${(rx + CARD_PAD_X).toFixed(1)}" y="${headerMidY.toFixed(1)}" dominant-baseline="middle" font-size="12" font-weight="bold" letter-spacing="0.5" font-family="${FONT_FAMILY}" fill="white">${escapeXml(item.code)}</text>
    <text x="${(rx + w - CARD_PAD_X).toFixed(1)}" y="${headerMidY.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="11" font-weight="bold" font-family="${FONT_FAMILY}" fill="white">${polaritySign}</text>
    ${labelEls}
    <rect x="${rx.toFixed(1)}" y="${(ry + h - EXPORT_FOOTER_H).toFixed(1)}" width="${w}" height="${EXPORT_FOOTER_H}" fill="rgba(0,0,0,0.15)"/>
    <text x="${cx.toFixed(1)}" y="${footerMidY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-family="${FONT_FAMILY}" fill="rgba(255,255,255,0.85)">${escapeXml(RING_LABELS[locale][item.ring].toUpperCase())}</text>
    </g>
  </g>`
  }).join('\n  ')

  // Compute content bounds from all elements
  let minX = -CIRCUMRADIUS * sc
  let minY = -CIRCUMRADIUS * sc
  let maxX = CIRCUMRADIUS * sc
  let maxY = CIRCUMRADIUS * sc

  // System node
  minX = Math.min(minX, -60)
  minY = Math.min(minY, -38)
  maxX = Math.max(maxX, 60)
  maxY = Math.max(maxY, 38)

  // Item cards
  for (const item of diagram.items) {
    const pos = positions.get(item.id)
    if (!pos) continue
    const w = item.width ?? EXPORT_ITEM_W
    const h = estimateExportH(item)
    minX = Math.min(minX, pos.x - w / 2)
    minY = Math.min(minY, pos.y - h / 2)
    maxX = Math.max(maxX, pos.x + w / 2)
    maxY = Math.max(maxY, pos.y + h / 2)
  }

  // Axis labels
  for (const angle of Object.values(SECTOR_ANGLE_DEG) as number[]) {
    const pt = edgeMidpoint(angle, sc)
    minX = Math.min(minX, pt.x - 80)
    minY = Math.min(minY, pt.y - 20)
    maxX = Math.max(maxX, pt.x + 80)
    maxY = Math.max(maxY, pt.y + 20)
  }

  const PAD = 30
  minX -= PAD
  minY -= PAD
  maxX += PAD
  maxY += PAD
  const vbW = maxX - minX
  const vbH = maxY - minY

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}">
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
  const wMatch = svg.match(/^<svg[^>]+width="([\d.]+)"/)
  const hMatch = svg.match(/^<svg[^>]+height="([\d.]+)"/)
  const svgW = wMatch ? parseFloat(wMatch[1]) : 1200
  const svgH = hMatch ? parseFloat(hMatch[1]) : 1200
  const PX = 4
  const outW = Math.ceil(svgW * PX)
  const outH = Math.ceil(svgH * PX)
  // Set SVG intrinsic dimensions to output size so browsers decode at full resolution
  // rather than rasterizing at naturalWidth and then upscaling a bitmap.
  const scaledSvg = svg
    .replace(/(<svg[^>]+)width="[\d.]+"/, `$1width="${outW}"`)
    .replace(/(<svg[^>]+)height="[\d.]+"/, `$1height="${outH}"`)
  const blob = new Blob([scaledSvg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outW, outH)
    ctx.drawImage(img, 0, 0, outW, outH)
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
