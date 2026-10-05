<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import AccountDrawer from './AccountDrawer.vue'
import { accountServices, accountTime, demoAccount, isPackageActive, packageTypeNames, quotaScopes, quotaSnapshotAt, serviceTypeNames, tokenPackages, tokens, type QuotaScope, type TokenPackage } from '../data/accountServices'
const route = useRoute(), router = useRouter()
const services = accountServices.filter(service => service.accountId === demoAccount)
const service = (scope: QuotaScope) => services.find(item => item.id === scope.serviceId)!
const own = (scope: QuotaScope) => services.some(item => item.id === scope.serviceId) && scope.visible
const defaults = () => ({ keyword: '', type: '' })
const draft = ref(defaults()), applied = ref(defaults()), snapshot = ref<QuotaScope[]>([])
const scenario = ref('normal'), loading = ref(false), error = ref(false), stale = ref(false), page = ref(1), validation = ref('')
const detailLoading = ref(false), detailError = ref(false), selected = ref<QuotaScope>(), packageRows = ref<TokenPackage[]>([]), packagePage = ref(1)
const detailUpdatedAt = ref(quotaSnapshotAt), hasLoaded = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined, detailTimer: ReturnType<typeof setTimeout> | undefined, generation = 0, detailGeneration = 0
const scopeId = computed(() => typeof route.query.scopeId === 'string' ? route.query.scopeId : '')
const pages = computed(() => Math.max(1, Math.ceil(snapshot.value.length / 20)))
const rows = computed(() => snapshot.value.slice((page.value - 1) * 20, page.value * 20))
const packagePages = computed(() => Math.max(1, Math.ceil(packageRows.value.length / 20)))
const packages = computed(() => packageRows.value.slice((packagePage.value - 1) * 20, packagePage.value * 20))
const latestAt = computed(() => snapshot.value.map(scope => scope.updatedAt).filter((value): value is string => Boolean(value)).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null)
const hasFilters = computed(() => Boolean(applied.value.keyword || applied.value.type))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))
const detailMismatch = computed(() => Boolean(selected.value && (detailUpdatedAt.value !== selected.value.updatedAt || packageRows.value.some(record => record.version !== selected.value!.version))))
function load(purpose: 'query' | 'refresh' = 'query', retry = false) {
  clearTimeout(timer); const request = ++generation, filters = { ...applied.value }, mode = scenario.value
  loading.value = true; error.value = false; stale.value = false
  timer = setTimeout(() => {
    if (request !== generation || !sessionStorage.getItem('tokenhub-demo-session')) return
    loading.value = false
    if ((mode === 'error' || mode === 'refreshError') && !retry) { if (purpose === 'refresh' && hasLoaded.value) stale.value = true; else error.value = true; return }
    snapshot.value = mode === 'empty' ? [] : quotaScopes.filter(scope => own(scope) && (!filters.keyword || `${service(scope).name || scope.serviceId}`.toLowerCase().includes(filters.keyword.toLowerCase())) && (!filters.type || service(scope).type === filters.type)).map(scope => mode === 'unavailable' ? { ...scope, available: null, dataStatus: 'UNAVAILABLE' as const } : { ...scope }).sort((a, b) => (service(a).name || a.serviceId).localeCompare(service(b).name || b.serviceId, 'zh-CN') || a.serviceId.localeCompare(b.serviceId) || a.id.localeCompare(b.id))
    hasLoaded.value = true; page.value = Math.min(page.value, pages.value)
  }, 240)
}
function query() { validation.value = draft.value.type && !Object.hasOwn(serviceTypeNames, draft.value.type) ? '请选择有效的服务类型' : ''; if (validation.value) return; applied.value = { keyword: draft.value.keyword.trim(), type: draft.value.type }; page.value = 1; load() }
function reset() { draft.value = defaults(); query() }
function open(scope: QuotaScope) { router.push({ query: { ...route.query, scopeId: scope.id } }) }
function close() { const query = { ...route.query }; delete query.scopeId; router.replace({ query }) }
function loadPackages(retry = false) {
  clearTimeout(detailTimer); const request = ++detailGeneration, id = scopeId.value, mode = scenario.value
  detailLoading.value = true; detailError.value = false; selected.value = undefined; packageRows.value = []; packagePage.value = 1
  detailTimer = setTimeout(() => {
    if (request !== detailGeneration || !sessionStorage.getItem('tokenhub-demo-session')) return
    detailLoading.value = false
    if (mode === 'packageError' && !retry) { detailError.value = true; return }
    const scope = quotaScopes.find(item => item.id === id && own(item) && item.mode === 'VALIDITY_PACKAGE')
    selected.value = mode === 'detailMissing' ? undefined : scope ? { ...scope } : undefined
    if (!selected.value) return
    detailUpdatedAt.value = mode === 'mismatch' ? '2026-10-05T10:02:00+08:00' : selected.value.updatedAt || quotaSnapshotAt
    packageRows.value = mode === 'noPackages' ? [] : tokenPackages.filter(record => record.scopeId === id && isPackageActive(record)).map(record => mode === 'mismatch' ? { ...record, updatedAt: detailUpdatedAt.value, version: 'quota-v2' } : { ...record }).sort((a, b) => (a.expiresAt === null ? Infinity : Date.parse(a.expiresAt)) - (b.expiresAt === null ? Infinity : Date.parse(b.expiresAt)) || a.id.localeCompare(b.id))
  }, 220)
}
function state(scope: QuotaScope) { return scope.frozen ? '账户冻结' : ({ ACTIVE: '正常', CRM_STOPPED: 'CRM 停机', UNSUBSCRIBED: '已退订' } as Record<string, string>)[scope.serviceStatus] || '状态待确认' }
function restricted(scope: QuotaScope) { return scope.frozen || scope.serviceStatus !== 'ACTIVE' }
watch(scopeId, id => { if (id) loadPackages(); else { detailGeneration++; clearTimeout(detailTimer); selected.value = undefined; packageRows.value = [] } }, { immediate: true })
watch(scenario, value => { if (value === 'refreshError') load('refresh'); else if (!['packageError', 'noPackages', 'mismatch', 'detailMissing'].includes(value)) load(); if (scopeId.value) loadPackages() })
onBeforeUnmount(() => { generation++; detailGeneration++; clearTimeout(timer); clearTimeout(detailTimer); snapshot.value = []; selected.value = undefined; packageRows.value = [] })
load()
</script>
<template>
  <div class="balances-view"><div class="account-service-demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="余量页面场景"><option value="normal">正常余量</option><option value="empty">暂无服务</option><option value="error">首次加载失败</option><option value="refreshError">刷新失败保留旧数据</option><option value="unavailable">额度暂不可用</option><option value="packageError">包明细加载失败</option><option value="noPackages">暂无生效包</option><option value="mismatch">汇总与明细版本不同</option><option value="detailMissing">详情无权限</option></select></label><button class="account-service-secondary" :disabled="loading" @click="load('refresh')"><RefreshCw :size="15" :class="{ spinning: loading }" />刷新</button></div>
    <form class="account-service-card account-service-filter" @submit.prevent="query"><div class="balance-filter-grid"><label>服务名称<input v-model="draft.keyword" aria-label="服务名称搜索" placeholder="请输入服务名称，支持模糊查询" /></label><label>服务类型<select v-model="draft.type" aria-label="余量服务类型"><option value="">全部类型</option><option v-for="(name, code) in serviceTypeNames" :key="code" :value="code">{{ name }}</option></select></label><div><button class="account-service-primary" type="submit">查询</button><button class="account-service-secondary" type="button" @click="reset">重置</button></div></div><p v-if="validation" class="account-service-error" role="alert">{{ validation }}</p><p v-else-if="dirty" class="account-service-filter-hint">筛选条件已修改，请点击查询</p></form>
    <div class="quota-updated"><span>额度更新时间：{{ latestAt ? accountTime(latestAt) : '暂未提供' }}<small>各行注明各自数据时间；刷新不会把打开时间当作额度更新时间。</small></span><span class="account-service-readonly">只读额度</span></div><p v-if="stale" class="account-service-stale" role="alert">刷新失败，当前显示上次数据<button class="account-service-text-link" @click="load('refresh', true)">重试</button></p>
    <section class="account-service-card"><div v-if="loading && !hasLoaded" class="account-service-state" role="status"><RefreshCw :size="27" class="spinning" />正在加载余量</div><div v-else-if="error" class="account-service-state" role="alert"><strong>余量加载失败，请重试</strong><button class="account-service-secondary" @click="load('query', true)">重试</button></div><template v-else><p v-if="loading" class="account-service-loading" role="status">正在更新余量…</p><div v-if="!rows.length" class="account-service-state"><strong>{{ hasFilters ? '未找到符合条件的服务' : '暂无已订购服务' }}</strong><button v-if="hasFilters" class="account-service-secondary" @click="reset">重置筛选</button></div><div v-else class="account-service-table-scroll"><table class="account-service-table balance-table"><thead><tr><th>服务名称</th><th>服务类型</th><th>剩余可用 Token</th><th>服务状态</th><th>当前生效 Token 包</th></tr></thead><tbody><tr v-for="scope in rows" :key="scope.id"><td><strong>{{ service(scope).name || scope.serviceId }}</strong><small v-if="scope.name" class="quota-scope-label">额度范围：{{ scope.name }}</small><small>服务编号：{{ scope.serviceId }}</small></td><td>{{ serviceTypeNames[service(scope).type] }}</td><td><strong class="quota-number-text">{{ tokens(scope.available) }}<span v-if="scope.available !== null"> Token</span></strong><small v-if="scope.dataStatus !== 'READY'">额度暂不可用{{ scope.dataStatus === 'PENDING_SYNC' ? ' · 待同步' : '' }}</small><small v-else>更新：{{ accountTime(scope.updatedAt) }}</small></td><td><span class="account-service-status" :class="restricted(scope) ? 'restricted' : 'active'">{{ state(scope) }}</span><small v-if="restricted(scope)" class="quota-restriction">当前不可调用；余量未被清零</small></td><td><span v-if="scope.mode !== 'VALIDITY_PACKAGE'">不适用</span><div v-else class="package-entry"><span>{{ scope.packageCount }} 个</span><button class="account-service-text-link" @click="open(scope)">查看</button></div></td></tr></tbody></table></div></template><footer class="account-service-pagination"><span>共 {{ error ? '—' : snapshot.length }} 个额度范围 · 每页 20 条</span><div><button aria-label="余量上一页" :disabled="loading || error || page === 1" @click="page--"><ChevronLeft :size="16" /></button>{{ page }} / {{ pages }}<button aria-label="余量下一页" :disabled="loading || error || page === pages" @click="page++"><ChevronRight :size="16" /></button></div></footer></section>
    <p class="account-service-footnote">同一服务不可共同抵扣的额度分行展示，不跨服务合计；共享额度不因密钥数量重复展示。可用量由额度系统提供，已扣除预占，不按用量统计反推。当前数据为虚构演示快照。</p>
    <AccountDrawer v-if="scopeId" title="当前生效 Token 包" @close="close"><div v-if="detailLoading" class="account-service-state"><RefreshCw :size="26" class="spinning" />正在加载 Token 包</div><div v-else-if="detailError" class="account-service-state" role="alert"><strong>Token 包加载失败，请重试</strong><button class="account-service-secondary" @click="loadPackages(true)">重试</button></div><div v-else-if="!selected" class="account-service-state"><strong>服务不存在或无权查看</strong></div><template v-else><h3>{{ service(selected).name || selected.serviceId }}{{ selected.name ? ` · ${selected.name}` : '' }}</h3><div class="package-summary"><span>该额度范围剩余可用 Token</span><strong>{{ tokens(selected.available) }}<small v-if="selected.available !== null"> Token</small></strong><p>汇总更新时间：{{ accountTime(selected.updatedAt) }}</p><p>明细更新时间：{{ accountTime(detailUpdatedAt) }}</p></div><p v-if="detailMismatch" class="account-service-stale">额度持续更新，以最新查询结果为准。汇总与明细不是同一额度版本，勿逐项相加核对。</p><p class="account-service-filter-hint">仅展示当前生效包；已耗尽但仍生效的包保留。按失效时间从近到远排列。</p><div v-if="!packages.length" class="account-service-state"><strong>暂无当前生效的 Token 包</strong></div><div v-else class="token-package-list"><article v-for="record in packages" :key="record.id"><header><h4>{{ record.name }}</h4><span>{{ packageTypeNames[record.type] }}</span></header><p v-if="record.type === 'RECURRING'" class="package-period-note">连续包 · 展示当前周期</p><dl><dt>当前周期总额度</dt><dd>{{ tokens(record.total) }} Token</dd><dt>本包剩余可用 Token</dt><dd>{{ tokens(record.available) }}{{ record.available !== null ? ' Token' : '' }}<span v-if="record.available === '0'" class="package-depleted">已耗尽</span></dd><dt>生效时间</dt><dd>{{ accountTime(record.startsAt) }}</dd><dt>失效时间</dt><dd>{{ record.expiresAt ? accountTime(record.expiresAt) : '长期有效' }}</dd></dl></article></div><div class="account-service-pagination package-pagination"><span>共 {{ packageRows.length }} 个 · 每页 20 条</span><div><button aria-label="Token 包上一页" :disabled="packagePage === 1" @click="packagePage--"><ChevronLeft :size="15" /></button>{{ packagePage }} / {{ packagePages }}<button aria-label="Token 包下一页" :disabled="packagePage === packagePages" @click="packagePage++"><ChevronRight :size="15" /></button></div></div></template></AccountDrawer>
  </div>
</template>
