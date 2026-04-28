<script setup lang="ts">
defineProps<{
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

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('cancel')
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
    <div class="bg-white border border-[#d4d4d4] rounded p-6 w-[360px] shadow-sm">
      <h2 id="confirm-title" class="text-base font-semibold mb-2">{{ title }}</h2>
      <p class="text-sm text-[#525252] mb-5">{{ message }}</p>

      <div class="flex flex-col gap-2">
        <button
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
