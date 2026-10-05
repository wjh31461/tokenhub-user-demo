<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Bot, Check, ChevronRight, Copy, FileText, Hash, KeyRound, Menu, Search, ShieldCheck, Sparkles, X, RefreshCw } from 'lucide-vue-next'
import { docsCategories, kindLabels, publishedDocs, modelDocRelations, modelDocEntry, type DocArticle, type DocSection } from '../data/docs'
import { catalogModels } from '../data/models'
import './docs.css'
const route = useRoute(), router = useRouter()
const searchDraft = ref(''), validation = ref(''), navOpen = ref(false), copied = ref(''), copyError = ref(''), activeSection = ref('')
const selectedLanguages = ref<Record<string, string>>({}), scenario = ref('normal'), loading = ref(false), failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined, copyTimer: ReturnType<typeof setTimeout> | undefined
const slug = computed(() => typeof route.params.articleSlug === 'string' ? route.params.articleSlug : '')
const articles = computed(() => scenario.value === 'empty' ? [] : publishedDocs)
const categories = computed(() => docsCategories.filter(category => articles.value.some(article => article.category === category.key)))
const selected = computed(() => scenario.value === 'offline' ? null : articles.value.find(article => article.slug === slug.value) ?? null)
const isSearch = computed(() => route.path === '/docs/search'), isHome = computed(() => route.path === '/docs')
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.trim().slice(0, 100) : '')
const searchPage = computed(() => Math.max(1, Number.parseInt(String(route.query.page || '1'), 10) || 1))
const categoryArticles = (key: string) => articles.value.filter(article => article.category === key)
const categoryTitle = (key: string) => docsCategories.find(category => category.key === key)?.title ?? '文档'
function searchable(article: DocArticle) {
  return [article.title, article.summary, ...article.tags, ...article.sections.flatMap(section => [section.title, ...(section.paragraphs ?? []), ...(section.bullets ?? []), ...(section.steps ?? []), section.note?.text ?? '', ...(section.examples ?? []).map(example => example.code), ...(section.table?.headers ?? []), ...(section.table?.rows.flat() ?? [])])].join(' ')
}
function excerpt(article: DocArticle) {
  const text = searchable(article), index = text.toLocaleLowerCase().indexOf(query.value.toLocaleLowerCase())
  return index < 0 ? article.summary : `${index > 35 ? '…' : ''}${text.slice(Math.max(0, index - 35), index + 100)}…`
}
const results = computed(() => query.value ? articles.value.filter(article => searchable(article).toLocaleLowerCase().includes(query.value.toLocaleLowerCase())) : [])
const searchPages = computed(() => Math.max(1, Math.ceil(results.value.length / 20)))
const displayedPage = computed(() => Math.min(searchPage.value, searchPages.value))
const pageResults = computed(() => results.value.slice((displayedPage.value - 1) * 20, displayedPage.value * 20))
const siblings = computed(() => selected.value ? categoryArticles(selected.value.category) : [])
const articleIndex = computed(() => siblings.value.findIndex(article => article.slug === slug.value))
const previous = computed(() => siblings.value[articleIndex.value - 1]), next = computed(() => siblings.value[articleIndex.value + 1])
const currentModel = computed(() => {
  const relation = modelDocRelations.find(item => item.modelId === route.query.modelId && item.slug === selected.value?.slug)
  return relation ? catalogModels.find(model => model.id === relation.modelId && model.status !== 'DELISTED') : undefined
})
const activeCategory = computed(() => categories.value.find(category => category.key === route.query.category))
const missingModelDoc = computed(() => route.query.notice === 'model-doc-missing')
const categoryIcon = (key: string) => key === 'general' ? BookOpen : Sparkles
const returnSearch = computed(() => typeof route.query.fromQ === 'string' ? { path: '/docs/search', query: { q: route.query.fromQ, page: String(route.query.fromPage || '1') } } : null)
function articleLocation(article: DocArticle) {
  const searchContext = isSearch.value ? { fromQ: query.value, fromPage: String(displayedPage.value) } : typeof route.query.fromQ === 'string' ? { fromQ: route.query.fromQ, fromPage: String(route.query.fromPage || '1') } : {}
  return { path: `/docs/articles/${article.slug}`, query: searchContext }
}
function openArticle(article: DocArticle) { navOpen.value = false; router.push(articleLocation(article)) }
function openCategory(key: string) { navOpen.value = false; router.push({ path: '/docs', query: { category: key } }) }
function submitSearch() {
  const q = searchDraft.value.trim().slice(0, 100)
  if (!q) { validation.value = '请输入关键词'; return }
  validation.value = ''; navOpen.value = false; router.push({ path: '/docs/search', query: { q, page: '1' } })
}
function pageSearch(delta: number) { router.push({ path: '/docs/search', query: { q: query.value, page: String(displayedPage.value + delta) } }) }
function load(retry = false) { clearTimeout(timer); loading.value = true; failed.value = false; timer = setTimeout(() => { loading.value = false; failed.value = scenario.value === 'error' && !retry; locate() }, 200) }
async function locate() {
  await nextTick()
  const id = route.hash.slice(1)
  if (selected.value?.sections.some(section => section.id === id)) { activeSection.value = id; document.getElementById(`docs-${id}`)?.scrollIntoView({ block: 'start' }) }
}
function jump(id: string) { activeSection.value = id; router.push({ path: route.path, query: route.query, hash: `#${id}` }) }
function languageFor(section: DocSection) { return selectedLanguages.value[section.id] ?? section.examples?.[0]?.language ?? '' }
function currentCode(section: DocSection) { return section.examples?.find(example => example.language === languageFor(section))?.code ?? '' }
async function copyCode(section: DocSection) {
  const key = `${selected.value?.slug}-${section.id}`
  try { if (!navigator.clipboard) throw new Error('unavailable'); await navigator.clipboard.writeText(currentCode(section)); copied.value = key; copyError.value = '' }
  catch { copied.value = ''; copyError.value = key }
  clearTimeout(copyTimer); copyTimer = setTimeout(() => { copied.value = ''; copyError.value = '' }, 3000)
}
function ticketLocation(article: DocArticle) { return { path: '/help/tickets/new', query: { sourceType: 'DOC', sourceId: article.slug } } }
watch(() => route.fullPath, async (value, old) => {
  const legacyModel = typeof route.query.model === 'string' ? catalogModels.find(model => model.code === route.query.model) : undefined
  if (isHome.value && legacyModel) { router.replace(modelDocEntry(legacyModel.id)); return }
  searchDraft.value = query.value; validation.value = ''; navOpen.value = false
  if (value.split('#')[0] === old?.split('#')[0]) { locate(); return }
  selectedLanguages.value = {}; copied.value = ''; copyError.value = ''; activeSection.value = selected.value?.sections[0]?.id ?? ''
  await nextTick(); document.querySelector<HTMLElement>('.workspace main')?.scrollTo({ top: 0 }); load()
}, { immediate: true })
watch(scenario, () => load())
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(copyTimer) })
</script>

