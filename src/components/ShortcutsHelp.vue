<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Locale } from '@/types'
import { useT } from '@/lib/i18n'

const props = defineProps<{
  open: boolean
  locale: Locale
}>()

const emit = defineEmits<{
  close: []
}>()

const t = computed(() => useT(props.locale))
const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let triggerEl: HTMLElement | null = null

watch(
  () => props.open,
  (v) => {
    if (v) {
      triggerEl = document.activeElement as HTMLElement | null
      nextTick(() => closeBtnRef.value?.focus())
    } else {
      triggerEl?.focus()
      triggerEl = null
    }
  },
)

function trapTab(e: KeyboardEvent): void {
  if (e.key !== 'Tab' || !dialogRef.value) return
  const els = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>('button:not([disabled])'),
  )
  if (els.length === 0) return
  const first = els[0]
  const last = els[els.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
  trapTab(e)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    @keydown="onKeydown"
    @click.self="emit('close')"
  >
    <div ref="dialogRef" class="bg-white border border-[#d4d4d4] rounded p-6 w-[420px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h2 id="shortcuts-title" class="text-base font-semibold">{{ t.shortcutHelpTitle }}</h2>
        <button
          ref="closeBtnRef"
          class="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="emit('close')"
        >
          {{ t.close }}
        </button>
      </div>

      <table class="w-full text-sm border-collapse">
        <tbody>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Ctrl+S</td>
            <td class="py-2">{{ t.shortcutSave }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Ctrl+Z</td>
            <td class="py-2">{{ t.shortcutUndo }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Ctrl+Y / Ctrl+Shift+Z</td>
            <td class="py-2">{{ t.shortcutRedo }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Delete / Backspace</td>
            <td class="py-2">{{ t.shortcutDelete }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Arrow keys</td>
            <td class="py-2">{{ t.shortcutArrows }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Ctrl+C / Ctrl+V</td>
            <td class="py-2">{{ t.shortcutCopy }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Ctrl+D</td>
            <td class="py-2">{{ t.shortcutDuplicate }}</td>
          </tr>
          <tr class="border-b border-[#ebebeb]">
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">Esc</td>
            <td class="py-2">{{ t.shortcutEsc }}</td>
          </tr>
          <tr>
            <td class="py-2 pr-4 font-mono text-xs text-[#525252] whitespace-nowrap">?</td>
            <td class="py-2">{{ t.shortcutHelp }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
