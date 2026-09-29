<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity, ArrowRight, BarChart3, Check, ChevronLeft, ChevronRight, CircleDollarSign,
  Clock3, Copy, Database, Info, Layers3, ListFilter, RefreshCw, RotateCcw, Search,
  ShieldAlert, Sparkles, X, Zap,
} from 'lucide-vue-next'
import {
  actors, models, services, usageCalls, userKeys,
  type CallStatus, type ChargeStatus, type MeteringStatus, type UsageCall,
} from '../data/usage'
import './usage.css'

const props = defineProps<{ isSub: boolean }>()
const route = useRoute()
const router = useRouter()
const activeTab = computed(() => route.query.tab === 'details' ? 'details' : 'statistics')
const today = '2026-09-28'
const defaults = () => ({
  range: '7', start: '2026-09-22', end: today, service: '', model: '', key: '', actor: '',
  callStatus: '',
})
const draft = ref(defaults())
const applied = ref(defaults())
const loading = ref(false)
const error = ref('')
const validation = ref('')
const scenario = ref('normal')
const recovered = ref(false)
const dimension = ref<'MODEL' | 'KEY' | 'ACTOR' | 'SERVICE'>('MODEL')
const trendMetric = ref<'TOKEN' | 'CALL' | 'CHARGE'>('TOKEN')
const page = ref(1)
const pageSize = ref(20)
const copied = ref('')
const snapshot = ref('2026-09-28T16:35:00+08:00')
const drawer = ref<HTMLElement>()
const drawerClose = ref<HTMLButtonElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let returnFocus: HTMLElement | null = null

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const isPartial = computed(() => scenario.value === 'partial')
const permittedCalls = computed(() => props.isSub
  ? usageCalls.filter(item => item.actorId === 'account-sub-a' && item.serviceType === 'TOKEN_SERVICE')
  : usageCalls)
const optionKeys = computed(() => userKeys.filter(item => (!draft.value.actor || item.actorId === draft.value.actor) && (!draft.value.service || item.serviceId === draft.value.service) && (!props.isSub || item.actorId === 'account-sub-a')))

function localDate(time: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(time))
}
function formatTime(time: string | null) {
  if (!time) return '—'
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(time)).replaceAll('/', '-')
}
function formatNumber(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('zh-CN').format(value)
}
function formatMoney(value: number | null) {
  return value === null ? '—' : `¥${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`
}
function tokenTotal(call: UsageCall) {
  return call.meteringStatus === 'COMPLETE' && call.inputTokens !== null && call.outputTokens !== null ? call.inputTokens + call.outputTokens : null
}
function matchesCommon(call: UsageCall) {
  const filter = applied.value
  const date = localDate(call.startedAt)
  return date >= filter.start && date <= filter.end
    && (!filter.service || call.serviceId === filter.service)
    && (!filter.model || call.modelId === filter.model || (filter.model === 'UNKNOWN' && call.modelId === null))
    && (!filter.key || call.keyId === filter.key || (filter.key === 'BUSINESS' && call.keyCategory === 'BUSINESS') || (filter.key === 'UNKNOWN' && call.keyCategory === 'UNKNOWN'))
    && (!filter.actor || call.actorId === filter.actor)
}
const commonRows = computed(() => scenario.value === 'empty' ? [] : permittedCalls.value.filter(matchesCommon))
const detailRows = computed(() => commonRows.value.filter(call => {
  const filter = applied.value
  return (!filter.callStatus || call.status === filter.callStatus)
}))
const pageRows = computed(() => detailRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const hasNext = computed(() => page.value * pageSize.value < detailRows.value.length)

const metrics = computed(() => {
  const complete = commonRows.value.filter(item => item.meteringStatus === 'COMPLETE')
  const input = complete.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0)
  const output = complete.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0)
  const settled = commonRows.value.filter(item => item.chargeStatus === 'SETTLED')
  return {
    calls: commonRows.value.length,
    input, output, total: input + output,
    charge: settled.reduce((sum, item) => sum + (item.chargeAmount ?? 0), 0),
    complete: complete.length,
    pending: commonRows.value.filter(item => item.meteringStatus === 'PENDING').length,
    chargePending: commonRows.value.filter(item => item.chargeStatus === 'PENDING' || item.chargeStatus === 'UNAVAILABLE').length,
  }
})
const cacheMetrics = computed(() => {
  const covered = commonRows.value.filter(item => item.cacheReadTokens !== null && item.cacheMissTokens !== null)
  const read = covered.reduce((sum, item) => sum + (item.cacheReadTokens ?? 0), 0)
  const miss = covered.reduce((sum, item) => sum + (item.cacheMissTokens ?? 0), 0)
  return { covered: covered.length, uncovered: metrics.value.complete - covered.length, read, miss, ratio: read + miss ? read / (read + miss) : null }
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
  const rows = commonRows.value.filter(item => localDate(item.startedAt) === date)
  const complete = rows.filter(item => item.meteringStatus === 'COMPLETE')
  return {
    date,
    input: complete.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
    output: complete.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0),
    calls: rows.length,
    charge: rows.filter(item => item.chargeStatus === 'SETTLED').reduce((sum, item) => sum + (item.chargeAmount ?? 0), 0),
  }
}))
const dailyMax = computed(() => Math.max(1, ...daily.value.map(item => trendMetric.value === 'CALL' ? item.calls : trendMetric.value === 'CHARGE' ? item.charge : item.input + item.output)))