<template>
  <div class="docs-view">
    <div class="docs-page-head"><div><div class="docs-mobile-line"><button aria-label="打开文档目录" :aria-expanded="navOpen" @click="navOpen = !navOpen"><Menu :size="18" /></button><span>文档分类目录</span></div><h1>接入文档</h1><p>查找 API 访问、流控、错误码与按能力分类的接口说明。</p></div></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="文档页面场景"><option value="normal">正常文档</option><option value="empty">文档准备中</option><option value="error">加载失败</option><option value="offline">文章不可查看</option><option value="forbidden">无访问权限</option></select></label></div>
    <p class="docs-demo-note">演示内容：接口地址、参数、响应、错误码及 Agent 配置尚待接口团队提供并验证。</p>
    <div class="docs-shell" :class="{ article: selected && !isHome && !isSearch }">
      <button v-if="navOpen" class="docs-nav-shade" aria-label="关闭文档目录" @click="navOpen = false" />
      <aside class="docs-nav" :class="{ open: navOpen }" @keydown.esc="navOpen = false"><div class="docs-nav-mobile"><strong>文档目录</strong><button aria-label="关闭文档目录" @click="navOpen = false"><X :size="17" /></button></div><RouterLink to="/docs" class="docs-home-link" :class="{ active: isHome && !activeCategory }"><BookOpen :size="16" />文档首页</RouterLink><nav v-if="scenario !== 'forbidden'" aria-label="接入文档分类目录"><section v-for="category in categories" :key="category.key"><button class="docs-category-title" :aria-expanded="true" @click="openCategory(category.key)"><component :is="categoryIcon(category.key)" :size="15" /><span>{{ category.title }}</span></button><button v-for="article in categoryArticles(category.key)" :key="article.slug" :class="{ active: selected?.slug === article.slug }" :aria-current="selected?.slug === article.slug ? 'page' : undefined" @click="openArticle(article)">{{ article.title }}</button></section></nav></aside>
      <section class="docs-content">
        <form class="docs-search-large docs-global-search" @submit.prevent="submitSearch"><Search :size="17" /><input v-model="searchDraft" maxlength="100" placeholder="搜索文档、参数或错误码" aria-label="搜索接入文档"><button>搜索</button></form><p v-if="validation" role="alert" class="docs-search-validation">{{ validation }}</p>
        <section v-if="loading" class="docs-missing" role="status"><RefreshCw :size="28" class="spinning" /><h2>正在加载文档</h2></section>
        <section v-else-if="scenario === 'forbidden'" class="docs-missing"><ShieldCheck :size="28" /><h2>暂无访问权限</h2></section>
        <section v-else-if="failed" class="docs-missing" role="alert"><AlertCircle :size="28" /><h2>文档加载失败，请重试</h2><button @click="load(true)">重试</button></section>
        <template v-else-if="isHome"><p v-if="missingModelDoc" class="docs-model-notice" role="status">该模型暂无专属接入文档{{ activeCategory ? '，可阅读以下能力文档。' : '，请从文档首页选择其他说明。' }}</p><section v-if="!articles.length" class="docs-missing"><BookOpen :size="28" /><h2>接入文档正在准备中</h2></section><template v-else-if="activeCategory"><section class="docs-home-section"><div class="docs-section-heading"><h2>{{ activeCategory.title }}</h2><RouterLink to="/docs">返回文档首页</RouterLink></div><div class="popular-grid"><button v-for="article in categoryArticles(activeCategory.key)" :key="article.slug" @click="openArticle(article)"><FileText :size="18" /><div><strong>{{ article.title }}</strong><small>{{ article.summary }}</small></div><ChevronRight :size="16" /></button></div></section></template><template v-else>
          <section class="docs-hero"><h2>开始接入 TokenHub</h2><p>准备服务 → 创建密钥 → 调用模型 → 查看用量</p></section>
          <section class="docs-home-section"><div class="docs-section-heading"><h2>快速开始</h2><button @click="openArticle(articles.find(article => article.slug === 'quickstart')!)">查看完整引导<ArrowRight :size="14" /></button></div><div class="quickstart-grid"><RouterLink to="/services"><span>01</span><ShieldCheck :size="19" /><strong>准备服务</strong><small>确认服务状态和可用额度</small></RouterLink><RouterLink to="/services?section=keys&action=create"><span>02</span><KeyRound :size="19" /><strong>创建密钥</strong><small>前往我的服务中的密钥管理</small></RouterLink><RouterLink to="/models"><span>03</span><Sparkles :size="19" /><strong>调用模型</strong><small>选择模型并阅读关联接口说明</small></RouterLink><RouterLink to="/usage"><span>04</span><BookOpen :size="19" /><strong>查看用量</strong><small>核对调用结果与消耗记录</small></RouterLink></div></section>
          <section class="docs-home-section"><div class="docs-section-heading"><h2>通用文档</h2></div><div class="popular-grid"><button v-for="article in categoryArticles('general').filter(article => article.kind !== 'QUICKSTART')" :key="article.slug" @click="openArticle(article)"><component :is="article.kind === 'INTEGRATION' ? Bot : BookOpen" :size="18" /><div><strong>{{ article.title }}</strong><small>{{ article.summary }}</small></div><ChevronRight :size="16" /></button></div></section>
          <section class="docs-home-section"><div class="docs-section-heading"><h2>按能力查看</h2></div><div class="category-grid"><article v-for="category in categories.filter(item => item.type === 'CAPABILITY')" :key="category.key"><span><Sparkles :size="20" /></span><div><h3>{{ category.title }}</h3><p>{{ category.description }}</p><button @click="openCategory(category.key)">查看 {{ categoryArticles(category.key).length }} 篇文档<ArrowRight :size="13" /></button></div></article></div></section>
        </template></template>
        <section v-else-if="isSearch" class="docs-search-page"><RouterLink class="docs-back" to="/docs"><ArrowLeft :size="15" />返回文档首页</RouterLink><h2>搜索结果</h2><p v-if="query">“{{ query }}”共找到 {{ results.length }} 篇相关文档</p><p v-else>请输入关键词</p><div v-if="pageResults.length" class="docs-search-results"><button v-for="article in pageResults" :key="article.slug" @click="openArticle(article)"><span>{{ categoryTitle(article.category) }}</span><h3>{{ article.title }}</h3><p>{{ excerpt(article) }}</p><small>更新于 {{ article.updatedAt }}</small><ArrowRight :size="17" /></button></div><div v-else-if="query" class="docs-search-empty"><Search :size="28" /><strong>没有找到相关文档，请更换关键词</strong></div><div v-if="results.length" class="docs-search-pagination"><span>每页 20 条</span><button :disabled="displayedPage === 1" @click="pageSearch(-1)">上一页</button><span>{{ displayedPage }} / {{ searchPages }}</span><button :disabled="displayedPage === searchPages" @click="pageSearch(1)">下一页</button></div></section>
        <article v-else-if="selected" class="docs-article"><RouterLink v-if="returnSearch" class="docs-back" :to="returnSearch"><ArrowLeft :size="15" />返回搜索结果</RouterLink><div class="docs-breadcrumb"><RouterLink to="/docs">接入文档</RouterLink><ChevronRight :size="13" /><span>{{ categoryTitle(selected.category) }}</span></div><header><span class="docs-kind">{{ kindLabels[selected.kind] }}</span><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p><div class="docs-meta"><span>更新于 {{ selected.updatedAt }}</span><span v-if="currentModel">当前模型：{{ currentModel.name }}</span></div></header>
          <section v-for="section in selected.sections" :id="`docs-${section.id}`" :key="section.id" class="docs-article-section"><h3><a :href="`#${section.id}`" :aria-label="`定位到${section.title}`" @click.prevent="jump(section.id)"><Hash :size="16" /></a>{{ section.title }}</h3><p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p><ul v-if="section.bullets"><li v-for="item in section.bullets" :key="item">{{ item }}</li></ul><ol v-if="section.steps" class="docs-steps"><li v-for="(item, index) in section.steps" :key="item"><span>{{ index + 1 }}</span><p>{{ item }}</p></li></ol><div v-if="section.note" class="docs-note" :class="section.note.tone"><AlertCircle :size="19" /><div><strong>{{ section.note.title }}</strong><p>{{ section.note.text }}</p></div></div><div v-if="section.table" class="docs-table-wrap"><table><thead><tr><th v-for="header in section.table.headers" :key="header">{{ header }}</th></tr></thead><tbody><tr v-for="(row, index) in section.table.rows" :key="index"><td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td></tr></tbody></table></div><div v-if="section.examples?.length" class="docs-code"><div class="docs-code-head"><div><button v-for="example in section.examples" :key="example.language" :class="{ active: languageFor(section) === example.language }" @click="selectedLanguages[section.id] = example.language">{{ example.language }}</button></div><button class="copy-code" @click="copyCode(section)"><Check v-if="copied === `${selected.slug}-${section.id}`" :size="14" /><Copy v-else :size="14" />{{ copied === `${selected.slug}-${section.id}` ? '已复制' : '复制示例' }}</button></div><pre><code>{{ currentCode(section) }}</code></pre></div><p v-if="copyError === `${selected.slug}-${section.id}`" class="docs-copy-error" role="status">复制失败，请手动选中复制</p><p v-if="copied === `${selected.slug}-${section.id}`" class="docs-copy-status" role="status">已复制</p><div class="docs-related-links"><RouterLink v-for="link in section.links" :key="link.path" :to="link.path">{{ link.label }}<ArrowRight :size="13" /></RouterLink></div></section>
          <nav class="docs-prev-next" aria-label="同一分类相邻文章"><button v-if="previous" @click="openArticle(previous)"><ArrowLeft :size="15" /><span><small>上一篇</small><strong>{{ previous.title }}</strong></span></button><span v-else /><button v-if="next" class="next" @click="openArticle(next)"><span><small>下一篇</small><strong>{{ next.title }}</strong></span><ArrowRight :size="15" /></button></nav><section class="docs-next-actions"><div><strong>遇到问题？</strong><p>带入文章标题和链接，您可自行补充问题。</p></div><RouterLink :to="ticketLocation(selected)">工单反馈<ArrowRight :size="14" /></RouterLink></section>
        </article>
        <section v-else class="docs-missing"><FileText :size="31" /><h2>该文档暂不可查看</h2><p>文章可能不存在或已下线。</p><RouterLink to="/docs">返回文档首页</RouterLink></section>
      </section>
      <aside v-if="selected && !isHome && !isSearch && !loading && !failed && scenario !== 'forbidden'" class="docs-toc"><strong>本页目录</strong><button v-for="section in selected.sections" :key="section.id" :class="{ active: activeSection === section.id }" @click="jump(section.id)">{{ section.title }}</button></aside>
    </div>
  </div>
</template>
