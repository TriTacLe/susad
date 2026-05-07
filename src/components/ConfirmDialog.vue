<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  primaryLabel: string
  secondaryLabel?: string
  cancelLabel: string
}>()

const emit = defineEmits<{
  primary: []
  secondary: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const primaryBtnRef = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) nextTick(() => primaryBtnRef.value?.focus())
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
  if (e.key === 'Escape') emit('cancel')
  trapTab(e)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`confirm-title`"
    @keydown="onKeydown"
    @click.self="emit('cancel')"
  >
    <div ref="dialogRef" class="bg-white border border-[#d4d4d4] rounded p-6 w-[360px] shadow-sm">
      <h2 id="confirm-title" class="text-base font-semibold mb-2">{{ title }}</h2>
      <p class="text-sm text-[#525252] mb-5">{{ message }}</p>

      <div class="flex flex-col gap-2">
        <button
          ref="primaryBtnRef"
          class="w-full min-h-[40px] px-3 py-2 text-sm font-semibold bg-[#1d4ed8] text-white rounded hover:bg-[#1e40af] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </button>

        <button
          v-if="secondaryLabel"
          class="w-full min-h-[40px] px-3 py-2 text-sm border border-[#d4d4d4] rounded hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>

        <button
          class="w-full min-h-[40px] px-3 py-2 text-sm text-[#737373] hover:text-[#171717] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
