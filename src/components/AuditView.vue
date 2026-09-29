<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw, Search, RotateCcw, ChevronLeft, ChevronRight, X, Copy, CheckCircle2, CircleX, ShieldAlert, ClipboardList, Info, ArrowRight, Clock3, SlidersHorizontal } from 'lucide-vue-next'
import { actors, auditRecords, events, modules, resultLabels, services, type AuditRecord } from '../data/audit'
import './audit.css'
const props = defineProps<{ isSub: boolean }>()
const route = useRoute(), router = useRouter()
const defaults = () => ({ range: '7', start: '2026-09-22', end: '2026-09-28', module: '', event: '', result: '', actor: '', service: '', searchType: 'TARGET_NAME', search: '' })
const draft = ref(defaults()), applied = ref(defaults())
const page = ref(1), pageSize = ref(20), loading = ref(false), error = ref(''), scenario = ref('normal'), recovered = ref(false)
const validation = ref(''), copied = ref(''), snapshot = ref('2026-09-28T16:35:00+08:00')
const dialog = ref<HTMLElement>(), closeButton = ref<HTMLButtonElement>()
let returnFocus: HTMLElement | null = null, timer: ReturnType<typeof setTimeout> | undefined, copyTimer: ReturnType<typeof setTimeout> | undefined
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const filteredEvents = computed(() => events.filter(e => !draft.value.module || e.module === draft.value.module))
const rows = computed(() => {
  if (props.isSub || scenario.value === 'empty') return []
  const f = applied.value
  return auditRecords.filter(r => {
    const date = new Date(r.occurredAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
    const needle = f.search.trim()
    return date >= f.start && date <= f.end && (!f.module || r.module === f.module) && (!f.event || r.event === f.event) && (!f.result || r.result === f.result) && (!f.actor || r.actorId === f.actor) && (!f.service || r.serviceId === f.service) && (!needle || (f.searchType === 'TARGET_NAME' ? r.targetName.includes(needle) : f.searchType === 'TARGET_ID' ? r.targetId === needle : r.operationId === needle))
  })
})
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const logId = computed(() => typeof route.query.logId === 'string' ? route.query.logId : '')
const selected = computed(() => props.isSub ? undefined : auditRecords.find(r => r.id === logId.value))
const hasNext = computed(() => page.value * pageSize.value < rows.value.length)
const moduleName = (id: string) => modules.find(m => m.id === id)?.label ?? id
const formatTime = (time: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(time)).replaceAll('/', '-')
function preset() {
  if (draft.value.range !== 'custom') { draft.value.end = '2026-09-28'; draft.value.start = draft.value.range === '7' ? '2026-09-22' : '2026-08-30' }
}
function validate() {
  const f = draft.value
  const span = (Date.parse(f.end) - Date.parse(f.start)) / 86400000 + 1
  if (!f.start || !f.end || !Number.isFinite(span) || span < 1 || span > 90 || f.end > '2026-09-28') return '请选择不超过 90 天的有效范围，结束日期不能晚于 2026-09-28。'
  const n = f.search.trim().length
  if (n && (f.searchType === 'TARGET_NAME' ? n < 2 || n > 100 : n > 64)) return f.searchType === 'TARGET_NAME' ? '对象名称请输入 2～100 个字符。' : '对象 ID 或操作编号最多 64 个字符。'
  return ''
}
function load() {
  clearTimeout(timer); loading.value = true; error.value = ''
  timer = setTimeout(() => { loading.value = false; if (scenario.value === 'error' && !recovered.value) error.value = '暂时无法获取操作记录，请稍后重试。' }, 380)
}
function query() {
  validation.value = validate(); if (validation.value) return
  applied.value = { ...draft.value, search: draft.value.search.trim() }; page.value = 1; load()
}
function reset() { draft.value = defaults(); query() }
function refresh() { page.value = 1; load() }
function retry() { recovered.value = true; load() }
function paginate(delta: number) { page.value += delta; load() }
function openDetail(row: AuditRecord, event: MouseEvent) {
  returnFocus = event.currentTarget as HTMLElement
  router.push({ query: { ...route.query, logId: row.id } })
}
function closeDetail() { const q = { ...route.query }; delete q.logId; router.replace({ query: q }) }
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = '已复制'; }
  catch { copied.value = '复制失败，请选择文本手动复制'; }
  clearTimeout(copyTimer); copyTimer = setTimeout(() => copied.value = '', 2400)
}
function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeDetail(); return }
  if (event.key !== 'Tab') return
  const elements = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
  if (!elements?.length) return
  const first = elements[0]!, last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(logId, async id => {
  document.body.style.overflow = id && !props.isSub ? 'hidden' : ''
  if (id && !props.isSub) { await nextTick(); closeButton.value?.focus() }
  else { await nextTick(); returnFocus?.focus() }
}, { immediate: true })
watch(scenario, () => { recovered.value = false; page.value = 1; load() })
watch(() => props.isSub, () => {
  clearTimeout(timer); loading.value = false; error.value = ''; draft.value = defaults(); applied.value = defaults(); page.value = 1; scenario.value = 'normal'
  if (logId.value) closeDetail()
  document.body.style.overflow = ''
})
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(copyTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="audit-view">
    <div class="audit-heading"><div><h1>操作审计</h1><p>每一次关键操作，都有迹可循。</p></div><button v-if="!isSub" class="refresh-button" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div>
    <section v-if="isSub" class="audit-state audit-card"><ShieldAlert :size="34" /><h2>当前身份无访问权限</h2><p>子账户暂不开放操作审计，请切换主账户查看。</p></section>
    <template v-else>
      <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="审计页面场景"><option value="normal">正常记录</option><option value="empty">暂无记录</option><option value="error">查询失败</option><option value="partial">部分操作未接入</option></select></label></div>
      <div class="audit-scope"><span class="audit-scope-icon"><ClipboardList :size="20" /></span><div><strong>当前账户的操作记录</strong><p>包含主账户及其审计范围内的子账户操作；模型调用请前往<RouterLink to="/usage?tab=details">调用明细 <ArrowRight :size="12" /></RouterLink></p></div><span class="audit-readonly">只读记录</span></div>
      <div v-if="scenario === 'partial'" class="audit-warning" role="status"><Info :size="16" />部分操作尚未接入审计，当前仅展示已定义的事件类型。</div>
      <form class="audit-card audit-filters" @submit.prevent="query">
        <div class="audit-filter-title"><SlidersHorizontal :size="15" /><strong>筛选记录</strong><span>时间按北京时间展示</span></div>
        <div class="audit-filter-grid">
          <label class="audit-date-field">操作时间<div class="audit-date-controls"><select v-model="draft.range" aria-label="操作时间范围" @change="preset"><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="custom">自定义</option></select><input v-model="draft.start" type="date" aria-label="开始日期" max="2026-09-28" @input="draft.range = 'custom'" /><span>—</span><input v-model="draft.end" type="date" aria-label="结束日期" max="2026-09-28" @input="draft.range = 'custom'" /></div></label>
          <label>业务模块<select aria-label="业务模块" v-model="draft.module" @change="draft.event = ''"><option value="">全部模块</option><option v-for="m in modules" :key="m.id" :value="m.id">{{ m.label }}</option></select></label>
          <label>操作类型<select aria-label="操作类型" v-model="draft.event"><option value="">全部操作</option><option v-for="e in filteredEvents" :key="e.id" :value="e.id">{{ e.label }}</option></select></label>
          <label>操作结果<select aria-label="操作结果" v-model="draft.result"><option value="">全部结果</option><option v-for="(label, id) in resultLabels" :key="id" :value="id">{{ label }}</option></select></label>
          <label>操作人<select aria-label="操作人" v-model="draft.actor"><option value="">全部操作人</option><option v-for="a in actors" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
          <label>关联服务<select aria-label="关联服务" v-model="draft.service"><option value="">全部服务</option><option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
        </div>
        <div class="audit-search-row"><div class="audit-search"><select v-model="draft.searchType" aria-label="定位方式"><option value="TARGET_NAME">对象名称</option><option value="TARGET_ID">对象 ID</option><option value="OPERATION_ID">操作编号</option></select><Search :size="16" /><input v-model="draft.search" aria-label="定位内容" :placeholder="draft.searchType === 'TARGET_NAME' ? '输入对象名称，至少 2 个字符' : '输入完整编号，精确匹配'" :maxlength="draft.searchType === 'TARGET_NAME' ? 100 : 64" /></div><div class="audit-filter-actions"><button type="submit" class="audit-primary" :disabled="loading"><Search :size="15" />查询</button><button type="button" class="refresh-button" :disabled="loading" @click="reset"><RotateCcw :size="14" />重置</button></div></div>
        <p v-if="validation" class="audit-validation" role="alert">{{ validation }}</p>
        <p v-else-if="dirty" class="audit-dirty">筛选条件已修改，点击「查询」更新记录。</p>
      </form>
      <section class="audit-card audit-results" :aria-busy="loading">
        <div class="audit-results-head"><div><h2>操作记录<span>只读</span></h2><p>{{ applied.start }} 至 {{ applied.end }} <span>·</span> 查询截至 {{ formatTime(snapshot) }}</p></div><span class="audit-delay"><Clock3 :size="13" />新操作可能稍后出现</span></div>
        <div v-if="loading" class="audit-state" role="status"><RefreshCw :size="25" class="spinning" /><strong>正在查询操作记录</strong><p>正在加载当前账户的数据…</p></div>
        <div v-else-if="error" class="audit-state" role="alert"><CircleX :size="30" /><strong>操作记录加载失败</strong><p>{{ error }}</p><button class="refresh-button" @click="retry">重新加载</button></div>
        <div v-else-if="!pageRows.length" class="audit-state"><ClipboardList :size="34" /><strong>当前条件下暂无操作记录</strong><p>请检查筛选条件与时间范围。</p><button class="refresh-button" @click="reset">重置筛选</button></div>
        <div v-else class="audit-table-scroll"><table class="audit-table"><thead><tr><th>操作时间</th><th>操作人</th><th>业务模块</th><th>操作类型</th><th>操作对象</th><th>结果</th><th>操作</th></tr></thead><tbody><tr v-for="row in pageRows" :key="row.id"><td class="audit-time">{{ formatTime(row.occurredAt).slice(0, 10) }}<small>{{ formatTime(row.occurredAt).slice(11) }}</small></td><td><span class="audit-actor"><span class="audit-avatar" :class="{ sub: row.role === '子账户' }">{{ row.role === '主账户' ? '主' : '子' }}</span><span>{{ row.actorName }}<small>{{ row.role }}</small></span></span></td><td class="audit-module">{{ moduleName(row.module) }}</td><td>{{ row.eventLabel }}</td><td><span class="audit-object" :title="row.targetName">{{ row.targetName }}</span><small class="audit-object-id">{{ row.targetId ?? '未记录对象标识' }}</small></td><td><span class="audit-result" :class="row.result.toLowerCase()"><CheckCircle2 v-if="row.result === 'SUCCESS'" :size="12" /><CircleX v-else-if="row.result === 'FAILURE'" :size="12" /><ShieldAlert v-else :size="12" />{{ resultLabels[row.result] }}</span></td><td><button class="audit-detail-link" @click="openDetail(row, $event)">查看详情<ChevronRight :size="13" /></button></td></tr></tbody></table></div>
        <div class="audit-pagination"><span>本页 {{ loading || error ? '—' : pageRows.length }} 条 <label>每页<select v-model="pageSize" aria-label="每页条数" :disabled="loading" @change="refresh"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label></span><div><button :disabled="page === 1 || loading || !!error" aria-label="上一页" @click="paginate(-1)"><ChevronLeft :size="16" /></button><span>第 {{ page }} 页</span><button :disabled="!hasNext || loading || !!error" aria-label="下一页" @click="paginate(1)"><ChevronRight :size="16" /></button></div></div>
      </section>
      <p class="audit-footnote"><Info :size="13" />仅记录关键管理操作，不包含模型请求内容或密钥原文。</p>
    </template>
    <Teleport to="body">
      <div v-if="logId && !isSub" class="audit-drawer-layer" @keydown="trapFocus"><div class="audit-drawer-backdrop" @click="closeDetail" /><section ref="dialog" class="audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" tabindex="-1"><header><div><h2 id="audit-detail-title">操作详情</h2></div><button ref="closeButton" class="icon-button" aria-label="关闭操作详情" @click="closeDetail"><X :size="20" /></button></header>
        <div v-if="!selected" class="audit-state"><ShieldAlert :size="32" /><strong>该记录不存在或当前无法查看</strong><p>请关闭详情并重新查询。</p></div>
        <div v-else class="audit-drawer-body">
          <div class="audit-detail-summary"><span class="audit-detail-symbol" :class="selected.result.toLowerCase()"><CheckCircle2 v-if="selected.result === 'SUCCESS'" :size="23" /><ShieldAlert v-else :size="23" /></span><div><h3>{{ selected.eventLabel }}<span class="audit-result" :class="selected.result.toLowerCase()">{{ resultLabels[selected.result] }}</span></h3><p>{{ selected.summary }}</p></div></div>
          <section class="audit-detail-section"><h3>基本信息</h3><dl><dt>操作编号</dt><dd class="audit-copy">{{ selected.operationId }}<button aria-label="复制操作编号" @click="copy(selected.operationId)"><Copy :size="14" /></button></dd><dt>操作时间</dt><dd>{{ formatTime(selected.occurredAt) }}</dd><dt>日志接收时间</dt><dd>{{ formatTime(selected.receivedAt) }}</dd><dt>操作人</dt><dd>{{ selected.actorName }} <span class="audit-role">{{ selected.role }}</span></dd><dt>业务模块</dt><dd>{{ moduleName(selected.module) }}</dd><dt>操作类型</dt><dd>{{ selected.eventLabel }}</dd></dl></section>
          <section class="audit-detail-section"><h3>操作对象<span>事件发生时的历史信息</span></h3><dl><dt>对象类型</dt><dd>{{ selected.targetType }}</dd><dt>对象名称</dt><dd>{{ selected.targetName }}</dd><dt>对象 ID</dt><dd class="audit-copy">{{ selected.targetId ?? '未记录' }}<button v-if="selected.targetId" aria-label="复制对象ID" @click="copy(selected.targetId)"><Copy :size="14" /></button></dd><dt>关联服务</dt><dd>{{ selected.serviceName || '无关联服务信息' }}</dd></dl></section>
          <section class="audit-detail-section"><h3>变更内容<span>{{ selected.changes.length ? '仅展示允许记录的业务字段' : '' }}</span></h3><div v-if="!selected.changes.length" class="audit-no-changes"><Info :size="16" />本次操作未产生已提交的字段变更。</div><table v-else class="audit-changes"><thead><tr><th>字段</th><th>操作前</th><th></th><th>操作后</th></tr></thead><tbody><tr v-for="change in selected.changes" :key="change.label"><td>{{ change.label }}</td><td>{{ change.before }}</td><td><ArrowRight :size="14" /></td><td>{{ change.after }}</td></tr></tbody></table></section>
          <section class="audit-detail-section"><h3>结果说明</h3><p class="audit-result-message">{{ selected.summary }}</p><code v-if="selected.resultCode">{{ selected.resultCode }}</code></section>
          <p class="audit-footnote">记录为只读历史快照，当前对象状态可能已发生变化。</p>
        </div>
        <footer><span role="status">{{ copied }}</span><button class="refresh-button" @click="closeDetail">关闭详情</button></footer>
      </section></div>
    </Teleport>
  </div>
</template>
