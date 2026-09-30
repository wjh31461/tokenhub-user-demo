<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Bot, Box, BrainCircuit, Check,
  ChevronLeft, ChevronRight, CircleHelp, Copy, FileCode2, Image, Info, KeyRound,
  Layers3, RefreshCw, RotateCcw, Search, ShieldCheck, Sparkles, XCircle, Zap,
} from 'lucide-vue-next'
import {
  capabilityLabels, catalogModels, modelTypeLabels, protocolLabels,
  type Availability, type Capability, type CatalogModel, type ModelType, type Protocol,
} from '../data/models'
import './models.css'

const props = defineProps<{ isSub: boolean; guest?: boolean }>()
const route = useRoute()
const router = useRouter()
type Scenario = 'normal' | 'empty' | 'restricted' | 'error'
const scenario = ref<Scenario>('normal')
const loading = ref(false)
const recovered = ref(false)
const copied = ref('')
const page = ref(1)
const pageSize = 6
let timer: ReturnType<typeof setTimeout> | undefined
const defaults = () => ({ keyword: '', type: '', capability: '', availability: '', protocol: '', manufacturer: '', tag: '', sort: 'RECOMMENDED' })
const draft = ref(defaults())
const applied = ref(defaults())

const typeIcons: Record<ModelType, typeof Bot> = { TEXT_GENERATION: Bot, MULTIMODAL: Sparkles, IMAGE_GENERATION: Image, EMBEDDING: Layers3 }
const selected = computed(() => typeof route.params.modelId === 'string' ? catalogModels.find(item => item.id === route.params.modelId) ?? null : null)
const detailMissing = computed(() => typeof route.params.modelId === 'string' && !selected.value)
const isDetail = computed(() => typeof route.params.modelId === 'string')
const failed = computed(() => scenario.value === 'error' && !recovered.value)
const availabilityOf = (model: CatalogModel): Availability => scenario.value === 'restricted' ? 'SERVICE_RESTRICTED' : props.isSub ? model.subAvailability : model.availability
const availabilityLabel = (value: Availability) => props.guest ? (value === 'DEPRECATED' ? '即将下架' : '登录后查看可用性') : ({ AVAILABLE: '当前可使用', NOT_ENTITLED: '暂不可使用', SERVICE_RESTRICTED: '服务受限', DEPRECATED: '即将下架' }[value])
const protocolName = (value: Protocol) => protocolLabels[value]
const capabilityName = (value: Capability) => capabilityLabels[value]
const uniqueProtocols = computed(() => [...new Set(catalogModels.flatMap(item => item.protocols))])
const manufacturers = computed(() => [...new Set(catalogModels.map(model => model.manufacturer))])
const tags = computed(() => [...new Set(catalogModels.flatMap(model => model.tags))])
const typeCount = (type: string) => catalogModels.filter(model => model.type === type).length
function selectSupplier(supplier: string) { draft.value.manufacturer = supplier; query() }
function selectType(type: string) { draft.value.type = type; query() }
const filtered = computed(() => {
  if (scenario.value === 'empty') return []
  const query = applied.value.keyword.trim().toLowerCase()
  return catalogModels.filter(model => {
    const availability = availabilityOf(model)
    return (!query || [model.name, model.code, model.summary, ...model.tags].join(' ').toLowerCase().includes(query))
      && (!applied.value.type || model.type === applied.value.type)
      && (props.guest || !applied.value.capability || model.capabilities.includes(applied.value.capability as Capability))
      && (props.guest || !applied.value.availability || availability === applied.value.availability)
      && (props.guest || !applied.value.protocol || model.protocols.includes(applied.value.protocol as Protocol))
      && (!applied.value.manufacturer || model.manufacturer === applied.value.manufacturer)
      && (props.guest || !applied.value.tag || model.tags.includes(applied.value.tag))
  }).sort((left, right) => {
    if (applied.value.sort === 'NAME_ASC') return left.name.localeCompare(right.name)
    if (applied.value.sort === 'UPDATED_DESC') return right.updatedAt.localeCompare(left.updatedAt)
    const rank = (model: CatalogModel) => ({ AVAILABLE: 0, DEPRECATED: 1, NOT_ENTITLED: 2, SERVICE_RESTRICTED: 3 }[availabilityOf(model)])
    return (props.guest ? 0 : rank(left) - rank(right)) || catalogModels.indexOf(left) - catalogModels.indexOf(right)
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageModels = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(applied.value))

function updateUrl() {
  const query: Record<string, string> = {}
  Object.entries(applied.value).forEach(([key, value]) => { if (value && !(key === 'sort' && value === 'RECOMMENDED')) query[key] = value })
  if (page.value > 1) query.page = String(page.value)
  router.replace({ path: '/models', query })
}
function query() {
  if (draft.value.keyword.length > 100) return
  applied.value = { ...draft.value }
  page.value = 1
  loading.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { loading.value = false }, 320)
  updateUrl()
}
function reset() {
  draft.value = defaults()
  applied.value = defaults()
  page.value = 1
  recovered.value = false
  updateUrl()
}
function goPage(value: number) {
  page.value = Math.max(1, Math.min(pageCount.value, value))
  updateUrl()
}
function copyCode(model: CatalogModel) {
  navigator.clipboard?.writeText(model.code)
  copied.value = model.id
  setTimeout(() => { if (copied.value === model.id) copied.value = '' }, 1500)
}
function openModel(model: CatalogModel) {
  router.push(`/models/${model.id}`)
}
function initializeFromRoute() {
  const next = defaults()
  for (const key of Object.keys(next) as Array<keyof typeof next>) {
    const value = route.query[key]
    if (typeof value === 'string') next[key] = value
  }
  if (props.guest) { next.capability = ''; next.availability = ''; next.protocol = ''; next.tag = '' }
  draft.value = next
  applied.value = { ...next }
  page.value = Math.max(1, Number(route.query.page) || 1)
}
watch(() => route.fullPath, () => { if (!isDetail.value) initializeFromRoute() })
watch(() => props.isSub, () => { reset(); if (isDetail.value) router.replace('/models') })
watch(scenario, () => { recovered.value = false; page.value = 1 })
watch(pageCount, count => { if (page.value > count) page.value = count })
onBeforeUnmount(() => clearTimeout(timer))
initializeFromRoute()
</script>

<template>
  <div class="models-view">
    <template v-if="!isDetail">
      <div class="models-heading"><div><h1>模型目录</h1><p>查看平台开放模型的能力、公开标识与用户计价，选择适合您的模型。</p></div><RouterLink class="models-secondary" to="/help/docs"><BookOpen :size="15" />接入文档<ArrowRight :size="13" /></RouterLink></div>
      <div v-if="!guest" class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="页面场景"><option value="normal">正常使用</option><option value="empty">平台暂无模型</option><option value="restricted">关联服务受限</option><option value="error">目录加载失败</option></select></label></div>
      <div class="catalog-layout" :class="{ 'guest-catalog': guest }">
        <aside v-if="guest" class="catalog-type-filter" aria-label="按模型类型和供应商筛选">
          <div class="catalog-filter-title"><h2>模型类型</h2><button type="button" @click="reset">重置</button></div>
          <div class="catalog-filter-tags" role="group" aria-label="模型类型">
            <button type="button" :class="{ active: !draft.type }" :aria-pressed="!draft.type" @click="selectType('')">全部模型<small>{{ catalogModels.length }}</small></button>
            <button v-for="(label, value) in modelTypeLabels" :key="value" type="button" :class="{ active: draft.type === value }" :aria-pressed="draft.type === value" @click="selectType(draft.type === value ? '' : value)">{{ label }}<small>{{ typeCount(value) }}</small></button>
          </div>
          <div class="catalog-filter-title catalog-supplier-title"><h2>供应商</h2></div>
          <div class="catalog-filter-tags" role="group" aria-label="供应商">
            <button type="button" :class="{ active: !draft.manufacturer }" :aria-pressed="!draft.manufacturer" @click="selectSupplier('')">全部供应商</button>
            <button v-for="supplier in manufacturers" :key="supplier" type="button" :class="{ active: draft.manufacturer === supplier }" :aria-pressed="draft.manufacturer === supplier" @click="selectSupplier(draft.manufacturer === supplier ? '' : supplier)">{{ supplier }}</button>
          </div>
        </aside>
        <div class="catalog-result-column">
      <section class="models-filter-card" aria-label="筛选模型">
        <form @submit.prevent="query"><div class="models-search"><Search :size="17" /><input v-model="draft.keyword" maxlength="100" placeholder="搜索模型名称、model 标识或适用场景" aria-label="搜索模型" /><button type="submit">搜索</button></div>
          <div v-if="!guest" class="models-filters"><label>模型类型<select v-model="draft.type"><option value="">全部类型</option><option v-for="(label, value) in modelTypeLabels" :key="value" :value="value">{{ label }}</option></select></label><label>模型能力<select v-model="draft.capability"><option value="">全部能力</option><option v-for="(label, value) in capabilityLabels" :key="value" :value="value">{{ label }}</option></select></label><label v-if="!guest">可用状态<select v-model="draft.availability"><option value="">全部状态</option><option value="AVAILABLE">当前可使用</option><option value="NOT_ENTITLED">暂不可使用</option><option value="SERVICE_RESTRICTED">服务受限</option><option value="DEPRECATED">即将下架</option></select></label><label>接口协议<select v-model="draft.protocol"><option value="">全部协议</option><option v-for="value in uniqueProtocols" :key="value" :value="value">{{ protocolName(value) }}</option></select></label><label>供应商<select v-model="draft.manufacturer"><option value="">全部供应商</option><option v-for="vendor in manufacturers" :key="vendor" :value="vendor">{{ vendor }}</option></select></label><label>标签<select v-model="draft.tag"><option value="">全部标签</option><option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option></select></label><button type="button" class="models-reset" @click="reset"><RotateCcw :size="13" />重置</button></div>
          <p v-if="dirty" class="models-dirty">筛选条件已修改，点击“搜索”更新结果。</p>
        </form>
      </section>

      <div v-if="scenario==='restricted'" class="models-notice warning"><AlertTriangle :size="16" />当前关联服务受限，目录仍可浏览，但模型暂时无法调用。{{ isSub ? '请联系主账户管理员。' : '请前往我的服务查看。' }}</div>
      <section class="models-results" aria-live="polite">
        <header><div><h2>开放模型 <span>{{ failed ? '—' : filtered.length }}</span></h2><p>数据截至 2026-09-28 18:30 · 仅展示平台模型，不包含底层供应商和渠道</p></div><label>排序<select v-model="draft.sort" @change="query"><option value="RECOMMENDED">综合排序</option><option value="NAME_ASC">名称升序</option><option value="UPDATED_DESC">最近更新</option></select></label></header>
        <div v-if="loading" class="models-state"><RefreshCw class="models-spinning" :size="28" /><strong>正在更新模型目录</strong><p>正在按当前条件查询…</p></div>
        <div v-else-if="failed" class="models-state"><XCircle :size="31" /><strong>模型目录加载失败</strong><p>暂时无法获取模型数据，请稍后重试。</p><button class="models-secondary" @click="recovered=true">重新加载</button></div>
        <div v-else-if="!pageModels.length" class="models-state"><Box :size="33" /><strong>{{ scenario==='empty' ? '当前暂无开放模型' : '当前条件下未找到模型' }}</strong><p>{{ scenario==='empty' ? '模型开放后会显示在这里。' : '请更换关键词或清除筛选条件。' }}</p><button v-if="scenario!=='empty'" class="models-secondary" @click="reset">清除筛选</button></div>
        <div v-else class="model-grid">
          <article v-for="model in pageModels" :key="model.id" class="model-card" @click="openModel(model)">
            <div class="model-card-top"><span class="model-icon" :class="model.type.toLowerCase()"><component :is="typeIcons[model.type]" :size="21" /></span><div><h3>{{ model.name }}</h3><button class="model-code" :aria-label="`复制 ${model.code}`" @click.stop="copyCode(model)"><FileCode2 :size="12" />{{ model.code }}<Check v-if="copied===model.id" :size="12" /><Copy v-else :size="11" /></button></div><span class="model-availability" :class="availabilityOf(model).toLowerCase()">{{ availabilityLabel(availabilityOf(model)) }}</span></div>
            <p class="model-summary">{{ model.summary }}</p>
            <div class="model-tags"><span class="model-type-tag">{{ modelTypeLabels[model.type] }}</span><span v-for="capability in model.capabilities.slice(0,3)" :key="capability">{{ capabilityName(capability) }}</span><span v-if="model.capabilities.length>3">+{{ model.capabilities.length-3 }}</span></div>
            <div v-if="model.notice" class="model-card-notice"><AlertTriangle :size="13" />{{ model.notice }}</div>
            <div class="model-card-meta"><span><BrainCircuit :size="14" />{{ model.context || '非 Token 模型' }}</span><span><Zap :size="14" />{{ model.priceSummary }}</span></div>
            <footer><span>更新于 {{ model.updatedAt.slice(0,10) }}</span><button>查看详情<ChevronRight :size="13" /></button></footer>
          </article>
        </div>
        <div v-if="!loading && !failed && filtered.length" class="models-pagination"><span>共 {{ filtered.length }} 个模型 · 第 {{ page }}/{{ pageCount }} 页</span><div><button :disabled="page===1" aria-label="上一页" @click="goPage(page-1)"><ChevronLeft :size="16" /></button><button v-for="value in pageCount" :key="value" :class="{active:page===value}" @click="goPage(value)">{{ value }}</button><button :disabled="page===pageCount" aria-label="下一页" @click="goPage(page+1)"><ChevronRight :size="16" /></button></div></div>
      </section>
      <p class="models-footnote"><Info :size="13" />{{ guest ? '无需登录即可浏览模型能力与价格，登录后查看账户可用性。' : '目录中的可用状态不替代实际调用时的密钥、服务状态、流控和额度校验。' }}</p>
        </div>
      </div>
    </template>

    <template v-else-if="selected">
      <button class="models-back" @click="router.push('/models')"><ArrowLeft :size="15" />返回模型目录</button>
      <section class="model-detail-hero">
        <div class="model-detail-main"><span class="model-icon large" :class="selected.type.toLowerCase()"><component :is="typeIcons[selected.type]" :size="27" /></span><div><div class="model-detail-title"><h1>{{ selected.name }}</h1><span class="model-availability" :class="availabilityOf(selected).toLowerCase()">{{ availabilityLabel(availabilityOf(selected)) }}</span></div><p>{{ selected.summary }}</p><button class="model-code detail-code" @click="copyCode(selected)"><FileCode2 :size="13" />model: {{ selected.code }}<Check v-if="copied===selected.id" :size="13" /><Copy v-else :size="12" /></button></div></div>
        <div class="model-detail-actions"><RouterLink class="models-primary" :to="{path:'/help/docs',query:{modelId:selected.id,modelType:selected.type}}"><BookOpen :size="15" />查看接入文档</RouterLink><RouterLink v-if="!guest && availabilityOf(selected)==='AVAILABLE'" class="models-secondary" :to="{path:'/api-keys',query:{from:'models',modelId:selected.id}}"><KeyRound :size="15" />管理 API 密钥</RouterLink></div>
      </section>
      <div v-if="selected.notice" class="models-notice warning"><AlertTriangle :size="16" />{{ selected.notice }}<RouterLink v-if="selected.replacementId" :to="`/models/${selected.replacementId}`">查看替代模型<ArrowRight :size="12" /></RouterLink></div>
      <div class="model-detail-layout"><div class="model-detail-content">
        <section class="model-detail-section"><header><h2>能力概览</h2><span>{{ modelTypeLabels[selected.type] }}</span></header><div class="capability-grid"><article v-for="(label, code) in capabilityLabels" :key="code" :class="{supported:selected.capabilities.includes(code)}"><span><Check v-if="selected.capabilities.includes(code)" :size="15" /><XCircle v-else :size="15" /></span><div><strong>{{ label }}</strong><small>{{ selected.capabilities.includes(code) ? '平台已确认支持' : '当前未公开支持' }}</small></div></article></div></section>
        <section class="model-detail-section"><header><h2>规格与限制</h2><span>公开规格</span></header><dl class="model-specs"><div><dt>模型类型</dt><dd>{{ modelTypeLabels[selected.type] }}</dd></div><div><dt>最大上下文</dt><dd>{{ selected.context || '不适用' }}</dd></div><div><dt>最大输出</dt><dd>{{ selected.maxOutput || '不适用' }}</dd></div><div><dt>接口协议</dt><dd>{{ selected.protocols.map(protocolName).join('、') }}</dd></div></dl><div class="model-description"><p>{{ selected.description }}</p><ul><li v-for="item in selected.limitations" :key="item">{{ item }}</li></ul></div></section>
        <section class="model-detail-section"><header><h2>用户计价</h2><span>生效时间 2026-09-01 00:00</span></header><div class="pricing-grid"><article v-for="item in selected.prices" :key="item.name"><span>{{ item.name }}</span><strong>{{ item.amount }}</strong><small>{{ item.unit }}</small></article></div><p class="model-section-note"><Info :size="13" />目录价格用于说明当前公开计价口径，实际扣减以用量中心和额度账本为准。</p></section>
        <section class="model-detail-section"><header><h2>接口与使用</h2><span>统一平台接口</span></header><div class="protocol-list"><article v-for="protocol in selected.protocols" :key="protocol"><span><FileCode2 :size="16" /></span><div><strong>{{ protocolName(protocol) }}</strong><small>请求中的 model 字段填写 {{ selected.code }}</small></div><RouterLink :to="{path:'/help/docs',query:{modelId:selected.id,protocol}}">查看文档<ChevronRight :size="13" /></RouterLink></article></div></section>
      </div><aside class="model-detail-aside">
        <section v-if="guest"><h2>开始使用</h2><p>登录后查看账户可用模型、开通服务并管理 API 密钥。</p><RouterLink class="models-primary" to="/login">登录控制台</RouterLink></section><section v-else><h2>当前账户可用性</h2><div class="availability-summary" :class="availabilityOf(selected).toLowerCase()"><ShieldCheck v-if="availabilityOf(selected)==='AVAILABLE'" :size="20" /><AlertTriangle v-else :size="20" /><div><strong>{{ availabilityLabel(availabilityOf(selected)) }}</strong><p v-if="availabilityOf(selected)==='AVAILABLE'">当前身份至少有一个有效服务允许调用该模型。</p><p v-else-if="availabilityOf(selected)==='NOT_ENTITLED'">{{ isSub ? '当前子账户暂不可使用，请联系主账户管理员。' : '当前服务暂未覆盖该模型。' }}</p><p v-else-if="availabilityOf(selected)==='SERVICE_RESTRICTED'">{{ isSub ? '关联服务受限，请联系主账户管理员。' : '关联服务当前受限，请前往我的服务查看。' }}</p><p v-else>模型仍可使用，但已进入停止服务迁移期。</p></div></div><RouterLink v-if="!isSub && availabilityOf(selected)!=='AVAILABLE'" class="models-secondary block" :to="{path:'/services',query:{modelId:selected.id}}">查看我的服务</RouterLink></section>
        <section><h2>下一步</h2><RouterLink :to="{path:'/usage',query:{tab:'statistics',platformModelId:selected.id}}"><Zap :size="15" /><span><strong>查看该模型用量</strong><small>进入用量中心并自动筛选</small></span><ChevronRight :size="14" /></RouterLink><RouterLink to="/help/docs"><CircleHelp :size="15" /><span><strong>查看接入说明</strong><small>了解鉴权、限流与错误码</small></span><ChevronRight :size="14" /></RouterLink></section>
        <section class="model-update"><h2>公开信息</h2><dl><div><dt>模型标识</dt><dd>{{ selected.code }}</dd></div><div><dt>最近更新</dt><dd>{{ selected.updatedAt }}</dd></div><div><dt>数据截至</dt><dd>2026-09-28 18:30</dd></div></dl></section>
      </aside></div>
    </template>

    <div v-else-if="detailMissing" class="model-detail-missing"><Box :size="38" /><h1>未找到该模型</h1><p>该模型不存在、已下架或当前账户无权查看。</p><button class="models-primary" @click="router.replace('/models')">返回模型目录</button></div>
  </div>
</template>
