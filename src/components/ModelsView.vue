<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle, ArrowLeft, BookOpen, Bot, Box, Check, ChevronLeft, ChevronRight,
  Copy, FileCode2, Image, Info, Mic2, RefreshCw, Search, Sparkles, Video, XCircle,
} from 'lucide-vue-next'
import {
  capabilityLabels, catalogModels, modelStatusLabels, modelTypeLabels, protocolLabels,
  type CatalogModel, type ModelType,
} from '../data/models'
import './models.css'
import { modelDocEntry } from '../data/docs'

defineProps<{ isSub: boolean; guest?: boolean }>()
const route = useRoute()
const router = useRouter()
type Scenario = 'normal' | 'empty' | 'error'
const scenario = ref<Scenario>('normal')
const loading = ref(false)
const recovered = ref(false)
const copied = ref<'success' | 'error' | ''>('')
const page = ref(1)
const pageSize = 6
const keywordDraft = ref('')
const category = ref('')
const appliedKeyword = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined

const typeIcons: Record<ModelType, typeof Bot> = {
  TEXT_GENERATION: Bot, IMAGE_GENERATION: Image, VIDEO_GENERATION: Video, SPEECH_RECOGNITION: Mic2,
}
const selected = computed(() => typeof route.params.modelId === 'string' ? catalogModels.find(item => item.id === route.params.modelId) ?? null : null)
const isDetail = computed(() => typeof route.params.modelId === 'string')
const detailMissing = computed(() => isDetail.value && (!selected.value || selected.value.status === 'DELISTED'))
const failed = computed(() => scenario.value === 'error' && !recovered.value)
const filtered = computed(() => {
  if (scenario.value === 'empty') return []
  const query = appliedKeyword.value.trim().toLowerCase()
  return catalogModels.filter(model => (!query || `${model.name} ${model.code}`.toLowerCase().includes(query)) && (!category.value || model.type === category.value))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageModels = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const hasFilters = computed(() => Boolean(appliedKeyword.value || category.value))

function updateUrl() {
  const query: Record<string, string> = {}
  if (appliedKeyword.value) query.keyword = appliedKeyword.value
  if (category.value) query.category = category.value
  if (page.value > 1) query.page = String(page.value)
  router.replace({ path: '/models', query })
}
function startLoading() {
  loading.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { loading.value = false }, 320)
}
function search() {
  appliedKeyword.value = keywordDraft.value.trim()
  keywordDraft.value = appliedKeyword.value
  page.value = 1
  startLoading()
  updateUrl()
}
function changeCategory() {
  page.value = 1
  startLoading()
  updateUrl()
}
function reset() {
  keywordDraft.value = ''
  appliedKeyword.value = ''
  category.value = ''
  page.value = 1
  recovered.value = false
  updateUrl()
}
function retry() {
  recovered.value = true
  startLoading()
}
function goPage(value: number) {
  page.value = Math.max(1, Math.min(pageCount.value, value))
  updateUrl()
}
async function copyCode(model: CatalogModel) {
  clearTimeout(toastTimer)
  try {
    if (!navigator.clipboard) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(model.code)
    copied.value = 'success'
  } catch {
    copied.value = 'error'
  }
  toastTimer = setTimeout(() => { copied.value = '' }, 2200)
}
function openModel(model: CatalogModel) {
  if (model.status !== 'DELISTED') router.push(`/models/${model.id}`)
}
function initializeFromRoute() {
  keywordDraft.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  appliedKeyword.value = keywordDraft.value.trim()
  category.value = typeof route.query.category === 'string' ? route.query.category : ''
  page.value = Math.max(1, Number(route.query.page) || 1)
}

watch(() => route.fullPath, () => { if (!isDetail.value) initializeFromRoute() })
watch(scenario, () => { recovered.value = false; page.value = 1 })
watch(pageCount, count => { if (page.value > count) page.value = count })
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(toastTimer) })
initializeFromRoute()
</script>

