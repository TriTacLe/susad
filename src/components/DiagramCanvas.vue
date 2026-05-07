<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Diagram } from '@/types'
import type { LayoutPosition } from '@/lib/layout'
import { CANVAS_SIZE } from '@/lib/geometry'
import { useT } from '@/lib/i18n'
import PentagonBackdrop from './PentagonBackdrop.vue'
import SectorLabels from './SectorLabels.vue'
import SystemNode from './SystemNode.vue'
import EdgeArrow from './EdgeArrow.vue'
import ItemNode from './ItemNode.vue'

const props = defineProps<{
  diagram: Diagram
  layout: Map<string, LayoutPosition>
  selectedId: string | null
  connectMode: boolean
  connectSourceId: string | null
}>()

const emit = defineEmits<{
  selectItem: [id: string]
  selectEdge: [id: string]
  selectSystem: []
  deselectAll: []
  itemDrag: [id: string, dx: number, dy: number]
  itemDragEnd: [id: string, dx: number, dy: number]
  itemResize: [id: string, w: number, h: number, dx: number, dy: number]
  itemResizeEnd: [id: string, w: number, h: number, dx: number, dy: number]
  connectTarget: [id: string]
  connectSystem: []
  addItem: []
}>()

const viewport = ref<HTMLDivElement | null>(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const half = CANVAS_SIZE / 2
const t = computed(() => useT(props.diagram.locale))

onMounted(() => {
  const rect = viewport.value!.getBoundingClientRect()
  panX.value = (rect.width - CANVAS_SIZE) / 2
  panY.value = (rect.height - CANVAS_SIZE) / 2
  viewport.value!.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  viewport.value?.removeEventListener('wheel', onWheel)
})

const worldStyle = computed(() => ({
  position: 'absolute' as const,
  top: 0,
  left: 0,
  width: `${CANVAS_SIZE}px`,
  height: `${CANVAS_SIZE}px`,
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
}))

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect = viewport.value!.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  const newZoom = Math.min(5, Math.max(0.1, zoom.value * factor))
  panX.value = cx + (panX.value - cx) * (newZoom / zoom.value)
  panY.value = cy + (panY.value - cy) * (newZoom / zoom.value)
  zoom.value = newZoom
}

function zoomBy(factor: number): void {
  const cx = viewport.value ? viewport.value.clientWidth / 2 : 0
  const cy = viewport.value ? viewport.value.clientHeight / 2 : 0
  const newZoom = Math.min(5, Math.max(0.1, zoom.value * factor))
  panX.value = cx + (panX.value - cx) * (newZoom / zoom.value)
  panY.value = cy + (panY.value - cy) * (newZoom / zoom.value)
  zoom.value = newZoom
}

function resetZoom(): void {
  if (!viewport.value) return
  const rect = viewport.value.getBoundingClientRect()
  zoom.value = 1
  panX.value = (rect.width - CANVAS_SIZE) / 2
  panY.value = (rect.height - CANVAS_SIZE) / 2
}

function fitToScreen(): void {
  if (!viewport.value) return
  const rect = viewport.value.getBoundingClientRect()
  const fitZoom = Math.min(rect.width / CANVAS_SIZE, rect.height / CANVAS_SIZE) * 0.95
  zoom.value = fitZoom
  panX.value = (rect.width - CANVAS_SIZE * fitZoom) / 2
  panY.value = (rect.height - CANVAS_SIZE * fitZoom) / 2
}

defineExpose({ zoomBy, resetZoom, fitToScreen })

const panning = ref(false)
let panStartX = 0
let panStartY = 0
let panMoved = false

function isInteractive(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as Element
  return !!(
    el.closest('[data-item]') ||
    el.closest('[data-edge]') ||
    el.closest('[data-system]') ||
    el.closest('button')
  )
}

function onViewportPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  if (isInteractive(e.target)) return
  panning.value = true
  panMoved = false
  panStartX = e.clientX - panX.value
  panStartY = e.clientY - panY.value
  viewport.value!.setPointerCapture(e.pointerId)
}

function onViewportPointerMove(e: PointerEvent): void {
  if (!panning.value) return
  const nx = e.clientX - panStartX
  const ny = e.clientY - panStartY
  if (Math.abs(nx - panX.value) > 2 || Math.abs(ny - panY.value) > 2) panMoved = true
  panX.value = nx
  panY.value = ny
}

function onViewportPointerUp(): void {
  if (!panning.value) return
  panning.value = false
  if (!panMoved) emit('deselectAll')
}

function nodePos(id: string): LayoutPosition {
  return props.layout.get(id) ?? { x: 0, y: 0 }
}

const edgesWithCoords = computed(() =>
  props.diagram.edges.map((edge) => {
    const from = edge.from === 'system' ? { x: 0, y: 0 } : nodePos(edge.from)
    const to = edge.to === 'system' ? { x: 0, y: 0 } : nodePos(edge.to)
    const fromItem = props.diagram.items.find(i => i.id === edge.from)
    const toItem = props.diagram.items.find(i => i.id === edge.to)
    return {
      ...edge,
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      fromLabel: fromItem?.code ?? edge.from,
      toLabel: toItem?.code ?? edge.to,
    }
  }),
)
</script>

