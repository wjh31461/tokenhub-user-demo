<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Megaphone, RefreshCw } from 'lucide-vue-next'
import { announcementCategories, announcementRecords, announcementPreview, isAnnouncementVisible, type AnnouncementCategory, type AnnouncementRecord } from '../data/announcements'
const route = useRoute(), router = useRouter()
const scenario = ref('normal'), loading = ref(false), failed = ref(false), asOf = ref(new Date().toISOString())
let timer: ReturnType<typeof setTimeout> | undefined, generation = 0
const positions = new Map<string, number>()
const announcementId = computed(() => typeof route.params.announcementId === 'string' ? route.params.announcementId : '')
const isDetail = computed(() => Boolean(announcementId.value))
const category = computed(() => typeof route.query.category === 'string' && Object.hasOwn(announcementCategories, route.query.category) ? route.query.category as AnnouncementCategory : '')
const sort = computed(() => route.query.sort === 'ASC' ? 'ASC' : 'DESC')
const requestedPage = computed(() => Math.max(1, Number.parseInt(String(route.query.page || '1'), 10) || 1))
const published = computed(() => scenario.value === 'empty' ? [] : announcementRecords.filter(record => isAnnouncementVisible(record, asOf.value)))
const selected = computed(() => scenario.value === 'offline' ? undefined : published.value.find(record => record.id === announcementId.value))
const filtered = computed(() => {
  if (scenario.value === 'noMatch') return []
  return published.value.filter(record => !category.value || record.category === category.value).sort((a, b) => {
    const order = Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id)
    return sort.value === 'ASC' ? order : -order
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 10)))
const page = computed(() => Math.min(requestedPage.value, pageCount.value))
const rows = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
const listQuery = computed(() => ({ ...(category.value ? { category: category.value } : {}), sort: sort.value, page: String(page.value) }))
const scrollKey = computed(() => `tokenhub-demo-announcement-scroll:${category.value}:${sort.value}:${page.value}`)
const main = () => document.querySelector<HTMLElement>('.workspace main')
function time(value: string) { return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replaceAll('/', '-') }
function savePosition() {
  const position = main()?.scrollTop ?? 0
  positions.set(scrollKey.value, position)
  try { sessionStorage.setItem(scrollKey.value, String(position)) } catch { /* Memory fallback is sufficient for this visit. */ }
}
function savedPosition() {
  try { return positions.get(scrollKey.value) ?? (Number(sessionStorage.getItem(scrollKey.value)) || 0) } catch { return positions.get(scrollKey.value) ?? 0 }
}
function load(retry = false, restore = false) {
  clearTimeout(timer); loading.value = true; failed.value = false
  const request = ++generation, mode = scenario.value
  timer = setTimeout(async () => {
    if (request !== generation) return
    asOf.value = new Date().toISOString(); failed.value = mode === 'error' && !retry; loading.value = false
    await nextTick()
    main()?.scrollTo({ top: restore && !isDetail.value ? savedPosition() : 0 })
  }, 200)
}
function changeCategory(event: Event) { router.push({ path: '/announcements', query: { ...listQuery.value, category: (event.target as HTMLSelectElement).value || undefined, page: '1' } }) }
function changeSort(event: Event) { router.push({ path: '/announcements', query: { ...listQuery.value, sort: (event.target as HTMLSelectElement).value, page: '1' } }) }
function paginate(delta: number) { router.push({ path: '/announcements', query: { ...listQuery.value, page: String(page.value + delta) } }) }
function open(record: AnnouncementRecord) { savePosition(); router.push({ path: `/announcements/${record.id}`, query: listQuery.value }) }
function back() { router.push({ path: '/announcements', query: listQuery.value }) }
watch(() => route.fullPath, (value, old) => {
  const returning = !isDetail.value && Boolean(old?.split('?')[0].startsWith('/announcements/'))
  load(false, returning)
}, { immediate: true })
watch(scenario, () => load())
onBeforeUnmount(() => { generation++; clearTimeout(timer); if (!isDetail.value) savePosition() })
</script>

