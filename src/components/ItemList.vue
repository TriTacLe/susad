<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import type { Item, Locale } from '@/types'
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

function polarityClass(polarity: Item['polarity']): string {
  return polarity === 'positive' ? 'text-[#15803d]' : 'text-[#b45309]'
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
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f0f0f0] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
        :title="t.closePanel"
        :aria-label="t.closePanel"
        @click="emit('close')"
      >
        <ChevronLeft :size="16" aria-hidden="true" />
      </button>
    </div>

    <ul class="flex-1 overflow-y-auto py-1" role="listbox" :aria-label="t.itemList">
      <li
        v-for="item in items"
        :key="item.id"
        role="option"
        :aria-selected="selectedId === item.id"
        class="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-[#f0f0f0] border-b border-[#ebebeb] last:border-b-0"
        :class="{ 'bg-[#e8f0fe]': selectedId === item.id }"
        tabindex="0"
        @click="emit('select', item.id)"
        @keydown.enter="emit('select', item.id)"
        @keydown.delete.prevent="emit('delete', item.id)"
      >
        <span
          class="text-xs font-mono mt-0.5 shrink-0"
          :class="polarityClass(item.polarity)"
        >{{ item.polarity === 'positive' ? '+' : '-' }}</span>
        <div class="min-w-0">
          <p class="text-xs font-semibold truncate">{{ item.code }}</p>
          <p class="text-xs text-[#525252] leading-tight">{{ item.label }}</p>
          <p class="text-[11px] text-[#595959] capitalize">{{ item.sector }} / {{ item.ring }}</p>
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
