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
}>()

defineEmits<{ click: [id: string] }>()

const path = computed(() => bezierPath(props.x1, props.y1, props.x2, props.y2))
</script>

<template>
  <g
    data-edge="true"
    role="button"
    :aria-label="`Edge connection`"
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
      stroke-width="2"
      :marker-end="selected ? 'url(#arrow-selected)' : 'url(#arrow)'"
      class="pointer-events-none"
    />
  </g>
</template>
