<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Sector, Ring, Polarity } from '@/types'
import { SECTORS, RINGS } from '@/types'

const props = defineProps<{
  open: boolean
  prefillSector?: Sector
  prefillRing?: Ring
}>()

const emit = defineEmits<{
  close: []
  add: [{ code: string; label: string; sector: Sector; ring: Ring; polarity: Polarity }]
}>()

const code = ref('')
const label = ref('')
const sector = ref<Sector>('social')
const ring = ref<Ring>('immediate')
const polarity = ref<Polarity>('positive')
const error = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      code.value = ''
      label.value = ''
      sector.value = props.prefillSector ?? 'social'
      ring.value = props.prefillRing ?? 'immediate'
      polarity.value = 'positive'
      error.value = ''
    }
  },
)

function submit(): void {
  error.value = ''
  if (!code.value.trim()) { error.value = 'Code is required'; return }
  if (!label.value.trim()) { error.value = 'Label is required'; return }
  emit('add', {
    code: code.value.trim(),
    label: label.value.trim(),
    sector: sector.value,
    ring: ring.value,
    polarity: polarity.value,
  })
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
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
    <div class="bg-white border border-[#d4d4d4] rounded p-6 w-[360px] shadow-sm">
      <h2 id="dialog-title" class="text-base font-semibold mb-4">Add Item</h2>

      <div v-if="error" class="mb-3 text-sm text-red-700 border border-red-300 bg-red-50 rounded px-3 py-2" role="alert">
        {{ error }}
      </div>

      <div class="space-y-3">
        <div>
          <label for="item-code" class="block text-sm font-medium mb-1">Code <span aria-hidden="true">*</span></label>
          <input
            id="item-code"
            v-model="code"
            type="text"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
            autofocus
          />
        </div>

        <div>
          <label for="item-label" class="block text-sm font-medium mb-1">Label <span aria-hidden="true">*</span></label>
          <input
            id="item-label"
            v-model="label"
            type="text"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          />
        </div>

        <div>
          <label for="item-sector" class="block text-sm font-medium mb-1">Sector <span aria-hidden="true">*</span></label>
          <select
            id="item-sector"
            v-model="sector"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          >
            <option v-for="s in SECTORS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div>
          <label for="item-ring" class="block text-sm font-medium mb-1">Ring <span aria-hidden="true">*</span></label>
          <select
            id="item-ring"
            v-model="ring"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1.5 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          >
            <option v-for="r in RINGS" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <fieldset>
          <legend class="text-sm font-medium mb-1">Polarity <span aria-hidden="true">*</span></legend>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                v-model="polarity"
                type="radio"
                value="positive"
                class="focus:outline focus:outline-2 focus:outline-[#1d4ed8]"
              />
              Positive (+)
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                v-model="polarity"
                type="radio"
                value="negative"
                class="focus:outline focus:outline-2 focus:outline-[#1d4ed8]"
              />
              Negative (-)
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
          Cancel
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm bg-[#1d4ed8] text-white rounded hover:bg-[#1e40af] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="submit"
        >
          Add Item
        </button>
      </div>
    </div>
  </div>
</template>
