import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Diagram, Item, Edge, Locale, Sector, Ring } from '@/types'
import { computeLayout, computeForceLayout, findNewItemOffset } from '@/lib/layout'
import { detectSectorRing, slotCenter } from '@/lib/geometry'

const SECTOR_PREFIX: Record<Sector, string> = {
  social: 'S', individual: 'I', technical: 'T', economic: 'Ec', environmental: 'En',
}
const RING_PREFIX: Record<Ring, string> = {
  immediate: 'I', enabling: 'E', structural: 'S',
}

function generateItemId(sector: Sector, ring: Ring, items: Item[]): string {
  const prefix = SECTOR_PREFIX[sector] + RING_PREFIX[ring]
  let n = 1
  while (items.find((it) => it.id === `${prefix}${n}`)) n++
  return `${prefix}${n}`
}

const MAX_HISTORY = 50

function emptyDiagram(): Diagram {
  return { version: 1, system: 'My System', locale: 'no', diagramScale: 1.3, items: [], edges: [] }
}

function snapshot(d: Diagram): Diagram {
  return JSON.parse(JSON.stringify(d))
}

export type ConnectState = { mode: 'idle' } | { mode: 'connecting'; fromId: string }

export const useDiagramStore = defineStore(
  'diagram',
  () => {
    const diagram = ref<Diagram>(emptyDiagram())
    const past = ref<Diagram[]>([])
    const future = ref<Diagram[]>([])
    const selectedId = ref<string | null>(null)
    const connectState = ref<ConnectState>({ mode: 'idle' })
    const mutationCount = ref(0)
    const savedMutationCount = ref(0)

    const layout = computed(() => computeLayout(diagram.value.items, diagram.value.diagramScale ?? 1))
    const canUndo = computed(() => past.value.length > 0)
    const canRedo = computed(() => future.value.length > 0)
    const isDirty = computed(
      () => diagram.value.items.length > 0 || diagram.value.edges.length > 0,
    )
    const hasPendingChanges = computed(() => mutationCount.value !== savedMutationCount.value)

    function record(): void {
      past.value.push(snapshot(diagram.value))
      if (past.value.length > MAX_HISTORY) past.value.shift()
      future.value = []
      mutationCount.value++
    }

    function markSaved(): void {
      savedMutationCount.value = mutationCount.value
    }

    function suggestItemCode(sector: Sector, ring: Ring): string {
      return generateItemId(sector, ring, diagram.value.items)
    }

    function undo(): void {
      if (!canUndo.value) return
      future.value.push(snapshot(diagram.value))
      diagram.value = past.value.pop()!
    }

    function redo(): void {
      if (!canRedo.value) return
      past.value.push(snapshot(diagram.value))
      diagram.value = future.value.pop()!
    }

    function load(d: Diagram): void {
      record()
      diagram.value = d
      selectedId.value = null
      connectState.value = { mode: 'idle' }
      const scale = diagram.value.diagramScale ?? 1
      const offsets = computeForceLayout(diagram.value.items, scale)
      for (const item of diagram.value.items) {
        const off = offsets.get(item.id)
        if (off) { item.dx = off.dx; item.dy = off.dy }
      }
    }

    function reset(): void {
      record()
      diagram.value = emptyDiagram()
      selectedId.value = null
      connectState.value = { mode: 'idle' }
    }

    // Live update without recording (for real-time typing)
    function patchSystemLive(name: string): void {
      diagram.value.system = name
    }

    // Record a named undo point (call on blur)
    function commitSystem(name: string): void {
      record()
      diagram.value.system = name
    }

    function setLocale(locale: Locale): void {
      diagram.value.locale = locale
    }

    function addItem(item: Omit<Item, 'dx' | 'dy' | 'id'>): void {
      const id = generateItemId(item.sector, item.ring, diagram.value.items)
      record()
      diagram.value.items.push({ ...item, id, dx: 0, dy: 0 })
      const scale = diagram.value.diagramScale ?? 1
      const newItem = diagram.value.items.at(-1)!
      const off = findNewItemOffset(newItem, diagram.value.items, scale)
      newItem.dx = off.dx
      newItem.dy = off.dy
      selectedId.value = id
    }

    function setDiagramScale(scale: number): void {
      record()
      diagram.value.diagramScale = Math.max(0.3, Math.min(2.5, scale))
      const newScale = diagram.value.diagramScale
      const offsets = computeForceLayout(diagram.value.items, newScale)
      for (const item of diagram.value.items) {
        const off = offsets.get(item.id)
        if (off) { item.dx = off.dx; item.dy = off.dy }
      }
    }

    function updateItem(id: string, patch: Partial<Omit<Item, 'id'>>): void {
      const idx = diagram.value.items.findIndex((it) => it.id === id)
      if (idx === -1) return
      record()
      diagram.value.items[idx] = { ...diagram.value.items[idx]!, ...patch }
    }

    // Live update without undo record (for real-time field editing)
    function patchItemLive(id: string, patch: Partial<Omit<Item, 'id'>>): void {
      const idx = diagram.value.items.findIndex((it) => it.id === id)
      if (idx === -1) return
      diagram.value.items[idx] = { ...diagram.value.items[idx]!, ...patch }
    }

    function moveItem(id: string, dx: number, dy: number): void {
      const idx = diagram.value.items.findIndex((it) => it.id === id)
      if (idx === -1) return
      diagram.value.items[idx]!.dx = dx
      diagram.value.items[idx]!.dy = dy
    }

    function recordMove(): void {
      record()
    }

    // After drag: detect new sector/ring from visual position, update item fields,
    // recompute dx/dy so the item stays exactly where it is visually but resets
    // to the new slot when resetPosition is called.
    function recordAndDetectSector(id: string): void {
      const idx = diagram.value.items.findIndex((it) => it.id === id)
      if (idx === -1) return
      const item = diagram.value.items[idx]!
      // Visual position in SVG coords = slot center + drag offset
      const scale = diagram.value.diagramScale ?? 1
      const slot = slotCenter(item.sector, item.ring, scale)
      const svgX = slot.x + item.dx
      const svgY = slot.y + item.dy
      const detected = detectSectorRing(svgX, svgY, scale)
      if (detected.sector !== item.sector || detected.ring !== item.ring) {
        // New slot center in SVG coords
        const newSlot = slotCenter(detected.sector, detected.ring, scale)
        // Keep visual position the same: new dx/dy = current visual pos - new slot center
        diagram.value.items[idx] = {
          ...item,
          sector: detected.sector,
          ring: detected.ring,
          dx: svgX - newSlot.x,
          dy: svgY - newSlot.y,
        }
      }
      record()
    }

    function resetLayout(): void {
      record()
      const scale = diagram.value.diagramScale ?? 1
      const offsets = computeForceLayout(diagram.value.items, scale)
      for (const item of diagram.value.items) {
        const off = offsets.get(item.id)
        if (off) { item.dx = off.dx; item.dy = off.dy }
      }
    }

    function deleteItem(id: string): void {
      record()
      diagram.value.items = diagram.value.items.filter((it) => it.id !== id)
      diagram.value.edges = diagram.value.edges.filter(
        (e) => e.from !== id && e.to !== id,
      )
      if (selectedId.value === id) selectedId.value = null
    }

    function addEdge(from: string, to: string): void {
      const id = `edge-${from}-${to}`
      if (diagram.value.edges.find((e) => e.id === id)) return
      record()
      diagram.value.edges.push({ id, from, to })
    }

    function deleteEdge(id: string): void {
      record()
      diagram.value.edges = diagram.value.edges.filter((e) => e.id !== id)
      if (selectedId.value === id) selectedId.value = null
    }

    function select(id: string | null): void {
      selectedId.value = id
    }

    function startConnect(fromId: string): void {
      connectState.value = { mode: 'connecting', fromId }
    }

    function finishConnect(toId: string): void {
      if (connectState.value.mode !== 'connecting') return
      const { fromId } = connectState.value
      if (fromId !== toId) {
        addEdge(fromId, toId)
      }
      connectState.value = { mode: 'idle' }
    }

    function cancelConnect(): void {
      connectState.value = { mode: 'idle' }
    }

    function pasteItem(data: Item): void {
      let newId = `${data.id}-copy`
      let n = 2
      while (diagram.value.items.find((it) => it.id === newId)) {
        newId = `${data.id}-copy${n++}`
      }
      record()
      diagram.value.items.push({ ...data, id: newId, dx: 0, dy: 0 })
      const scale = diagram.value.diagramScale ?? 1
      const newItem = diagram.value.items.at(-1)!
      const off = findNewItemOffset(newItem, diagram.value.items, scale)
      newItem.dx = off.dx
      newItem.dy = off.dy
      selectedId.value = newId
    }

    function duplicateItem(id: string): void {
      const item = diagram.value.items.find((it) => it.id === id)
      if (item) pasteItem(item)
    }

    function getDiagramSnapshot(): Diagram {
      return snapshot(diagram.value)
    }

    const selectedItem = computed<Item | null>(
      () => diagram.value.items.find((it) => it.id === selectedId.value) ?? null,
    )
    const selectedEdge = computed<Edge | null>(
      () => diagram.value.edges.find((e) => e.id === selectedId.value) ?? null,
    )

    return {
      diagram,
      layout,
      past,
      future,
      selectedId,
      selectedItem,
      selectedEdge,
      connectState,
      canUndo,
      canRedo,
      isDirty,
      hasPendingChanges,
      markSaved,
      suggestItemCode,
      undo,
      redo,
      load,
      reset,
      patchSystemLive,
      commitSystem,
      setLocale,
      setDiagramScale,
      addItem,
      updateItem,
      patchItemLive,
      moveItem,
      recordMove,
      recordAndDetectSector,
      resetLayout,
      deleteItem,
      addEdge,
      deleteEdge,
      select,
      startConnect,
      finishConnect,
      cancelConnect,
      pasteItem,
      duplicateItem,
      getDiagramSnapshot,
    }
  },
  {
    persist: {
      pick: ['diagram'],
    },
  },
)
