<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle, ArrowRight, Bell, Check, CheckCheck, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, CircleX, Clock3, Copy, Info, KeyRound, RefreshCw,
  RotateCcw, Search, ShieldAlert, SlidersHorizontal, X,
} from 'lucide-vue-next'
import {
  alertRecords, alertServices, alertSubaccounts, categoryLabels, lifecycleLabels, severityLabels,
  type AlertCategory, type AlertRecord, type AlertSeverity,
} from '../data/alerts'
import './alerts.css'

const props = defineProps<{ isSub: boolean }>()
const emit = defineEmits<{ 'unread-count': [value: number] }>()
const route = useRoute()
const router = useRouter()
const today = '2026-09-28'
const defaults = () => ({ range: '30', start: '2026-08-30', end: today, severity: '', read: '', lifecycle: 'ACTIVE', service: '', subaccount: '', keyword: '' })
const draft = ref(defaults())
const applied = ref(defaults())
const scenario = ref<'normal' | 'empty' | 'error'>('normal')
const loading = ref(false)
const error = ref('')
const recovered = ref(false)
const validation = ref('')
const page = ref(1)
const pageSize = ref(20)
const selectedRows = ref(new Set<string>())
const readIds = ref(new Set(alertRecords.filter(item => item.initiallyRead).map(item => item.id)))
const copied = ref('')
const drawer = ref<HTMLElement>()
const closeButton = ref<HTMLButtonElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let returnFocus: HTMLElement | null = null

