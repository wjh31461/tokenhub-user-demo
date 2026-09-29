<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, CircleAlert, FileText, Filter, Megaphone, Pin, RefreshCw, Search, ShieldAlert } from 'lucide-vue-next'
import { announcementCategories, announcementRecords, type AnnouncementCategory, type AnnouncementRecord } from '../data/announcements'

const props = defineProps<{ isSub: boolean }>()
const route = useRoute()
const router = useRouter()
type ReadFilter = '' | 'READ' | 'UNREAD'
type Scenario = 'normal' | 'empty' | 'error'

const draftCategory = ref<AnnouncementCategory | ''>('')
const draftReadStatus = ref<ReadFilter>('')
const draftKeyword = ref('')
const applied = ref({ category: '' as AnnouncementCategory | '', readStatus: '' as ReadFilter, keyword: '' })
const page = ref(1)
const scenario = ref<Scenario>('normal')
const loading = ref(false)
const recovered = ref(false)
const readIds = ref(new Set(announcementRecords.filter(item => item.initialRead).map(item => item.id)))
let loadTimer: ReturnType<typeof setTimeout> | undefined

const announcementId = computed(() => typeof route.params.announcementId === 'string' ? route.params.announcementId : '')
const isDetail = computed(() => Boolean(announcementId.value))
const pageSize = 5
const audience = computed(() => props.isSub ? ['ALL', 'SUB_ACCOUNT'] : ['ALL', 'MAIN_ACCOUNT'])
const permitted = computed(() => announcementRecords
  .filter(item => audience.value.includes(item.audience))
  .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.publishedAt.localeCompare(left.publishedAt) || right.id.localeCompare(left.id)))
