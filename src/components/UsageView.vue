<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity, ArrowRight, BarChart3, ChevronLeft, ChevronRight, CircleDollarSign,
  Copy, Database, Download, Info, Layers3, ListFilter, RefreshCw, RotateCcw, Search,
  ShieldAlert, Sparkles, WalletCards, X, Zap,
} from 'lucide-vue-next'
import {
  models, usageCalls, userKeys,
  type CallStatus, type ChargeStatus, type MeteringStatus, type UsageCall,
} from '../data/usage'
import './usage.css'

defineProps<{ isSub: boolean }>()
const route = useRoute()
const router = useRouter()
const activeTab = computed(() => route.query.tab === 'details' ? 'details' : 'statistics')
const today = '2026-10-03'
const defaults = () => ({ range: '7', start: '2026-09-27', end: today, resourceType: '', model: '', key: '' })
const draft = ref(defaults())
const applied = ref(defaults())
const loading = ref(false)
const error = ref('')
const validation = ref('')
const scenario = ref('normal')
const recovered = ref(false)
const dimension = ref<'TIME' | 'KEY' | 'MODEL'>('TIME')
const page = ref(1)
const pageSize = ref(20)
const copied = ref('')
const exporting = ref(false)
const exportMessage = ref('')
const snapshot = ref('2026-10-03T10:35:00+08:00')
const balanceUpdatedAt = ref('2026-10-03T10:34:28+08:00')
const currentBalance = computed(() => scenario.value === 'balanceUnavailable' ? null : { amount: '128.50', currency: 'CNY' })
const drawer = ref<HTMLElement>()
const drawerClose = ref<HTMLButtonElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let exportTimer: ReturnType<typeof setTimeout> | undefined
let returnFocus: HTMLElement | null = null

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const optionKeys = computed(() => userKeys.filter((item, index, list) => index === list.findIndex(candidate => candidate.id === item.id)))
const resourceLabel = (type: UsageCall['serviceType']) => type === 'AI_APPLICATION' ? 'AI应用' : 'Token服务'
const resourceId = (call: UsageCall) => call.serviceType === 'AI_APPLICATION' ? `订单实例 ${call.serviceId}` : call.keyName ?? '已删除密钥'

function localDate(time: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(time))
}
function formatTime(time: string | null, milliseconds = false) {
  if (!time) return '—'
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  if (milliseconds) options.fractionalSecondDigits = 3
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date(time)).replaceAll('/', '-')
}
function formatNumber(value: number | null) { return value === null ? '—' : new Intl.NumberFormat('zh-CN').format(value) }
function formatMoney(value: number | null, status?: ChargeStatus) {
  if (status === 'PENDING') return '待更新'
  if (status === 'UNAVAILABLE') return '暂无数据'
  if (value === null) return '—'
  return `¥${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} CNY`
}
function tokenTotal(call: UsageCall) {
  return call.meteringStatus === 'COMPLETE' && call.inputTokens !== null && call.outputTokens !== null ? call.inputTokens + call.outputTokens : null
}
function matchesCommon(call: UsageCall) {
  const filter = applied.value
  const date = localDate(call.startedAt)
  return date >= filter.start && date <= filter.end
    && (!filter.resourceType || call.serviceType === filter.resourceType)
    && (!filter.model || call.modelId === filter.model || (filter.model === 'UNKNOWN' && call.modelId === null))
    && (!filter.key || call.keyId === filter.key)
}
const commonRows = computed(() => scenario.value === 'empty' ? [] : usageCalls.filter(matchesCommon))
const detailRows = computed(() => commonRows.value)
const pageRows = computed(() => detailRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const pageCount = computed(() => Math.max(1, Math.ceil(detailRows.value.length / pageSize.value)))

const metrics = computed(() => {
  const complete = commonRows.value.filter(item => item.meteringStatus === 'COMPLETE')
  const input = complete.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0)
  const output = complete.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0)
  const settled = commonRows.value.filter(item => item.chargeStatus === 'SETTLED')
  return {
    input, output, total: input + output,
    charge: settled.reduce((sum, item) => sum + (item.chargeAmount ?? 0), 0),
    complete: complete.length,
    pending: commonRows.value.filter(item => item.meteringStatus === 'PENDING').length,
    chargePending: commonRows.value.filter(item => ['PENDING', 'UNAVAILABLE'].includes(item.chargeStatus)).length,
  }
})
const cacheMetrics = computed(() => {
  const covered = commonRows.value.filter(item => item.cacheReadTokens !== null && item.cacheMissTokens !== null)
  const hit = covered.reduce((sum, item) => sum + (item.cacheReadTokens ?? 0), 0)
  const miss = covered.reduce((sum, item) => sum + (item.cacheMissTokens ?? 0), 0)
  return { covered: covered.length, uncovered: metrics.value.complete - covered.length, hit, miss, ratio: hit + miss ? hit / (hit + miss) : null }
})
const dates = computed(() => {
  const result: string[] = []
  const cursor = new Date(`${applied.value.start}T00:00:00+08:00`)
  const end = new Date(`${applied.value.end}T00:00:00+08:00`)
  while (cursor <= end && result.length < 90) {
    result.push(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
})
const daily = computed(() => dates.value.map(date => {
  const rows = commonRows.value.filter(item => localDate(item.startedAt) === date && item.meteringStatus === 'COMPLETE')
  return { date, input: rows.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0), output: rows.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0) }
}))
const dailyMax = computed(() => Math.max(1, ...daily.value.map(item => item.input + item.output)))

