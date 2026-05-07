<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { Item, Edge, Sector, Ring, Polarity, Locale } from '@/types'
import { SECTORS, RINGS, SECTOR_LABELS, RING_LABELS } from '@/types'
import { useT } from '@/lib/i18n'

const DEFAULT_W = 110
const DEFAULT_H = 64

const props = defineProps<{
  selectedItem: Item | null
  selectedEdge: Edge | null
  systemName: string
  connectMode: boolean
  connectSourceId: string | null
  locale: Locale
}>()

const emit = defineEmits<{
  updateItem: [payload: { id: string; patch: Partial<Omit<Item, 'id'>> }]
  patchItemLive: [payload: { id: string; patch: Partial<Omit<Item, 'id'>> }]
  deleteItem: [id: string]
  deleteEdge: [id: string]
  resetItemPosition: [id: string]
  startConnect: [fromId: string]
  patchSystemLive: [name: string]
  commitSystem: [name: string]
  close: []
}>()

const t = computed(() => useT(props.locale))

const localLabel = ref('')
const localCode = ref('')
const localSector = ref<Sector>('social')
const localRing = ref<Ring>('immediate')
const localPolarity = ref<Polarity>('positive')
const localColor = ref('')
const effectiveColor = computed(() =>
  localColor.value || (props.selectedItem?.polarity === 'positive' ? '#15803d' : '#b45309'),
)
const localWidth = ref(DEFAULT_W)
const localHeight = ref(DEFAULT_H)
const systemEdit = ref('')

watch(
  () => props.selectedItem,
  (item) => {
    if (item) {
      localLabel.value = item.label
      localCode.value = item.code
      localSector.value = item.sector
      localRing.value = item.ring
      localPolarity.value = item.polarity
      localColor.value = item.color ?? ''
      localWidth.value = item.width ?? DEFAULT_W
      localHeight.value = item.height ?? DEFAULT_H
    }
  },
  { immediate: true },
)

watch(() => props.systemName, (v) => { systemEdit.value = v }, { immediate: true })

function patchLive(patch: Partial<Omit<Item, 'id'>>): void {
  if (!props.selectedItem) return
  emit('patchItemLive', { id: props.selectedItem.id, patch })
}

function commitItem(): void {
  if (!props.selectedItem) return
  emit('updateItem', {
    id: props.selectedItem.id,
    patch: {
      label: localLabel.value,
      code: localCode.value,
      sector: localSector.value,
      ring: localRing.value,
      polarity: localPolarity.value,
      color: localColor.value || undefined,
      width: localWidth.value,
      height: localHeight.value,
    },
  })
}

function sectorLabel(s: Sector): string {
  return SECTOR_LABELS[props.locale][s]
}

function ringLabel(r: Ring): string {
  return RING_LABELS[props.locale][r]
}
</script>

