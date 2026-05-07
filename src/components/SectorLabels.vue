<script setup lang="ts">
import { computed } from 'vue'
import type { Locale } from '@/types'
import { SECTORS, SECTOR_LABELS } from '@/types'
import { SECTOR_ANGLE_DEG, labelRotation, INRADIUS } from '@/lib/geometry'

const props = defineProps<{ locale: Locale; scale?: number }>()

const sc = computed(() => props.scale ?? 1)

// Place labels at 1.22x INRADIUS so they sit outside the pentagon face
// (face = INRADIUS, structural cards reach ~INRADIUS*0.85 + 55px card half-width).
// This guarantees labels never overlap any item card.
const deg = (d: number) => (d * Math.PI) / 180
const LABEL_RADIUS_FACTOR = 1.22

const sectorLabels = computed(() =>
  SECTORS.map((sector) => {
    const angle = SECTOR_ANGLE_DEG[sector]
    const a = deg(angle)
    const r = INRADIUS * sc.value * LABEL_RADIUS_FACTOR
    const rot = labelRotation(angle)
    return {
      x: r * Math.cos(a),
      y: r * Math.sin(a),
      label: SECTOR_LABELS[props.locale][sector],
      rot,
    }
  }),
)
</script>

<template>
  <text
    v-for="sl in sectorLabels"
    :key="sl.label"
    :x="sl.x"
    :y="sl.y"
    text-anchor="middle"
    dominant-baseline="middle"
    :font-size="19 * sc"
    font-weight="800"
    font-family="sans-serif"
    fill="#111827"
    stroke="white"
    :stroke-width="6 * sc"
    paint-order="stroke"
    :transform="`rotate(${sl.rot}, ${sl.x}, ${sl.y})`"
  >
    {{ sl.label }}
  </text>
</template>
