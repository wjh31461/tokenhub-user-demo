<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-vue-next'
import TicketImages from './TicketImages.vue'
import { publishedDocs } from '../data/docs'
import { currentTicketAccount, loadTickets, saveTicket, newEvent, validateTicketImages, ticketCategoryNames, ticketStatusNames, ticketSummary, ticketTime, type TicketAttachment, type TicketCategory, type TicketRecord } from '../data/tickets'
const route = useRoute(), router = useRouter()
const records = ref<TicketRecord[]>([]), loading = ref(false), loadError = ref(false), scenario = ref('normal'), notice = ref('')
const isNew = computed(() => route.path === '/tickets/new')
const ticketId = computed(() => typeof route.params.ticketId === 'string' ? route.params.ticketId : '')
const selected = computed(() => records.value.find(record => record.id === ticketId.value && record.accountId === currentTicketAccount))
const isList = computed(() => !isNew.value && !ticketId.value)
const filter = ref({ status: '', category: '', ticketNo: '' })
const applied = computed(() => ({ status: typeof route.query.status === 'string' && Object.hasOwn(ticketStatusNames, route.query.status) ? route.query.status : '', category: typeof route.query.category === 'string' && Object.hasOwn(ticketCategoryNames, route.query.category) ? route.query.category : '', ticketNo: typeof route.query.ticketNo === 'string' ? route.query.ticketNo : '' }))
const filtered = computed(() => scenario.value === 'empty' ? [] : records.value.filter(record => record.accountId === currentTicketAccount && (!applied.value.status || record.status === applied.value.status) && (!applied.value.category || record.category === applied.value.category) && (!applied.value.ticketNo || record.ticketNo === applied.value.ticketNo)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id)))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 20)))
const page = computed(() => Math.min(pageCount.value, Math.max(1, parseInt(String(route.query.page || '1')) || 1)))
const rows = computed(() => filtered.value.slice((page.value - 1) * 20, page.value * 20))
const listQuery = computed(() => ({ ...applied.value, page: String(page.value) }))
const formCategory = ref<TicketCategory | ''>(''), description = ref(''), images = ref<TicketAttachment[]>([])
const reply = ref(''), replyImages = ref<TicketAttachment[]>([]), busy = ref(false), actionError = ref(''), categoryError = ref(''), descriptionError = ref(''), timelineLimit = ref(20)
const related = computed(() => {
  const id = String(route.query.relatedTicketId || (route.query.sourceType === 'TICKET' ? route.query.sourceId || '' : ''))
  return records.value.find(record => (record.id === id || record.ticketNo === id) && record.accountId === currentTicketAccount)
})
const hasRelated = computed(() => Boolean(route.query.relatedTicketId || route.query.sourceType === 'TICKET'))
const timeline = computed(() => [...(selected.value?.timeline || [])].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)))
const events = computed(() => timeline.value.slice(-timelineLimit.value))
const hasSupportReply = computed(() => selected.value?.timeline.some(event => event.sender === 'SUPPORT' && (event.kind === 'MESSAGE' || /已解决|已关闭/.test(event.content))))
const dirty = computed(() => isNew.value ? Boolean(formCategory.value || description.value || images.value.length) : Boolean(reply.value || replyImages.value.length))
let allowLeave = false, generation = 0
async function load(retry = false) {
  const request = ++generation; loading.value = true; loadError.value = false
  try { const result = await loadTickets(); if (request !== generation) return; if (scenario.value === 'error' && !retry) throw new Error('模拟查询失败'); records.value = result }
  catch { if (request === generation) loadError.value = true }
  finally { if (request === generation) loading.value = false }
}
async function query(reset = false) { if (reset) filter.value = { status: '', category: '', ticketNo: '' }; await router.push({ path: '/tickets', query: reset ? { page: '1' } : { status: filter.value.status || undefined, category: filter.value.category || undefined, ticketNo: filter.value.ticketNo.trim() || undefined, page: '1' } }); void load() }
function paginate(delta: number) { router.push({ path: '/tickets', query: { ...listQuery.value, page: String(page.value + delta) } }) }
function open(record: TicketRecord) { router.push({ path: `/tickets/${record.id}`, query: listQuery.value }) }
function back() { router.push({ path: '/tickets', query: listQuery.value }) }
function goNew() { router.push({ path: '/tickets/new', query: listQuery.value }) }
function createRelated() { if (selected.value) router.push({ path: '/tickets/new', query: { ...listQuery.value, relatedTicketId: selected.value.id } }) }
function validImages(value: TicketAttachment[]) { const error = validateTicketImages(value); if (error) { actionError.value = error; return false } return true }
async function submit() {
  if (busy.value) return
  categoryError.value = formCategory.value ? '' : '请选择问题类型'
  descriptionError.value = !description.value.trim() ? '请填写问题描述' : Array.from(description.value.trim()).length > 5000 ? '问题描述不能超过 5000 字' : ''
  actionError.value = ''
  if (categoryError.value || descriptionError.value || !validImages(images.value)) return
  if (hasRelated.value && !related.value) { actionError.value = '原工单不存在或无权查看，不能关联'; return }
  busy.value = true
  try {
    if (scenario.value === 'submitError') throw new Error('模拟提交失败，请切换正常场景后重试')
    const now = new Date().toISOString(), id = crypto.randomUUID()
    const record: TicketRecord = { id, ticketNo: `TH${ticketTime(now).slice(0, 10).replaceAll('-', '')}${id.slice(0, 8).toUpperCase()}`, accountId: currentTicketAccount, category: formCategory.value as TicketCategory, status: 'PENDING', description: description.value.trim(), createdAt: now, needsUserReply: false, attachments: structuredClone(toRaw(images.value)), relatedTicketId: related.value?.id, timeline: [newEvent('工单已提交，待处理', now, 'SYSTEM', 'STATUS')] }
    await saveTicket(record); records.value.unshift(record); notice.value = '工单提交成功'; description.value = ''; images.value = []; formCategory.value = ''; allowLeave = true
    await router.replace({ path: `/tickets/${id}`, query: listQuery.value })
  } catch (cause) { actionError.value = cause instanceof Error ? cause.message : '提交失败，内容已保留，请重试' }
  finally { busy.value = false; allowLeave = false }
}
async function send() {
  if (busy.value || !selected.value) return
  actionError.value = ''
  const text = reply.value.trim()
  if (!text && !replyImages.value.length) { actionError.value = '请填写留言或添加图片'; return }
  if (Array.from(text).length > 5000) { actionError.value = '留言不能超过 5000 字'; return }
  if (!validImages(replyImages.value)) return
  busy.value = true
  try {
    const latest = (await loadTickets()).find(record => record.id === ticketId.value && record.accountId === currentTicketAccount)
    if (!latest || latest.status === 'CLOSED' || scenario.value === 'closedRace') throw new Error('工单已关闭或不可访问，留言未发送，输入已保留，请刷新查看')
    if (scenario.value === 'submitError') throw new Error('模拟留言发送失败，输入已保留，请切换正常场景后重试')
    latest.timeline.push(newEvent(text, new Date().toISOString(), 'USER', 'MESSAGE', structuredClone(toRaw(replyImages.value))))
    latest.needsUserReply = false
    await saveTicket(latest); records.value = records.value.map(record => record.id === latest.id ? latest : record)
    reply.value = ''; replyImages.value = []; notice.value = '留言发送成功'
  } catch (cause) { actionError.value = cause instanceof Error ? cause.message : '发送失败，请重试' }
  finally { busy.value = false }
}
const stopGuard = router.beforeEach((to, from) => {
  if (to.path === from.path || !from.path.startsWith('/tickets') || allowLeave) return true
  if (busy.value) { notice.value = '正在提交，请稍候再离开'; return false }
  return !dirty.value || window.confirm('离开后将丢失未提交内容，是否离开？')
})
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
watch(() => route.fullPath, (value, old) => {
  filter.value = { ...applied.value }
  if (value.split('?')[0] !== old?.split('?')[0]) {
    reply.value = ''; replyImages.value = []; description.value = ''; images.value = []; formCategory.value = ''; actionError.value = ''; categoryError.value = ''; descriptionError.value = ''; timelineLimit.value = 20
    // Keep documented contextual entry links, without the removed title / account fields.
    if (!allowLeave) notice.value = ''
    if (isNew.value && route.query.sourceType === 'DOC') { const article = publishedDocs.find(item => item.slug === route.query.sourceId); formCategory.value = 'OTHER'; description.value = `文档：${article?.title || String(route.query.sourceId || '')}\n链接：${window.location.origin}/#/docs/articles/${String(route.query.sourceId || '')}\n\n请补充您遇到的问题。请勿提交完整密钥或敏感请求正文。` }
  }
  void load()
}, { immediate: true })
watch(scenario, (value, old) => { if (isList.value || value === 'error' || old === 'error') void load() })
onBeforeUnmount(() => { generation++; stopGuard(); window.removeEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <div class="tickets-view">
    <div v-if="notice" class="ticket-notice" role="status">{{ notice }}<button aria-label="关闭提示" @click="notice = ''">×</button></div>
    <header class="tickets-heading"><div><h1>{{ isNew ? '提交工单' : ticketId ? '工单详情' : '我的工单' }}</h1><p>提交问题反馈，查看处理进展与平台回复。</p></div><button v-if="isList" class="ticket-primary" @click="goNew"><Plus :size="16" />提交工单</button></header>
    <div class="ticket-demo"><label>页面场景<select v-model="scenario" aria-label="工单页面场景"><option value="normal">正常数据</option><option value="empty">暂无工单</option><option value="error">加载失败</option><option value="submitError">提交 / 留言失败</option><option value="uploadError">图片上传失败</option><option value="closedRace">留言时被关闭</option></select></label><span>本地演示：不发送真实工单或图片，刷新保留已提交内容。</span></div>
    <button v-if="!isList" class="ticket-back" @click="back"><ArrowLeft :size="16" />返回我的工单</button>
    <form v-if="isList" class="ticket-card ticket-filter" @submit.prevent="query()"><label>工单状态<select v-model="filter.status" aria-label="工单状态"><option value="">全部状态</option><option v-for="(name, code) in ticketStatusNames" :key="code" :value="code">{{ name }}</option></select></label><label>问题类型<select v-model="filter.category" aria-label="筛选问题类型"><option value="">全部类型</option><option v-for="(name, code) in ticketCategoryNames" :key="code" :value="code">{{ name }}</option></select></label><label>工单号<input v-model="filter.ticketNo" placeholder="请输入完整工单号" aria-label="工单号" /></label><div><button class="ticket-primary" type="submit">查询</button><button class="ticket-secondary" type="button" @click="query(true)">重置</button></div></form>
    <section v-if="loading" class="ticket-card ticket-state" role="status"><RefreshCw :size="26" class="spinning" />加载中</section>
    <section v-else-if="loadError" class="ticket-card ticket-state" role="alert"><strong>加载失败，请重试</strong><button class="ticket-primary" @click="load(true)">重试</button></section>
    <form v-else-if="isNew" class="ticket-card ticket-form" @submit.prevent="submit">
      <div v-if="hasRelated" class="ticket-info">关联原工单：{{ related?.ticketNo || '工单不存在或无权查看' }}<p>请填写新问题，不会复制旧工单的留言和图片。</p></div>
      <label>问题类型 *<select v-model="formCategory" aria-label="新工单问题类型" :disabled="busy"><option value="">请选择</option><option v-for="(name, code) in ticketCategoryNames" :key="code" :value="code">{{ name }}</option></select></label><p v-if="categoryError" class="ticket-error">{{ categoryError }}</p>
      <label>问题描述 *<textarea v-model="description" :disabled="busy" aria-label="问题描述" placeholder="请描述问题现象、发生时间以及尝试过的操作……" rows="8" /></label><small>{{ Array.from(description.trim()).length }} / 5000 字</small><p v-if="descriptionError" class="ticket-error">{{ descriptionError }}</p>
      <h2>图片附件（选填）</h2><TicketImages :images="images" :disabled="busy" :fail-upload="scenario === 'uploadError'" @change="images = $event" />
      <p class="ticket-security">请勿填写完整 API 密钥、密码；上传前请遮盖密钥、密码、手机号等敏感信息。平台不承诺自动遮盖。</p><p v-if="actionError" class="ticket-error" role="alert">{{ actionError }}</p>
      <footer><button type="button" class="ticket-secondary" :disabled="busy" @click="back">取消</button><button type="submit" class="ticket-primary" :disabled="busy || images.some(image => image.state !== 'READY')">{{ busy ? '提交中…' : '提交' }}</button></footer>
    </form>
    <template v-else-if="ticketId">
      <section v-if="!selected" class="ticket-card ticket-state"><strong>工单不存在或无权查看</strong><button class="ticket-primary" @click="back">返回我的工单</button></section>
      <template v-else>
        <section class="ticket-card ticket-detail"><header><h2>工单号：{{ selected.ticketNo }}</h2><span class="ticket-status" :class="selected.status.toLowerCase()">{{ ticketStatusNames[selected.status] }}</span></header><div class="ticket-meta"><span>问题类型：{{ ticketCategoryNames[selected.category] }}</span><time>提交时间：{{ ticketTime(selected.createdAt) }}</time></div><p v-if="selected.relatedTicketId" class="ticket-info">关联原工单：<button @click="router.push({ path: `/tickets/${selected.relatedTicketId}`, query: listQuery })">{{ records.find(record => record.id === selected?.relatedTicketId && record.accountId === currentTicketAccount)?.ticketNo || '工单不存在或无权查看' }}</button></p><h2>问题描述</h2><p class="ticket-body">{{ selected.description }}</p><TicketImages :images="selected.attachments" readonly /></section>
        <section class="ticket-card ticket-detail"><h2>处理进展</h2><p class="ticket-hint">公开状态变化与双方异步留言，按时间从早到晚展示；不承诺即时回复。</p><button v-if="timeline.length > timelineLimit" class="ticket-secondary" @click="timelineLimit += 20">加载更早记录</button><div class="ticket-timeline"><article v-for="event in events" :key="event.id" :class="event.sender.toLowerCase()"><header><strong>{{ event.kind === 'STATUS' ? '状态更新' : event.sender === 'USER' ? '我' : '平台支持' }}</strong><time>{{ ticketTime(event.createdAt) }}</time></header><p class="ticket-body">{{ event.content }}</p><TicketImages :images="event.attachments" readonly /></article></div><p v-if="!hasSupportReply" class="ticket-hint">平台暂未回复，请稍后查看</p></section>
        <section v-if="selected.status === 'CLOSED'" class="ticket-card ticket-detail ticket-closed"><h2>本工单已关闭</h2><p>不能新增留言，如仍需帮助，可提交关联的新工单。</p><button class="ticket-primary" @click="createRelated">提交关联工单</button></section>
        <form v-else class="ticket-card ticket-form" @submit.prevent="send"><h2>留言沟通</h2><p v-if="selected.needsUserReply" class="ticket-info">需要您补充信息</p><p v-if="selected.status === 'RESOLVED'" class="ticket-hint">问题仍存在时可以留言说明；由平台判断是否恢复处理，留言不会自动改变状态。</p><textarea v-model="reply" aria-label="留言内容" :disabled="busy" rows="5" placeholder="填写需要补充的信息……也可以只发送图片" /><small>{{ Array.from(reply.trim()).length }} / 5000 字</small><TicketImages :images="replyImages" :disabled="busy" :fail-upload="scenario === 'uploadError'" @change="replyImages = $event" /><p class="ticket-security">请勿提交完整密钥或密码，截图请先遮盖敏感信息。</p><p v-if="actionError" class="ticket-error" role="alert">{{ actionError }}</p><footer><button class="ticket-primary" type="submit" :disabled="busy || replyImages.some(image => image.state !== 'READY')">{{ busy ? '发送中…' : '发送留言' }}</button></footer></form>
      </template>
    </template>
    <section v-else class="ticket-card"><div v-if="!rows.length" class="ticket-state"><strong>{{ applied.status || applied.category || applied.ticketNo ? '没有符合条件的工单' : '您还没有提交过工单' }}</strong><button v-if="applied.status || applied.category || applied.ticketNo" class="ticket-secondary" @click="query(true)">重置条件</button><button v-else class="ticket-primary" @click="goNew">提交工单</button></div><div v-else class="ticket-table-scroll"><table class="ticket-table"><thead><tr><th>工单号</th><th>问题类型</th><th>问题描述摘要</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td><button class="ticket-link" @click="open(record)">{{ record.ticketNo }}</button></td><td>{{ ticketCategoryNames[record.category] }}</td><td><p class="ticket-summary">{{ ticketSummary(record.description) }}{{ Array.from(record.description).length > 50 ? '…' : '' }}</p></td><td><span class="ticket-status" :class="record.status.toLowerCase()">{{ ticketStatusNames[record.status] }}</span></td><td><time>{{ ticketTime(record.createdAt) }}</time></td><td><button class="ticket-link" @click="open(record)">查看</button></td></tr></tbody></table></div><footer class="ticket-pagination"><span>共 {{ filtered.length }} 条 · 每页 20 条</span><div><button :disabled="page === 1" aria-label="上一页" @click="paginate(-1)"><ChevronLeft :size="16" /></button>{{ page }} / {{ pageCount }}<button :disabled="page === pageCount" aria-label="下一页" @click="paginate(1)"><ChevronRight :size="16" /></button></div></footer></section>
  </div>
</template>