const breakdown = computed(() => {
  const grouped = new Map<string, { id: string; label: string; kind: string; rows: UsageCall[] }>()
  for (const call of commonRows.value) {
    let id = '', label = '', kind = 'NORMAL'
    if (dimension.value === 'MODEL') { id = call.modelId ?? 'UNKNOWN'; label = call.modelName; kind = call.modelId ? 'NORMAL' : 'UNKNOWN' }
    if (dimension.value === 'SERVICE') { id = call.serviceId; label = call.serviceName }
    if (dimension.value === 'ACTOR') { id = call.actorId; label = call.actorName }
    if (dimension.value === 'KEY') {
      id = call.keyCategory === 'USER' ? call.keyId ?? 'UNKNOWN' : call.keyCategory
      label = call.keyCategory === 'BUSINESS' ? '系统业务调用' : call.keyCategory === 'UNKNOWN' ? '未识别密钥' : call.keyName ?? '未识别密钥'
      kind = call.keyCategory
    }
    const row = grouped.get(id) ?? { id, label, kind, rows: [] }
    row.rows.push(call); grouped.set(id, row)
  }
  return [...grouped.values()].map(group => {
    const complete = group.rows.filter(item => item.meteringStatus === 'COMPLETE')
    const input = complete.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0)
    const output = complete.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0)
    const charge = group.rows.filter(item => item.chargeStatus === 'SETTLED').reduce((sum, item) => sum + (item.chargeAmount ?? 0), 0)
    return { ...group, calls: group.rows.length, input, output, total: input + output, charge }
  }).sort((left, right) => right.total - left.total || left.id.localeCompare(right.id))
})

const selectedId = computed(() => typeof route.query.callId === 'string' ? route.query.callId : '')
const selected = computed(() => permittedCalls.value.find(item => item.id === selectedId.value))
const statusLabel: Record<CallStatus, string> = { PROCESSING: '处理中', SUCCESS: '成功', FAILED: '失败', CANCELLED: '已取消' }
const meteringLabel: Record<MeteringStatus, string> = { PENDING: '待计量', COMPLETE: '已完成', UNAVAILABLE: '无法获取', NOT_APPLICABLE: '非 Token 计量' }
const chargeLabel: Record<ChargeStatus, string> = { PENDING: '待确认', SETTLED: '已确认', NOT_CHARGED: '不计费', UNAVAILABLE: '暂不可用' }