interface BreakdownRow { id: string; label: string; resourceType: UsageCall['serviceType']; date?: string; keyId?: string; modelId?: string | null; input: number; output: number; hit: number | null; miss: number | null; total: number; charge: number; calls: number }
const breakdown = computed<BreakdownRow[]>(() => {
  const grouped = new Map<string, { id: string; label: string; resourceType: UsageCall['serviceType']; date?: string; keyId?: string; modelId?: string | null; rows: UsageCall[] }>()
  for (const call of commonRows.value) {
    const date = localDate(call.startedAt)
    let id = '', label = '', keyId: string | undefined, modelId: string | null | undefined
    if (dimension.value === 'TIME') { id = `${date}-${call.serviceType}`; label = date }
    if (dimension.value === 'KEY') {
      keyId = call.serviceType === 'TOKEN_SERVICE' ? call.keyId ?? undefined : undefined
      id = call.serviceType === 'AI_APPLICATION' ? 'AI_APPLICATION' : `${call.keyId ?? 'UNKNOWN'}-TOKEN_SERVICE`
      label = call.serviceType === 'AI_APPLICATION' ? 'AI应用（按订单查看明细）' : call.keyName ?? '已删除密钥'
    }
    if (dimension.value === 'MODEL') { modelId = call.modelId; id = `${call.modelId ?? 'UNKNOWN'}-${call.serviceType}`; label = call.modelName }
    const row = grouped.get(id) ?? { id, label, resourceType: call.serviceType, date: dimension.value === 'TIME' ? date : undefined, keyId, modelId, rows: [] }
    row.rows.push(call); grouped.set(id, row)
  }
  return [...grouped.values()].map(group => {
    const complete = group.rows.filter(item => item.meteringStatus === 'COMPLETE')
    const input = complete.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0)
    const output = complete.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0)
    const cacheRows = complete.filter(item => item.cacheReadTokens !== null && item.cacheMissTokens !== null)
    const hit = cacheRows.length ? cacheRows.reduce((sum, item) => sum + (item.cacheReadTokens ?? 0), 0) : null
    const miss = cacheRows.length ? cacheRows.reduce((sum, item) => sum + (item.cacheMissTokens ?? 0), 0) : null
    const charge = group.rows.filter(item => item.chargeStatus === 'SETTLED').reduce((sum, item) => sum + (item.chargeAmount ?? 0), 0)
    return { ...group, calls: group.rows.length, input, output, hit, miss, total: input + output, charge }
  }).sort((left, right) => dimension.value === 'TIME' ? right.label.localeCompare(left.label) : right.total - left.total)
})

