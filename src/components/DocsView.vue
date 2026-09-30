<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, Bot, Braces, Check, ChevronDown,
  ChevronRight, CircleHelp, Clipboard, Clock3, Code2, Copy, ExternalLink, FileCode2,
  FileText, Gauge, Hash, KeyRound, Menu, MessageSquareText, Search, ShieldCheck,
  Sparkles, TerminalSquare, X,
} from 'lucide-vue-next'
import { docArticles, docsCategories, kindLabels, type DocArticle, type DocSection } from '../data/docs'
import './docs.css'

const props = defineProps<{ isSub: boolean; guest?: boolean }>()
const route = useRoute()
const router = useRouter()
const searchDraft = ref('')
const navOpen = ref(false)
const copied = ref('')
const activeSection = ref('')
const selectedLanguages = ref<Record<string, string>>({})
const version = ref('v1 当前版本')
let copyTimer: ReturnType<typeof setTimeout> | undefined

const slug = computed(() => typeof route.params.articleSlug === 'string' ? route.params.articleSlug : '')
const selected = computed(() => docArticles.find(article => article.slug === slug.value) ?? null)
const isSearch = computed(() => route.path === '/help/docs/search')
const isHome = computed(() => route.path === '/help/docs' && !isSearch.value)
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const searchResults = computed(() => {
  const keyword = query.value.toLocaleLowerCase()
  if (!keyword) return []
  return docArticles.filter(article => [article.title, article.summary, ...article.tags, ...article.sections.flatMap(section => [section.title, ...(section.paragraphs ?? []), ...(section.bullets ?? [])])].join(' ').toLocaleLowerCase().includes(keyword))
})
const categoryArticles = (key: string) => docArticles.filter(article => article.category === key)
const categoryTitle = (key: string) => docsCategories.find(category => category.key === key)?.title ?? '文档'
const articleIndex = computed(() => selected.value ? docArticles.findIndex(article => article.slug === selected.value?.slug) : -1)
const previous = computed(() => articleIndex.value > 0 ? docArticles[articleIndex.value - 1] : null)
const next = computed(() => articleIndex.value >= 0 && articleIndex.value < docArticles.length - 1 ? docArticles[articleIndex.value + 1] : null)
const popular = ['guides/authentication', 'api/text-openai', 'guides/streaming', 'guides/errors', 'agents/claude-code'].map(slugValue => docArticles.find(article => article.slug === slugValue)!)
const categoryIcon = (key: string) => ({ quickstart: Sparkles, guides: BookOpen, api: Braces, agents: Bot, faq: CircleHelp }[key] ?? FileText)

function openArticle(article: DocArticle) {
  navOpen.value = false
  router.push(`/help/docs/${article.slug}`)
}

function submitSearch() {
  const nextQuery = searchDraft.value.trim().slice(0, 100)
  if (!nextQuery) return
  navOpen.value = false
  router.push({ path: '/help/docs/search', query: { q: nextQuery } })
}

function clearSearch() {
  searchDraft.value = ''
  router.push('/help/docs')
}

