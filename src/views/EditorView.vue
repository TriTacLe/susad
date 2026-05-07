<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { List, SlidersHorizontal } from 'lucide-vue-next'
import { useDiagramStore } from '@/stores/diagram'
import { wouldOverlap } from '@/lib/layout'
import { parseFile, parseDiagram, diagramToJson, downloadSvg, downloadPng } from '@/lib/importExport'
import exampleDiagram from '../../examples/nettdetektivene.susad.json'
import { useT } from '@/lib/i18n'
import DiagramCanvas from '@/components/DiagramCanvas.vue'
import ItemList from '@/components/ItemList.vue'
import Inspector from '@/components/Inspector.vue'
import Toolbar from '@/components/Toolbar.vue'
import AddItemDialog from '@/components/AddItemDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ShortcutsHelp from '@/components/ShortcutsHelp.vue'
import type { Item } from '@/types'

const store = useDiagramStore()
const t = computed(() => useT(store.diagram.locale))

const canvasRef = ref<InstanceType<typeof DiagramCanvas> | null>(null)
const showAddDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref('')
const showList = ref(true)
const showInspector = ref(true)
const clipboard = ref<Item | null>(null)
const showShortcuts = ref(false)
const showOnboarding = ref(false)
const deletionToast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 1024)
const mobilePanel = ref<'list' | 'inspector' | null>(null)

function onResize(): void {
  windowWidth.value = window.innerWidth
}

// Confirm dialogs
const confirmNewOpen = ref(false)
const confirmOpenOpen = ref(false)
const confirmClearOpen = ref(false)

function showDeletionToast(msg: string): void {
  deletionToast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { deletionToast.value = '' }, 4000)
}

