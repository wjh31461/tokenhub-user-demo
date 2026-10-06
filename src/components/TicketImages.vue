<script setup lang="ts">
import { createUuid } from '../utils/uuid'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { TicketAttachment } from '../data/tickets'
const props = defineProps<{ images: TicketAttachment[]; readonly?: boolean; disabled?: boolean; failUpload?: boolean }>()
const emit = defineEmits<{ change: [images: TicketAttachment[]] }>()
const error = ref(''), preview = ref<TicketAttachment>()
const files = new Map<string, File>()
const used = computed(() => props.images.reduce((sum, image) => sum + image.bytes, 0))
const MB = 1024 * 1024
let active = true
onBeforeUnmount(() => { active = false })
function update(id: string, changes: Partial<TicketAttachment>) { if (active) emit('change', props.images.map(image => image.id === id ? { ...image, ...changes } : image)) }
async function upload(image: TicketAttachment, file: File) {
  update(image.id, { state: 'UPLOADING', error: '' })
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    const png = [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    if (!jpeg && !png && !webp) throw new Error('文件内容不是支持的图片，不能仅修改后缀')
    const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file) })
    await new Promise<void>((resolve, reject) => { const decoded = new Image(); decoded.onload = () => resolve(); decoded.onerror = () => reject(new Error('图片损坏或无法解码')); decoded.src = url })
    if (props.failUpload) throw new Error('模拟上传失败，请切换正常场景后重试')
    update(image.id, { state: 'READY', url, expiresAt: Date.now() + 24 * 3600000 })
  } catch (cause) { update(image.id, { state: 'FAILED', error: cause instanceof Error ? cause.message : '上传失败' }) }
}
async function add(incoming: File[]) {
  if (props.disabled || props.readonly) return
  error.value = ''
  let current = [...props.images]
  const accepted: [TicketAttachment, File][] = []
  const rejected: string[] = []
  for (const file of incoming) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) { rejected.push(`${file.name}：仅支持 JPG、JPEG、PNG、WebP`); continue }
    if (file.size > 10 * MB) { rejected.push(`${file.name}：单张不能超过 10 MB`); continue }
    if (current.length >= 10) { rejected.push('每次最多 10 张图片'); continue }
    if (current.reduce((sum, image) => sum + image.bytes, 0) + file.size > 50 * MB) { rejected.push('每次图片合计不能超过 50 MB'); continue }
    const image: TicketAttachment = { id: createUuid(), name: file.name, bytes: file.size, url: '', state: 'UPLOADING' }
    files.set(image.id, file); current.push(image); accepted.push([image, file])
  }
  emit('change', current); error.value = [...new Set(rejected)].join('；')
  // Start after parent props update, so parallel completions merge against the current attachment set.
  await nextTick()
  await Promise.all(accepted.map(([image, file]) => upload(image, file)))
}
function choose(event: Event) { const input = event.target as HTMLInputElement; void add(Array.from(input.files || [])); input.value = '' }
function paste(event: ClipboardEvent) { const incoming = Array.from(event.clipboardData?.files || []); if (incoming.length) { event.preventDefault(); void add(incoming) } }
function remove(id: string) { files.delete(id); emit('change', props.images.filter(image => image.id !== id)) }
function retry(image: TicketAttachment) { const file = files.get(image.id); if (file) void upload(image, file) }
</script>
<template>
  <div class="ticket-images" @paste="paste">
    <template v-if="!readonly"><label class="ticket-image-picker">选择图片<input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="disabled" @change="choose" /></label><div class="ticket-paste" tabindex="0" role="group" aria-label="截图粘贴区">或点击此处粘贴截图（Ctrl / ⌘ + V）</div><small>最多 10 张 · 单张 10 MB · 每次合计 50 MB（按 1024² 字节计算）</small><small>剩余 {{ 10 - images.length }} 张 · {{ ((50 * MB - used) / MB).toFixed(2) }} MB</small></template>
    <div v-if="images.length" class="ticket-image-grid"><article v-for="image in images" :key="image.id"><button v-if="image.url" type="button" :aria-label="`预览 ${image.name}`" @click="preview = image"><img :src="image.url" :alt="image.name" /></button><div v-else class="ticket-image-placeholder">{{ image.state === 'UPLOADING' ? '上传中…' : '上传失败' }}</div><span :title="image.name">{{ image.name }}</span><small>{{ (image.bytes / MB).toFixed(2) }} MB · {{ image.state === 'READY' ? '已就绪' : image.state === 'UPLOADING' ? '上传中' : '失败' }}</small><p v-if="image.error" class="ticket-error">{{ image.error }}</p><div v-if="!readonly"><button v-if="image.state === 'FAILED'" type="button" :disabled="disabled" @click="retry(image)">重新上传</button><button type="button" :disabled="disabled" :aria-label="`移除 ${image.name}`" @click="remove(image.id)">移除</button></div></article></div>
    <p v-if="error" class="ticket-error" role="alert">{{ error }}</p>
    <Teleport to="body"><div v-if="preview" class="ticket-image-overlay" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="preview = undefined" @keydown.esc="preview = undefined"><button type="button" aria-label="关闭图片预览" @click="preview = undefined">关闭</button><img :src="preview.url" :alt="preview.name" /></div></Teleport>
  </div>
</template>
