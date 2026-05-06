<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  selected: boolean
  connectMode: boolean
  scale?: number
}>()

defineEmits<{
  click: []
}>()

const sc = computed(() => props.scale ?? 1)
const rx = computed(() => 60 * sc.value)
const ry = computed(() => 38 * sc.value)
const fontSize = computed(() => 13 * sc.value)
</script>

<template>
  <g
    data-system="true"
    role="button"
    :aria-label="`System node: ${label}`"
    tabindex="0"
    class="cursor-pointer"
    style="pointer-events: all"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <ellipse
      cx="0"
      cy="0"
      :rx="rx"
      :ry="ry"
      fill="#be185d"
      :stroke="selected ? '#1d4ed8' : 'none'"
      :stroke-width="selected ? 2 : 0"
      :stroke-dasharray="selected ? '4 2' : 'none'"
    />
    <text
      x="0"
      y="0"
      text-anchor="middle"
      dominant-baseline="middle"
      :font-size="fontSize"
      font-weight="bold"
      font-family="sans-serif"
      fill="white"
      style="pointer-events: none; user-select: none"
    >
      {{ label }}
    </text>
    <!-- Connect target ring (when in connect mode) -->
    <ellipse
      v-if="connectMode"
      cx="0"
      cy="0"
      :rx="rx + 5"
      :ry="ry + 5"
      fill="none"
      stroke="#1d4ed8"
      stroke-width="2"
      stroke-dasharray="4 2"
    />
  </g>
</template>
