<script setup lang="ts">
defineProps<{
  label: string
  selected: boolean
  connectMode: boolean
}>()

defineEmits<{
  click: []
}>()
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
      rx="60"
      ry="38"
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
      font-size="13"
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
      rx="65"
      ry="43"
      fill="none"
      stroke="#1d4ed8"
      stroke-width="2"
      stroke-dasharray="4 2"
    />
  </g>
</template>