function jump(id: string) {
  activeSection.value = id
  nextTick(() => document.getElementById(`docs-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  if (selected.value) router.replace({ path: `/help/docs/${selected.value.slug}`, hash: `#${id}` })
}

function languageFor(section: DocSection) {
  return selectedLanguages.value[section.id] ?? section.examples?.[0]?.language ?? ''
}

function chooseLanguage(sectionId: string, language: string) {
  selectedLanguages.value = { ...selectedLanguages.value, [sectionId]: language }
}

function currentCode(section: DocSection) {
  const language = languageFor(section)
  return section.examples?.find(example => example.language === language)?.code ?? ''
}

async function copyCode(section: DocSection) {
  const key = `${selected.value?.slug}-${section.id}`
  await navigator.clipboard?.writeText(currentCode(section))
  copied.value = key
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { if (copied.value === key) copied.value = '' }, 1800)
}

function onVersionChange() {
  if (version.value.startsWith('v0.9')) router.replace({ query: { ...route.query, version: 'v0.9' } })
  else {
    const nextQuery = { ...route.query }
    delete nextQuery.version
    router.replace({ query: nextQuery })
  }
}

watch(() => route.fullPath, async () => {
  searchDraft.value = query.value
  version.value = route.query.version === 'v0.9' ? 'v0.9 历史版本' : 'v1 当前版本'
  navOpen.value = false
  selectedLanguages.value = {}
  activeSection.value = selected.value?.sections[0]?.id ?? ''
  await nextTick()
  if (route.hash) jump(route.hash.slice(1))
  else document.querySelector<HTMLElement>('.workspace main')?.scrollTo({ top: 0 })
}, { immediate: true })

watch(() => props.isSub, () => { navOpen.value = false })
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div class="docs-view">
    <div class="docs-page-head">
      <div>
        <div class="docs-mobile-line"><button aria-label="打开文档目录" @click="navOpen = true"><Menu :size="18" /></button><span>开发者文档</span></div>
        <h1>接入文档</h1>
        <p>从首次调用到 Agent 接入，查找 TokenHub 公开 API 的使用方式。</p>
      </div>
      <label class="docs-version">文档版本<select v-model="version" @change="onVersionChange"><option>v1 当前版本</option><option>v0.9 历史版本</option></select></label>
    </div>

    <div v-if="route.query.version === 'v0.9'" class="docs-history-banner"><AlertCircle :size="17" /><span>正在查看历史版本。配置和示例可能不适用于当前接口。</span><button @click="version = 'v1 当前版本'; onVersionChange()">返回当前版本</button></div>

    <div class="docs-shell">
      <button v-if="navOpen" class="docs-nav-shade" aria-label="关闭文档目录" @click="navOpen = false" />
      <aside class="docs-nav" :class="{ open: navOpen }">
        <div class="docs-nav-mobile"><strong>文档目录</strong><button aria-label="关闭文档目录" @click="navOpen = false"><X :size="17" /></button></div>
        <form class="docs-nav-search" @submit.prevent="submitSearch"><Search :size="15" /><input v-model="searchDraft" maxlength="100" placeholder="搜索文档、错误码或参数" aria-label="搜索接入文档" /><button v-if="searchDraft" type="button" aria-label="清空搜索" @click="searchDraft = ''"><X :size="13" /></button></form>
        <RouterLink to="/help/docs" class="docs-home-link" :class="{ active: isHome }"><BookOpen :size="16" />文档首页</RouterLink>
        <nav aria-label="接入文档目录">
          <section v-for="category in docsCategories" :key="category.key">
            <div class="docs-category-title"><component :is="categoryIcon(category.key)" :size="15" /><span>{{ category.title }}</span></div>
            <button v-for="article in categoryArticles(category.key)" :key="article.slug" :class="{ active: selected?.slug === article.slug }" @click="openArticle(article)">{{ article.title }}</button>
          </section>
        </nav>
        <div class="docs-nav-help"><MessageSquareText :size="16" /><div><strong>仍未解决？</strong><RouterLink to="/help/tickets/new?sourceType=DOC&sourceId=quick-start">提交工单<ArrowRight :size="12" /></RouterLink></div></div>
      </aside>

      <section class="docs-content">
        <template v-if="isHome">
          <section class="docs-hero">
            <span class="docs-hero-icon"><Code2 :size="24" /></span>
            <h2>开始接入 TokenHub</h2>
            <p>统一调用多种模型，只需准备服务、API 密钥和公开 model 标识。</p>
            <form class="docs-hero-search" @submit.prevent="submitSearch"><Search :size="18" /><input v-model="searchDraft" maxlength="100" placeholder="搜索 API、错误码、model 参数或 Claude Code" /><kbd>Enter</kbd></form>
          </section>

          <section class="docs-home-section"><div class="docs-section-heading"><div><span>QUICK START</span><h2>四步完成首次调用</h2></div><button @click="openArticle(docArticles.find(item => item.slug === 'quickstart/first-request')!)">查看完整教程<ArrowRight :size="14" /></button></div>
            <div class="quickstart-grid">
              <RouterLink to="/services"><span>01</span><KeyRound :size="19" /><strong>确认服务</strong><small>确认 Token 服务与额度可用</small></RouterLink>
              <RouterLink to="/api-keys?action=create"><span>02</span><ShieldCheck :size="19" /><strong>创建密钥</strong><small>为调用应用创建独立凭证</small></RouterLink>
              <RouterLink to="/models"><span>03</span><Sparkles :size="19" /><strong>选择模型</strong><small>复制平台公开 model 标识</small></RouterLink>
              <button @click="openArticle(docArticles.find(item => item.slug === 'quickstart/first-request')!)"><span>04</span><TerminalSquare :size="19" /><strong>发起请求</strong><small>复制示例并核对调用结果</small></button>
            </div>
          </section>

          <section class="docs-home-section"><div class="docs-section-heading"><div><span>POPULAR</span><h2>常用文档</h2></div></div><div class="popular-grid"><button v-for="article in popular" :key="article.slug" @click="openArticle(article)"><span class="popular-icon"><component :is="article.kind === 'API_REFERENCE' ? FileCode2 : article.kind === 'INTEGRATION' ? Bot : article.slug.includes('errors') ? AlertCircle : BookOpen" :size="18" /></span><div><strong>{{ article.title }}</strong><small>{{ article.summary }}</small></div><ChevronRight :size="16" /></button></div></section>

          <section class="docs-home-section"><div class="docs-section-heading"><div><span>EXPLORE</span><h2>按主题浏览</h2></div></div><div class="category-grid"><article v-for="category in docsCategories" :key="category.key"><span><component :is="categoryIcon(category.key)" :size="20" /></span><div><h3>{{ category.title }}</h3><p>{{ category.description }}</p><button @click="openArticle(categoryArticles(category.key)[0]!)">查看 {{ categoryArticles(category.key).length }} 篇文档<ArrowRight :size="13" /></button></div></article></div></section>

          <section class="docs-safety-note"><ShieldCheck :size="21" /><div><strong>示例不会读取您的真实密钥</strong><p>所有代码都使用环境变量和占位地址。正式 Base URL、鉴权方式及模型范围以平台发布配置为准。</p></div></section>
        </template>

        <template v-else-if="isSearch">
          <div class="docs-search-page"><button class="docs-back" @click="router.push('/help/docs')"><ArrowLeft :size="15" />返回文档首页</button><h2>搜索结果</h2><p v-if="query">“{{ query }}”共找到 {{ searchResults.length }} 篇相关文档</p>
            <form class="docs-search-large" @submit.prevent="submitSearch"><Search :size="18" /><input v-model="searchDraft" maxlength="100" placeholder="搜索接入文档" /><button>搜索</button></form>
            <div v-if="searchResults.length" class="docs-search-results"><button v-for="article in searchResults" :key="article.slug" @click="openArticle(article)"><span>{{ kindLabels[article.kind] }}</span><h3>{{ article.title }}</h3><p>{{ article.summary }}</p><small>{{ docsCategories.find(item => item.key === article.category)?.title }} · 更新于 {{ article.updatedAt }}</small><ArrowRight :size="17" /></button></div>
            <div v-else class="docs-search-empty"><Search :size="28" /><strong>未找到相关文档</strong><p>可以尝试搜索“鉴权”“429”“model”或“Claude Code”。</p><button @click="clearSearch">返回文档首页</button></div>
          </div>
        </template>

        <template v-else-if="selected">
          <article class="docs-article">
            <div class="docs-breadcrumb"><button @click="router.push('/help/docs')">接入文档</button><ChevronRight :size="13" /><span>{{ categoryTitle(selected.category) }}</span><ChevronRight :size="13" /><strong>{{ selected.title }}</strong></div>
            <header><span class="docs-kind">{{ kindLabels[selected.kind] }}</span><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p><div class="docs-meta"><span><Clock3 :size="13" />约 {{ selected.readMinutes }} 分钟</span><span>更新于 {{ selected.updatedAt }}</span><span v-for="protocol in selected.protocols" :key="protocol">{{ protocol }}</span></div></header>
            <section v-for="section in selected.sections" :id="`docs-${section.id}`" :key="section.id" class="docs-article-section">
              <h3><a :href="`#${section.id}`" @click.prevent="jump(section.id)"><Hash :size="16" /></a>{{ section.title }}</h3>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <ul v-if="section.bullets"><li v-for="item in section.bullets" :key="item">{{ item }}</li></ul>
              <ol v-if="section.steps" class="docs-steps"><li v-for="(item, index) in section.steps" :key="item"><span>{{ index + 1 }}</span><p>{{ item }}</p></li></ol>
              <div v-if="section.note" class="docs-note" :class="section.note.tone"><component :is="section.note.tone === 'warning' ? AlertCircle : ShieldCheck" :size="19" /><div><strong>{{ section.note.title }}</strong><p>{{ section.note.text }}</p></div></div>
              <div v-if="section.table" class="docs-table-wrap"><table><thead><tr><th v-for="header in section.table.headers" :key="header">{{ header }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex"><code v-if="cell.startsWith('/') || cell.includes('_') || cell.startsWith('{')">{{ cell }}</code><template v-else>{{ cell }}</template></td></tr></tbody></table></div>
              <div v-if="section.examples" class="docs-code"><div class="docs-code-head"><div><button v-for="example in section.examples" :key="example.language" :class="{ active: languageFor(section) === example.language }" @click="chooseLanguage(section.id, example.language)">{{ example.language }}</button></div><button class="copy-code" @click="copyCode(section)"><Check v-if="copied === `${selected.slug}-${section.id}`" :size="14" /><Copy v-else :size="14" />{{ copied === `${selected.slug}-${section.id}` ? '已复制' : '复制' }}</button></div><pre><code>{{ currentCode(section) }}</code></pre></div>
            </section>
            <section class="docs-next-actions"><div><strong>准备继续？</strong><p>创建密钥、查看模型，或到用量中心核对调用。</p></div><div><RouterLink to="/api-keys"><KeyRound :size="15" />管理密钥</RouterLink><RouterLink to="/models"><Sparkles :size="15" />模型目录</RouterLink><RouterLink to="/usage"><Gauge :size="15" />查看用量</RouterLink></div></section>
            <nav class="docs-prev-next"><button v-if="previous" @click="openArticle(previous)"><ArrowLeft :size="15" /><span><small>上一篇</small><strong>{{ previous.title }}</strong></span></button><span v-else /><button v-if="next" class="next" @click="openArticle(next)"><span><small>下一篇</small><strong>{{ next.title }}</strong></span><ArrowRight :size="15" /></button></nav>
          </article>
        </template>

        <section v-else class="docs-missing"><FileText :size="31" /><h2>文档不存在或无访问权限</h2><p>该文档可能已迁移、撤回，或不在当前身份可见范围内。</p><button @click="router.push('/help/docs')">返回文档首页</button></section>
      </section>

      <aside v-if="selected" class="docs-toc"><strong>本页目录</strong><button v-for="section in selected.sections" :key="section.id" :class="{ active: activeSection === section.id }" @click="jump(section.id)">{{ section.title }}</button><div class="docs-toc-divider" /><span>当前身份</span><p>{{ guest ? '访客' : isSub ? '研发子账户' : '主账户' }}</p><RouterLink :to="`/help/tickets/new?sourceType=DOC&sourceId=${selected.slug}`">仍需帮助？<ExternalLink :size="12" /></RouterLink></aside>
    </div>
  </div>
</template>