const activeCategory = computed<'' | AlertCategory>(() => route.query.category === 'QUOTA' || route.query.category === 'USAGE_ANOMALY' ? route.query.category : '')
const permittedRows = computed(() => props.isSub ? alertRecords.filter(item => item.ownerContext === 'sub-a') : alertRecords)
const isRead = (item: AlertRecord) => readIds.value.has(item.id)
const unreadCount = computed(() => scenario.value === 'empty' ? 0 : permittedRows.value.filter(item => !isRead(item)).length)
const summary = computed(() => ({
  unread: unreadCount.value,
  critical: scenario.value === 'empty' ? 0 : permittedRows.value.filter(item => item.severity === 'CRITICAL' && item.lifecycle === 'ACTIVE').length,
  recent: scenario.value === 'empty' ? 0 : permittedRows.value.filter(item => item.firstOccurredAt >= '2026-09-27T18:35:00+08:00').length,
}))
const categoryCounts = computed(() => ({
  all: permittedRows.value.length,
  quota: permittedRows.value.filter(item => item.category === 'QUOTA').length,
  anomaly: permittedRows.value.filter(item => item.category === 'USAGE_ANOMALY').length,
}))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const filteredRows = computed(() => {
  if (scenario.value === 'empty') return []
  const filter = applied.value
  const keyword = filter.keyword.trim().toLowerCase()
  return permittedRows.value.filter(item => {
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(item.firstOccurredAt))
    return date >= filter.start && date <= filter.end
      && (!activeCategory.value || item.category === activeCategory.value)
      && (!filter.severity || item.severity === filter.severity)
      && (!filter.read || (filter.read === 'READ') === isRead(item))
      && (!filter.lifecycle || item.lifecycle === filter.lifecycle)
      && (!filter.service || item.serviceId === filter.service)
      && (!filter.subaccount || item.subaccountId === filter.subaccount)
      && (!keyword || [item.title, item.alertNo, item.subjectName, item.serviceName].some(value => value.toLowerCase().includes(keyword)))
  }).sort((left, right) => {
    const unreadOrder = Number(isRead(left)) - Number(isRead(right))
    if (unreadOrder) return unreadOrder
    const severityOrder: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, NOTICE: 2 }
    return severityOrder[left.severity] - severityOrder[right.severity] || right.lastOccurredAt.localeCompare(left.lastOccurredAt) || right.id.localeCompare(left.id)
  })
})
const pageRows = computed(() => filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const hasNext = computed(() => page.value * pageSize.value < filteredRows.value.length)
const allPageSelected = computed(() => !!pageRows.value.length && pageRows.value.every(item => selectedRows.value.has(item.id)))
const alertId = computed(() => typeof route.params.alertId === 'string' ? route.params.alertId : typeof route.query.alertId === 'string' ? route.query.alertId : '')
const selected = computed(() => permittedRows.value.find(item => item.id === alertId.value))

function formatTime(time: string | null) {
  if (!time) return '—'
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(time)).replaceAll('/', '-')
}
function preset() {
  if (draft.value.range !== 'custom') {
    draft.value.end = today
    draft.value.start = draft.value.range === '7' ? '2026-09-22' : '2026-08-30'
  }
}
function validate() {
  const span = (Date.parse(draft.value.end) - Date.parse(draft.value.start)) / 86_400_000 + 1
  if (!Number.isFinite(span) || span < 1 || span > 180 || draft.value.end > today) return '请选择不超过 180 天的有效范围，结束日期不能晚于 2026-09-28。'
  const length = draft.value.keyword.trim().length
  if (length === 1 || length > 100) return '关键词请输入 2～100 个字符。'
  return ''
}
function load() {
  clearTimeout(timer)
  loading.value = true
  error.value = ''
  timer = setTimeout(() => {
    loading.value = false
    if (scenario.value === 'error' && !recovered.value) error.value = '暂时无法获取告警数据，请稍后重试。'
  }, 360)
}
function query() {
  validation.value = validate()
  if (validation.value) return
  applied.value = { ...draft.value, keyword: draft.value.keyword.trim() }
  page.value = 1
  selectedRows.value = new Set()
  load()
}
function reset() {
  draft.value = defaults()
  query()
}
function refresh() {
  page.value = 1
  selectedRows.value = new Set()
  load()
}
function retry() {
  recovered.value = true
  load()
}
function setCategory(category: '' | AlertCategory) {
  const query = { ...route.query }
  if (category) query.category = category
  else delete query.category
  delete query.alertId
  router.replace({ path: '/alerts', query })
  page.value = 1
  selectedRows.value = new Set()
}
function togglePage() {
  const next = new Set(selectedRows.value)
  if (allPageSelected.value) pageRows.value.forEach(item => next.delete(item.id))
  else pageRows.value.forEach(item => next.add(item.id))
  selectedRows.value = next
}
function toggleRow(id: string) {
  const next = new Set(selectedRows.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedRows.value = next
}
function markIdsRead(ids: string[]) {
  const next = new Set(readIds.value)
  ids.forEach(id => next.add(id))
  readIds.value = next
  selectedRows.value = new Set()
}
function markSelectedRead() { markIdsRead([...selectedRows.value]) }
function markAllRead() {
  if (!unreadCount.value || !window.confirm(`将当前身份下 ${unreadCount.value} 条未读告警全部标记为已读？`)) return
  markIdsRead(permittedRows.value.map(item => item.id))
}
function openDetail(item: AlertRecord, event: MouseEvent) {
  returnFocus = event.currentTarget as HTMLElement
  router.push({ path: `/alerts/${item.id}`, query: route.query })
}
function closeDetail() { router.replace({ path: '/alerts', query: route.query }) }
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = '已复制' }
  catch { copied.value = '复制失败，请手动选择复制' }
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => copied.value = '', 2200)
}
function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeDetail(); return }
  if (event.key !== 'Tab') return
  const elements = drawer.value?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
  if (!elements?.length) return
  const first = elements[0]!, last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