function saveFile(): void {
  const json = diagramToJson(store.getDiagramSnapshot())
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.diagram.system || 'susad'}.susad.json`
  a.click()
  URL.revokeObjectURL(url)
  store.markSaved()
}

function triggerOpen(): void {
  fileInput.value?.click()
}

function onFileChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    importError.value = ''
    try {
      const diagram = parseFile(ev.target?.result as string)
      store.load(diagram)
    } catch (err) {
      importError.value = err instanceof Error ? err.message : 'Import failed'
    }
    ;(e.target as HTMLInputElement).value = ''
  }
  reader.readAsText(file)
}

// New diagram flow
function onNew(): void {
  if (store.isDirty) {
    confirmNewOpen.value = true
  } else {
    store.reset()
  }
}

function onNewSaveAndNew(): void {
  confirmNewOpen.value = false
  saveFile()
  store.reset()
}

function onNewDiscard(): void {
  confirmNewOpen.value = false
  store.reset()
}

// Open file flow
function onClearDiagram(): void {
  if (store.isDirty) {
    confirmClearOpen.value = true
  } else {
    store.reset()
  }
}

function onOpen(): void {
  if (store.isDirty) {
    confirmOpenOpen.value = true
  } else {
    triggerOpen()
  }
}

function onOpenReplace(): void {
  confirmOpenOpen.value = false
  triggerOpen()
}

function onAddItem(data: Omit<Item, 'dx' | 'dy' | 'id'>): void {
  try {
    store.addItem(data)
    showAddDialog.value = false
    importError.value = ''
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Failed to add item'
  }
}

function resetPosition(id: string): void {
  store.updateItem(id, { dx: 0, dy: 0 })
}

function onKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement).tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

  if (e.key === 'Escape') {
    if (store.connectState.mode === 'connecting') {
      store.cancelConnect()
      return
    }
    store.select(null)
    return
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
    if (store.selectedItem) {
      store.deleteItem(store.selectedItem.id)
      showDeletionToast(t.value.itemDeletedUndo)
    } else if (store.selectedEdge) {
      store.deleteEdge(store.selectedEdge.id)
      showDeletionToast(t.value.edgeDeletedUndo)
    }
    return
  }

  if (e.key === '?' && !inInput) {
    showShortcuts.value = true
    return
  }

  if ((e.ctrlKey || e.metaKey) && !inInput) {
    if (e.key === 'x') {
      e.preventDefault()
      if (store.selectedItem) {
        clipboard.value = { ...store.selectedItem }
        store.deleteItem(store.selectedItem.id)
      }
      return
    }
    if (e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) { store.redo(); return }
      store.undo()
      return
    }
    if (e.key === 'y') { e.preventDefault(); store.redo(); return }
    if (e.key === 's') { e.preventDefault(); saveFile(); return }
    if (e.key === 'c') {
      if (store.selectedItem) clipboard.value = { ...store.selectedItem }
      return
    }
    if (e.key === 'v') {
      if (clipboard.value) store.pasteItem(clipboard.value)
      return
    }
    if (e.key === 'd') {
      e.preventDefault()
      if (store.selectedItem) store.duplicateItem(store.selectedItem.id)
      return
    }
  }

  if (store.selectedItem && !inInput) {
    const step = e.shiftKey ? 10 : 2
    const item = store.selectedItem
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); if (!wouldOverlap(item.id, item.dx - step, item.dy, store.diagram.items, store.layout)) store.moveItem(item.id, item.dx - step, item.dy); store.recordMove(); break
      case 'ArrowRight': e.preventDefault(); if (!wouldOverlap(item.id, item.dx + step, item.dy, store.diagram.items, store.layout)) store.moveItem(item.id, item.dx + step, item.dy); store.recordMove(); break
      case 'ArrowUp': e.preventDefault(); if (!wouldOverlap(item.id, item.dx, item.dy - step, store.diagram.items, store.layout)) store.moveItem(item.id, item.dx, item.dy - step); store.recordMove(); break
      case 'ArrowDown': e.preventDefault(); if (!wouldOverlap(item.id, item.dx, item.dy + step, store.diagram.items, store.layout)) store.moveItem(item.id, item.dx, item.dy + step); store.recordMove(); break
    }
  }
}

function onBeforeUnload(e: BeforeUnloadEvent): void {
  if (store.hasPendingChanges) {
    e.preventDefault()
    e.returnValue = ''
  }
}

watch(
  () => store.diagram.locale,
  (locale) => { document.documentElement.lang = locale },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('resize', onResize)
  if (!store.isDirty) {
    store.load(parseDiagram(exampleDiagram))
    store.markSaved()
    if (!localStorage.getItem('susad-onboarded')) {
      showOnboarding.value = true
    }
  } else if (store.diagram.items.length > 0 && store.diagram.items.every(i => i.dx === 0 && i.dy === 0)) {
    // Persisted diagram has no layout offsets applied - run force layout silently
    store.resetLayout()
    store.markSaved()
  }
  nextTick(() => canvasRef.value?.fitToScreen())
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('resize', onResize)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden font-sans bg-white">
    <!-- Skip to main content (WCAG) -->
    <a
      href="#main-canvas"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-white focus:border focus:border-[#1d4ed8] focus:rounded text-sm"
    >
      {{ t.skipToDiagram }}
    </a>

    <Toolbar
      :locale="store.diagram.locale"
      :can-undo="store.canUndo"
      :can-redo="store.canRedo"
      :connect-mode="store.connectState.mode === 'connecting'"
      :diagram-scale="store.diagram.diagramScale ?? 1"
      :has-pending-changes="store.hasPendingChanges"
      @new="onNew"
      @clear-diagram="onClearDiagram"
      @open="onOpen"
      @save="saveFile"
      @export-svg="downloadSvg(store.getDiagramSnapshot())"
      @export-png="downloadPng(store.getDiagramSnapshot())"
      @toggle-locale="store.setLocale(store.diagram.locale === 'en' ? 'no' : 'en')"
      @undo="store.undo()"
      @redo="store.redo()"
      @cancel-connect="store.cancelConnect()"
      @cleanup-layout="store.resetLayout()"
      @fit-view="canvasRef?.fitToScreen()"
      @diagram-scale-live="store.setDiagramScaleLive($event)"
      @diagram-scale="store.setDiagramScale($event)"
      @show-shortcuts="showShortcuts = true"
    />

    <!-- Import error banner -->
    <div
      v-if="importError"
      class="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200"
      role="alert"
    >
      {{ importError }}
      <button class="ml-3 underline text-xs" @click="importError = ''">Dismiss</button>
    </div>

    <main id="main-canvas" tabindex="-1" class="relative flex flex-1 overflow-hidden" :class="isMobile ? 'pb-14' : ''">
      <!-- Deletion toast -->
      <div
        class="absolute left-1/2 -translate-x-1/2 z-20 px-4 py-2 text-sm bg-[#171717] text-white rounded shadow-md transition-opacity"
        :class="[deletionToast ? 'opacity-100' : 'opacity-0 pointer-events-none', isMobile ? 'bottom-20' : 'bottom-16']"
        role="status"
        aria-live="polite"
      >
        {{ deletionToast }}
      </div>

      <!-- Onboarding overlay -->
      <div
        v-if="showOnboarding"
        class="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-sm w-[calc(100%-2rem)] px-4 py-3 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-lg shadow-md flex items-start gap-3"
        role="status"
      >
        <span class="flex-1 leading-snug">{{ t.onboardingBanner }}</span>
        <button
          class="shrink-0 text-xs underline focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="showOnboarding = false; localStorage.setItem('susad-onboarded', '1')"
        >{{ t.onboardingDismiss }}</button>
      </div>

      <!-- Connect mode banner -->
      <div
        v-if="store.connectState.mode === 'connecting'"
        class="absolute top-0 left-0 right-0 z-20 px-4 py-2 text-sm bg-yellow-50 border-b border-yellow-300 text-yellow-800 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {{ t.connectModeMsg }}
      </div>

      <!-- Reopen sidebar buttons when hidden (desktop only) -->
      <div v-if="!isMobile" class="absolute top-2 left-2 z-10 flex gap-1">
        <button
          v-if="!showList"
          class="px-2 py-1 text-xs border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="showList = true"
        >
          {{ t.itemList }}
        </button>
      </div>
      <div v-if="!isMobile" class="absolute top-2 right-2 z-10 flex gap-1">
        <button
          v-if="!showInspector"
          class="px-2 py-1 text-xs border border-[#d4d4d4] rounded bg-white hover:bg-[#f5f5f5] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#1d4ed8]"
          @click="showInspector = true"
        >
          {{ t.details }}
        </button>
      </div>

      <ItemList
        v-show="isMobile ? mobilePanel === 'list' : showList"
        :class="isMobile ? 'absolute top-0 left-0 bottom-0 right-0 z-30 !w-auto' : ''"
        :items="store.diagram.items"
        :selected-id="store.selectedId"
        :locale="store.diagram.locale"
        @select="store.select($event)"
        @delete="store.deleteItem($event)"
        @add-item="showAddDialog = true"
        @close="isMobile ? mobilePanel = null : showList = false"
      />

      <DiagramCanvas
        ref="canvasRef"
        class="flex-1"
        :diagram="store.diagram"
        :layout="store.layout"
        :selected-id="store.selectedId"
        :connect-mode="store.connectState.mode === 'connecting'"
        :connect-source-id="store.connectState.mode === 'connecting' ? store.connectState.fromId : null"
        @select-item="store.select($event)"
        @select-edge="store.select($event)"
        @select-system="store.select('system')"
        @deselect-all="store.select(null)"
        @item-drag="(id, dx, dy) => { if (!wouldOverlap(id, dx, dy, store.diagram.items, store.layout)) store.moveItem(id, dx, dy) }"
        @item-drag-end="(id, dx, dy) => { store.recordAndDetectSector(id) }"
        @item-resize="(id, w, h, dx, dy) => store.patchItemLive(id, { width: w, height: h, dx, dy })"
        @item-resize-end="(id, w, h, dx, dy) => store.updateItem(id, { width: w, height: h, dx, dy })"
        @connect-target="store.finishConnect($event)"
        @connect-system="store.finishConnect('system')"
        @add-item="showAddDialog = true"
      />

      <Inspector
        v-show="isMobile ? mobilePanel === 'inspector' : showInspector"
        :class="isMobile ? 'absolute top-0 left-0 bottom-0 right-0 z-30 !w-auto' : ''"
        :selected-item="store.selectedItem"
        :selected-edge="store.selectedEdge"
        :system-name="store.diagram.system"
        :connect-mode="store.connectState.mode === 'connecting'"
        :connect-source-id="store.connectState.mode === 'connecting' ? store.connectState.fromId : null"
        :locale="store.diagram.locale"
        @update-item="store.updateItem($event.id, $event.patch)"
        @patch-item-live="store.patchItemLive($event.id, $event.patch)"
        @delete-item="store.deleteItem($event)"
        @delete-edge="store.deleteEdge($event)"
        @reset-item-position="resetPosition($event)"
        @start-connect="store.startConnect($event)"
        @patch-system-live="store.patchSystemLive($event)"
        @commit-system="store.commitSystem($event)"
        @close="isMobile ? mobilePanel = null : showInspector = false"
      />

      <!-- Mobile bottom tab bar -->
      <nav
        v-if="isMobile"
        class="absolute bottom-0 left-0 right-0 h-14 flex border-t border-[#d4d4d4] bg-white z-20"
        :aria-label="t.itemList + ' / ' + t.details"
      >
        <button
          class="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#1d4ed8]"
          :class="mobilePanel === 'list' ? 'text-[#1d4ed8] bg-blue-50' : 'text-[#525252]'"
          :aria-pressed="mobilePanel === 'list'"
          @click="mobilePanel = mobilePanel === 'list' ? null : 'list'"
        >
          <List :size="20" aria-hidden="true" />
          {{ t.itemList }}
        </button>
        <button
          class="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium border-l border-[#d4d4d4] focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#1d4ed8]"
          :class="mobilePanel === 'inspector' ? 'text-[#1d4ed8] bg-blue-50' : 'text-[#525252]'"
          :aria-pressed="mobilePanel === 'inspector'"
          @click="mobilePanel = mobilePanel === 'inspector' ? null : 'inspector'"
        >
          <SlidersHorizontal :size="20" aria-hidden="true" />
          {{ t.details }}
        </button>
      </nav>
    </main>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept=".json,.susad.json"
      class="sr-only"
      tabindex="-1"
      @change="onFileChange"
    />

    <AddItemDialog
      :open="showAddDialog"
      :locale="store.diagram.locale"
      :suggest-code="store.suggestItemCode"
      @close="showAddDialog = false"
      @add="onAddItem($event)"
    />

    <!-- Clear diagram confirm -->
    <ConfirmDialog
      :open="confirmClearOpen"
      :title="t.clearConfirmTitle"
      :message="t.clearConfirmMsg"
      :primary-label="t.clearConfirm"
      :cancel-label="t.cancel"
      @primary="confirmClearOpen = false; store.reset()"
      @cancel="confirmClearOpen = false"
    />

    <!-- New diagram confirm -->
    <ConfirmDialog
      :open="confirmNewOpen"
      :title="t.newConfirmTitle"
      :message="t.newConfirmMsg"
      :primary-label="t.saveAndNew"
      :secondary-label="t.discardAndNew"
      :cancel-label="t.cancel"
      @primary="onNewSaveAndNew"
      @secondary="onNewDiscard"
      @cancel="confirmNewOpen = false"
    />

    <!-- Open file confirm -->
    <ConfirmDialog
      :open="confirmOpenOpen"
      :title="t.openConfirmTitle"
      :message="t.openConfirmMsg"
      :primary-label="t.openReplace"
      :cancel-label="t.cancel"
      @primary="onOpenReplace"
      @cancel="confirmOpenOpen = false"
    />

    <ShortcutsHelp
      :open="showShortcuts"
      :locale="store.diagram.locale"
      @close="showShortcuts = false"
    />
  </div>
</template>