function applyPreset() {
  if (draft.value.range === 'today') draft.value.start = today
  else if (draft.value.range === 'yesterday') draft.value.start = draft.value.end = '2026-09-27'
  else if (draft.value.range !== 'custom') { draft.value.end = today; draft.value.start = draft.value.range === '7' ? '2026-09-22' : '2026-08-30' }
}
function validate() {
  const span = (Date.parse(draft.value.end) - Date.parse(draft.value.start)) / 86_400_000 + 1
  if (!Number.isFinite(span) || span < 1 || span > 90 || draft.value.end > today) return '请选择不超过 90 天的有效时间范围，结束日期不能晚于 2026-09-28。'
  return ''
}
function load() {
  clearTimeout(timer); loading.value = true; error.value = ''
  timer = setTimeout(() => { loading.value = false; if (scenario.value === 'error' && !recovered.value) error.value = '暂时无法获取用量数据，请稍后重试。' }, 360)
}
function updateUrl() {
  const query: Record<string, string> = { tab: activeTab.value, startDate: applied.value.start, endDate: applied.value.end }
  if (applied.value.service) query.serviceId = applied.value.service
  if (applied.value.model) query.platformModelId = applied.value.model
  if (applied.value.key) query.userKeyId = applied.value.key
  if (applied.value.actor && !props.isSub) query.actorAccountId = applied.value.actor
  router.replace({ path: '/usage', query })
}
function query() {
  validation.value = validate(); if (validation.value) return
  applied.value = { ...draft.value, actor: props.isSub ? '' : draft.value.actor }
  page.value = 1; updateUrl(); load()
}
function reset() { draft.value = defaults(); if (props.isSub) draft.value.actor = ''; query() }
function refresh() { page.value = 1; snapshot.value = '2026-09-28T16:42:00+08:00'; load() }
function retry() { recovered.value = true; load() }
function switchTab(tab: 'statistics' | 'details') {
  draft.value.callStatus = ''
  applied.value.callStatus = ''
  page.value = 1
  router.replace({ path: '/usage', query: { ...route.query, tab } })
}
function drill(row: typeof breakdown.value[number]) {
  draft.value.model = dimension.value === 'MODEL' ? row.id : draft.value.model
  draft.value.service = dimension.value === 'SERVICE' ? row.id : draft.value.service
  draft.value.actor = dimension.value === 'ACTOR' ? row.id : draft.value.actor
  draft.value.key = dimension.value === 'KEY' ? row.id : draft.value.key
  applied.value = { ...draft.value, callStatus: '' }
  page.value = 1
  const query: Record<string, string> = { tab: 'details', startDate: applied.value.start, endDate: applied.value.end }
  if (applied.value.service) query.serviceId = applied.value.service
  if (applied.value.model) query.platformModelId = applied.value.model
  if (applied.value.key) query.userKeyId = applied.value.key
  if (applied.value.actor && !props.isSub) query.actorAccountId = applied.value.actor
  router.replace({ path: '/usage', query })
  load()
}
function openDetail(call: UsageCall, event: MouseEvent) { returnFocus = event.currentTarget as HTMLElement; router.push({ query: { ...route.query, callId: call.id } }) }
function closeDetail() { const query = { ...route.query }; delete query.callId; router.replace({ query }) }
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = '已复制' } catch { copied.value = '复制失败' }
  clearTimeout(copyTimer); copyTimer = setTimeout(() => copied.value = '', 1800)
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
  if (typeof route.query.serviceId === 'string' && services.some(item => item.id === route.query.serviceId)) next.service = route.query.serviceId
  if (typeof route.query.platformModelId === 'string' && (route.query.platformModelId === 'UNKNOWN' || models.some(item => item.id === route.query.platformModelId))) next.model = route.query.platformModelId
  if (typeof route.query.userKeyId === 'string' && (['BUSINESS', 'UNKNOWN'].includes(route.query.userKeyId) || userKeys.some(item => item.id === route.query.userKeyId))) next.key = route.query.userKeyId
  if (!props.isSub && typeof route.query.actorAccountId === 'string' && actors.some(item => item.id === route.query.actorAccountId)) next.actor = route.query.actorAccountId
  draft.value = next; applied.value = { ...next }
}

