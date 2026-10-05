<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const drawer = ref<HTMLElement>(), closeButton = ref<HTMLButtonElement>()
const returnFocus = document.activeElement as HTMLElement, previousOverflow = document.body.style.overflow
onMounted(async () => { document.body.style.overflow = 'hidden'; await nextTick(); closeButton.value?.focus() })
onBeforeUnmount(() => { document.body.style.overflow = previousOverflow; if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }) })
function trap(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab') return
  const controls = drawer.value?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select')
  if (!controls?.length) return
  const first = controls[0]!, last = controls[controls.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
</script>
<template><Teleport to="body"><div class="account-drawer-layer" @keydown="trap"><button class="account-drawer-backdrop" aria-label="关闭详情遮罩" @click="emit('close')" /><section ref="drawer" class="account-drawer" role="dialog" aria-modal="true" :aria-label="title"><header><h2>{{ title }}</h2><button ref="closeButton" aria-label="关闭详情" @click="emit('close')"><X :size="22" /></button></header><div class="account-drawer-body"><slot /></div><footer><button class="account-service-secondary" @click="emit('close')">关闭</button></footer></section></div></Teleport></template>
