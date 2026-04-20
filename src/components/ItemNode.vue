<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Item } from '@/types'
import { CANVAS_SIZE } from '@/lib/geometry'

const DEFAULT_W = 90
const DEFAULT_H = 50

const props = defineProps<{
  item: Item
  x: number
  y: number
  selected: boolean
  connectMode: boolean
  isConnectSource: boolean
  zoom: number
}>()

const emit = defineEmits<{
  select: [id: string]
  drag: [id: string, dx: number, dy: number]
  dragend: [id: string, dx: number, dy: number]
  resize: [id: string, w: number, h: number, dx: number, dy: number]
  resizeend: [id: string, w: number, h: number, dx: number, dy: number]
  connectTarget: [id: string]
}>()

const cardW = computed(() => props.item.width ?? DEFAULT_W)
const cardH = computed(() => props.item.height ?? DEFAULT_H)

const style = computed(() => ({
  left: `${props.x + CANVAS_SIZE / 2 - cardW.value / 2}px`,
  top: `${props.y + CANVAS_SIZE / 2 - cardH.value / 2}px`,
  width: `${cardW.value}px`,
  minHeight: `${cardH.value}px`,
}))

const bgColor = computed(() =>
  props.item.color || (props.item.polarity === 'positive' ? '#15803d' : '#b45309'),
)

// --- Drag ---
const dragging = ref(false)
let startPointerX = 0
let startPointerY = 0
let startDx = 0
let startDy = 0
let hasMoved = false

function onPointerDown(e: PointerEvent): void {
  if (props.connectMode) {
    emit('connectTarget', props.item.id)
    return
  }
  emit('select', props.item.id)
  dragging.value = true
  hasMoved = false
  startPointerX = e.clientX
  startPointerY = e.clientY
  startDx = props.item.dx
  startDy = props.item.dy
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  hasMoved = true
  const ddx = (e.clientX - startPointerX) / props.zoom
  const ddy = (e.clientY - startPointerY) / props.zoom
  emit('drag', props.item.id, startDx + ddx, startDy + ddy)
}

function onPointerUp(e: PointerEvent): void {
  if (!dragging.value) return
  dragging.value = false
  if (hasMoved) {
    const ddx = (e.clientX - startPointerX) / props.zoom
    const ddy = (e.clientY - startPointerY) / props.zoom
    emit('dragend', props.item.id, startDx + ddx, startDy + ddy)
  }
}

// --- Resize ---
const resizing = ref(false)
let rsStartX = 0
let rsStartY = 0
let rsStartW = 0
let rsStartH = 0
let rsStartItemDx = 0
let rsStartItemDy = 0
let rsXSign = 1
let rsYSign = 1

function clampW(w: number): number { return Math.round(Math.max(60, Math.min(300, w))) }
function clampH(h: number): number { return Math.round(Math.max(40, Math.min(200, h))) }

function onResizeDown(e: PointerEvent, xSign: number, ySign: number): void {
  e.stopPropagation()
  resizing.value = true
  rsStartX = e.clientX
  rsStartY = e.clientY
  rsStartW = cardW.value
  rsStartH = cardH.value
  rsStartItemDx = props.item.dx
  rsStartItemDy = props.item.dy
  rsXSign = xSign
  rsYSign = ySign
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function computeResize(e: PointerEvent): { w: number; h: number; dx: number; dy: number } {
  const w = clampW(rsStartW + rsXSign * (e.clientX - rsStartX) / props.zoom)
  const h = clampH(rsStartH + rsYSign * (e.clientY - rsStartY) / props.zoom)
  const dx = rsStartItemDx + rsXSign * (w - rsStartW) / 2
  const dy = rsStartItemDy + rsYSign * (h - rsStartH) / 2
  return { w, h, dx, dy }
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing.value) return
  const { w, h, dx, dy } = computeResize(e)
  emit('resize', props.item.id, w, h, dx, dy)
}

function onResizeUp(e: PointerEvent): void {
  if (!resizing.value) return
  resizing.value = false
  const { w, h, dx, dy } = computeResize(e)
  emit('resizeend', props.item.id, w, h, dx, dy)
}
</script>

<template>
  <div
    data-item="true"
    :style="{ ...style, backgroundColor: bgColor }"
    class="absolute rounded border border-white/20 text-white select-none touch-none"
    :class="{
      'outline outline-2 outline-offset-2 outline-[#1d4ed8]': selected && !connectMode,
      'outline outline-2 outline-offset-2 outline-dashed outline-[#1d4ed8]': connectMode && !isConnectSource,
      'cursor-grab': !connectMode && !dragging,
      'cursor-pointer': connectMode,
      'cursor-grabbing': dragging,
    }"
    :aria-label="`${item.polarity === 'positive' ? 'Positive' : 'Negative'} ${item.sector} ${item.ring} effect: ${item.label}`"
    :aria-pressed="selected"
    role="button"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @keydown.enter="emit('select', item.id)"
    @keydown.space.prevent="emit('select', item.id)"
  >
    <!-- Text content in its own overflow-hidden layer so it doesn't interfere with resize handle -->
    <div class="p-1 overflow-hidden w-full h-full pointer-events-none">
      <p class="text-[10px] leading-tight font-semibold truncate">{{ item.code }}</p>
      <p class="text-[9px] leading-tight line-clamp-3">{{ item.label }} ({{ item.polarity === 'positive' ? '+' : '-' }})</p>
    </div>

    <!-- Resize handles: 4 corners, outside overflow-hidden wrapper so always hittable -->
    <template v-if="selected && !connectMode">
      <div
        class="absolute top-0 left-0 w-5 h-5 cursor-nw-resize touch-none"
        style="background: rgba(255,255,255,0.25); border-bottom-right-radius: 4px;"
        aria-hidden="true"
        @pointerdown.stop="onResizeDown($event, -1, -1)"
        @pointermove="onResizeMove"
        @pointerup="onResizeUp"
      />
      <div
        class="absolute top-0 right-0 w-5 h-5 cursor-ne-resize touch-none"
        style="background: rgba(255,255,255,0.25); border-bottom-left-radius: 4px;"
        aria-hidden="true"
        @pointerdown.stop="onResizeDown($event, 1, -1)"
        @pointermove="onResizeMove"
        @pointerup="onResizeUp"
      />
      <div
        class="absolute bottom-0 left-0 w-5 h-5 cursor-sw-resize touch-none"
        style="background: rgba(255,255,255,0.25); border-top-right-radius: 4px;"
        aria-hidden="true"
        @pointerdown.stop="onResizeDown($event, -1, 1)"
        @pointermove="onResizeMove"
        @pointerup="onResizeUp"
      />
      <div
        class="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize touch-none flex items-end justify-end pr-[3px] pb-[3px]"
        style="background: rgba(255,255,255,0.35); border-top-left-radius: 4px;"
        aria-hidden="true"
        @pointerdown.stop="onResizeDown($event, 1, 1)"
        @pointermove="onResizeMove"
        @pointerup="onResizeUp"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <path d="M1 7L7 1M4 7L7 4" stroke="white" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
    </template>
  </div>
</template>