<template>
  <aside
    class="w-64 border-l border-[#d4d4d4] flex flex-col bg-[#fafafa] overflow-y-auto"
    :aria-label="t.inspectorLabel"
  >
    <!-- Header with close -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-[#d4d4d4]">
      <span class="text-sm font-semibold">{{ t.details }}</span>
      <button
        class="w-11 h-11 flex items-center justify-center rounded hover:bg-[#f0f0f0] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.closePanel"
        :aria-label="t.closePanel"
        @click="emit('close')"
      >
        <ChevronRight :size="16" aria-hidden="true" />
      </button>
    </div>

    <!-- System name -->
    <div class="px-3 py-3 border-b border-[#d4d4d4]">
      <label for="system-name" class="block text-xs font-semibold mb-1">{{ t.systemName }}</label>
      <input
        id="system-name"
        v-model="systemEdit"
        type="text"
        class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        @input="emit('patchSystemLive', systemEdit)"
        @blur="emit('commitSystem', systemEdit)"
      />
    </div>

    <!-- No selection -->
    <div v-if="!selectedItem && !selectedEdge" class="px-4 py-6 flex flex-col items-center gap-3 text-center text-xs text-[#737373]">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="8" y="10" width="24" height="18" rx="3" stroke="#d4d4d4" stroke-width="1.5" fill="#f5f5f5"/>
        <rect x="12" y="14" width="10" height="2" rx="1" fill="#d4d4d4"/>
        <rect x="12" y="18" width="16" height="2" rx="1" fill="#d4d4d4"/>
        <rect x="12" y="22" width="8" height="2" rx="1" fill="#d4d4d4"/>
        <circle cx="30" cy="28" r="7" fill="#e8f0fe" stroke="#1d4ed8" stroke-width="1.5"/>
        <path d="M27.5 28h5M30 25.5v5" stroke="#1d4ed8" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <p class="leading-snug">{{ t.selectPrompt }}</p>
      <p class="leading-snug">{{ t.connectPrompt }}</p>
    </div>

    <!-- Selected item -->
    <div v-else-if="selectedItem" class="flex flex-col gap-3 px-3 py-3">
      <h3 class="text-sm font-semibold">{{ t.itemLabel }}: {{ selectedItem.code }}</h3>

      <div>
        <label class="block text-xs font-medium mb-1" for="insp-code">{{ t.code }}</label>
        <input
          id="insp-code"
          v-model="localCode"
          type="text"
          class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @input="patchLive({ code: localCode })"
          @blur="commitItem"
        />
      </div>

      <div>
        <label class="block text-xs font-medium mb-1" for="insp-label">{{ t.label }}</label>
        <textarea
          id="insp-label"
          v-model="localLabel"
          rows="2"
          class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] resize-none"
          @input="patchLive({ label: localLabel })"
          @blur="commitItem"
        />
      </div>

      <div>
        <label class="block text-xs font-medium mb-1" for="insp-sector">{{ t.sector }}</label>
        <select
          id="insp-sector"
          v-model="localSector"
          class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @change="commitItem"
        >
          <option v-for="s in SECTORS" :key="s" :value="s">{{ sectorLabel(s) }}</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium mb-1" for="insp-ring">{{ t.ring }}</label>
        <select
          id="insp-ring"
          v-model="localRing"
          class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @change="commitItem"
        >
          <option v-for="r in RINGS" :key="r" :value="r">{{ ringLabel(r) }}</option>
        </select>
      </div>

      <fieldset>
        <legend class="text-xs font-medium mb-1">{{ t.polarity }}</legend>
        <div class="flex gap-4">
          <label class="flex items-center gap-1.5 text-xs cursor-pointer">
            <input v-model="localPolarity" type="radio" value="positive" @change="commitItem" />
            {{ t.positive }}
          </label>
          <label class="flex items-center gap-1.5 text-xs cursor-pointer">
            <input v-model="localPolarity" type="radio" value="negative" @change="commitItem" />
            {{ t.negative }}
          </label>
        </div>
      </fieldset>

      <!-- Color -->
      <div>
        <label class="block text-xs font-medium mb-1" for="insp-color">{{ t.color }}</label>
        <div class="flex items-center gap-2">
          <input
            id="insp-color"
            :value="effectiveColor"
            type="color"
            class="w-11 h-11 border border-[#d4d4d4] rounded cursor-pointer p-0.5"
            @input="(e) => { localColor = (e.target as HTMLInputElement).value; patchLive({ color: localColor }) }"
            @blur="commitItem"
          />
          <button
            v-if="localColor"
            class="text-xs text-[#737373] underline focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] min-h-[44px] px-1"
            @click="localColor = ''; commitItem()"
          >
            {{ t.resetColor }}
          </button>
          <span v-else class="text-xs text-[#737373]">{{ t.colorHint }}</span>
        </div>
      </div>

      <!-- Size -->
      <div class="flex gap-2">
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1" for="insp-width">{{ t.width }} (px)</label>
          <input
            id="insp-width"
            v-model.number="localWidth"
            type="number"
            min="60"
            max="300"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
            @change="commitItem"
          />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1" for="insp-height">{{ t.height }} (px)</label>
          <input
            id="insp-height"
            v-model.number="localHeight"
            type="number"
            min="40"
            max="200"
            class="w-full border border-[#d4d4d4] rounded px-2 py-1 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
            @change="commitItem"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2 pt-1 border-t border-[#d4d4d4]">
        <button
          class="text-xs px-2 py-1.5 border border-[#d4d4d4] rounded hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] min-h-[36px]"
          @click="emit('resetItemPosition', selectedItem.id)"
        >
          {{ t.resetPosition }}
        </button>

        <button
          v-if="!connectMode"
          class="text-xs px-2 py-1.5 border border-[#1d4ed8] text-[#1d4ed8] rounded hover:bg-blue-50 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8] min-h-[36px]"
          @click="emit('startConnect', selectedItem.id)"
        >
          {{ t.connect }}
        </button>
        <p v-else class="text-xs text-[#525252]">{{ t.connectActive }}</p>

        <button
          class="text-xs px-2 py-1.5 border border-red-400 text-red-700 rounded hover:bg-red-50 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-red-600 min-h-[36px]"
          @click="emit('deleteItem', selectedItem.id)"
        >
          {{ t.deleteItem }}
        </button>
      </div>
    </div>

    <!-- Selected edge -->
    <div v-else-if="selectedEdge" class="px-3 py-3 flex flex-col gap-2">
      <h3 class="text-sm font-semibold">{{ t.edge }}</h3>
      <p class="text-xs text-[#525252]">{{ selectedEdge.from }} &rarr; {{ selectedEdge.to }}</p>
      <button
        class="text-xs px-2 py-1.5 border border-red-400 text-red-700 rounded hover:bg-red-50 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-red-600 min-h-[36px]"
        @click="emit('deleteEdge', selectedEdge.id)"
      >
        {{ t.deleteEdge }}
      </button>
    </div>
  </aside>
</template>