<template>
  <div class="models-view">
    <template v-if="!isDetail">
      <div class="models-heading">
        <div><h1>模型目录</h1><p>查看 TokenHub 当前开放的模型</p></div>
      </div>
      <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="页面场景"><option value="normal">正常使用</option><option value="empty">平台暂无模型</option><option value="error">目录加载失败</option></select></label></div>

      <section class="models-filter-card" aria-label="搜索和筛选模型">
        <form class="catalog-search-row" @submit.prevent="search">
          <div class="models-search"><Search :size="17" /><input v-model="keywordDraft" maxlength="100" placeholder="输入模型名称或 model 标识" aria-label="输入模型名称或 model 标识" /><button type="submit">搜索</button></div>
          <label class="category-filter"><span>模型类别</span><select v-model="category" @change="changeCategory"><option value="">全部</option><option v-for="(label, value) in modelTypeLabels" :key="value" :value="value">{{ label }}</option></select></label>
          <button v-if="hasFilters" type="button" class="filter-clear" @click="reset">清空条件</button>
        </form>
      </section>

      <section class="models-results" aria-live="polite">
        <header><h2>共 {{ failed ? '—' : filtered.length }} 个模型</h2></header>
        <div v-if="loading" class="model-grid skeleton-grid" aria-label="正在加载模型">
          <article v-for="item in 6" :key="item" class="model-skeleton"><i /><i /><i /><div><i /><i /><i /></div><i /></article>
        </div>
        <div v-else-if="failed" class="models-state"><XCircle :size="31" /><strong>模型目录加载失败</strong><p>暂时无法获取模型数据，请稍后重试。</p><button class="models-secondary" @click="retry"><RefreshCw :size="14" />重新加载</button></div>
        <div v-else-if="!pageModels.length" class="models-state"><Box :size="33" /><strong>{{ scenario === 'empty' ? '暂无可用模型' : '未找到符合条件的模型' }}</strong><p>{{ scenario === 'empty' ? '模型开放后会显示在这里。' : '请更换关键词或清空当前筛选。' }}</p><button v-if="scenario !== 'empty'" class="models-secondary" @click="reset">清空筛选</button></div>
        <div v-else class="model-grid">
          <article v-for="model in pageModels" :key="model.id" class="model-card" :class="{ delisted: model.status === 'DELISTED' }" :tabindex="model.status === 'DELISTED' ? -1 : 0" @click="openModel(model)" @keydown.enter="openModel(model)">
            <div class="model-card-top"><span class="model-icon" :class="model.type.toLowerCase()"><component :is="typeIcons[model.type]" :size="21" /></span><div><h3 :title="model.name">{{ model.name }}</h3><code :title="model.code">{{ model.code }}</code></div><span class="model-status" :class="model.status.toLowerCase()">{{ modelStatusLabels[model.status] }}</span></div>
            <p class="model-summary" :title="model.summary">{{ model.summary }}</p>
            <div class="model-tags"><span class="model-type-tag">{{ modelTypeLabels[model.type] }}</span><span v-for="capability in model.capabilities" :key="capability">{{ capabilityLabels[capability] }}</span></div>
            <div class="model-price"><span>{{ model.pricingType === 'MULTIPLIER' ? '定价方式' : '用户价格' }}</span><strong>{{ model.priceSummary }}</strong></div>
          </article>
        </div>
        <div v-if="!loading && !failed && filtered.length" class="models-pagination"><span>第 {{ page }} / {{ pageCount }} 页</span><div><button :disabled="page === 1" @click="goPage(page - 1)"><ChevronLeft :size="15" />上一页</button><button :disabled="page === pageCount" @click="goPage(page + 1)">下一页<ChevronRight :size="15" /></button></div></div>
      </section>
    </template>

    <template v-else-if="selected && !detailMissing">
      <nav class="model-breadcrumb" aria-label="面包屑"><button @click="router.push('/models')">模型目录</button><ChevronRight :size="14" /><span>{{ selected.name }}</span></nav>
      <section class="model-detail-hero">
        <div class="model-detail-main"><span class="model-icon large" :class="selected.type.toLowerCase()"><component :is="typeIcons[selected.type]" :size="27" /></span><div><div class="model-detail-title"><h1>{{ selected.name }}</h1><span class="model-status" :class="selected.status.toLowerCase()">{{ modelStatusLabels[selected.status] }}</span></div><p>{{ selected.summary }}</p><button class="detail-code" @click="copyCode(selected)"><code>model: {{ selected.code }}</code><Check v-if="copied === 'success'" :size="14" /><Copy v-else :size="14" /></button></div></div>
      </section>
      <div v-if="selected.status === 'MAINTENANCE'" class="models-notice warning"><AlertTriangle :size="16" />{{ selected.notice }}</div>

      <div class="model-detail-content">
        <section class="model-detail-section"><header><span>一</span><h2>模型基础信息</h2></header><dl class="detail-list"><div><dt>模型名称</dt><dd>{{ selected.name }}</dd></div><div><dt>模型类别</dt><dd>{{ modelTypeLabels[selected.type] }}</dd></div><div><dt>模型标识 model</dt><dd><code>{{ selected.code }}</code><button @click="copyCode(selected)"><Copy :size="13" />复制</button></dd></div><div><dt>模型状态</dt><dd>{{ modelStatusLabels[selected.status] }}</dd></div><div class="wide"><dt>模型描述</dt><dd>{{ selected.description }}</dd></div></dl></section>
        <section class="model-detail-section"><header><span>二</span><h2>模型性能信息</h2></header><div class="performance-grid"><article><span>上下文长度</span><strong>{{ selected.context || '暂未提供' }}</strong></article><article><span>最大输出长度</span><strong>{{ selected.maxOutput || '暂未提供' }}</strong></article><article><span>知识截止时间</span><strong>{{ selected.knowledgeCutoff || '暂未提供' }}</strong></article></div></section>
        <section class="model-detail-section"><header><span>三</span><h2>支持的能力</h2></header><div v-if="selected.capabilities.length" class="detail-capabilities"><span v-for="capability in selected.capabilities" :key="capability"><Check :size="14" />{{ capabilityLabels[capability] }}</span></div><p v-else class="missing-copy">暂未提供</p><p class="model-section-note"><Info :size="13" />具体请求参数请以接入文档为准。</p></section>
        <section class="model-detail-section"><header><span>四</span><h2>价格信息</h2><small>生效时间：{{ selected.effectiveAt }}</small></header><dl class="pricing-mode"><div><dt>计价方式</dt><dd>{{ selected.pricingType === 'UNIT_PRICE' ? '直接单价' : '定价倍率' }}</dd></div><div><dt>提供商</dt><dd>{{ selected.manufacturer }}</dd></div><div v-if="selected.pricingType === 'MULTIPLIER'"><dt>倍率基准</dt><dd>{{ selected.multiplierBase }}</dd></div></dl><div class="pricing-grid"><article v-for="item in selected.prices" :key="item.name"><span>{{ item.name }}</span><strong>{{ item.amount }}</strong><small v-if="item.unit">{{ item.unit }}</small></article></div><p class="model-section-note"><Info :size="13" />页面展示的是用户价格，实际费用以用量中心和计费记录为准。</p></section>
        <section class="model-detail-section"><header><span>五</span><h2>接口信息</h2><RouterLink class="models-primary" :to="modelDocEntry(selected.id)"><BookOpen :size="15" />查看接入文档</RouterLink></header><div class="protocol-list"><article v-for="protocol in selected.protocols" :key="protocol"><span><FileCode2 :size="16" /></span><div><strong>{{ protocolLabels[protocol] }}</strong><small>调用时 model 填写 {{ selected.code }}</small></div></article></div></section>
      </div>
      <div v-if="copied" class="copy-toast" :class="{ error: copied === 'error' }" role="status">{{ copied === 'success' ? '模型标识已复制' : '复制失败，请手动复制模型标识' }}</div>
    </template>

    <div v-else-if="detailMissing" class="model-detail-missing"><Box :size="38" /><h1>模型不存在或已下架</h1><p>该模型当前无法查看，请返回模型目录选择其他模型。</p><button class="models-primary" @click="router.replace('/models')"><ArrowLeft :size="15" />返回模型目录</button></div>
  </div>
</template>