<template>
  <div class="announcements-view">
    <div class="announcements-heading"><div><h1>平台公告</h1><p>查看模型上下架、维护通知等平台消息。</p></div></div>
    <div class="demo-toolbar"><label>页面场景<select v-model="scenario" aria-label="公告页面场景"><option value="normal">正常公告</option><option value="empty">暂无公告</option><option value="noMatch">类型无结果</option><option value="error">加载失败</option><option value="offline">公告已下线</option></select></label></div>
    <div v-if="isDetail" class="announcement-detail-heading"><button class="back-button" @click="back"><ArrowLeft :size="16" />返回公告列表</button></div>
    <section v-else class="announcement-card announcement-filter"><label>公告类型<select :value="category" aria-label="公告类型" @change="changeCategory"><option value="">全部</option><option v-for="(name, code) in announcementCategories" :key="code" :value="code">{{ name }}</option></select></label><label>发布时间<select :value="sort" aria-label="发布时间排序" @change="changeSort"><option value="DESC">最新优先</option><option value="ASC">最早优先</option></select></label></section>
    <section v-if="loading" class="announcement-card announcement-state" role="status"><RefreshCw :size="28" class="spinning" /><strong>正在加载公告</strong></section>
    <section v-else-if="failed" class="announcement-card announcement-state" role="alert"><Megaphone :size="28" /><strong>加载失败，请重试</strong><button class="announcement-secondary" @click="load(true)">重试</button></section>
    <template v-else-if="isDetail"><article v-if="selected" class="announcement-detail-card"><h1>{{ selected.title }}</h1><div class="announcement-detail-meta"><span class="announcement-category" :class="selected.category.toLowerCase()">{{ announcementCategories[selected.category] }}</span><time>发布时间：{{ time(selected.publishedAt) }}</time></div><div class="announcement-content"><p v-for="(paragraph, index) in selected.paragraphs" :key="index">{{ paragraph }}</p></div></article><section v-else class="announcement-card announcement-state"><Megaphone :size="28" /><strong>该公告不存在或已下线</strong><button class="announcement-primary" @click="back">返回公告列表</button></section></template>
    <section v-else class="announcement-card"><div v-if="!rows.length" class="announcement-state"><Megaphone :size="28" /><strong>{{ category || scenario === 'noMatch' ? '暂无该类型的公告' : '暂无公告' }}</strong></div><div v-else class="announcement-table-scroll"><table class="announcement-table"><thead><tr><th>公告标题</th><th>公告类型</th><th>发布时间</th><th>公告内容</th></tr></thead><tbody><tr v-for="record in rows" :key="record.id"><td data-label="公告标题"><button class="announcement-title-link" :title="record.title" @click="open(record)">{{ record.title }}</button></td><td data-label="公告类型"><span class="announcement-category" :class="record.category.toLowerCase()">{{ announcementCategories[record.category] }}</span></td><td data-label="发布时间"><time>{{ time(record.publishedAt) }}</time></td><td data-label="公告内容"><p class="announcement-preview">{{ announcementPreview(record) }}{{ Array.from(record.paragraphs.join(' ')).length > 100 ? '…' : '' }}</p><button class="announcement-full-link" @click="open(record)">查看全文<ChevronRight :size="13" /></button></td></tr></tbody></table></div><div class="announcement-pagination"><span>共 {{ filtered.length }} 条 · 每页 10 条</span><div><button :disabled="page === 1" aria-label="上一页" @click="paginate(-1)"><ChevronLeft :size="16" /></button><span>{{ page }} / {{ pageCount }}</span><button :disabled="page === pageCount" aria-label="下一页" @click="paginate(1)"><ChevronRight :size="16" /></button></div></div></section>
  </div>
</template>