const selected = computed(() => permitted.value.find(item => item.id === announcementId.value))
const isRead = (item: AnnouncementRecord) => readIds.value.has(item.id)
const filtered = computed(() => {
  if (scenario.value === 'empty') return []
  const keyword = applied.value.keyword.toLowerCase()
  return permitted.value.filter(item =>
    (!applied.value.category || item.category === applied.value.category)
    && (!applied.value.readStatus || (applied.value.readStatus === 'READ') === isRead(item))
    && (!keyword || item.title.toLowerCase().includes(keyword)),
  )
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const unreadCount = computed(() => permitted.value.filter(item => !isRead(item)).length)
const error = computed(() => scenario.value === 'error' && !recovered.value)

function syncQuery() {
  const query: Record<string, string> = {}
  if (applied.value.category) query.category = applied.value.category
  if (applied.value.readStatus) query.readStatus = applied.value.readStatus
  if (applied.value.keyword) query.keyword = applied.value.keyword
  if (page.value > 1) query.page = String(page.value)
  router.replace({ path: '/help/announcements', query })
}

function load() {
  clearTimeout(loadTimer)
  loading.value = true
  loadTimer = setTimeout(() => { loading.value = false }, 280)
}

function query() {
  applied.value = { category: draftCategory.value, readStatus: draftReadStatus.value, keyword: draftKeyword.value.trim() }
  page.value = 1
  syncQuery()
  load()
}

function reset() {
  draftCategory.value = ''
  draftReadStatus.value = ''
  draftKeyword.value = ''
  query()
}

function retry() {
  recovered.value = true
  load()
}

function selectPage(value: number) {
  page.value = Math.max(1, Math.min(value, pageCount.value))
  syncQuery()
  load()
}

function open(item: AnnouncementRecord) {
  router.push({ path: `/help/announcements/${item.id}`, query: route.query })
}

function back() {
  router.push({ path: '/help/announcements', query: route.query })
}

function markRead(item: AnnouncementRecord) {
  if (isRead(item)) return
  const next = new Set(readIds.value)
  next.add(item.id)
  readIds.value = next
}

function followLink(path: string) {
  router.push(path)
}

function categoryName(category: AnnouncementCategory) { return announcementCategories[category] }

watch(announcementId, id => {
  if (id && selected.value) markRead(selected.value)
}, { immediate: true })

watch(() => props.isSub, () => {
  draftCategory.value = ''
  draftReadStatus.value = ''
  draftKeyword.value = ''
  applied.value = { category: '', readStatus: '', keyword: '' }
  page.value = 1
  scenario.value = 'normal'
  recovered.value = false
  if (announcementId.value) router.replace('/help/announcements')
})

watch(scenario, () => { recovered.value = false; page.value = 1; load() })

watch(() => route.query, query => {
  if (isDetail.value) return
  const category = typeof query.category === 'string' && Object.hasOwn(announcementCategories, query.category) ? query.category as AnnouncementCategory : ''
  const readStatus = query.readStatus === 'READ' || query.readStatus === 'UNREAD' ? query.readStatus : ''
  const keyword = typeof query.keyword === 'string' ? query.keyword.slice(0, 50) : ''
  const nextPage = Math.max(1, Number.parseInt(typeof query.page === 'string' ? query.page : '1', 10) || 1)
  draftCategory.value = category; draftReadStatus.value = readStatus; draftKeyword.value = keyword
  applied.value = { category, readStatus, keyword }; page.value = nextPage
}, { immediate: true })
</script>

<template>
  <div class="announcements-view">
    <template v-if="!isDetail">
      <div class="announcements-heading">
        <div><h1>平台公告</h1><p>查看模型变更、平台维护和服务通知。</p></div>
        <div class="announcement-heading-side"><span><Megaphone :size="15" />{{ unreadCount }} 条未读</span><button class="refresh-button" :disabled="loading" @click="load"><RefreshCw :size="14" :class="{ spinning: loading }" />刷新</button></div>
      </div>

      <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="公告页面场景"><option value="normal">正常公告</option><option value="empty">暂无公告</option><option value="error">查询失败</option></select></label><small>演示数据仅保留在当前浏览器会话中。</small></div>

      <section class="announcement-card">
        <div class="announcement-filter"><div class="announcement-filter-title"><Filter :size="15" /><strong>筛选公告</strong><span>按条件查看当前身份可见的公告</span></div><div class="announcement-filter-grid">
          <label>公告分类<select v-model="draftCategory"><option value="">全部分类</option><option v-for="(name, code) in announcementCategories" :key="code" :value="code">{{ name }}</option></select></label>
          <label>阅读状态<select v-model="draftReadStatus"><option value="">全部状态</option><option value="UNREAD">未读</option><option value="READ">已读</option></select></label>
          <label class="announcement-keyword">标题关键字<div><Search :size="15" /><input v-model="draftKeyword" maxlength="50" placeholder="请输入公告标题关键字" @keyup.enter="query" /></div></label>
        </div><div class="announcement-filter-footer"><span v-if="draftCategory !== applied.category || draftReadStatus !== applied.readStatus || draftKeyword.trim() !== applied.keyword" class="announcement-dirty">筛选条件尚未应用</span><span v-else /><div><button class="announcement-secondary" @click="reset">重置</button><button class="announcement-primary" @click="query">查询</button></div></div></div>

        <div class="announcement-results-head"><div><h2>公告列表</h2><p>共 {{ filtered.length }} 条公告 <span>·</span> 当前身份：{{ isSub ? '研发子账户' : '主账户' }}</p></div></div>
        <div v-if="loading" class="announcement-state"><RefreshCw :size="25" class="spinning" /><strong>正在加载公告</strong></div>
        <div v-else-if="error" class="announcement-state"><CircleAlert :size="29" /><strong>暂时无法获取公告</strong><p>请稍后重新加载。</p><button class="outline-button" @click="retry">重新加载</button></div>
        <div v-else-if="!rows.length" class="announcement-state"><Megaphone :size="29" /><strong>暂无符合条件的公告</strong><p>可以调整筛选条件后再次查询。</p></div>
        <div v-else class="announcement-list">
          <button v-for="item in rows" :key="item.id" class="announcement-item" @click="open(item)">
            <div class="announcement-item-top"><span v-if="item.pinned" class="announcement-pinned"><Pin :size="12" />置顶</span><span class="announcement-category" :class="item.category.toLowerCase()">{{ categoryName(item.category) }}</span><span v-if="item.importance === 'IMPORTANT'" class="announcement-important">重要</span><span v-if="!isRead(item)" class="announcement-unread">未读</span><time>{{ item.publishedAt }}</time></div>
            <div class="announcement-item-body"><div><h3 :class="{ unread: !isRead(item) }">{{ item.title }}</h3><p>{{ item.summary }}</p><span v-if="item.impactStartAt" class="announcement-impact"><CalendarClock :size="13" />影响时间：{{ item.impactStartAt }} 至 {{ item.impactEndAt }}</span></div><ChevronRight :size="18" /></div>
          </button>
        </div>
        <div v-if="!loading && !error && filtered.length" class="announcement-pagination"><span>第 {{ page }} / {{ pageCount }} 页</span><div><button :disabled="page === 1" aria-label="上一页" @click="selectPage(page - 1)"><ChevronLeft :size="16" /></button><button :disabled="page === pageCount" aria-label="下一页" @click="selectPage(page + 1)"><ChevronRight :size="16" /></button></div></div>
      </section>
    </template>

    <template v-else-if="selected">
      <div class="announcement-detail-heading"><button class="back-button" @click="back"><ArrowLeft :size="16" />返回公告列表</button><span>已读</span></div>
      <article class="announcement-detail-card">
        <div class="announcement-detail-meta"><span v-if="selected.pinned" class="announcement-pinned"><Pin :size="12" />置顶</span><span class="announcement-category" :class="selected.category.toLowerCase()">{{ categoryName(selected.category) }}</span><span v-if="selected.importance === 'IMPORTANT'" class="announcement-important">重要</span></div>
        <h1>{{ selected.title }}</h1><p class="announcement-detail-time">发布时间：{{ selected.publishedAt }}</p>
        <section v-if="selected.impactStartAt" class="announcement-detail-impact"><ShieldAlert :size="20" /><div><strong>影响信息</strong><p>影响时间：{{ selected.impactStartAt }} 至 {{ selected.impactEndAt }}</p><small>{{ selected.impactDescription }}</small></div></section>
        <div class="announcement-content"><p v-for="paragraph in selected.paragraphs" :key="paragraph">{{ paragraph }}</p></div>
        <section v-if="selected.links.length" class="announcement-related"><h2>相关入口</h2><div><button v-for="link in selected.links" :key="link.path" @click="followLink(link.path)"><FileText :size="16" />{{ link.label }}<ArrowUpRight :size="14" /></button></div></section>
      </article>
    </template>

    <section v-else class="announcement-detail-missing"><Megaphone :size="32" /><h1>公告不存在或无访问权限</h1><p>该公告可能已下线，或不在当前账户身份的可见范围内。</p><button class="announcement-primary" @click="back">返回公告列表</button></section>
  </div>
</template>
