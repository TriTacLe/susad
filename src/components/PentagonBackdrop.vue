<script setup lang="ts">
import { computed } from 'vue'
import type { Locale } from '@/types'
import { RING_LABELS } from '@/types'
import {
  CIRCUMRADIUS,
  VERTEX_ANGLES_DEG,
  SECTOR_ANGLE_DEG,
  INRADIUS,
} from '@/lib/geometry'

const props = defineProps<{ locale: Locale; scale?: number }>()

const deg = (d: number) => (d * Math.PI) / 180

// Pentagon path at a given scale
function pentPath(scale: number): string {
  const pts = VERTEX_ANGLES_DEG.map((a) => ({
    x: CIRCUMRADIUS * scale * Math.cos(deg(a)),
    y: CIRCUMRADIUS * scale * Math.sin(deg(a)),
  }))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

const sc = computed(() => props.scale ?? 1)

// Draws largest to smallest so each fill covers only center of previous, revealing ring zones
const ringFills = computed(() => [
  { path: pentPath(1.0 * sc.value), fill: '#dbeafe' },
  { path: pentPath(0.68 * sc.value), fill: '#bfdbfe' },
  { path: pentPath(0.38 * sc.value), fill: '#93c5fd' },
  { path: pentPath(0.10 * sc.value), fill: '#ffffff' },
])

const ringSeparatorPaths = computed(() =>
  [1.0, 0.68, 0.38, 0.10].map((f) => pentPath(f * sc.value))
)

// Axis lines: center to each vertex
const axisLines = computed(() =>
  VERTEX_ANGLES_DEG.map((a) => ({
    x: CIRCUMRADIUS * sc.value * Math.cos(deg(a)),
    y: CIRCUMRADIUS * sc.value * Math.sin(deg(a)),
  })),
)

const RING_RADII_FRAC = [0.30, 0.57, 0.83]
const rings = ['immediate', 'enabling', 'structural'] as const

// Ring labels inside the Economic (bottom) sector
const ringLabels = computed(() =>
  rings.map((ring, i) => {
    const r = INRADIUS * RING_RADII_FRAC[i]! * sc.value
    const a = deg(SECTOR_ANGLE_DEG.economic)
    return {
      x: r * Math.cos(a),
      y: r * Math.sin(a) - 12,
      label: RING_LABELS[props.locale][ring],
    }
  }),
)

</script>

<template>
  <!-- Ring fills (largest to smallest for correct zone layering) -->
  <path
    v-for="(ring, i) in ringFills"
    :key="`fill-${i}`"
    :d="ring.path"
    :fill="ring.fill"
    stroke="none"
  />

  <!-- Ring separator lines on top of fills -->
  <path
    v-for="(p, i) in ringSeparatorPaths"
    :key="`sep-${i}`"
    :d="p"
    fill="none"
    stroke="#262626"
    stroke-width="1"
  />

  <!-- Axis lines from center to each vertex -->
  <line
    v-for="(v, i) in axisLines"
    :key="`axis-${i}`"
    x1="0"
    y1="0"
    :x2="v.x"
    :y2="v.y"
    stroke="#262626"
    stroke-width="1.5"
  />

  <!-- Ring labels in Economic sector -->
  <text
    v-for="rl in ringLabels"
    :key="rl.label"
    :x="rl.x"
    :y="rl.y"
    text-anchor="middle"
    dominant-baseline="middle"
    :font-size="12 * sc"
    font-weight="600"
    font-family="sans-serif"
    fill="#1f2937"
    stroke="white"
    :stroke-width="3 * sc"
    paint-order="stroke"
  >
    {{ rl.label }}
  </text>
</template>
