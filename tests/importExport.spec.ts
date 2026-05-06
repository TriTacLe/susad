import { describe, it, expect } from 'vitest'
import { parseDiagram, parseFile, diagramToJson } from '../src/lib/importExport'
import type { Diagram } from '../src/types'

const valid: Diagram = {
  version: 1,
  system: 'TestApp',
  locale: 'en',
  items: [
    {
      id: 'SE1',
      code: 'SE1',
      label: 'Sustainability',
      sector: 'social',
      ring: 'immediate',
      polarity: 'positive',
      dx: 0,
      dy: 0,
    },
  ],
  edges: [{ id: 'edge-system-SE1', from: 'system', to: 'SE1' }],
}

describe('parseDiagram', () => {
  it('parses valid diagram', () => {
    const result = parseDiagram(valid)
    expect(result.system).toBe('TestApp')
    expect(result.items).toHaveLength(1)
    expect(result.edges).toHaveLength(1)
  })

  it('defaults locale to no when missing', () => {
    const raw = { ...valid, locale: undefined }
    const result = parseDiagram(raw)
    expect(result.locale).toBe('no')
  })

  it('rejects version !== 1', () => {
    expect(() => parseDiagram({ ...valid, version: 2 })).toThrow('version')
  })

  it('rejects invalid sector', () => {
    const bad = { ...valid, items: [{ ...valid.items[0], sector: 'galaxy' }] }
    expect(() => parseDiagram(bad)).toThrow('sector')
  })

  it('rejects invalid ring', () => {
    const bad = { ...valid, items: [{ ...valid.items[0], ring: 'now' }] }
    expect(() => parseDiagram(bad)).toThrow('ring')
  })

  it('rejects invalid polarity', () => {
    const bad = { ...valid, items: [{ ...valid.items[0], polarity: 'maybe' }] }
    expect(() => parseDiagram(bad)).toThrow('polarity')
  })

  it('rejects edge referencing unknown item', () => {
    const bad = { ...valid, edges: [{ id: 'e1', from: 'NONEXISTENT', to: 'system' }] }
    expect(() => parseDiagram(bad)).toThrow('unknown id')
  })

  it('rejects duplicate item ids', () => {
    const bad = { ...valid, items: [valid.items[0], valid.items[0]] }
    expect(() => parseDiagram(bad)).toThrow('Duplicate')
  })

  it('accepts empty edges array', () => {
    const result = parseDiagram({ ...valid, edges: [] })
    expect(result.edges).toHaveLength(0)
  })
})

describe('parseFile', () => {
  it('parses valid JSON string', () => {
    const json = JSON.stringify(valid)
    const result = parseFile(json)
    expect(result.system).toBe('TestApp')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseFile('{not json')).toThrow('valid JSON')
  })
})

describe('diagramToJson', () => {
  it('round-trips a diagram', () => {
    const json = diagramToJson(valid)
    const back = parseDiagram(JSON.parse(json))
    expect(back.system).toBe(valid.system)
    expect(back.items[0]!.id).toBe(valid.items[0]!.id)
  })
})