const selectedId = computed(() => typeof route.query.callId === 'string' ? route.query.callId : '')
const selected = computed(() => usageCalls.find(item => item.id === selectedId.value))
const statusLabel: Record<CallStatus, string> = { SUCCESS: '成功', FAILED: '失败' }
const modelTypeLabel: Record<UsageCall['modelType'], string> = { TEXT_TO_TEXT: '文生文', TEXT_TO_IMAGE: '文生图', VISION_TO_TEXT: '图生文', OTHER: '其他' }
const meteringLabel: Record<MeteringStatus, string> = { PENDING: '待更新', COMPLETE: '已计量', UNAVAILABLE: '暂无数据', NOT_APPLICABLE: '不按 Token 计量' }
const chargeLabel: Record<ChargeStatus, string> = { PENDING: '待更新', SETTLED: '已确认', NOT_CHARGED: '不收费', UNAVAILABLE: '暂无数据' }

function applyPreset() {
  if (draft.value.range === 'today') draft.value.start = draft.value.end = today
  else if (draft.value.range !== 'custom') { draft.value.end = today; draft.value.start = draft.value.range === '7' ? '2026-09-27' : '2026-09-04' }
}
function validate() {
  const span = (Date.parse(draft.value.end) - Date.parse(draft.value.start)) / 86_400_000 + 1
  if (!Number.isFinite(span) || span < 1 || span > 90 || draft.value.end > today) return `请选择不超过 90 天的有效时间范围，结束日期不能晚于 ${today}。`
  return ''
}
function load() {
  clearTimeout(timer); loading.value = true; error.value = ''
  timer = setTimeout(() => { loading.value = false; if (scenario.value === 'error' && !recovered.value) error.value = '加载失败，请重试。' }, 360)
}
function updateUrl(tab = activeTab.value) {
  const query: Record<string, string> = { tab, startDate: applied.value.start, endDate: applied.value.end }
  if (applied.value.resourceType) query.resourceType = applied.value.resourceType
  if (applied.value.model) query.platformModelId = applied.value.model
  if (applied.value.key) query.userKeyId = applied.value.key
  router.replace({ path: '/usage', query })
}
function query() { validation.value = validate(); if (validation.value) return; applied.value = { ...draft.value }; page.value = 1; updateUrl(); load() }
function reset() { draft.value = defaults(); applied.value = { ...draft.value }; page.value = 1; updateUrl(); load() }
function refresh() { page.value = 1; snapshot.value = '2026-10-03T10:42:00+08:00'; balanceUpdatedAt.value = snapshot.value; load() }
function retry() { recovered.value = true; load() }
function switchTab(tab: 'statistics' | 'details') { draft.value = { ...applied.value }; page.value = 1; updateUrl(tab) }
function drill(row: BreakdownRow) {
  draft.value = { ...applied.value, resourceType: row.resourceType, key: '', model: applied.value.model }
  if (row.date) { draft.value.range = 'custom'; draft.value.start = row.date; draft.value.end = row.date }
  if (dimension.value === 'KEY' && row.resourceType === 'TOKEN_SERVICE') draft.value.key = row.keyId ?? ''
  if (dimension.value === 'MODEL') draft.value.model = row.modelId ?? 'UNKNOWN'
  applied.value = { ...draft.value }; page.value = 1; updateUrl('details'); load()
}
function openDetail(call: UsageCall, event: MouseEvent) { returnFocus = event.currentTarget as HTMLElement; router.push({ query: { ...route.query, callId: call.id } }) }
function closeDetail() { const query = { ...route.query }; delete query.callId; router.replace({ query }) }
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = '已复制' } catch { copied.value = '复制失败' }
  clearTimeout(copyTimer); copyTimer = setTimeout(() => copied.value = '', 1800)
}
function csvCell(value: string | number | null) { const text = value === null ? '—' : String(value); return `"${text.replaceAll('"', '""')}"` }
function exportCsv() {
  if (exporting.value) return
  exporting.value = true; exportMessage.value = '正在生成'
  clearTimeout(exportTimer)
  exportTimer = setTimeout(() => {
    try {
      const headers = ['调用时间', '资源类型', '资源标识', '使用模型', '大模型类型', '输入Token', '输出Token', '缓存命中', '缓存未命中', '费用', '额度消耗', '调用状态']
      const rows = detailRows.value.map(call => [formatTime(call.startedAt, true), resourceLabel(call.serviceType), resourceId(call), call.modelName, modelTypeLabel[call.modelType], formatNumber(call.inputTokens), formatNumber(call.outputTokens), formatNumber(call.cacheReadTokens), formatNumber(call.cacheMissTokens), formatMoney(call.chargeAmount, call.chargeStatus), call.quotaAmount === null ? '—' : `${call.quotaAmount} ${call.quotaUnit === 'point' ? '积分' : 'Token'}`, statusLabel[call.status]])
      const csv = `\ufeff${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}`
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `tokenhub-usage-${applied.value.start}-${applied.value.end}.csv`; link.click(); URL.revokeObjectURL(url)
      exportMessage.value = `已导出 ${rows.length} 条明细`
    } catch { exportMessage.value = '生成失败，请重试' }
    exporting.value = false
  }, 500)
}
function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') { closeDetail(); return }
  if (event.key !== 'Tab') return
  const items = drawer.value?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')
  if (!items?.length) return
  const first = items[0]!, last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
