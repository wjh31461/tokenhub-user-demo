<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Activity, ArrowRight, ArrowUpRight, Bell, BookOpen, CheckCheck, ChevronRight, Clock3, FileText, Info, KeyRound, Layers3, RefreshCw, ShieldCheck, Sparkles, TriangleAlert, UsersRound, Zap } from 'lucide-vue-next'
import UsageTrend from './UsageTrend.vue'
const props = defineProps<{ isSub: boolean }>()
type Scenario = 'normal' | 'empty' | 'restricted' | 'partial' | 'error'
const scenario = ref<Scenario>('normal')
const range = ref<7 | 30>(7)
const refreshing = ref(false)
const usageLoading = ref(false)
const serviceRecovered = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let usageTimer: ReturnType<typeof setTimeout> | undefined
const endDate = '2026-09-28'
const services = [
  { id: 'token-pro', name: 'Token 服务 · 专业版', type: 'Token 服务', icon: Layers3, color: 'blue', remaining: '8,640,000', unit: 'Token', health: '额度充足', date: '下次刷新 2026-10-01 00:00', multi: false },
  { id: 'legal-assistant', name: '法律文书', type: 'AI 应用', icon: FileText, color: 'violet', remaining: '126,000', unit: 'Token', health: '额度较低', date: '有效期至 2026-09-30 23:59', multi: false },
  { id: 'medical-assistant', name: '星海智医', type: 'AI 应用', icon: Sparkles, color: 'teal', remaining: '多种额度', unit: '', health: '查看明细', date: '各额度包有效期不同', multi: true }
]
const quotas = [
  { id: 'token-pro', name: 'Token 服务 · 研发配额', assigned: '2,000,000', used: '720,000', remaining: '1,280,000', date: '有效期至 2026-09-30 23:59' }
]
const daily = computed(() => Array.from({ length: range.value }, (_, index) => {
  const date = new Date(`${endDate}T00:00:00+08:00`)
  date.setUTCDate(date.getUTCDate() - (range.value - 1 - index))
  const day = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
  const seed = Number(day.slice(-2))
  const scale = props.isSub ? 0.08 : 1
  const input = scenario.value === 'empty' ? 0 : Math.round((180000 + (seed * 7919 % 230000)) * scale)
  const output = scenario.value === 'empty' ? 0 : Math.round((60000 + (seed * 3571 % 85000)) * scale)
  return { date: day, input, output }
}))
const totals = computed(() => daily.value.reduce((sum, d) => ({ input: sum.input + d.input, output: sum.output + d.output }), { input: 0, output: 0 }))
const metrics = computed(() => [
  { title: '调用次数', value: scenario.value === 'empty' ? 0 : daily.value.reduce((sum, d) => sum + Math.round((d.input + d.output) / 850), 0), unit: '次', note: '按唯一调用计数，包含成功与失败', icon: Activity },
  { title: '总 Token', value: totals.value.input + totals.value.output, unit: 'Token', note: '已完成计量的输入与输出之和', icon: Zap },
  { title: '输入 Token', value: totals.value.input, unit: 'Token', note: '包含缓存命中的输入用量', icon: ArrowUpRight },
  { title: '输出 Token', value: totals.value.output, unit: 'Token', note: '模型实际生成的输出用量', icon: CheckCheck }
])
const alerts = [
  { id: 'quota-low', title: '法律文书服务额度较低', service: '法律文书', time: '09-28 14:32', level: '额度提醒', read: false },
  { id: 'request-warning', title: '检测到连续异常调用', service: 'Token 服务 · 专业版', time: '09-28 11:08', level: '调用异常', read: false },
  { id: 'quota-exhausted', title: '历史急救包额度已耗尽', service: 'Token 服务 · 专业版', time: '09-27 16:45', level: '额度提醒', read: true }
]
const announcements = [
  { id: 'integration-guide', category: '使用指南', title: '欢迎使用 TokenHub：模型接入与 API 密钥使用指南', date: '2026-09-25', pinned: true },
  { id: 'model-update', category: '模型动态', title: '模型目录更新：查看最新可用模型与能力说明', date: '2026-09-28', pinned: false },
  { id: 'maintenance', category: '维护通知', title: '平台例行维护通知（10 月 1 日）', date: '2026-09-27', pinned: false }
]
const usageLink = computed(() => ({ path: '/usage', query: { tab: 'statistics', startDate: daily.value[0]!.date, endDate } }))
const failed = computed(() => scenario.value === 'error' && !serviceRecovered.value)
function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  refreshTimer = setTimeout(() => { refreshing.value = false }, 550)
}
function selectRange(value: 7 | 30) {
  if (range.value === value) return
  clearTimeout(usageTimer)
  range.value = value
  usageLoading.value = true
  usageTimer = setTimeout(() => { usageLoading.value = false }, 300)
}
function reset() {
  clearTimeout(refreshTimer)
  clearTimeout(usageTimer)
  refreshing.value = false
  usageLoading.value = false
  range.value = 7
  serviceRecovered.value = false
}
watch(() => props.isSub, reset)
watch(scenario, () => { serviceRecovered.value = false })
onBeforeUnmount(() => { clearTimeout(refreshTimer); clearTimeout(usageTimer) })
const exact = (n: number) => n.toLocaleString('zh-CN')
</script>

