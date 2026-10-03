<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, X } from 'lucide-vue-next'
import { alertRecords, typeLabels, levelLabels, statusLabels, type AlertRecord } from '../data/alerts'
import './alerts.css'

const route = useRoute()
const router = useRouter()
const defaults = () => ({ start: '2026-09-04', end: '2026-10-03', type: '', level: '', status: '' })
const draft = ref(defaults())
const applied = ref(defaults())
const records = ref<AlertRecord[]>(structuredClone(alertRecords))
const storageKey = 'tokenhub-demo-alerts-v4'
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
  if (Array.isArray(saved)) records.value = saved
} catch { /* 使用初始演示消息 */ }
const scenario = ref('normal')
const loading = ref(false)
const loadError = ref(false)
const validation = ref('')
const feedback = ref('')
const page = ref(1)
const pageSize = ref(20)
const pending = ref(false)
const action = ref<{ type: 'PROCESS' | 'DELETE'; id: string } | null>(null)
const remark = ref('')
const dialog = ref<HTMLElement>()
let returnFocus: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let operationTimer: ReturnType<typeof setTimeout> | undefined
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const visible = computed(() => records.value.filter(item => !item.deletedAt))
const filtered = computed(() => {
  if (scenario.value === 'empty') return []
  return visible.value.filter(item => {
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(item.occurredAt))
    return date >= applied.value.start && date <= applied.value.end
      && (!applied.value.type || item.type === applied.value.type)
      && (!applied.value.level || item.level === applied.value.level)
      && (!applied.value.status || item.status === applied.value.status)
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const alertId = computed(() => typeof route.params.alertId === 'string' ? route.params.alertId : typeof route.query.alertId === 'string' ? route.query.alertId : '')
const selected = computed(() => visible.value.find(item => item.id === alertId.value))
const actionRecord = computed(() => records.value.find(item => item.id === action.value?.id))
function time(value?: string) {
  return value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value)).replaceAll('/', '-') : '—'
}
function load(retry = false) {
  clearTimeout(timer); loading.value = true; loadError.value = false
  timer = setTimeout(() => { loading.value = false; loadError.value = scenario.value === 'error' && !retry }, 250)
}
function query() {
  if (!draft.value.start || !draft.value.end || draft.value.start > draft.value.end) { validation.value = '开始日期不能晚于结束日期，请修改告警时间。'; return }
  validation.value = ''; applied.value = { ...draft.value }; page.value = 1; load()
}
function reset() { draft.value = defaults(); query() }
function openDetail(item: AlertRecord, event: MouseEvent) {
  returnFocus = event.currentTarget as HTMLElement
  router.push({ path: '/alerts', query: { ...route.query, alertId: item.id } })
}
function closeDetail() {
  const query = { ...route.query }; delete query.alertId
  router.replace({ path: '/alerts', query })
}
function begin(type: 'PROCESS' | 'DELETE', item: AlertRecord, event: MouseEvent) {
  returnFocus = event.currentTarget as HTMLElement
  remark.value = ''; feedback.value = ''; action.value = { type, id: item.id }
}
function cancel() { if (pending.value) return; action.value = null; feedback.value = '' }
function mutate(item: AlertRecord, type: 'MARK_READ' | 'PROCESS' | 'DELETE') {
  if (pending.value || item.deletedAt || (type === 'MARK_READ' && item.status !== 'UNREAD') || (type === 'PROCESS' && item.status === 'PROCESSED')) return
  pending.value = true; feedback.value = ''
  const submittedRemark = remark.value.trim()
  operationTimer = setTimeout(() => {
    pending.value = false
    if (scenario.value === 'operationError') { feedback.value = '操作失败，请重试。告警状态未改变。'; return }
    const now = new Date().toISOString()
    if (type === 'MARK_READ') { item.status = 'READ'; item.readAt = now }
    if (type === 'PROCESS') { item.readAt ??= now; item.status = 'PROCESSED'; item.processedAt = now; item.processedBy = '当前账户'; item.remark = submittedRemark }
    if (type === 'DELETE') { item.deletedAt = now; if (alertId.value === item.id) closeDetail() }
    sessionStorage.setItem(storageKey, JSON.stringify(records.value))
    const history = JSON.parse(sessionStorage.getItem(storageKey + '-history') ?? '[]')
    history.push({ alertId: item.id, type, operatedAt: now, remark: type === 'PROCESS' ? submittedRemark : '' })
    sessionStorage.setItem(storageKey + '-history', JSON.stringify(history))
    action.value = null
    feedback.value = type === 'DELETE' ? '告警已清理，系统仍保留记录。' : type === 'PROCESS' ? '已标记为已处理。' : '已标记为已读。'
  }, 250)
}
function trap(event: KeyboardEvent) {
  if (event.key === 'Escape') { if (pending.value) return; action.value ? cancel() : closeDetail(); return }
  if (event.key !== 'Tab') return
  const items = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],textarea')
  if (!items?.length) return
  const first = items[0]!, last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => Boolean(action.value || alertId.value), async open => {
  document.body.style.overflow = open ? 'hidden' : ''
  await nextTick()
  if (open) dialog.value?.querySelector<HTMLElement>('button')?.focus()
  else returnFocus?.focus({ preventScroll: true })
}, { immediate: true })
watch(action, async () => { await nextTick(); dialog.value?.querySelector<HTMLElement>('textarea,button')?.focus() })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
watch(scenario, () => { page.value = 1; load() })
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(operationTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="alerts-view">
    <div class="alerts-heading"><div><h1>告警管理</h1><p>查看账户余额、Token 包余量和异常请求提醒。</p></div></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="告警页面场景"><option value="normal">正常数据</option><option value="empty">暂无告警</option><option value="error">列表加载失败</option><option value="operationError">操作提交失败</option></select></label></div>
    <section class="alerts-card alerts-main-card">
      <form class="alerts-filters" @submit.prevent="query">
        <div class="alerts-filter-grid">
          <label class="alerts-date-field"><span>告警时间（北京时间）</span><div><input v-model="draft.start" type="date" aria-label="开始日期"><span>至</span><input v-model="draft.end" type="date" aria-label="结束日期"></div></label>
          <label><span>告警类型</span><select v-model="draft.type"><option value="">全部</option><option v-for="(label, value) in typeLabels" :key="value" :value="value">{{ label }}</option></select></label>
          <label><span>告警级别</span><select v-model="draft.level"><option value="">全部</option><option v-for="(label, value) in levelLabels" :key="value" :value="value">{{ label }}</option></select></label>
          <label><span>告警状态</span><select v-model="draft.status"><option value="">全部</option><option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        </div>
        <div class="alerts-filter-footer"><div><span v-if="validation" class="alerts-validation">{{ validation }}</span><span v-else-if="dirty" class="alerts-dirty">筛选条件尚未应用</span></div><div><button type="button" class="alerts-secondary" @click="reset"><RotateCcw :size="14" />重置</button><button type="submit" class="alerts-primary" :disabled="loading"><Search :size="14" />查询</button></div></div>
      </form>
      <div v-if="loading" class="alerts-state"><RefreshCw :size="28" class="spinning" /><strong>正在加载告警</strong></div>
      <div v-else-if="loadError" class="alerts-state"><Bell :size="28" /><strong>告警加载失败，请重试</strong><button class="alerts-primary" @click="load(true)">重试</button></div>
      <template v-else>
        <div class="alerts-table-scroll"><table class="alerts-table"><thead><tr><th>告警时间</th><th>告警类型</th><th>告警级别</th><th>告警内容</th><th>告警状态</th><th>操作</th></tr></thead><tbody>
          <tr v-for="item in rows" :key="item.id" :class="{ unread: item.status === 'UNREAD' }"><td>{{ time(item.occurredAt) }}</td><td>{{ typeLabels[item.type] || '未知' }}</td><td><span class="alerts-severity" :class="item.level.toLowerCase()">{{ levelLabels[item.level] || '未知' }}</span></td><td><div class="alert-content" :title="item.content">{{ item.content }}</div></td><td><span class="alert-status" :class="item.status.toLowerCase()">{{ statusLabels[item.status] }}</span></td><td><div class="alert-row-actions"><button :disabled="pending" @click="openDetail(item, $event)">查看详情</button><button v-if="item.status === 'UNREAD'" :disabled="pending" @click="mutate(item, 'MARK_READ')">标记已读</button><button v-if="item.status !== 'PROCESSED'" :disabled="pending" @click="begin('PROCESS', item, $event)">处理</button><button class="alert-delete" :disabled="pending" @click="begin('DELETE', item, $event)">删除</button></div></td></tr>
          <tr v-if="!rows.length"><td colspan="6"><div class="alerts-state"><Bell :size="28" /><strong>暂无告警</strong></div></td></tr>
        </tbody></table></div>
        <div class="alerts-pagination"><span>共 {{ filtered.length }} 条 <label>每页<select v-model="pageSize" @change="page=1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label></span><div><button :disabled="page === 1" aria-label="上一页" @click="page--"><ChevronLeft :size="15" /></button><span>{{ page }} / {{ pageCount }}</span><button :disabled="page === pageCount" aria-label="下一页" @click="page++"><ChevronRight :size="15" /></button></div></div>
      </template>
    </section>
    <p v-if="feedback && !action" class="alert-feedback" role="status">{{ feedback }}</p>
    <Teleport to="body">
      <div v-if="alertId || action" class="alert-modal-layer" @keydown="trap">
        <button class="alert-modal-backdrop" aria-label="关闭弹层" :disabled="pending" @click="action ? cancel() : closeDetail()" />
        <section ref="dialog" class="alert-modal" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title">
          <header><h2 id="alert-modal-title">{{ action ? (action.type === 'PROCESS' ? '处理告警' : '删除告警') : '告警详情' }}</h2><button :disabled="pending" aria-label="关闭弹层" @click="action ? cancel() : closeDetail()"><X :size="20" /></button></header>
          <template v-if="action && actionRecord">
            <div class="alert-modal-body"><p>{{ actionRecord.content }}</p><template v-if="action.type === 'PROCESS'"><p class="alert-operation-note">标记已处理仅记录您的处理结果，请先按告警建议完成相关操作。</p><label class="alert-remark">处理备注（选填）<textarea v-model="remark" maxlength="500" rows="4" placeholder="记录已完成的处理措施" /><small>{{ remark.length }} / 500</small></label></template><p v-else class="alert-operation-note">清理后将不再出现在告警列表，系统仍保留记录。</p><p v-if="feedback" class="alert-feedback" role="alert">{{ feedback }}</p></div>
            <footer><button class="alerts-secondary" :disabled="pending" @click="cancel">取消</button><button class="alerts-primary" :disabled="pending" @click="mutate(actionRecord, action.type)">{{ pending ? '提交中…' : action.type === 'PROCESS' ? '确认处理' : '确认删除' }}</button></footer>
          </template>
          <template v-else-if="selected">
            <div class="alert-modal-body"><dl class="alert-detail-fields"><dt>告警时间</dt><dd>{{ time(selected.occurredAt) }}</dd><dt>告警类型</dt><dd>{{ typeLabels[selected.type] || '未知' }}</dd><dt>告警级别</dt><dd><span class="alerts-severity" :class="selected.level.toLowerCase()">{{ levelLabels[selected.level] || '未知' }}</span></dd><dt>告警状态</dt><dd>{{ statusLabels[selected.status] }}</dd><dt>告警内容</dt><dd>{{ selected.content }}</dd></dl><h3 v-if="selected.related.length">关联信息</h3><dl class="alert-detail-fields"><template v-for="field in selected.related" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></template></dl><h3>处理建议</h3><p>{{ selected.suggestion }}</p><RouterLink v-if="selected.usageQuery" class="alerts-secondary" :to="{ path: '/usage', query: selected.usageQuery }">查看相关用量</RouterLink><RouterLink class="alerts-secondary" :to="{ path: '/help/tickets/new', query: { sourceType: 'ALERT', sourceId: selected.id } }">提交工单</RouterLink><template v-if="selected.status === 'PROCESSED'"><h3>处理记录</h3><dl class="alert-detail-fields"><dt>处理人</dt><dd>{{ selected.processedBy }}</dd><dt>处理时间</dt><dd>{{ time(selected.processedAt) }}</dd><dt>处理备注</dt><dd>{{ selected.remark || '未填写' }}</dd></dl></template><p v-if="feedback" role="status" class="alert-feedback">{{ feedback }}</p></div>
            <footer><button v-if="selected.status === 'UNREAD'" class="alerts-secondary" :disabled="pending" @click="mutate(selected, 'MARK_READ')">标记已读</button><button v-if="selected.status !== 'PROCESSED'" class="alerts-primary" :disabled="pending" @click="begin('PROCESS', selected, $event)">处理</button><button class="alerts-secondary" :disabled="pending" @click="closeDetail">关闭</button></footer>
          </template>
          <template v-else><div class="alerts-state"><strong>该告警不存在或无法查看</strong></div><footer><button class="alerts-secondary" @click="closeDetail(); load()">关闭并刷新列表</button></footer></template>
        </section>
      </div>
    </Teleport>
  </div>
</template>