<template>
  <div
    ref="viewport"
    class="relative overflow-hidden bg-[#f5f5f5]"
    role="img"
    :aria-label="`SusAD diagram for ${diagram.system}`"
    :style="{ cursor: panning ? 'grabbing' : 'grab', touchAction: 'none' }"
    @pointerdown="onViewportPointerDown"
    @pointermove="onViewportPointerMove"
    @pointerup="onViewportPointerUp"
  >
    <!-- World: everything that zooms and pans -->
    <div :style="worldStyle">
      <!-- Single SVG for backdrop + edges + system node -->
      <svg
        :width="CANVAS_SIZE"
        :height="CANVAS_SIZE"
        :viewBox="`${-half} ${-half} ${CANVAS_SIZE} ${CANVAS_SIZE}`"
        class="absolute inset-0"
        style="overflow: visible; background: transparent"
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#171717" />
          </marker>
          <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#1d4ed8" />
          </marker>
        </defs>

        <!-- White canvas that grows with diagramScale -->
        <rect
          :x="-half * (diagram.diagramScale ?? 1)"
          :y="-half * (diagram.diagramScale ?? 1)"
          :width="CANVAS_SIZE * (diagram.diagramScale ?? 1)"
          :height="CANVAS_SIZE * (diagram.diagramScale ?? 1)"
          fill="white"
          stroke="#d4d4d4"
          stroke-width="1"
        />

        <!-- Static backdrop (no pointer events) -->
        <g style="pointer-events: none">
          <PentagonBackdrop :locale="diagram.locale" :scale="diagram.diagramScale ?? 1" />
        </g>

        <!-- Edges -->
        <EdgeArrow
          v-for="edge in edgesWithCoords"
          :id="edge.id"
          :key="edge.id"
          :x1="edge.x1"
          :y1="edge.y1"
          :x2="edge.x2"
          :y2="edge.y2"
          :selected="selectedId === edge.id"
          :scale="diagram.diagramScale ?? 1"
          :from-label="edge.fromLabel"
          :to-label="edge.toLabel"
          @click="emit('selectEdge', $event)"
        />

        <!-- System node -->
        <SystemNode
          :label="diagram.system"
          :selected="selectedId === 'system'"
          :connect-mode="connectMode"
          :scale="diagram.diagramScale ?? 1"
          @click="connectMode ? emit('connectSystem') : emit('selectSystem')"
        />
      </svg>

      <!-- Item nodes (HTML, for rich text + drag) -->
      <ItemNode
        v-for="item in diagram.items"
        :key="item.id"
        :item="item"
        :x="nodePos(item.id).x"
        :y="nodePos(item.id).y"
        :selected="selectedId === item.id"
        :connect-mode="connectMode"
        :is-connect-source="connectSourceId === item.id"
        :zoom="zoom"
        :locale="diagram.locale"
        @select="emit('selectItem', $event)"
        @drag="(id, dx, dy) => emit('itemDrag', id, dx, dy)"
        @dragend="(id, dx, dy) => emit('itemDragEnd', id, dx, dy)"
        @resize="(id, w, h, dx, dy) => emit('itemResize', id, w, h, dx, dy)"
        @resizeend="(id, w, h, dx, dy) => emit('itemResizeEnd', id, w, h, dx, dy)"
        @connect-target="emit('connectTarget', $event)"
      />

      <!-- Sector label overlay: rendered after HTML item cards so labels always appear on top -->
      <svg
        :width="CANVAS_SIZE"
        :height="CANVAS_SIZE"
        :viewBox="`${-half} ${-half} ${CANVAS_SIZE} ${CANVAS_SIZE}`"
        class="absolute inset-0"
        style="overflow: visible; pointer-events: none"
      >
        <SectorLabels :locale="diagram.locale" :scale="diagram.diagramScale ?? 1" />
      </svg>

      <!-- Screen reader mirror -->
      <ul class="sr-only" aria-label="Diagram items">
        <li v-for="item in diagram.items" :key="`sr-${item.id}`">
          {{ item.code }}: {{ item.label }} - {{ item.polarity }} {{ item.sector }} {{ item.ring }} effect
        </li>
      </ul>
    </div>

    <!-- Zoom controls (viewport-fixed, bottom-right) -->
    <div class="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
      <button
        class="w-11 h-11 flex items-center justify-center border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] text-sm font-bold focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.zoomIn"
        @pointerdown.stop
        @click="zoomBy(1.2)"
      >
        +
      </button>
      <button
        class="w-11 h-11 flex items-center justify-center border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] text-sm font-bold focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.zoomOut"
        @pointerdown.stop
        @click="zoomBy(1 / 1.2)"
      >
        -
      </button>
      <button
        class="w-11 h-11 flex items-center justify-center border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] text-[10px] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.resetZoom"
        @pointerdown.stop
        @click="resetZoom"
      >
        1:1
      </button>
    </div>

    <!-- Empty state (viewport-fixed so it doesn't zoom) -->
    <div
      v-if="diagram.items.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <p class="text-sm font-medium text-[#404040]">{{ t.emptyStateTitle }}</p>
      <p class="text-xs text-[#595959] mt-1 max-w-[220px] text-center">{{ t.emptyState }}</p>
    </div>

    <!-- Add item: bottom center, always accessible -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <button
        class="px-4 h-9 flex items-center gap-1 border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] text-sm font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        @pointerdown.stop
        @click="emit('addItem')"
      >
        + {{ t.addItem }}
      </button>
    </div>
  </div>
</template>
