export type Sector = 'social' | 'individual' | 'technical' | 'economic' | 'environmental'
export type Ring = 'immediate' | 'enabling' | 'structural'
export type Polarity = 'positive' | 'negative'
export type Locale = 'en' | 'no'

export interface Item {
  id: string
  code: string
  label: string
  sector: Sector
  ring: Ring
  polarity: Polarity
  dx: number
  dy: number
  width?: number
  height?: number
  color?: string
}

export interface Edge {
  id: string
  from: string
  to: string
}

export interface Diagram {
  version: 1
  system: string
  locale: Locale
  diagramScale: number
  items: Item[]
  edges: Edge[]
}

export const SECTORS: Sector[] = ['social', 'individual', 'technical', 'economic', 'environmental']
export const RINGS: Ring[] = ['immediate', 'enabling', 'structural']

export const SECTOR_LABELS: Record<Locale, Record<Sector, string>> = {
  en: {
    social: 'Social',
    individual: 'Individual',
    technical: 'Technical',
    economic: 'Economic',
    environmental: 'Environmental',
  },
  no: {
    social: 'Sosial',
    individual: 'Individuell',
    technical: 'Teknisk',
    economic: 'Økonomisk',
    environmental: 'Miljømessig',
  },
}

export const RING_LABELS: Record<Locale, Record<Ring, string>> = {
  en: {
    immediate: 'Right away',
    enabling: 'Enables',
    structural: 'Long-term',
  },
  no: {
    immediate: 'Med en gang',
    enabling: 'Muliggjør',
    structural: 'Langsiktig',
  },
}

export const POLARITY_LABEL: Record<Polarity, string> = {
  positive: '+',
  negative: '-',
}
