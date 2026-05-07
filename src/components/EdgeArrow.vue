<script setup lang="ts">
import { computed } from 'vue'
import { bezierPath } from '@/lib/geometry'

const props = defineProps<{
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  selected: boolean
  scale?: number
  fromLabel?: string
  toLabel?: string
}>()

defineEmits<{ click: [id: string] }>()

const path = computed(() => bezierPath(props.x1, props.y1, props.x2, props.y2))
const sw = computed(() => 2 * (props.scale ?? 1))
const ariaLabel = computed(() =>
  props.fromLabel && props.toLabel
    ? `${props.fromLabel} -> ${props.toLabel}`
    : 'Edge connection',
)
</script>

<template>
  <g
    data-edge="true"
    role="button"
    :aria-label="ariaLabel"
    tabindex="0"
    style="pointer-events: all"
    @click="$emit('click', id)"
    @keydown.enter="$emit('click', id)"
    @keydown.space.prevent="$emit('click', id)"
  >
    <!-- Wider invisible hit area -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="12"
      class="cursor-pointer"
      pointer-events="all"
    />
    <path
      :d="path"
      fill="none"
      :stroke="selected ? '#1d4ed8' : '#171717'"
      :stroke-width="sw"
      :marker-end="selected ? 'url(#arrow-selected)' : 'url(#arrow)'"
      class="pointer-events-none"
    />
  </g>
</template>

<style scoped>
g:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}
</style>
