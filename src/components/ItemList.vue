<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import type { Item, Locale } from '@/types'
import { SECTOR_LABELS, RING_LABELS } from '@/types'
import { useT } from '@/lib/i18n'

const props = defineProps<{
  items: Item[]
  selectedId: string | null
  locale: Locale
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  addItem: []
  close: []
}>()

const t = computed(() => useT(props.locale))
const focusedIndex = ref(-1)

function onListFocus(): void {
  if (focusedIndex.value < 0 && props.items.length > 0) {
    const sel = props.items.findIndex(i => i.id === props.selectedId)
    focusedIndex.value = sel >= 0 ? sel : 0
  }
}

function onListBlur(): void {
  focusedIndex.value = -1
}

function selectAndFocus(idx: number, id: string): void {
  focusedIndex.value = idx
  emit('select', id)
}

function onListKeydown(e: KeyboardEvent): void {
  if (props.items.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = Math.min(focusedIndex.value + 1, props.items.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
  } else if (e.key === 'Home') {
    e.preventDefault()
    focusedIndex.value = 0
  } else if (e.key === 'End') {
    e.preventDefault()
    focusedIndex.value = props.items.length - 1
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (focusedIndex.value >= 0) emit('select', props.items[focusedIndex.value].id)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (focusedIndex.value >= 0) emit('delete', props.items[focusedIndex.value].id)
  }
}
</script>

<template>
  <aside
    class="w-56 border-r border-[#d4d4d4] flex flex-col bg-[#fafafa] overflow-hidden"
    aria-label="Item list"
  >
    <div class="flex items-center justify-between px-3 py-2 border-b border-[#d4d4d4]">
      <h2 class="text-sm font-semibold">{{ t.itemList }} ({{ items.length }})</h2>
      <button
        class="w-11 h-11 flex items-center justify-center rounded hover:bg-[#f0f0f0] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.closePanel"
        :aria-label="t.closePanel"
        @click="emit('close')"
      >
        <ChevronLeft :size="16" aria-hidden="true" />
      </button>
    </div>

    <ul
      class="flex-1 overflow-y-auto py-1"
      role="listbox"
      :aria-label="t.itemList"
      :aria-activedescendant="focusedIndex >= 0 && items[focusedIndex] ? `item-opt-${items[focusedIndex].id}` : undefined"
      tabindex="0"
      @focus="onListFocus"
      @blur="onListBlur"
      @keydown="onListKeydown"
    >
      <li
        v-for="(item, idx) in items"
        :key="item.id"
        :id="`item-opt-${item.id}`"
        role="option"
        :aria-selected="selectedId === item.id"
        class="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-[#f0f0f0] border-b border-[#ebebeb] last:border-b-0 border-l-4"
        :class="{
          'bg-[#e8f0fe]': selectedId === item.id,
          'ring-1 ring-inset ring-[#1d4ed8]': focusedIndex === idx,
          'border-l-[#15803d]': item.polarity === 'positive',
          'border-l-[#b45309]': item.polarity === 'negative',
        }"
        tabindex="-1"
        @click="selectAndFocus(idx, item.id)"
      >
        <span class="sr-only">{{ item.polarity === 'positive' ? t.polarityPositive : t.polarityNegative }}</span>
        <div class="min-w-0">
          <p class="text-xs font-semibold truncate">{{ item.code }}</p>
          <p class="text-xs text-[#525252] leading-tight line-clamp-2">{{ item.label }}</p>
          <p class="text-[11px] text-[#595959]">{{ SECTOR_LABELS[locale][item.sector] }} / {{ RING_LABELS[locale][item.ring] }}</p>
        </div>
      </li>
      <li v-if="items.length === 0" class="px-3 py-4 text-xs text-[#737373] text-center">
        {{ t.noItems }}
      </li>
    </ul>

    <div class="p-2 border-t border-[#d4d4d4]">
      <button
        class="w-full min-h-[44px] px-3 py-2 text-sm font-semibold border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        @click="emit('addItem')"
      >
        {{ t.addItemBtn }}
      </button>
    </div>
  </aside>
</template>