watch(selectedId, async id => {
  document.body.style.overflow = id ? 'hidden' : ''
  if (id) { await nextTick(); drawerClose.value?.focus() } else { await nextTick(); returnFocus?.focus() }
}, { immediate: true })
watch(scenario, () => { recovered.value = false; page.value = 1; load() })
watch(() => props.isSub, () => { hydrateFromRoute(); scenario.value = 'normal'; page.value = 1; if (selectedId.value) closeDetail(); load() })
watch(() => draft.value.service, () => { if (draft.value.key && !optionKeys.value.some(item => item.id === draft.value.key)) draft.value.key = '' })
watch(() => draft.value.actor, () => { if (draft.value.key && !optionKeys.value.some(item => item.id === draft.value.key)) draft.value.key = '' })
hydrateFromRoute()
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(copyTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="usage-view">
    <div class="usage-heading"><div><h1>用量中心</h1><p>查看 Token 消耗、缓存用量与逐笔调用记录。</p></div><button class="refresh-button" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="用量中心页面场景"><option value="normal">正常数据</option><option value="empty">暂无调用</option><option value="partial">部分计量中</option><option value="error">查询失败</option></select></label></div>
    <div class="usage-scope"><span class="usage-scope-icon"><Database :size="19" /></span><div><strong>{{ isSub ? '仅当前子账户的调用' : '当前主账户及子账户调用' }}</strong><p>实际 Token、套餐扣减额度和消费金额分别统计；内部重试不会重复计算调用次数。</p></div><span>上海时区</span></div>

    <section class="usage-card usage-main-card">
      <div class="usage-tabs" role="tablist" aria-label="用量中心页面"><button role="tab" :aria-selected="activeTab==='statistics'" :class="{ active: activeTab==='statistics' }" @click="switchTab('statistics')"><BarChart3 :size="16" />用量统计</button><button role="tab" :aria-selected="activeTab==='details'" :class="{ active: activeTab==='details' }" @click="switchTab('details')"><ListFilter :size="16" />调用明细</button></div>

      <div class="usage-filters">
        <div class="usage-filter-grid">
          <label class="usage-date-field"><span>时间范围</span><div><select v-model="draft.range" @change="applyPreset"><option value="today">今天</option><option value="yesterday">昨天</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="custom">自定义</option></select><input v-model="draft.start" type="date" :max="today" @input="draft.range='custom'"><span>至</span><input v-model="draft.end" type="date" :max="today" @input="draft.range='custom'"></div></label>
          <label><span>服务</span><select v-model="draft.service"><option value="">全部服务</option><option v-for="item in services.filter(s => !isSub || s.type === 'TOKEN_SERVICE')" :key="item.id" :value="item.id">{{ item.label }}</option></select></label>
          <label><span>平台模型</span><select v-model="draft.model"><option value="">全部模型</option><option v-for="item in models" :key="item.id" :value="item.id">{{ item.label }}</option><option value="UNKNOWN">未识别模型</option></select></label>
          <label><span>用户密钥</span><select v-model="draft.key"><option value="">全部密钥</option><option v-for="item in optionKeys" :key="item.id" :value="item.id">{{ item.label }}</option><option v-if="!isSub" value="BUSINESS">系统业务调用</option><option value="UNKNOWN">未识别密钥</option></select></label>
          <label v-if="!isSub"><span>调用账户</span><select v-model="draft.actor"><option value="">全部账户</option><option v-for="item in actors" :key="item.id" :value="item.id">{{ item.label }} · {{ item.type }}</option></select></label>
        </div>
        <div v-if="activeTab==='details'" class="usage-detail-filters"><label><span>调用状态</span><select v-model="draft.callStatus"><option value="">全部状态</option><option value="SUCCESS">成功</option><option value="FAILED">失败</option></select></label></div>
        <div class="usage-filter-footer"><div><span v-if="dirty" class="usage-dirty">筛选条件尚未应用</span><span v-if="validation" class="usage-validation">{{ validation }}</span></div><div><button class="usage-secondary" @click="reset"><RotateCcw :size="14" />重置</button><button class="usage-primary" :disabled="loading" @click="query"><Search :size="14" />查询</button></div></div>
      </div>

      <div class="usage-query-meta"><span>已查询：{{ applied.start }} 至 {{ applied.end }}</span><span>数据截至 {{ formatTime(snapshot) }}</span><span v-if="isPartial" class="usage-partial"><i />部分调用仍在计量</span></div>

      <div v-if="error" class="usage-state"><ShieldAlert :size="29" /><strong>用量数据暂时无法加载</strong><p>{{ error }}</p><button class="usage-primary" @click="retry">重新查询</button></div>
      <div v-else-if="loading" class="usage-state"><RefreshCw class="spinning" :size="28" /><strong>正在生成查询快照</strong><p>正在按当前账户和筛选条件汇总数据。</p></div>

      <template v-else-if="activeTab==='statistics'">
        <div class="usage-metrics">
          <article><span><Activity :size="16" />调用次数</span><strong>{{ formatNumber(metrics.calls) }}</strong><small>唯一客户端调用，内部重试不重复</small></article>
          <article><span><Zap :size="16" />总 Token</span><strong>{{ metrics.complete || !metrics.calls ? formatNumber(metrics.total) : '—' }}</strong><small>已完成计量 {{ metrics.complete }} 次<span v-if="metrics.pending"> · 待计量 {{ metrics.pending }} 次</span></small></article>
          <article><span><Database :size="16" />输入 Token</span><strong>{{ metrics.complete || !metrics.calls ? formatNumber(metrics.input) : '—' }}</strong><small>包含缓存命中的输入 Token</small></article>
          <article><span><Sparkles :size="16" />输出 Token</span><strong>{{ metrics.complete || !metrics.calls ? formatNumber(metrics.output) : '—' }}</strong><small>不重复叠加已含的推理 Token</small></article>
          <article><span><CircleDollarSign :size="16" />已确认消费</span><strong>{{ formatMoney(metrics.charge) }}</strong><small>CNY<span v-if="metrics.chargePending"> · {{ metrics.chargePending }} 次尚未确认</span></small></article>
        </div>

        <div class="usage-content-grid">
          <section class="usage-chart-panel"><div class="usage-section-title"><div><h2>每日趋势</h2><p>统计结果与指标卡使用同一查询快照</p></div><div class="usage-segment"><button :class="{active:trendMetric==='TOKEN'}" @click="trendMetric='TOKEN'">Token</button><button :class="{active:trendMetric==='CALL'}" @click="trendMetric='CALL'">调用次数</button><button :class="{active:trendMetric==='CHARGE'}" @click="trendMetric='CHARGE'">消费</button></div></div><div v-if="!commonRows.length" class="usage-inline-empty">所选条件下暂无调用记录</div><div v-else class="usage-bars"><div v-for="item in daily" :key="item.date" class="usage-bar-day" tabindex="0"><div class="usage-bar-tooltip"><strong>{{ item.date }}</strong><span>输入 {{ formatNumber(item.input) }} · 输出 {{ formatNumber(item.output) }}</span><span>调用 {{ item.calls }} 次 · {{ formatMoney(item.charge) }}</span></div><div class="usage-bar-track"><template v-if="trendMetric==='TOKEN'"><i class="input" :style="{height:`${item.input/dailyMax*100}%`}"/><i class="output" :style="{height:`${item.output/dailyMax*100}%`}"/></template><i v-else class="single" :class="trendMetric.toLowerCase()" :style="{height:`${(trendMetric==='CALL'?item.calls:item.charge)/dailyMax*100}%`}"/></div><span>{{ item.date.slice(5) }}</span></div></div></section>

          <section class="usage-cache-panel"><div class="usage-section-title"><div><h2>缓存输入分析</h2><p>仅统计支持完整缓存拆分的调用</p></div><Layers3 :size="19" /></div><div class="usage-cache-ring" :style="{'--ratio':`${(cacheMetrics.ratio ?? 0)*360}deg`}"><div><strong>{{ cacheMetrics.ratio===null?'—':`${(cacheMetrics.ratio*100).toFixed(1)}%` }}</strong><span>命中占比</span></div></div><dl><div><dt>缓存命中输入</dt><dd>{{ formatNumber(cacheMetrics.read) }}</dd></div><div><dt>未命中输入</dt><dd>{{ formatNumber(cacheMetrics.miss) }}</dd></div><div><dt>覆盖调用数</dt><dd>{{ cacheMetrics.covered }} / {{ metrics.complete }}</dd></div></dl><p v-if="cacheMetrics.uncovered" class="usage-cache-note">另有 {{ cacheMetrics.uncovered }} 次已计量调用暂不支持缓存拆分。</p></section>
        </div>

        <section class="usage-breakdown"><div class="usage-section-title"><div><h2>维度汇总</h2><p>默认按总 Token 从高到低排列</p></div><div class="usage-segment"><button :class="{active:dimension==='MODEL'}" @click="dimension='MODEL'">模型</button><button :class="{active:dimension==='KEY'}" @click="dimension='KEY'">用户密钥</button><button v-if="!isSub" :class="{active:dimension==='ACTOR'}" @click="dimension='ACTOR'">调用账户</button><button :class="{active:dimension==='SERVICE'}" @click="dimension='SERVICE'">服务</button></div></div><div class="usage-table-scroll"><table><thead><tr><th>汇总对象</th><th>调用次数</th><th>输入 Token</th><th>输出 Token</th><th>总 Token</th><th>已确认消费</th><th>操作</th></tr></thead><tbody><tr v-for="row in breakdown" :key="row.id"><td><strong>{{ row.label }}</strong><small v-if="row.kind!=='NORMAL'">特殊分类，不代表可管理对象</small></td><td>{{ formatNumber(row.calls) }}</td><td>{{ formatNumber(row.input) }}</td><td>{{ formatNumber(row.output) }}</td><td>{{ formatNumber(row.total) }}</td><td>{{ formatMoney(row.charge) }}</td><td><button class="usage-link" @click="drill(row)">查看调用<ArrowRight :size="12" /></button></td></tr><tr v-if="!breakdown.length"><td colspan="7"><div class="usage-inline-empty">暂无可汇总记录</div></td></tr></tbody></table></div></section>
      </template>

      <template v-else>
        <div class="usage-results-head"><div><h2>调用明细</h2><p>按调用时间倒序；同一调用的预扣、校正和内部重试只展示一条记录。</p></div><span>本页 {{ pageRows.length }} 条<span v-if="detailRows.length"> · 匹配 {{ detailRows.length }} 条记录</span></span></div>
        <div class="usage-table-scroll usage-call-table"><table><thead><tr><th>调用时间</th><th>平台模型／服务</th><th v-if="!isSub">调用账户</th><th>用户密钥</th><th>Token 用量</th><th>缓存输入</th><th>已确认消费</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="call in pageRows" :key="call.id"><td><strong>{{ formatTime(call.startedAt) }}</strong><small>{{ call.id }}</small></td><td><strong>{{ call.modelName }}</strong><small>{{ call.serviceName }}</small></td><td v-if="!isSub">{{ call.actorName }}</td><td>{{ call.keyCategory==='BUSINESS'?'系统业务调用':call.keyCategory==='UNKNOWN'?'未识别密钥':call.keyName }}</td><td><strong>{{ formatNumber(tokenTotal(call)) }}</strong><small>{{ meteringLabel[call.meteringStatus] }}<template v-if="call.meteringStatus==='COMPLETE'"> · {{ formatNumber(call.inputTokens) }} / {{ formatNumber(call.outputTokens) }}</template></small></td><td>{{ call.cacheReadTokens===null?'—':`${formatNumber(call.cacheReadTokens)} / ${formatNumber(call.cacheMissTokens)}` }}</td><td><strong>{{ call.chargeStatus==='SETTLED'?formatMoney(call.chargeAmount):call.chargeStatus==='NOT_CHARGED'?'¥0':'—' }}</strong><small>{{ chargeLabel[call.chargeStatus] }}</small></td><td><span class="usage-status" :class="call.status.toLowerCase()">{{ statusLabel[call.status] }}</span></td><td><button class="usage-link" @click="openDetail(call,$event)">查看详情</button></td></tr><tr v-if="!pageRows.length"><td :colspan="isSub?8:9"><div class="usage-inline-empty">所选条件下暂无调用记录</div></td></tr></tbody></table></div>
        <div class="usage-pagination"><span>使用稳定游标模拟分页，不展示未经计算的总页数</span><div><label>每页<select v-model="pageSize" @change="page=1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label><button :disabled="page===1" aria-label="上一页" @click="page--;load()"><ChevronLeft :size="15" /></button><span>第 {{ page }} 页</span><button :disabled="!hasNext" aria-label="下一页" @click="page++;load()"><ChevronRight :size="15" /></button></div></div>
      </template>
    </section>
    <p class="usage-footnote"><Info :size="14" />用量、计量、计费和快照数据由大网关或用量服务提供。</p>

    <div v-if="selectedId" class="usage-drawer-layer" @keydown="trapFocus"><button class="usage-drawer-backdrop" aria-label="关闭调用详情" @click="closeDetail"/><aside ref="drawer" class="usage-drawer" role="dialog" aria-modal="true" aria-labelledby="usage-detail-title"><header><div><h2 id="usage-detail-title">调用详情</h2></div><button ref="drawerClose" class="icon-button" aria-label="关闭" @click="closeDetail"><X :size="19" /></button></header><div v-if="selected" class="usage-drawer-body"><div class="usage-detail-summary"><span :class="selected.status.toLowerCase()"><Activity :size="21" /></span><div><h3>{{ selected.modelName }}<b class="usage-status" :class="selected.status.toLowerCase()">{{ statusLabel[selected.status] }}</b></h3><p>{{ selected.resultMessage }}</p></div></div><section><h3>基本信息</h3><dl><dt>调用编号</dt><dd class="usage-copy">{{ selected.id }}<button @click="copy(selected.id)"><Copy :size="13" /></button></dd><dt>调用时间</dt><dd>{{ formatTime(selected.startedAt) }}</dd><dt>完成时间</dt><dd>{{ formatTime(selected.completedAt) }}</dd><dt>所属服务</dt><dd>{{ selected.serviceName }}</dd><dt v-if="!isSub">调用账户</dt><dd v-if="!isSub">{{ selected.actorName }}</dd><dt>用户密钥</dt><dd>{{ selected.keyCategory==='BUSINESS'?'系统业务调用（凭证不对用户展示）':selected.keyName??'未识别密钥' }}</dd></dl></section><section><h3>模型与计量</h3><dl><dt>请求 model</dt><dd>{{ selected.requestedModel }}</dd><dt>最终平台模型</dt><dd>{{ selected.modelName }}</dd><dt>Token</dt><dd>输入 {{ formatNumber(selected.inputTokens) }} · 输出 {{ formatNumber(selected.outputTokens) }} · 合计 {{ formatNumber(tokenTotal(selected)) }}</dd><dt>缓存输入</dt><dd>命中 {{ formatNumber(selected.cacheReadTokens) }} · 未命中 {{ formatNumber(selected.cacheMissTokens) }} · 写入 {{ formatNumber(selected.cacheWriteTokens) }}</dd><dt>计量状态</dt><dd>{{ meteringLabel[selected.meteringStatus] }}</dd></dl></section><section><h3>消费与额度</h3><dl><dt>消费金额</dt><dd>{{ selected.chargeStatus==='SETTLED'?`${formatMoney(selected.chargeAmount)} CNY`:chargeLabel[selected.chargeStatus] }}</dd><dt>最终额度扣减</dt><dd>{{ selected.quotaAmount===null?'—':`${formatNumber(selected.quotaAmount)} ${selected.quotaUnit}` }}</dd><dt>说明</dt><dd>金额、实际 Token 和套餐额度是三种独立口径。</dd></dl></section><section><h3>调用结果</h3><dl><dt>公开错误码</dt><dd>{{ selected.errorCode??'—' }}</dd><dt>总耗时</dt><dd>{{ selected.durationMs===null?'—':`${selected.durationMs} ms` }}</dd><dt>首 Token 耗时</dt><dd>{{ selected.ttftMs===null?'—':`${selected.ttftMs} ms` }}</dd></dl></section></div><div v-else class="usage-state"><ShieldAlert :size="28" /><strong>调用不存在或当前身份无权查看</strong><p>请关闭详情后重新查询。</p></div><footer><span>{{ copied }}</span><button class="usage-secondary" @click="closeDetail">关闭</button></footer></aside></div>
  </div>
</template>