<template>
  <div class="overview-demo">
    <div class="overview-heading"><div><h1>概览</h1><div class="identity-line"><span>{{ isSub ? '研发子账户' : '主账户' }}</span><span class="role-pill">{{ isSub ? '子账户' : '主账户管理员' }}</span><span class="state-pill" :class="{ amber: scenario === 'restricted' }"><i />{{ scenario === 'restricted' ? (isSub ? '关联服务受限' : '已停机') : '账户正常' }}</span></div></div><button class="refresh-button" :disabled="refreshing" @click="refresh"><RefreshCw :size="14" :class="{ spinning: refreshing }" />{{ refreshing ? '刷新中' : '刷新' }}</button></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="页面场景"><option value="normal">正常使用</option><option value="empty">暂无服务 / 配额</option><option value="restricted">账户 / 服务受限</option><option value="partial">部分计量更新中</option><option value="error">额度区域加载失败</option></select></label></div>
    <div v-if="scenario === 'restricted'" class="notice-banner warning" role="status"><TriangleAlert :size="17" /><span>{{ isSub ? '主账户当前服务受限，您的配额暂时无法使用。请联系主账户管理员。' : '当前账户已停机，模型调用受限。请通过原业务办理渠道处理。' }}</span></div>

    <section class="overview-section services-section" :aria-busy="refreshing" aria-label="服务与额度">
      <div class="section-heading"><div><h2>{{ isSub ? '我的可用配额' : '我的服务与余量' }}<span class="count-pill">{{ scenario === 'empty' ? 0 : isSub ? 1 : 3 }}</span></h2><p>数据截至 09-28 14:35</p></div><RouterLink :to="isSub ? '/usage?tab=statistics' : '/services'" class="text-link">{{ isSub ? '查看我的用量' : '查看全部服务' }}<ChevronRight :size="14" /></RouterLink></div>
      <div v-if="failed" class="section-empty"><TriangleAlert :size="26" /><strong>暂时无法获取{{ isSub ? '配额' : '服务' }}数据</strong><p>其他区域可正常查看，请重试加载。</p><button class="outline-button" @click="serviceRecovered=true">重新加载</button></div>
      <div v-else-if="scenario === 'empty'" class="section-empty"><Layers3 :size="28" /><strong>{{ isSub ? '暂未分配可用配额' : '暂无已开通服务' }}</strong><p>{{ isSub ? '请联系主账户管理员。' : '完成业务订购后可在此查看。' }}</p><RouterLink v-if="!isSub" to="/help/docs" class="text-link">查看接入文档<ArrowRight :size="13" /></RouterLink></div>
      <div v-else-if="!isSub" class="service-grid">
        <article v-for="service in services" :key="service.id" class="service-card"><div class="service-top"><span class="service-icon" :class="service.color"><component :is="service.icon" :size="19" /></span><div class="service-title"><h3 :title="service.name">{{ service.name }}</h3><span>{{ service.type }}</span></div><span class="service-status" :class="{ amber: scenario === 'restricted' }">{{ scenario === 'restricted' ? '已停机' : '正常' }}</span></div><div class="balance-caption">{{ service.multi ? '可用额度' : '剩余可用额度' }}<span v-if="!service.multi" class="quota-health" :class="{ low: service.health === '额度较低' }">{{ service.health }}</span></div><div class="quota-number" :class="{ mixed: service.multi }">{{ service.remaining }}<small>{{ service.unit }}</small></div><div class="service-date"><Clock3 :size="12" />{{ service.date }}</div><div class="service-actions"><RouterLink :to="`/services/${service.id}`">{{ service.multi ? '查看额度详情' : '服务详情' }}<ArrowUpRight :size="12" /></RouterLink><RouterLink :to="{path:'/usage',query:{tab:'statistics',serviceId:service.id}}">查看用量<ChevronRight :size="12" /></RouterLink></div></article>
      </div>
      <div v-else class="service-grid"><article v-for="quota in quotas" :key="quota.id" class="service-card"><div class="service-top"><span class="service-icon blue"><Layers3 :size="19" /></span><div class="service-title"><h3>{{ quota.name }}</h3><span>Token 服务 · 本周期配额</span></div><span class="service-status" :class="{ amber: scenario === 'restricted' }">{{ scenario === 'restricted' ? '受限' : '可用' }}</span></div><div class="balance-caption">我的剩余配额</div><div class="quota-number">{{ quota.remaining }}<small>Token</small></div><div class="quota-breakdown"><span>分配配额 <b>{{ quota.assigned }}</b></span><span>本周期已用 <b>{{ quota.used }}</b></span></div><div class="service-date"><Clock3 :size="12" />{{ quota.date }}</div><div class="service-actions"><RouterLink :to="{path:'/usage',query:{tab:'statistics',serviceId:quota.id}}">查看用量<ChevronRight :size="12" /></RouterLink></div></article></div>
      <p class="section-footnote"><Info :size="12" />{{ isSub ? '实际调用同时受主账户服务状态和可用余额限制。' : '各服务额度独立展示，具体额度包及有效期请查看服务详情。' }}</p>
    </section>

    <section class="overview-section usage-section" aria-label="用量概况" :aria-busy="usageLoading || refreshing">
      <div class="section-heading"><div><h2>用量概况</h2><p>{{ daily[0]!.date }} — {{ endDate }} <span class="scope-label">{{ isSub ? '仅当前子账户' : '本账户及子账户' }}</span></p></div><div class="range-switch" aria-label="统计范围"><button :class="{ active: range === 7 }" :aria-pressed="range===7" @click="selectRange(7)">近 7 天</button><button :class="{ active: range === 30 }" :aria-pressed="range===30" @click="selectRange(30)">近 30 天</button></div></div>
      <div v-if="scenario === 'partial'" class="metering-note"><span class="orange-dot" />部分调用用量仍在更新，当前仅展示已完成计量的 Token。</div>
      <div class="usage-body" :class="{ 'is-loading': usageLoading || refreshing }"><div class="metrics-grid"><div v-for="metric in metrics" :key="metric.title" class="metric-card"><div class="metric-title">{{ metric.title }}<component :is="metric.icon" :size="15" /></div><div class="metric-value" :title="exact(metric.value)">{{ exact(metric.value) }}<small>{{ metric.unit }}</small></div><p>{{ metric.note }}</p></div></div><div class="chart-heading"><div><h3>每日 Token 用量</h3><span>今日数据截至 14:35 · 上海时区</span></div><div class="chart-legend"><span><i />输入 Token</span><span><i />输出 Token</span></div></div><div v-if="scenario === 'empty'" class="no-usage">所选时间范围内暂无调用记录</div><UsageTrend v-else :days="daily" :partial="scenario==='partial'" /></div>
      <div v-if="usageLoading || refreshing" class="usage-loading" role="status"><RefreshCw class="spinning" :size="18" />正在刷新数据</div>
      <div class="usage-footer"><span>统计已计量 Token，不代表套餐扣减额度</span><RouterLink :to="usageLink" class="text-link">查看详细用量<ArrowRight :size="13" /></RouterLink></div>
    </section>

    <div class="overview-bottom" :class="{ 'sub-layout': isSub }">
      <section class="overview-section quick-section"><div class="section-heading"><div><h2>快捷操作</h2><p>从这里开始使用 TokenHub</p></div><Zap :size="17" class="muted-icon" /></div><div class="quick-grid"><button class="quick-card" :disabled="scenario==='empty'" :title="scenario==='empty' ? '当前身份未关联可创建密钥的 Token 服务' : ''" @click="$router.push('/api-keys?action=create')"><span class="quick-icon"><KeyRound :size="19" /></span><span><strong>创建 API 密钥</strong><small>{{ scenario === 'empty' ? '暂无可用 Token 服务' : '连接您的应用与模型' }}</small></span><ArrowUpRight :size="13" /></button><RouterLink class="quick-card" to="/usage?tab=statistics"><span class="quick-icon"><Activity :size="19" /></span><span><strong>查看用量</strong><small>追踪每一次模型调用</small></span><ArrowUpRight :size="13" /></RouterLink><RouterLink class="quick-card" to="/help/docs"><span class="quick-icon"><BookOpen :size="19" /></span><span><strong>接入文档</strong><small>快速完成 API 接入</small></span><ArrowUpRight :size="13" /></RouterLink><RouterLink v-if="!isSub" class="quick-card" to="/subaccounts"><span class="quick-icon"><UsersRound :size="19" /></span><span><strong>子账户管理</strong><small>管理团队成员与配额</small></span><ArrowUpRight :size="13" /></RouterLink></div><div class="quick-hint"><ShieldCheck :size="13" />请妥善保管密钥，避免将其公开分享。</div></section>
      <section v-if="!isSub" class="overview-section alerts-section"><div class="section-heading"><div><h2>告警摘要<span v-if="scenario!=='empty'" class="unread-pill">2 条未读</span></h2><p>数据截至 09-28 14:35</p></div><RouterLink class="text-link" to="/alerts">查看全部<ChevronRight :size="13" /></RouterLink></div><div v-if="scenario==='empty'" class="section-empty small"><Bell :size="23" /><p>暂无告警</p></div><RouterLink v-for="alert in scenario==='empty' ? [] : alerts" :key="alert.id" :to="`/alerts/${alert.id}`" class="alert-row"><span class="alert-symbol" :class="{ read: alert.read }"><TriangleAlert :size="15" /></span><div><strong>{{ alert.title }}<i v-if="!alert.read" class="unread-dot" /></strong><small>{{ alert.service }}<span>·</span>{{ alert.time }}</small></div><span class="alert-level">{{ alert.read ? '已读' : alert.level }}</span><ChevronRight :size="12" /></RouterLink></section>
    </div>
    <section class="overview-section announcements-section"><div class="section-heading"><div><h2>平台公告</h2><p>数据截至 09-28 10:00</p></div><RouterLink class="text-link" to="/help/announcements">查看全部<ChevronRight :size="13" /></RouterLink></div><RouterLink v-for="item in announcements" :key="item.id" :to="`/help/announcements/${item.id}`" class="announcement-row"><span class="announcement-category" :class="{ blue: item.category==='模型动态' }">{{ item.category }}</span><span class="announcement-title">{{ item.title }}<span v-if="item.pinned" class="pinned-label">置顶</span></span><time>{{ item.date }}</time><ChevronRight :size="13" /></RouterLink></section>
    <p v-if="refreshing" class="demo-refresh-note" aria-live="polite">正在刷新页面…</p>
  </div>
</template>
