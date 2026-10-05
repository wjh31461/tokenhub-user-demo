<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Copy, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import AccountDrawer from './AccountDrawer.vue'
import { accountServices, accountTime, beijingDate, compareIds, demoAccount, orderContentNames, orderMoney, orderRecords, orderStatusNames, orderTypeNames, tokens, type OrderRecord } from '../data/accountServices'
const route = useRoute(), router = useRouter()
const services = accountServices.filter(service => service.accountId === demoAccount)
const defaults = () => ({ serviceId: '', type: '', status: '', orderId: '', start: '', end: '' })
const draft = ref(defaults()), applied = ref(defaults()), snapshot = ref<OrderRecord[]>([])
const loading = ref(false), error = ref(false), validation = ref(''), scenario = ref('normal'), notice = ref(''), page = ref(1), pageSize = ref(20)
const detailLoading = ref(false), detailError = ref(false), detail = ref<OrderRecord>()
let timer: ReturnType<typeof setTimeout> | undefined, detailTimer: ReturnType<typeof setTimeout> | undefined, generation = 0, detailGeneration = 0
const recordId = computed(() => typeof route.query.recordId === 'string' ? route.query.recordId : '')
const pages = computed(() => Math.max(1, Math.ceil(snapshot.value.length / pageSize.value)))
const rows = computed(() => snapshot.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const hasFilters = computed(() => Object.values(applied.value).some(Boolean))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value }
function validate() {
  if (draft.value.serviceId && !services.some(service => service.id === draft.value.serviceId)) return '服务不存在或无权查看，请选择当前账户的服务'
  if (draft.value.type && !Object.hasOwn(orderTypeNames, draft.value.type)) return '请选择有效的订单类型'
  if (draft.value.status && !Object.hasOwn(orderStatusNames, draft.value.status)) return '请选择有效的订单状态'
  if ((draft.value.start && !validDate(draft.value.start)) || (draft.value.end && !validDate(draft.value.end))) return '请选择有效的订单日期'
  if (draft.value.start && draft.value.end && draft.value.start > draft.value.end) return '开始日期不能晚于结束日期'
  return ''
}
function load(retry = false) {
  clearTimeout(timer); const request = ++generation, filters = { ...applied.value }, mode = scenario.value
  loading.value = true; error.value = false
  timer = setTimeout(() => {
    if (request !== generation || !sessionStorage.getItem('tokenhub-demo-session')) return
    loading.value = false
    if (mode === 'error' && !retry) { error.value = true; return }
    snapshot.value = mode === 'empty' ? [] : orderRecords.filter(record => record.accountId === demoAccount && (!filters.serviceId || record.serviceId === filters.serviceId) && (!filters.type || record.type === filters.type) && (!filters.status || record.status === filters.status) && (!filters.orderId || record.orderId === filters.orderId) && (!filters.start || beijingDate(record.createdAt) >= filters.start) && (!filters.end || beijingDate(record.createdAt) <= filters.end)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || compareIds(b.id, a.id))
    page.value = Math.min(page.value, pages.value)
  }, 240)
}
function query() { validation.value = validate(); if (validation.value) return; applied.value = { ...draft.value, orderId: draft.value.orderId.trim() }; page.value = 1; notice.value = ''; load() }
function reset() { draft.value = defaults(); query() }
function refresh() { page.value = 1; load() }
function open(record: OrderRecord) { router.push({ query: { ...route.query, recordId: record.id } }) }
function close() { const query = { ...route.query }; delete query.recordId; router.replace({ query }) }
function loadDetail(retry = false) {
  clearTimeout(detailTimer); const request = ++detailGeneration, id = recordId.value, mode = scenario.value
  detailLoading.value = true; detailError.value = false; detail.value = undefined
  detailTimer = setTimeout(() => { if (request !== detailGeneration || !sessionStorage.getItem('tokenhub-demo-session')) return; detailLoading.value = false; if (mode === 'detailError' && !retry) { detailError.value = true; return }; detail.value = mode === 'detailMissing' ? undefined : orderRecords.find(record => record.id === id && record.accountId === demoAccount) }, 220)
}
async function copy(value: string) { try { await navigator.clipboard.writeText(value); notice.value = '订单编号已复制' } catch { notice.value = '复制失败，请重试' } }
watch(recordId, id => { if (id) loadDetail(); else { detailGeneration++; clearTimeout(detailTimer); detail.value = undefined } }, { immediate: true })
watch(() => route.query.serviceId, value => { draft.value = { ...defaults(), serviceId: typeof value === 'string' ? value : '' }; query() }, { immediate: true })
watch(scenario, () => { page.value = 1; load(); if (recordId.value) loadDetail() })
onBeforeUnmount(() => { generation++; detailGeneration++; clearTimeout(timer); clearTimeout(detailTimer); snapshot.value = []; detail.value = undefined })
</script>
<template>
  <div class="orders-view"><div class="account-service-demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="订单页面场景"><option value="normal">正常订单</option><option value="empty">暂无订单</option><option value="error">列表加载失败</option><option value="detailError">详情加载失败</option><option value="detailMissing">详情不存在或无权限</option></select></label><button class="account-service-secondary" :disabled="loading" @click="refresh"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div>
    <form class="account-service-card account-service-filter" @submit.prevent="query"><div class="order-filter-grid"><label>服务<select v-model="draft.serviceId" aria-label="订单服务"><option value="">全部服务</option><option v-for="service in services" :key="service.id" :value="service.id">{{ service.name || service.id }}</option></select></label><label>订单类型<select v-model="draft.type" aria-label="订单类型"><option value="">全部类型</option><option v-for="(name, code) in orderTypeNames" :key="code" :value="code">{{ name }}</option></select></label><label>状态<select v-model="draft.status" aria-label="订单状态"><option value="">全部状态</option><option v-for="(name, code) in orderStatusNames" :key="code" :value="code">{{ name }}</option></select></label><label>订单编号<input v-model="draft.orderId" aria-label="订单编号" placeholder="请输入完整订单编号" /></label><label class="order-dates">订单时间<div><input v-model="draft.start" aria-label="订单开始日期" type="date" /><span>至</span><input v-model="draft.end" aria-label="订单结束日期" type="date" /></div></label></div><footer><span v-if="validation" class="account-service-error" role="alert">{{ validation }}</span><span v-else>{{ dirty ? '筛选条件已修改，请点击查询' : '按创建时间查询，北京时间；默认不限时间' }}</span><div><button class="account-service-primary" type="submit">查询</button><button class="account-service-secondary" type="button" @click="reset">重置</button></div></footer></form>
    <p v-if="notice" class="account-service-notice" role="status">{{ notice }}</p>
    <section class="account-service-card"><div v-if="loading" class="account-service-state" role="status"><RefreshCw :size="27" class="spinning" /><strong>正在加载订单记录</strong></div><div v-else-if="error" class="account-service-state" role="alert"><strong>订单记录加载失败，请重试</strong><button class="account-service-secondary" @click="load(true)">重试</button></div><div v-else-if="!rows.length" class="account-service-state"><strong>{{ hasFilters ? '没有符合条件的订单' : '暂无订单记录' }}</strong><button v-if="hasFilters" class="account-service-secondary" @click="reset">重置筛选</button></div><div v-else class="account-service-table-scroll"><table class="account-service-table order-table"><thead><tr><th>订单编号</th><th>归属服务</th><th>订单类型</th><th>订单内容</th><th>订单金额</th><th>订单创建时间</th><th>订单状态</th><th>操作</th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td><div class="order-id-cell"><button class="account-service-text-link" @click="open(record)">{{ record.orderId }}</button><button :aria-label="`复制订单编号 ${record.orderId}`" @click="copy(record.orderId)"><Copy :size="13" /></button></div></td><td>{{ record.serviceName || record.serviceId }}</td><td>{{ orderTypeNames[record.type] }}</td><td>{{ orderContentNames[record.content] }}</td><td class="account-service-number">{{ orderMoney(record) }}</td><td class="account-service-time">{{ accountTime(record.createdAt) }}</td><td><span class="account-service-status" :class="record.status.toLowerCase()">{{ orderStatusNames[record.status as keyof typeof orderStatusNames] || '状态待同步' }}</span></td><td><button class="account-service-text-link" @click="open(record)">查看</button></td></tr></tbody></table></div><footer class="account-service-pagination"><span>共 {{ loading || error ? '—' : snapshot.length }} 条<label>每页<select v-model="pageSize" aria-label="订单每页条数" :disabled="loading" @change="page = 1"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select>条</label></span><div><button aria-label="订单上一页" :disabled="loading || error || page === 1" @click="page--"><ChevronLeft :size="16" /></button>{{ page }} / {{ pages }}<button aria-label="订单下一页" :disabled="loading || error || page === pages" @click="page++"><ChevronRight :size="16" /></button></div></footer></section>
    <p class="account-service-footnote">订单由 CRM 同步，最新变更可能稍后显示。刷新仅查询已同步数据；“有效”不代表一定可调用模型。本页为虚构只读演示，不提供付款、退订或导出。</p>
    <AccountDrawer v-if="recordId" title="订单详情" @close="close"><p v-if="notice" class="account-service-notice" role="status">{{ notice }}</p><div v-if="detailLoading" class="account-service-state"><RefreshCw :size="26" class="spinning" />正在加载订单详情</div><div v-else-if="detailError" class="account-service-state"><strong>订单详情加载失败，请重试</strong><button class="account-service-secondary" @click="loadDetail(true)">重试</button></div><div v-else-if="!detail" class="account-service-state"><strong>订单不存在或无权查看</strong></div><template v-else><h3>订单信息</h3><dl class="account-service-detail-fields"><dt>订单编号</dt><dd>{{ detail.orderId }}<button class="account-service-text-link" @click="copy(detail.orderId)"><Copy :size="13" />复制</button></dd><dt>归属服务</dt><dd>{{ detail.serviceName || detail.serviceId }}</dd><dt>订单类型</dt><dd>{{ orderTypeNames[detail.type] }}</dd><dt>订单内容</dt><dd>{{ orderContentNames[detail.content] }}</dd><dt>订单金额</dt><dd>{{ orderMoney(detail) }}</dd><dt>订单创建时间</dt><dd>{{ accountTime(detail.createdAt) }}</dd><dt>订单状态</dt><dd><span class="account-service-status" :class="detail.status.toLowerCase()">{{ orderStatusNames[detail.status as keyof typeof orderStatusNames] || '状态待同步' }}</span></dd><dt>生效时间</dt><dd>{{ detail.effectiveAt ? accountTime(detail.effectiveAt) : detail.content === 'RECHARGE' ? '不适用' : '暂未提供' }}</dd><dt>失效时间</dt><dd>{{ detail.expiresAt ? accountTime(detail.expiresAt) : detail.content === 'RECHARGE' ? '不适用' : '暂未提供' }}</dd><dt>购买额度</dt><dd>{{ detail.purchasedQuota !== null && detail.quotaUnit ? `${tokens(detail.purchasedQuota)} ${detail.quotaUnit}` : detail.content === 'RECHARGE' ? '不适用' : '暂未提供' }}</dd></dl><p class="account-service-footnote">购买额度为本订单购买时的额度，不是当前余量。订单状态来自 CRM，不由页面根据时间推算。</p></template></AccountDrawer>
  </div>
</template>