function hydrateFromRoute() {
  const next = defaults()
  if (typeof route.query.startDate === 'string') { next.start = route.query.startDate; next.range = 'custom' }
  if (typeof route.query.endDate === 'string') next.end = route.query.endDate
  if (route.query.resourceType === 'AI_APPLICATION' || route.query.resourceType === 'TOKEN_SERVICE') next.resourceType = route.query.resourceType
  if (typeof route.query.platformModelId === 'string' && (route.query.platformModelId === 'UNKNOWN' || models.some(item => item.id === route.query.platformModelId))) next.model = route.query.platformModelId
  if (typeof route.query.userKeyId === 'string' && userKeys.some(item => item.id === route.query.userKeyId)) { next.key = route.query.userKeyId; next.resourceType = 'TOKEN_SERVICE' }
  draft.value = next; applied.value = { ...next }
}

watch(selectedId, async id => { document.body.style.overflow = id ? 'hidden' : ''; if (id) { await nextTick(); drawerClose.value?.focus() } else { await nextTick(); returnFocus?.focus() } }, { immediate: true })
watch(scenario, () => { recovered.value = false; page.value = 1; load() })
watch(() => draft.value.resourceType, value => { if (value === 'AI_APPLICATION') draft.value.key = '' })
watch(() => draft.value.key, value => { if (value) draft.value.resourceType = 'TOKEN_SERVICE' })
hydrateFromRoute()
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(copyTimer); clearTimeout(exportTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="usage-view">
    <div class="usage-heading"><div><h1>用量中心</h1><p>查看用了多少、花了多少、还剩多少，以及每一次调用的消费记录。</p></div><button class="refresh-button" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="用量中心页面场景"><option value="normal">正常数据</option><option value="balanceUnavailable">余额数据暂未提供</option><option value="empty">暂无调用</option><option value="partial">部分数据待更新</option><option value="error">查询失败</option></select></label></div>

    <section class="usage-balance-card" :class="{ unavailable: !currentBalance }"><span><WalletCards :size="20" /></span><div><small>当前可用余额</small><strong v-if="currentBalance">¥{{ currentBalance.amount }} <i>{{ currentBalance.currency }}</i></strong><strong v-else class="balance-unavailable">暂无余额数据</strong></div><p>更新时间：{{ currentBalance ? formatTime(balanceUpdatedAt) : '—' }}<br>金额余额为当前值，不随历史筛选变化</p></section>

    <section class="usage-card usage-main-card">
      <div class="usage-filters">
        <div class="usage-filter-grid usage-v4-filters">
          <label class="usage-date-field"><span>时间</span><div><select v-model="draft.range" @change="applyPreset"><option value="today">今日</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="custom">自定义</option></select><input v-model="draft.start" type="date" :max="today" @input="draft.range='custom'"><span>至</span><input v-model="draft.end" type="date" :max="today" @input="draft.range='custom'"></div></label>
          <label><span>资源类型</span><select v-model="draft.resourceType"><option value="">全部</option><option value="AI_APPLICATION">AI应用</option><option value="TOKEN_SERVICE">Token服务</option></select></label>
          <label><span>密钥</span><select v-model="draft.key" :disabled="draft.resourceType === 'AI_APPLICATION'"><option value="">全部密钥</option><option v-for="item in optionKeys" :key="item.id" :value="item.id">{{ item.label }}</option></select><small v-if="draft.resourceType === 'AI_APPLICATION'">AI应用按订单归属</small></label>
          <label><span>模型</span><select v-model="draft.model"><option value="">全部模型</option><option v-for="item in models" :key="item.id" :value="item.id">{{ item.label }}</option><option value="UNKNOWN">未识别模型</option></select></label>
        </div>
        <div class="usage-filter-footer"><div><span v-if="dirty" class="usage-dirty">筛选条件尚未应用</span><span v-if="validation" class="usage-validation">{{ validation }}</span></div><div><button class="usage-secondary" @click="reset"><RotateCcw :size="14" />重置</button><button class="usage-primary" :disabled="loading" @click="query"><Search :size="14" />查询</button></div></div>
      </div>

      <div class="usage-tabs" role="tablist" aria-label="用量中心页面"><button role="tab" :aria-selected="activeTab==='statistics'" :class="{ active: activeTab==='statistics' }" @click="switchTab('statistics')"><BarChart3 :size="16" />用量统计</button><button role="tab" :aria-selected="activeTab==='details'" :class="{ active: activeTab==='details' }" @click="switchTab('details')"><ListFilter :size="16" />消费明细</button></div>
      <div class="usage-query-meta"><span>已查询：{{ applied.start }} 至 {{ applied.end }}（北京时间）</span><span>数据更新时间：{{ formatTime(snapshot) }}</span><span v-if="scenario === 'partial'" class="usage-partial"><i />部分计量或费用待更新</span></div>

      <div v-if="error" class="usage-state"><ShieldAlert :size="29" /><strong>加载失败，请重试</strong><p>{{ error }}</p><button class="usage-primary" @click="retry">重新加载</button></div>
      <div v-else-if="loading" class="usage-state"><RefreshCw class="spinning" :size="28" /><strong>正在查询用量数据</strong><p>正在按当前筛选条件更新统计和明细。</p></div>

      <template v-else-if="activeTab === 'statistics'">
        <div class="usage-metrics usage-v4-metrics">
          <article><span><Zap :size="16" />总 Token</span><strong>{{ metrics.complete || !commonRows.length ? formatNumber(metrics.total) : '—' }}</strong><small>输入与输出之和，不重复计算缓存</small></article>
          <article><span><Database :size="16" />输入 Token</span><strong>{{ metrics.complete || !commonRows.length ? formatNumber(metrics.input) : '—' }}</strong><small>包含缓存命中的输入 Token</small></article>
          <article><span><Sparkles :size="16" />输出 Token</span><strong>{{ metrics.complete || !commonRows.length ? formatNumber(metrics.output) : '—' }}</strong><small v-if="metrics.pending">{{ metrics.pending }} 条计量待更新</small><small v-else>已完成计量</small></article>
          <article><span><CircleDollarSign :size="16" />计费费用</span><strong>{{ formatMoney(metrics.charge) }}</strong><small v-if="metrics.chargePending">另有 {{ metrics.chargePending }} 条费用待更新</small><small v-else>已确认费用合计</small></article>
        </div>

        <div class="usage-content-grid">
          <section class="usage-chart-panel"><div class="usage-section-title"><div><h2>每日用量趋势</h2><p>输入 Token、输出 Token</p></div><BarChart3 :size="19" /></div><div v-if="!commonRows.length" class="usage-inline-empty">暂无统计数据</div><div v-else class="usage-bars"><div v-for="item in daily" :key="item.date" class="usage-bar-day" tabindex="0"><div class="usage-bar-tooltip"><strong>{{ item.date }}</strong><span>输入 {{ formatNumber(item.input) }} · 输出 {{ formatNumber(item.output) }}</span></div><div class="usage-bar-track"><i class="input" :style="{ height: `${item.input / dailyMax * 100}%` }"/><i class="output" :style="{ height: `${item.output / dailyMax * 100}%` }"/></div><span>{{ item.date.slice(5) }}</span></div></div></section>
          <section class="usage-cache-panel"><div class="usage-section-title"><div><h2>缓存用量</h2><p>命中 Token、未命中 Token</p></div><Layers3 :size="19" /></div><div class="usage-cache-ring" :style="{'--ratio':`${(cacheMetrics.ratio ?? 0) * 360}deg`}"><div><strong>{{ cacheMetrics.ratio === null ? '—' : `${(cacheMetrics.ratio * 100).toFixed(1)}%` }}</strong><span>命中占比</span></div></div><dl><div><dt>缓存命中 Token</dt><dd>{{ formatNumber(cacheMetrics.hit) }}</dd></div><div><dt>缓存未命中 Token</dt><dd>{{ formatNumber(cacheMetrics.miss) }}</dd></div></dl><p v-if="cacheMetrics.uncovered" class="usage-cache-note">另有 {{ cacheMetrics.uncovered }} 条记录的部分缓存数据未提供。</p></section>
        </div>

        <section class="usage-breakdown"><div class="usage-section-title"><div><h2>统计明细</h2><p>卡片、趋势和表格使用相同筛选条件</p></div><div class="usage-segment"><button :class="{ active: dimension === 'TIME' }" @click="dimension='TIME'">按时间</button><button :class="{ active: dimension === 'KEY' }" @click="dimension='KEY'">按密钥</button><button :class="{ active: dimension === 'MODEL' }" @click="dimension='MODEL'">按模型</button></div></div><div class="usage-table-scroll"><table><thead><tr><th>统计对象</th><th>资源类型</th><th>输入</th><th>输出</th><th>缓存命中</th><th>缓存未命中</th><th>总 Token</th><th>费用</th><th>操作</th></tr></thead><tbody><tr v-for="row in breakdown" :key="row.id"><td><strong>{{ row.label }}</strong><small>{{ row.calls }} 次调用</small></td><td><span class="usage-resource-type">{{ resourceLabel(row.resourceType) }}</span></td><td>{{ formatNumber(row.input) }}</td><td>{{ formatNumber(row.output) }}</td><td>{{ formatNumber(row.hit) }}</td><td>{{ formatNumber(row.miss) }}</td><td>{{ formatNumber(row.total) }}</td><td>{{ formatMoney(row.charge) }}</td><td><button class="usage-link" @click="drill(row)">查看明细<ArrowRight :size="12" /></button></td></tr><tr v-if="!breakdown.length"><td colspan="9"><div class="usage-inline-empty">暂无统计数据</div></td></tr></tbody></table></div></section>
      </template>

      <template v-else>
        <div class="usage-results-head"><div><h2>消费明细</h2><p>按调用时间倒序，时间精确到毫秒。</p></div><div class="usage-export-actions"><span>{{ exportMessage || `共 ${detailRows.length} 条` }}</span><button class="usage-secondary" :disabled="exporting || !detailRows.length" @click="exportCsv"><Download :size="14" />{{ exporting ? '正在生成' : '导出 CSV' }}</button></div></div>
        <div class="usage-table-scroll usage-call-table"><table><thead><tr><th>调用时间</th><th>资源类型</th><th>资源标识</th><th>使用模型</th><th>大模型类型</th><th>输入 Token</th><th>输出 Token</th><th>缓存命中 / 未命中</th><th>费用</th><th>额度消耗</th><th>调用状态</th><th>操作</th></tr></thead><tbody><tr v-for="call in pageRows" :key="call.id"><td><strong>{{ formatTime(call.startedAt, true) }}</strong><small>{{ call.id }}</small></td><td><span class="usage-resource-type">{{ resourceLabel(call.serviceType) }}</span></td><td><strong>{{ resourceId(call) }}</strong></td><td>{{ call.modelName }}</td><td><span class="usage-model-type">{{ modelTypeLabel[call.modelType] }}</span></td><td>{{ formatNumber(call.inputTokens) }}</td><td>{{ formatNumber(call.outputTokens) }}</td><td><div class="usage-token-breakdown"><span><i>命中</i>{{ formatNumber(call.cacheReadTokens) }}</span><span><i>未命中</i>{{ formatNumber(call.cacheMissTokens) }}</span></div></td><td><strong>{{ formatMoney(call.chargeAmount, call.chargeStatus) }}</strong></td><td><strong>{{ call.quotaAmount === null ? '—' : formatNumber(call.quotaAmount) }}</strong><small>{{ call.quotaUnit === 'token' ? 'Token' : call.quotaUnit === 'point' ? '积分' : '' }}</small></td><td><span class="usage-status" :class="call.status.toLowerCase()">{{ statusLabel[call.status] }}</span></td><td><button class="usage-link" @click="openDetail(call, $event)">查看详情</button></td></tr><tr v-if="!pageRows.length"><td colspan="12"><div class="usage-inline-empty">暂无消费明细</div></td></tr></tbody></table></div>
        <div class="usage-pagination"><span>共 {{ detailRows.length }} 条记录</span><div><label>每页<select v-model="pageSize" @change="page=1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label><button :disabled="page === 1" aria-label="上一页" @click="page--"><ChevronLeft :size="15" /></button><span>第 {{ page }} / {{ pageCount }} 页</span><button :disabled="page === pageCount" aria-label="下一页" @click="page++"><ChevronRight :size="15" /></button></div></div>
      </template>
    </section>
    <p class="usage-footnote"><Info :size="14" />当前可用余额直接读取账户／计费服务，不由积分或 Token 换算；用量费用随筛选条件变化。</p>

    <div v-if="selectedId" class="usage-drawer-layer" @keydown="trapFocus"><button class="usage-drawer-backdrop" aria-label="关闭调用详情" @click="closeDetail"/><aside ref="drawer" class="usage-drawer" role="dialog" aria-modal="true" aria-labelledby="usage-detail-title"><header><div><h2 id="usage-detail-title">调用详情</h2></div><button ref="drawerClose" class="icon-button" aria-label="关闭" @click="closeDetail"><X :size="19" /></button></header><div v-if="selected" class="usage-drawer-body"><div class="usage-detail-summary"><span :class="selected.status.toLowerCase()"><Activity :size="21" /></span><div><h3>{{ selected.modelName }}<b class="usage-status" :class="selected.status.toLowerCase()">{{ statusLabel[selected.status] }}</b></h3><p>{{ selected.resultMessage }}</p></div></div><section><h3>基本信息</h3><dl><dt>调用编号</dt><dd class="usage-copy">{{ selected.id }}<button @click="copy(selected.id)"><Copy :size="13" /></button></dd><dt>调用时间</dt><dd>{{ formatTime(selected.startedAt, true) }}</dd><dt>资源类型</dt><dd>{{ resourceLabel(selected.serviceType) }}</dd><dt>资源标识</dt><dd>{{ resourceId(selected) }}</dd><dt>使用模型</dt><dd>{{ selected.modelName }} · {{ modelTypeLabel[selected.modelType] }}</dd></dl></section><section><h3>Token 与缓存</h3><dl><dt>输入 Token</dt><dd>{{ formatNumber(selected.inputTokens) }}</dd><dt>输出 Token</dt><dd>{{ formatNumber(selected.outputTokens) }}</dd><dt>总 Token</dt><dd>{{ formatNumber(tokenTotal(selected)) }}</dd><dt>缓存</dt><dd>命中 {{ formatNumber(selected.cacheReadTokens) }} · 未命中 {{ formatNumber(selected.cacheMissTokens) }}</dd><dt>计量状态</dt><dd>{{ meteringLabel[selected.meteringStatus] }}</dd></dl></section><section><h3>费用与额度</h3><dl><dt>调用费用</dt><dd>{{ formatMoney(selected.chargeAmount, selected.chargeStatus) }}</dd><dt>费用状态</dt><dd>{{ chargeLabel[selected.chargeStatus] }}</dd><dt>额度消耗</dt><dd>{{ selected.quotaAmount === null ? '—' : `${formatNumber(selected.quotaAmount)} ${selected.quotaUnit === 'point' ? '积分' : 'Token'}` }}</dd></dl></section><section><h3>调用结果摘要</h3><dl><dt>结果</dt><dd>{{ selected.resultMessage }}</dd><dt>公开错误码</dt><dd>{{ selected.errorCode ?? '—' }}</dd><dt>总耗时</dt><dd>{{ selected.durationMs === null ? '—' : `${selected.durationMs} ms` }}</dd></dl></section></div><div v-else class="usage-state"><ShieldAlert :size="28" /><strong>调用不存在或当前账户无权查看</strong><p>请关闭详情后重新查询。</p></div><footer><span>{{ copied }}</span><button class="usage-secondary" @click="closeDetail">关闭</button></footer></aside></div>
  </div>
</template>
