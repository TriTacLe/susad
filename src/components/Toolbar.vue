<script setup lang="ts">
import { Undo2, Redo2, LayoutGrid } from 'lucide-vue-next'
import type { Locale } from '@/types'
import { useT } from '@/lib/i18n'
import { computed } from 'vue'

const props = defineProps<{
  locale: Locale
  canUndo: boolean
  canRedo: boolean
  connectMode: boolean
  diagramScale: number
  hasPendingChanges: boolean
}>()

const emit = defineEmits<{
  new: []
  open: []
  save: []
  exportSvg: []
  exportPng: []
  toggleLocale: []
  undo: []
  redo: []
  cancelConnect: []
  cleanupLayout: []
  fitView: []
  diagramScale: [scale: number]
}>()

const t = computed(() => useT(props.locale))

function onScaleInput(e: Event): void {
  emit('diagramScale', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <header class="flex items-center gap-1 px-3 py-2 bg-[#f5f5f5] border-b border-[#d4d4d4] flex-wrap">
    <span class="font-semibold text-sm mr-2">{{ t.appName }}</span>

    <button class="btn" :title="t.new" @click="emit('new')">{{ t.new }}</button>
    <button class="btn" :title="t.open" @click="emit('open')">{{ t.open }}</button>
    <button class="btn relative" :title="t.save" @click="emit('save')">
      {{ t.save }}
      <span
        v-if="hasPendingChanges"
        class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#b45309]"
        :title="t.unsaved ?? 'Unsaved changes'"
        aria-hidden="true"
      />
    </button>

    <span class="w-px h-5 bg-[#d4d4d4] mx-1" aria-hidden="true" />

    <button class="btn" :title="t.exportSvg" @click="emit('exportSvg')">{{ t.exportSvg }}</button>
    <button class="btn" :title="t.exportPng" @click="emit('exportPng')">{{ t.exportPng }}</button>

    <span class="w-px h-5 bg-[#d4d4d4] mx-1" aria-hidden="true" />

    <button
      class="btn gap-1"
      :disabled="!canUndo"
      :title="`${t.undo} (Ctrl+Z)`"
      @click="emit('undo')"
    >
      <Undo2 :size="14" aria-hidden="true" />
      {{ t.undo }}
    </button>
    <button
      class="btn gap-1"
      :disabled="!canRedo"
      :title="`${t.redo} (Ctrl+Y)`"
      @click="emit('redo')"
    >
      <Redo2 :size="14" aria-hidden="true" />
      {{ t.redo }}
    </button>

    <span class="w-px h-5 bg-[#d4d4d4] mx-1" aria-hidden="true" />

    <button
      class="btn gap-1"
      :title="t.cleanupLayout"
      @click="emit('cleanupLayout')"
    >
      <LayoutGrid :size="14" aria-hidden="true" />
      {{ t.cleanupLayout }}
    </button>

    <button
      class="btn gap-1"
      :title="t.fitView"
      @click="emit('fitView')"
    >
      {{ t.fitView }}
    </button>

    <span class="w-px h-5 bg-[#d4d4d4] mx-1" aria-hidden="true" />

    <div class="flex items-center gap-2 text-sm">
      <label for="diagram-scale" class="text-xs text-[#525252] whitespace-nowrap">Scale</label>
      <input
        id="diagram-scale"
        type="range"
        min="0.3"
        max="1.8"
        step="0.05"
        :value="diagramScale"
        class="w-20 h-1 accent-[#1d4ed8]"
        :title="`Diagram scale: ${Math.round(diagramScale * 100)}%`"
        @input="onScaleInput"
      />
      <span class="text-xs text-[#525252] w-8 tabular-nums" aria-live="polite">{{ Math.round(diagramScale * 100) }}%</span>
      <button
        class="btn"
        title="Reset diagram scale to 100%"
        @click="emit('diagramScale', 1)"
      >
        Reset
      </button>
    </div>

    <button
      v-if="connectMode"
      class="btn bg-yellow-100 border-yellow-400 text-yellow-800"
      @click="emit('cancelConnect')"
    >
      {{ t.cancelConnect }}
    </button>

    <span class="flex-1" />

    <button class="btn" :title="t.localeSwitchTitle" @click="emit('toggleLocale')">
      {{ t.locale }}
    </button>
  </header>
</template>

<style scoped>
@reference "tailwindcss";
.btn {
  @apply flex items-center px-2 py-1 text-sm border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px] min-w-[36px];
}
</style>
