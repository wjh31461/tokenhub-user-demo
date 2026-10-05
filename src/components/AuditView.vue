<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw, Download, Search, RotateCcw, ChevronLeft, ChevronRight, X, ClipboardList, Info } from 'lucide-vue-next'
import { auditRecords, detailText, operationLabels, resultLabels, targetLabels, valueLabel, type AuditRecord } from '../data/audit'
import { createAuditWorkbook } from '../utils/auditExport'
import './audit.css'
const route = useRoute(), router = useRouter()
// The demo uses the document's reference date so its fictional history stays reproducible.
const today = '2026-10-05'
const shiftDate = (days: number) => new Date(Date.parse(today + 'T00:00:00Z') - days * 86400000).toISOString().slice(0, 10)
const defaults = () => ({ range: '7', start: shiftDate(6), end: today, operationType: '' })
const draft = ref(defaults()), applied = ref(defaults())
const records = ref<AuditRecord[]>(structuredClone(auditRecords))
const queryAsOf = ref(new Date().toISOString())
const snapshotRows = ref<AuditRecord[]>([])
const page = ref(1), pageSize = ref(20), loading = ref(false), error = ref(false), scenario = ref('normal')
const validation = ref(''), exportState = ref<'idle' | 'running' | 'completed' | 'failed' | 'expired'>('idle')
const exportMessage = ref(''), fileUrl = ref(''), fileName = ref(''), exportCount = ref(0)
const dialog = ref<HTMLElement>(), closeButton = ref<HTMLButtonElement>()
let returnFocus: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined, exportTimer: ReturnType<typeof setTimeout> | undefined
let activeExport = 0
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const pageRows = computed(() => snapshotRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const pages = computed(() => Math.max(1, Math.ceil(snapshotRows.value.length / pageSize.value)))
const logId = computed(() => typeof route.query.logId === 'string' ? route.query.logId : '')
const selected = computed(() => scenario.value === 'detailError' ? undefined : records.value.find(record => record.id === logId.value))
const actor = (record: AuditRecord) => record.actorName || record.actorId
const object = (record: AuditRecord) => record.targetType === 'PROFILE' ? record.targetName : `${targetLabels[record.targetType]}：${record.targetName}`
const date = (value: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(value))
const time = (value: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value)).replaceAll('/', '-')
function preset() { if (draft.value.range !== 'custom') { draft.value.end = today; draft.value.start = shiftDate(draft.value.range === '7' ? 6 : 29) } }
function validate() {
  const span = (Date.parse(draft.value.end) - Date.parse(draft.value.start)) / 86400000 + 1
  if (!Number.isFinite(span) || span < 1) return '请选择有效的时间范围，开始日期不能晚于结束日期。'
  if (span > 90) return '请选择90天以内的时间范围'
  if (draft.value.end > today) return '不能选择未来日期'
  return ''
}
function load(retry = false) {
  clearTimeout(timer); loading.value = true; error.value = false
  const filters = { ...applied.value }, asOf = new Date().toISOString(), mode = scenario.value
  timer = setTimeout(() => {
    loading.value = false
    if (mode === 'error' && !retry) { error.value = true; snapshotRows.value = []; return }
    queryAsOf.value = asOf
    snapshotRows.value = mode === 'empty' ? [] : records.value.filter(record => date(record.occurredAt) >= filters.start && date(record.occurredAt) <= filters.end && record.occurredAt <= asOf && (!filters.operationType || record.operationType === filters.operationType)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
  }, 250)
}
function query() { validation.value = validate(); if (validation.value) return; applied.value = { ...draft.value }; page.value = 1; load() }
function reset() { draft.value = defaults(); query() }
function refresh() { page.value = 1; load() }
function openDetail(record: AuditRecord, event: MouseEvent) { returnFocus = event.currentTarget as HTMLElement; router.push({ query: { ...route.query, logId: record.id } }) }
function closeDetail() { const query = { ...route.query }; delete query.logId; router.replace({ query }) }
function clearFile() { if (fileUrl.value) URL.revokeObjectURL(fileUrl.value); fileUrl.value = '' }
function exportLogs() {
  if (loading.value || error.value || exportState.value === 'running') return
  if (!snapshotRows.value.length) { clearFile(); exportState.value = 'idle'; exportMessage.value = '当前条件下暂无可导出的记录'; return }
  clearFile(); exportMessage.value = ''; exportState.value = 'running'
  // Freeze the queried filters and all matching records, never just the visible page.
  const filters = { ...applied.value }, matched = JSON.parse(JSON.stringify(snapshotRows.value)) as AuditRecord[]
  const failed = scenario.value === 'exportError', expired = scenario.value === 'expired', task = ++activeExport
  exportTimer = setTimeout(() => {
    if (task !== activeExport) return
    if (failed) { exportState.value = 'failed'; exportMessage.value = '导出生成失败，请重试'; return }
    try {
      const rows = [['操作时间', '操作人', '操作对象', '操作类型', '操作结果', '操作详情'], ...matched.map(record => [time(record.occurredAt), actor(record), object(record), operationLabels[record.operationType], resultLabels[record.result], detailText(record)])]
      const bytes = createAuditWorkbook(rows)
      fileUrl.value = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const typeLabel = filters.operationType ? operationLabels[filters.operationType as keyof typeof operationLabels] : '全部'
      fileName.value = `操作审计_${filters.start}_${filters.end}_${typeLabel}.xlsx`; exportCount.value = matched.length
      exportState.value = expired ? 'expired' : 'completed'
      exportMessage.value = expired ? '文件已过期，请重新导出' : `${fileName.value} 已生成，共 ${matched.length} 条记录`
      // Demo-only suggested export event, added after generation and not included in this file.
      const now = new Date().toISOString()
      records.value.unshift({ id: `audit-export-${task}-${Date.now()}`, occurredAt: now, actorName: '张三', actorId: 'user-demo-001', targetType: 'AUDIT_LOG', targetName: `${filters.start} 至 ${filters.end}`, targetId: null, operationType: 'EXPORT', result: 'SUCCESS', summary: '操作审计文件生成完成。', resultMessage: `范围：${filters.start} 至 ${filters.end}；操作类型：${filters.operationType ? operationLabels[filters.operationType as keyof typeof operationLabels] : '全部'}；${matched.length} 条记录。`, changes: [] })
    } catch { clearFile(); exportState.value = 'failed'; exportMessage.value = '导出生成失败，请重试' }
  }, 600)
}
function trap(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeDetail(); return }
  if (event.key !== 'Tab') return
  const elements = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')
  if (!elements?.length) return
  const first = elements[0]!, last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(logId, async id => { document.body.style.overflow = id ? 'hidden' : ''; await nextTick(); if (id) closeButton.value?.focus(); else returnFocus?.focus({ preventScroll: true }) }, { immediate: true })
watch(scenario, () => { page.value = 1; exportMessage.value = ''; exportState.value = 'idle'; activeExport++; clearTimeout(exportTimer); clearFile(); load() })
onMounted(() => load())
onBeforeUnmount(() => { activeExport++; clearTimeout(timer); clearTimeout(exportTimer); clearFile(); snapshotRows.value = []; document.body.style.overflow = '' })
</script>

<template>
  <div class="audit-view">
    <div class="audit-heading"><div><h1>操作审计</h1><p>查看当前账户的关键操作记录。</p></div><div class="audit-heading-actions"><button class="audit-secondary" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button><button class="audit-primary" :disabled="loading || error || exportState === 'running'" @click="exportLogs"><Download :size="15" />{{ exportState === 'running' ? '正在生成…' : '导出' }}</button></div></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="审计页面场景"><option value="normal">正常记录</option><option value="empty">暂无记录</option><option value="error">查询失败</option><option value="detailError">详情无法查看</option><option value="exportError">导出失败</option><option value="expired">导出文件过期</option></select></label></div>
    <form class="audit-card audit-filters" @submit.prevent="query">
      <div class="audit-filter-grid"><label class="audit-date-field">操作时间<div class="audit-date-controls"><select v-model="draft.range" aria-label="操作时间范围" @change="preset"><option value="7">近7天</option><option value="30">近30天</option><option value="custom">自定义日期</option></select><input v-model="draft.start" type="date" aria-label="开始日期" :max="today" @input="draft.range = 'custom'"><span>至</span><input v-model="draft.end" type="date" aria-label="结束日期" :max="today" @input="draft.range = 'custom'"></div></label><label>操作类型<select v-model="draft.operationType" aria-label="操作类型"><option value="">全部</option><option v-for="(label, code) in operationLabels" :key="code" :value="code">{{ label }}</option></select></label></div>
      <div class="audit-filter-footer"><div><span v-if="validation" class="audit-validation" role="alert">{{ validation }}</span><span v-else-if="dirty" class="audit-dirty">筛选条件已修改，请点击查询</span><span v-else>时间统一按北京时间展示</span></div><div class="audit-heading-actions"><button type="submit" class="audit-primary" :disabled="loading"><Search :size="14" />查询</button><button type="button" class="audit-secondary" :disabled="loading" @click="reset"><RotateCcw :size="14" />重置</button></div></div>
    </form>
    <div v-if="exportState === 'running' || exportMessage" class="audit-export-panel" role="status"><span>{{ exportState === 'running' ? '正在生成导出文件，已固定本次筛选和数据范围…' : exportMessage }}</span><a v-if="exportState === 'completed'" class="audit-primary" :href="fileUrl" :download="fileName">下载 Excel（{{ exportCount }} 条）</a><button v-if="exportState === 'failed' || exportState === 'expired'" class="audit-secondary" :disabled="loading || error" @click="exportLogs">重新导出</button></div>
    <section class="audit-card audit-results" :aria-busy="loading">
      <div class="audit-results-head"><span>已查询：{{ applied.start }} 至 {{ applied.end }} · {{ applied.operationType ? operationLabels[applied.operationType as keyof typeof operationLabels] : '全部操作' }}<small>查询截至 {{ time(queryAsOf) }}</small></span><span class="audit-readonly">只读记录</span></div>
      <div v-if="loading" class="audit-state" role="status"><RefreshCw :size="28" class="spinning" /><strong>正在加载操作记录</strong></div>
      <div v-else-if="error" class="audit-state" role="alert"><Info :size="28" /><strong>加载失败，请重试</strong><button class="audit-secondary" @click="load(true)">重试</button></div>
      <div v-else-if="!pageRows.length" class="audit-state"><ClipboardList :size="28" /><strong>当前条件下暂无操作记录</strong></div>
      <div v-else class="audit-table-scroll"><table class="audit-table"><thead><tr><th>操作时间</th><th>操作人</th><th>操作对象</th><th>操作类型</th><th>操作结果</th><th>操作详情</th></tr></thead><tbody><tr v-for="record in pageRows" :key="record.id"><td class="audit-time">{{ time(record.occurredAt) }}</td><td><span class="audit-actor" :title="actor(record)">{{ actor(record) }}</span></td><td><span class="audit-object" :title="object(record)">{{ object(record) }}</span></td><td>{{ operationLabels[record.operationType] }}</td><td><span class="audit-result" :class="record.result.toLowerCase()">{{ resultLabels[record.result] }}</span></td><td><button class="audit-detail-link" @click="openDetail(record, $event)">查看详情</button></td></tr></tbody></table></div>
      <div class="audit-pagination"><span>共 {{ error || loading ? '—' : snapshotRows.length }} 条<label>每页<select v-model="pageSize" aria-label="每页条数" :disabled="loading" @change="page = 1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label></span><div><button :disabled="page === 1 || loading || error" aria-label="上一页" @click="page--"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pages }}</span><button :disabled="page === pages || loading || error" aria-label="下一页" @click="page++"><ChevronRight :size="16" /></button></div></div>
    </section>
    <p class="audit-footnote"><Info :size="14" />新操作可能稍后出现，可点击刷新。日志只读；模型调用与 Token 消耗请前往<RouterLink to="/usage?tab=details">用量中心</RouterLink>。</p>
    <Teleport to="body"><div v-if="logId" class="audit-drawer-layer" @keydown="trap"><button class="audit-drawer-backdrop" aria-label="关闭详情" @click="closeDetail" /><section ref="dialog" class="audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title"><header><h2 id="audit-detail-title">操作详情</h2><button ref="closeButton" aria-label="关闭详情" @click="closeDetail"><X :size="21" /></button></header><div v-if="selected" class="audit-drawer-body"><h3>基本信息</h3><dl><dt>操作编号</dt><dd>{{ selected.id }}</dd><dt>操作时间</dt><dd>{{ time(selected.occurredAt) }}</dd><dt>操作人</dt><dd>{{ actor(selected) }}</dd><dt>操作类型</dt><dd>{{ operationLabels[selected.operationType] }}</dd><dt>操作结果</dt><dd><span class="audit-result" :class="selected.result.toLowerCase()">{{ resultLabels[selected.result] }}</span></dd></dl><h3>操作对象</h3><dl><dt>对象类别</dt><dd>{{ targetLabels[selected.targetType] }}</dd><dt>对象名称</dt><dd>{{ selected.targetName }}</dd><dt>对象编号</dt><dd>{{ selected.targetId || '未记录' }}</dd><template v-if="selected.serviceName"><dt>关联服务</dt><dd>{{ selected.serviceName }}</dd></template></dl><h3>变更内容</h3><table v-if="selected.result === 'SUCCESS' && selected.changes.length" class="audit-changes"><thead><tr><th>字段</th><th>操作前</th><th>操作后</th></tr></thead><tbody><tr v-for="change in selected.changes" :key="change.field"><td>{{ change.label }}</td><td>{{ valueLabel(change.before) }}</td><td>{{ valueLabel(change.after) }}</td></tr></tbody></table><p v-else class="audit-no-changes">{{ selected.result === 'FAILURE' ? '操作未生效，没有已完成的变更。' : '本次操作无字段变更。' }}</p><h3>结果说明</h3><p class="audit-result-message">{{ selected.resultMessage }}</p></div><div v-else class="audit-state"><Info :size="28" /><strong>该记录不存在或当前无法查看</strong></div><footer><button class="audit-secondary" @click="closeDetail">关闭</button></footer></section></div></Teleport>
  </div>
</template>
