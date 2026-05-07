<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import type { Sector, Ring, Polarity, Locale } from '@/types'
import { SECTORS, RINGS, SECTOR_LABELS, RING_LABELS } from '@/types'
import { useT } from '@/lib/i18n'

const props = defineProps<{
  open: boolean
  locale: Locale
  prefillSector?: Sector
  prefillRing?: Ring
  suggestCode?: (sector: Sector, ring: Ring) => string
}>()

const emit = defineEmits<{
  close: []
  add: [{ code: string; label: string; sector: Sector; ring: Ring; polarity: Polarity }]
}>()

const t = computed(() => useT(props.locale))

const dialogRef = ref<HTMLElement | null>(null)
let triggerEl: HTMLElement | null = null

const code = ref('')
const label = ref('')
const sector = ref<Sector>('social')
const ring = ref<Ring>('immediate')
const polarity = ref<Polarity>('positive')
const error = ref('')

// Track the last auto-suggested code so we can replace it if sector/ring changes
let lastSuggestion = ''

function applySuggestion(): void {
  if (!props.suggestCode) return
  const suggestion = props.suggestCode(sector.value, ring.value)
  // Only auto-fill if code is empty or still matches the previous suggestion
  if (code.value === '' || code.value === lastSuggestion) {
    code.value = suggestion
    lastSuggestion = suggestion
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      triggerEl = document.activeElement as HTMLElement | null
      label.value = ''
      sector.value = props.prefillSector ?? 'social'
      ring.value = props.prefillRing ?? 'immediate'
      polarity.value = 'positive'
      error.value = ''
      lastSuggestion = ''
      code.value = ''
      applySuggestion()
      nextTick(() => {
        dialogRef.value?.querySelector<HTMLElement>('input')?.focus()
      })
    } else {
      triggerEl?.focus()
      triggerEl = null
    }
  },
)

watch([sector, ring], () => {
  applySuggestion()
})

function submit(): void {
  error.value = ''
  if (!code.value.trim()) { error.value = t.value.codeRequired; return }
  if (!label.value.trim()) { error.value = t.value.labelRequired; return }
  emit('add', {
    code: code.value.trim(),
    label: label.value.trim(),
    sector: sector.value,
    ring: ring.value,
    polarity: polarity.value,
  })
}

function trapTab(e: KeyboardEvent): void {
  if (e.key !== 'Tab' || !dialogRef.value) return
  const els = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    ),
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
    aria-labelledby="dialog-title"
    @keydown="onKeydown"
    @click.self="emit('close')"
  >
    <div ref="dialogRef" class="bg-white border border-[#d4d4d4] rounded p-6 w-[360px] shadow-sm">
      <h2 id="dialog-title" class="text-base font-semibold mb-4">{{ t.addItemTitle }}</h2>

      <div v-if="error" id="add-error-msg" class="mb-3 text-sm text-red-700 border border-red-300 bg-red-50 rounded px-3 py-2" role="alert">
        {{ error }}
      </div>

      <div class="space-y-3">
        <div>
          <label for="item-code" class="block text-sm font-medium mb-1">{{ t.code }} <span aria-hidden="true">*</span></label>
          <input
            id="item-code"
            v-model="code"
            type="text"
            :aria-invalid="error === t.codeRequired || undefined"
            :aria-describedby="error ? 'add-error-msg' : undefined"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          />
        </div>

        <div>
          <label for="item-label" class="block text-sm font-medium mb-1">{{ t.label }} <span aria-hidden="true">*</span></label>
          <input
            id="item-label"
            v-model="label"
            type="text"
            :aria-invalid="error === t.labelRequired || undefined"
            :aria-describedby="error ? 'add-error-msg' : undefined"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          />
        </div>

        <div>
          <label for="item-sector" class="block text-sm font-medium mb-1">{{ t.sector }} <span aria-hidden="true">*</span></label>
          <select
            id="item-sector"
            v-model="sector"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          >
            <option v-for="s in SECTORS" :key="s" :value="s">{{ SECTOR_LABELS[locale][s] }}</option>
          </select>
        </div>

        <div>
          <label for="item-ring" class="block text-sm font-medium mb-1">{{ t.ring }} <span aria-hidden="true">*</span></label>
          <select
            id="item-ring"
            v-model="ring"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          >
            <option v-for="r in RINGS" :key="r" :value="r">{{ RING_LABELS[locale][r] }}</option>
          </select>
        </div>

        <fieldset>
          <legend class="text-sm font-medium mb-1">{{ t.polarity }} <span aria-hidden="true">*</span></legend>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                v-model="polarity"
                type="radio"
                value="positive"
                class="focus:outline focus:outline-2 focus:outline-[#1d4ed8]"
              />
              {{ t.positive }}
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                v-model="polarity"
                type="radio"
                value="negative"
                class="focus:outline focus:outline-2 focus:outline-[#1d4ed8]"
              />
              {{ t.negative }}
            </label>
          </div>
        </fieldset>
      </div>

      <div class="flex justify-end gap-2 mt-5">
        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="emit('close')"
        >
          {{ t.cancel }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm bg-[#1d4ed8] text-white rounded hover:bg-[#1e40af] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="submit"
        >
          {{ t.addItem }}
        </button>
      </div>
    </div>
  </div>
</template>
