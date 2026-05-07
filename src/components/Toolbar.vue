<script setup lang="ts">
import { Undo2, Redo2, LayoutGrid, FilePlus2, Trash2, FolderOpen, Save, Download, Maximize2, RotateCcw, Keyboard, Globe } from 'lucide-vue-next'
import type { Locale } from '@/types'
import { useT } from '@/lib/i18n'
import { computed, ref, watch } from 'vue'

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
  clearDiagram: []
  cleanupLayout: []
  fitView: []
  diagramScaleLive: [scale: number]
  diagramScale: [scale: number]
  showShortcuts: []
}>()

const t = computed(() => useT(props.locale))

// Local scale tracks slider position immediately for responsive display.
// diagramScaleLive propagates cheap proportional reflow during drag.
// diagramScale (commit) runs full force layout on slider release.
const localScale = ref(props.diagramScale)
watch(() => props.diagramScale, (v) => { localScale.value = v })

function onScaleInput(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value)
  localScale.value = v
  emit('diagramScaleLive', v)
}

function onScaleChange(e: Event): void {
  emit('diagramScale', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <header class="flex items-center gap-1 px-2 py-2 bg-[#f5f5f5] border-b border-[#d4d4d4]">
    <!-- Scrollable main buttons -->
    <div class="scroll-area flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
      <span class="font-semibold text-sm mr-1 shrink-0 hidden sm:inline">{{ t.appName }}</span>

      <!-- File group -->
      <button class="btn gap-1 shrink-0" :title="t.new" @click="emit('new')">
        <FilePlus2 :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.new }}</span>
      </button>
      <button class="btn gap-1 shrink-0" :title="t.open" @click="emit('open')">
        <FolderOpen :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.open }}</span>
      </button>
      <button class="btn gap-1 relative shrink-0" :title="`${t.save} (Ctrl+S)`" @click="emit('save')">
        <Save :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.save }}</span>
        <span
          v-if="hasPendingChanges"
          class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#b45309]"
          :title="t.unsaved"
          aria-hidden="true"
        />
        <span v-if="hasPendingChanges" class="sr-only">{{ t.unsavedChanges }}</span>
      </button>

      <span class="w-px h-5 bg-[#d4d4d4] mx-1 shrink-0" aria-hidden="true" />

      <!-- Export group -->
      <button class="btn gap-1 shrink-0" :title="t.exportSvg" @click="emit('exportSvg')">
        <Download :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.exportSvg }}</span>
      </button>
      <button class="btn gap-1 shrink-0" :title="t.exportPng" @click="emit('exportPng')">
        <Download :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.exportPng }}</span>
      </button>

      <span class="w-px h-5 bg-[#d4d4d4] mx-1 shrink-0" aria-hidden="true" />

      <!-- Edit group -->
      <button
        class="btn gap-1 shrink-0"
        :disabled="!canUndo"
        :title="`${t.undo} (Ctrl+Z)`"
        @click="emit('undo')"
      >
        <Undo2 :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.undo }}</span>
      </button>
      <button
        class="btn gap-1 shrink-0"
        :disabled="!canRedo"
        :title="`${t.redo} (Ctrl+Y / Ctrl+Shift+Z)`"
        @click="emit('redo')"
      >
        <Redo2 :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.redo }}</span>
      </button>
      <button
        class="btn gap-1 shrink-0 border-red-300 text-red-700 hover:bg-red-50"
        :title="t.clearDiagram"
        @click="emit('clearDiagram')"
      >
        <Trash2 :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.clearDiagram }}</span>
      </button>

      <span class="w-px h-5 bg-[#d4d4d4] mx-1 shrink-0" aria-hidden="true" />

      <!-- View group -->
      <button
        class="btn gap-1 shrink-0"
        :title="t.cleanupLayout"
        @click="emit('cleanupLayout')"
      >
        <LayoutGrid :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.cleanupLayout }}</span>
      </button>

      <button
        class="btn gap-1 shrink-0"
        :title="t.fitView"
        @click="emit('fitView')"
      >
        <Maximize2 :size="15" aria-hidden="true" />
        <span class="hidden lg:inline">{{ t.fitView }}</span>
      </button>

      <!-- Scale group -->
      <span class="w-px h-5 bg-[#d4d4d4] mx-1 shrink-0" aria-hidden="true" />
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="btn w-9 text-base font-bold shrink-0"
          :title="`${t.scale} -`"
          :aria-label="`${t.scale} -`"
          @click="emit('diagramScale', Math.max(0.3, Math.round((diagramScale - 0.1) * 10) / 10))"
        >-</button>
        <div class="relative flex items-center">
          <input
            id="diagram-scale"
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            :value="localScale"
            class="w-16 sm:w-20 accent-[#1d4ed8] h-11"
            :title="`${t.scale}: ${Math.round(localScale * 100)}%`"
            :aria-label="t.scale"
            @input="onScaleInput"
            @change="onScaleChange"
          />
        </div>
        <span class="text-xs text-[#525252] w-8 tabular-nums text-center" aria-live="polite">{{ Math.round(localScale * 100) }}%</span>
        <button
          class="btn w-9 text-base font-bold shrink-0"
          :title="`${t.scale} +`"
          :aria-label="`${t.scale} +`"
          @click="emit('diagramScale', Math.min(2.5, Math.round((diagramScale + 0.1) * 10) / 10))"
        >+</button>
        <button
          class="btn shrink-0"
          :title="t.resetScale"
          :aria-label="t.resetScale"
          @click="emit('diagramScale', 1)"
        >
          <RotateCcw :size="14" aria-hidden="true" />
        </button>
      </div>

      <button
        v-if="connectMode"
        class="btn shrink-0 bg-yellow-100 border-yellow-400 text-yellow-800"
        @click="emit('cancelConnect')"
      >
        {{ t.cancelConnect }}
      </button>
    </div>

    <!-- Fixed right: help + locale (always visible) -->
    <div class="flex items-center gap-1 shrink-0 pl-1 ml-1 border-l border-[#d4d4d4]">
      <button class="btn gap-1" :title="t.shortcutHelpTitle" @click="emit('showShortcuts')">
        <Keyboard :size="15" aria-hidden="true" />
      </button>

      <!-- Locale segmented control -->
      <div class="flex border border-[#d4d4d4] rounded overflow-hidden" role="group" :aria-label="t.localeSwitchTitle">
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#1d4ed8] min-h-[44px] min-w-[36px]"
          :class="locale === 'en' ? 'bg-[#1d4ed8] text-white' : 'bg-white hover:bg-[#f5f5f5] text-[#404040]'"
          :aria-pressed="locale === 'en'"
          :title="locale === 'en' ? 'English (current)' : 'Switch to English'"
          @click="locale !== 'en' && emit('toggleLocale')"
        >
          <Globe :size="12" aria-hidden="true" />
          EN
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#1d4ed8] min-h-[44px] min-w-[36px] border-l border-[#d4d4d4]"
          :class="locale === 'no' ? 'bg-[#1d4ed8] text-white' : 'bg-white hover:bg-[#f5f5f5] text-[#404040]'"
          :aria-pressed="locale === 'no'"
          :title="locale === 'no' ? 'Norsk (nåværende)' : 'Bytt til norsk'"
          @click="locale !== 'no' && emit('toggleLocale')"
        >
          NO
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
@reference "tailwindcss";
.btn {
  @apply flex items-center px-2 py-1 text-sm border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px];
}
.scroll-area {
  scrollbar-width: none;
}
.scroll-area::-webkit-scrollbar {
  display: none;
}
</style>