watch(alertId, async id => {
  document.body.style.overflow = id ? 'hidden' : ''
  if (id) {
    if (selected.value && !isRead(selected.value)) markIdsRead([selected.value.id])
    await nextTick(); closeButton.value?.focus()
  } else { await nextTick(); returnFocus?.focus() }
}, { immediate: true })
watch(unreadCount, value => emit('unread-count', value), { immediate: true })
watch(scenario, () => { recovered.value = false; selectedRows.value = new Set(); page.value = 1; load() })
watch(() => props.isSub, () => {
  draft.value = defaults(); applied.value = defaults(); selectedRows.value = new Set(); page.value = 1; scenario.value = 'normal'; error.value = ''
  if (alertId.value) closeDetail()
})
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(copyTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="alerts-view">
    <div class="alerts-heading"><div><h1>告警中心</h1><p>集中查看额度风险与异常调用，快速定位受影响的服务和密钥。</p></div><div class="alerts-heading-actions"><button class="alerts-secondary" :disabled="!unreadCount || loading" @click="markAllRead"><CheckCheck :size="15" />全部标记已读</button><button class="refresh-button" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="告警页面场景"><option value="normal">正常告警</option><option value="empty">暂无告警</option><option value="error">查询失败</option></select></label></div>

    <div class="alerts-summary" aria-label="告警概况">
      <article><span class="alerts-summary-icon unread"><Bell :size="18" /></span><div><span>未读告警</span><strong>{{ summary.unread }}</strong><small>{{ isSub ? '仅当前子账户' : '当前主账户范围' }}</small></div></article>
      <article><span class="alerts-summary-icon critical"><ShieldAlert :size="18" /></span><div><span>严重告警</span><strong>{{ summary.critical }}</strong><small>仅统计仍在告警中的记录</small></div></article>
      <article><span class="alerts-summary-icon recent"><Clock3 :size="18" /></span><div><span>最近 24 小时新增</span><strong>{{ summary.recent }}</strong><small>按首次发生时间统计</small></div></article>
    </div>

    <section class="alerts-card alerts-main-card">
      <div class="alerts-tabs" role="tablist" aria-label="告警分类">
        <button :class="{ active: activeCategory === '' }" role="tab" :aria-selected="activeCategory === ''" @click="setCategory('')">全部<span>{{ categoryCounts.all }}</span></button>
        <button :class="{ active: activeCategory === 'QUOTA' }" role="tab" :aria-selected="activeCategory === 'QUOTA'" @click="setCategory('QUOTA')">额度告警<span>{{ categoryCounts.quota }}</span></button>
        <button :class="{ active: activeCategory === 'USAGE_ANOMALY' }" role="tab" :aria-selected="activeCategory === 'USAGE_ANOMALY'" @click="setCategory('USAGE_ANOMALY')">异常调用<span>{{ categoryCounts.anomaly }}</span></button>
      </div>

      <form class="alerts-filters" @submit.prevent="query">
        <div class="alerts-filter-title"><SlidersHorizontal :size="15" /><strong>筛选告警</strong><span>默认只展示仍在告警中的记录</span></div>
        <div class="alerts-filter-grid">
          <label class="alerts-date-field">首次发生时间<div><select v-model="draft.range" aria-label="首次发生时间范围" @change="preset"><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="custom">自定义</option></select><input v-model="draft.start" type="date" max="2026-09-28" aria-label="开始日期" @input="draft.range='custom'" /><span>—</span><input v-model="draft.end" type="date" max="2026-09-28" aria-label="结束日期" @input="draft.range='custom'" /></div></label>
          <label>告警级别<select v-model="draft.severity"><option value="">全部级别</option><option value="CRITICAL">严重</option><option value="WARNING">重要</option><option value="NOTICE">提醒</option></select></label>
          <label>阅读状态<select v-model="draft.read"><option value="">全部状态</option><option value="UNREAD">未读</option><option value="READ">已读</option></select></label>
          <label>事件状态<select v-model="draft.lifecycle"><option value="ACTIVE">告警中</option><option value="RECOVERED">已恢复</option><option value="">全部状态</option></select></label>
          <label>关联服务<select v-model="draft.service"><option value="">全部服务</option><option v-for="service in alertServices" :key="service.id" :value="service.id">{{ service.name }}</option></select></label>
          <label v-if="!isSub">关联子账户<select v-model="draft.subaccount"><option value="">全部子账户</option><option v-for="account in alertSubaccounts" :key="account.id" :value="account.id">{{ account.name }}</option></select></label>
          <label class="alerts-keyword">关键词<div><Search :size="15" /><input v-model="draft.keyword" maxlength="100" placeholder="告警标题、编号或对象名称" /></div></label>
        </div>
        <div class="alerts-filter-footer"><div><p v-if="validation" class="alerts-validation" role="alert">{{ validation }}</p><p v-else-if="dirty" class="alerts-dirty">筛选条件已修改，点击「查询」更新列表。</p></div><div><button type="submit" class="alerts-primary" :disabled="loading"><Search :size="14" />查询</button><button type="button" class="alerts-secondary" :disabled="loading" @click="reset"><RotateCcw :size="14" />重置</button></div></div>
      </form>

      <div class="alerts-results-head"><div><h2>{{ activeCategory ? categoryLabels[activeCategory] : '全部告警' }}</h2><p>{{ applied.start }} 至 {{ applied.end }} <span>·</span> 数据截至 2026-09-28 18:35:00</p></div><button v-if="selectedRows.size" class="alerts-secondary" @click="markSelectedRead"><CheckCheck :size="14" />标记已读（{{ selectedRows.size }}）</button></div>

      <div v-if="loading" class="alerts-state" role="status"><RefreshCw :size="27" class="spinning" /><strong>正在查询告警</strong><p>正在加载当前身份范围内的数据…</p></div>
      <div v-else-if="error" class="alerts-state" role="alert"><CircleX :size="31" /><strong>告警数据加载失败</strong><p>{{ error }}</p><button class="alerts-secondary" @click="retry">重新加载</button></div>
      <div v-else-if="!pageRows.length" class="alerts-state"><CircleCheck :size="34" /><strong>{{ scenario === 'empty' ? '当前没有需要处理的告警' : '当前条件下暂无告警' }}</strong><p>{{ scenario === 'empty' ? '额度与调用状态正常。' : '请调整筛选条件或查看已恢复告警。' }}</p><button v-if="scenario !== 'empty'" class="alerts-secondary" @click="reset">重置筛选</button></div>
      <div v-else class="alerts-table-scroll"><table class="alerts-table"><thead><tr><th class="alerts-check"><input type="checkbox" :checked="allPageSelected" aria-label="选择当前页" @change="togglePage" /></th><th>级别</th><th>告警内容</th><th>关联对象</th><th>首次发生</th><th>最近发生</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in pageRows" :key="item.id" :class="{ unread: !isRead(item) }"><td class="alerts-check"><input type="checkbox" :checked="selectedRows.has(item.id)" :aria-label="`选择 ${item.title}`" @change="toggleRow(item.id)" /></td><td><span class="alerts-severity" :class="item.severity.toLowerCase()"><ShieldAlert v-if="item.severity === 'CRITICAL'" :size="12" /><AlertTriangle v-else-if="item.severity === 'WARNING'" :size="12" /><Info v-else :size="12" />{{ severityLabels[item.severity] }}</span></td><td><button class="alerts-title" @click="openDetail(item, $event)"><span>{{ item.title }}<i v-if="!isRead(item)" /></span><small>{{ item.typeLabel }} · {{ item.alertNo }}</small></button></td><td><span class="alerts-subject">{{ item.subjectName }}</span><small>{{ item.subjectMasked || item.serviceName }}<template v-if="item.subaccountName"> · {{ item.subaccountName }}</template></small></td><td class="alerts-time">{{ formatTime(item.firstOccurredAt).slice(0, 10) }}<small>{{ formatTime(item.firstOccurredAt).slice(11) }}</small></td><td class="alerts-time">{{ formatTime(item.lastOccurredAt).slice(0, 10) }}<small>{{ formatTime(item.lastOccurredAt).slice(11) }}</small></td><td><span class="alerts-lifecycle" :class="item.lifecycle.toLowerCase()"><i />{{ lifecycleLabels[item.lifecycle] }}</span><small>{{ isRead(item) ? '已读' : '未读' }}</small></td><td><button class="alerts-detail-link" @click="openDetail(item, $event)">查看详情<ChevronRight :size="13" /></button></td></tr></tbody></table></div>
      <div class="alerts-pagination"><span>本页 {{ loading || error ? '—' : pageRows.length }} 条<label>每页<select v-model="pageSize" :disabled="loading" @change="page=1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label></span><div><button :disabled="page===1 || loading || !!error" aria-label="上一页" @click="page--"><ChevronLeft :size="16" /></button><span>第 {{ page }} 页</span><button :disabled="!hasNext || loading || !!error" aria-label="下一页" @click="page++"><ChevronRight :size="16" /></button></div></div>
    </section>
    <p class="alerts-footnote"><Info :size="13" />告警只展示必要的计量与异常摘要，不包含请求正文、响应正文、完整密钥或供应商内部信息。</p>

    <Teleport to="body">
      <div v-if="alertId" class="alerts-drawer-layer" @keydown="trapFocus"><div class="alerts-drawer-backdrop" @click="closeDetail" /><section ref="drawer" class="alerts-drawer" role="dialog" aria-modal="true" aria-labelledby="alert-detail-title" tabindex="-1"><header><div><h2 id="alert-detail-title">告警详情</h2></div><button ref="closeButton" class="icon-button" aria-label="关闭告警详情" @click="closeDetail"><X :size="20" /></button></header>
        <div v-if="!selected" class="alerts-state"><ShieldAlert :size="34" /><strong>该告警不存在或当前无法查看</strong><p>请关闭详情并重新查询。</p></div>
        <div v-else class="alerts-drawer-body">
          <div class="alerts-detail-summary" :class="selected.severity.toLowerCase()"><span><ShieldAlert v-if="selected.severity === 'CRITICAL'" :size="23" /><AlertTriangle v-else-if="selected.severity === 'WARNING'" :size="23" /><CircleAlert v-else :size="23" /></span><div><div class="alerts-detail-badges"><span class="alerts-severity" :class="selected.severity.toLowerCase()">{{ severityLabels[selected.severity] }}</span><span class="alerts-lifecycle" :class="selected.lifecycle.toLowerCase()"><i />{{ lifecycleLabels[selected.lifecycle] }}</span></div><h3>{{ selected.title }}</h3><p>{{ selected.description }}</p></div></div>
          <section class="alerts-detail-section"><h3>基本信息</h3><dl><dt>告警编号</dt><dd class="alerts-copy">{{ selected.alertNo }}<button aria-label="复制告警编号" @click="copy(selected.alertNo)"><Copy :size="14" /></button></dd><dt>告警分类</dt><dd>{{ categoryLabels[selected.category] }} · {{ selected.typeLabel }}</dd><dt>首次发生</dt><dd>{{ formatTime(selected.firstOccurredAt) }}</dd><dt>最近发生</dt><dd>{{ formatTime(selected.lastOccurredAt) }}</dd><dt>恢复时间</dt><dd>{{ formatTime(selected.recoveredAt) }}</dd><dt>影响说明</dt><dd>{{ selected.impactSummary }}</dd></dl></section>
          <section class="alerts-detail-section"><h3>影响对象<span>事件发生时的授权后快照</span></h3><dl><dt>关联服务</dt><dd>{{ selected.serviceName }}</dd><dt>关联对象</dt><dd>{{ selected.subjectName }}</dd><dt v-if="selected.subjectMasked">密钥掩码</dt><dd v-if="selected.subjectMasked">{{ selected.subjectMasked }}</dd><dt v-if="selected.subaccountName">关联子账户</dt><dd v-if="selected.subaccountName">{{ selected.subaccountName }}</dd><dt>累计发生</dt><dd>{{ selected.occurrenceCount.toLocaleString('zh-CN') }} 次</dd></dl></section>
          <section class="alerts-detail-section"><h3>判断依据<span>由事件源提供，门户不重新计算</span></h3><div class="alerts-metric-grid"><article v-for="metric in selected.metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.threshold || metric.note || '—' }}</small></article></div><div v-if="selected.requestIds.length" class="alerts-request-ids"><strong>相关请求 ID</strong><span v-for="requestId in selected.requestIds" :key="requestId">{{ requestId }}<button :aria-label="`复制 ${requestId}`" @click="copy(requestId)"><Copy :size="13" /></button></span><p>仅展示用于排查的请求标识，不提供请求或响应正文。</p></div></section>
          <section class="alerts-detail-section"><h3>事件记录</h3><ol class="alerts-timeline"><li v-for="event in [...selected.timeline].reverse()" :key="`${event.type}-${event.occurredAt}`" :class="event.type.toLowerCase()"><i /><div><strong>{{ event.title }}</strong><p>{{ event.description }}</p><time>{{ formatTime(event.occurredAt) }}</time></div></li></ol></section>
          <section class="alerts-detail-section"><h3>建议处理</h3><div class="alerts-actions"><RouterLink v-for="action in selected.actions" :key="action.code" :to="action.path" :class="action.primary ? 'alerts-primary' : 'alerts-secondary'"><KeyRound v-if="action.code === 'MANAGE_KEY'" :size="14" /><ArrowRight v-else :size="14" />{{ action.label }}</RouterLink></div></section>
        </div>
        <footer><span role="status">{{ copied || (selected && isRead(selected) ? '已标记为已读' : '') }}</span><button class="alerts-secondary" @click="closeDetail">关闭详情</button></footer>
      </section></div>
    </Teleport>
  </div>
</template>
