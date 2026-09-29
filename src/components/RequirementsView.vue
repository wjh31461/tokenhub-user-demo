<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { BookOpen, ChevronDown, FileText, List } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const files = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const docs = Object.entries(files).map(([path, content]) => {
  const id = path.split('/').pop()!
  return {
    id,
    content,
    label: id.includes('公共设计')
      ? '用户门户公共设计'
      : id.replace('用户门户需求文档-', '').replace('.md', '').replace(/^(\d+)-/, '$1 · '),
    type: id.includes('公共设计') ? '公共规范' : '模块需求',
  }
}).sort((a, b) => a.id.includes('公共设计') ? -1 : b.id.includes('公共设计') ? 1 : a.id.localeCompare(b.id, 'zh-CN'))

const initialId = typeof route.query.doc === 'string' && docs.some(doc => doc.id === route.query.doc)
  ? route.query.doc
  : docs.find(doc => doc.id.includes('概览'))?.id ?? docs[0]?.id ?? ''
const selectedId = ref(initialId)
const selected = computed(() => docs.find(doc => doc.id === selectedId.value))
const html = computed(() => DOMPurify.sanitize(marked.parse(selected.value?.content ?? '暂无可展示的文档', { async: false })))
const article = ref<HTMLElement | null>(null)
const headings = ref<{ id: string; text: string; level: number }[]>([])

async function indexHeadings(anchor?: string) {
  await nextTick()
  headings.value = Array.from(article.value?.querySelectorAll('h1,h2,h3') ?? []).map((node, index) => {
    const element = node as HTMLElement
    const id = (element.textContent ?? '').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-') || `section-${index}`
    element.id = id
    return { id, text: element.textContent ?? '', level: Number(element.tagName.slice(1)) }
  })
  if (anchor) jump(anchor)
}

function choose(id: string) {
  selectedId.value = id
  router.replace({ path: '/requirements', query: { doc: id } })
}

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function contentScroller() {
  return document.querySelector<HTMLElement>('.workspace main')
}

async function followLink(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest('a')
  if (!link) return
  const href = link.getAttribute('href') ?? ''
  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    return
  }
  event.preventDefault()
  let decoded = ''
  try { decoded = decodeURIComponent(href) } catch { return }
  const [file, anchor] = decoded.split('#')
  if (file) {
    const match = docs.find(doc => doc.id === file.split('/').pop())
    if (!match) return
    selectedId.value = match.id
    await router.replace({ path: '/requirements', query: { doc: match.id } })
    await indexHeadings(anchor)
  } else if (anchor) {
    jump(anchor)
  }
}

watch(selectedId, async () => {
  contentScroller()?.scrollTo({ top: 0 })
  await indexHeadings()
})

onMounted(() => indexHeadings(typeof route.query.section === 'string' ? route.query.section : undefined))
</script>

<template>
  <div class="requirements-view">
    <div class="requirements-page-heading">
      <div>
        <h1>需求文档</h1>
        <p>选择文档并对照页面设计、交互规则和技术约束。</p>
      </div>
      <div class="document-count"><BookOpen :size="17" /><span>{{ docs.length }} 份文档</span></div>
    </div>

    <div class="requirements-layout">
      <aside class="requirements-library" aria-label="需求文档列表">
        <div class="library-title"><span>文档库</span><small>项目 docs 目录</small></div>
        <div class="document-picker">
          <label for="requirements-document">选择需求文档</label>
          <div class="document-select-wrap">
            <FileText :size="17" />
            <select id="requirements-document" v-model="selectedId" @change="choose(selectedId)">
              <option v-for="doc in docs" :key="doc.id" :value="doc.id">{{ doc.label }}</option>
            </select>
            <ChevronDown :size="16" class="select-arrow" />
          </div>
          <small>{{ selected?.type }} · 共 {{ docs.length }} 份文档</small>
        </div>
        <div class="contents-title"><List :size="15" />当前文档章节</div>
        <nav class="contents-list" aria-label="当前文档章节">
          <button v-for="heading in headings.filter(item => item.level > 1)" :key="heading.id" :class="{ nested: heading.level === 3 }" @click="jump(heading.id)">{{ heading.text }}</button>
        </nav>
      </aside>

      <section class="document-reader" aria-live="polite">
        <header class="reader-header">
          <div><span>{{ selected?.type }}</span><strong>{{ selected?.label }}</strong></div>
        </header>
        <article ref="article" class="requirements-markdown" @click="followLink" v-html="html" />
        <footer class="reader-footer">文档直接读取自项目 docs 目录，修改后刷新页面即可查看最新内容。</footer>
      </section>
    </div>
  </div>
</template>

<style>
.requirements-page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.requirements-page-heading h1{margin:0;font-size:28px}.requirements-page-heading p{margin:10px 0 0;color:#718097;font-size:14px}.document-count{display:flex;align-items:center;gap:8px;color:#60789f;background:#fff;border:1px solid #dfe6f1;border-radius:7px;padding:10px 13px;font-size:13px}.requirements-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:20px;align-items:start}.requirements-library{position:sticky;top:18px;background:#fff;border:1px solid #e1e7f0;border-radius:10px;max-height:calc(100vh - 112px);display:flex;flex-direction:column;overflow:hidden}.library-title{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 12px}.library-title span{font-size:15px;font-weight:600}.library-title small{font-size:11px;color:#98a4b5}.document-search{display:flex;align-items:center;gap:8px;margin:0 14px 12px;padding:9px 10px;border:1px solid #e0e6ef;border-radius:6px;color:#8b99ad;background:#fafbfd}.document-search:focus-within{border-color:#91aceb;box-shadow:0 0 0 3px #e9f0ff}.document-search input{border:0;outline:0;background:transparent;width:100%;font:inherit;font-size:13px;color:#42536d}.document-list{padding:0 9px 11px;border-bottom:1px solid #e9edf4;overflow:auto;max-height:280px}.document-list button{display:flex;align-items:center;gap:10px;width:100%;padding:11px 9px;border-radius:7px;text-align:left}.document-list button:hover{background:#f5f8fd}.document-list button.active{background:#edf3ff;color:#315fc8}.document-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:7px;background:#f1f4f9;color:#7890b6;flex-shrink:0}.document-list button.active .document-icon{background:#dfe9ff;color:#3565d6}.document-list strong{display:block;font-size:13px;font-weight:550;line-height:1.45}.document-list small{display:block;font-size:11px;color:#98a3b3;margin-top:3px}.no-documents{font-size:12px;color:#98a4b5;text-align:center;padding:16px}.contents-title{display:flex;align-items:center;gap:7px;padding:15px 18px 8px;font-size:12px;font-weight:550;color:#607089}.contents-list{padding:0 10px 15px;overflow:auto;min-height:0}.contents-list button{display:block;width:100%;text-align:left;padding:7px 8px;border-radius:5px;color:#718198;font-size:12px;line-height:1.5}.contents-list button.nested{padding-left:21px;font-size:11px;color:#8c98aa}.contents-list button:hover{background:#f2f6fc;color:#3565d6}.document-reader{min-width:0;background:#fff;border:1px solid #e1e7f0;border-radius:10px;overflow:hidden}.reader-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 28px;border-bottom:1px solid #e9edf4;background:#fafbfd}.reader-header>div{display:flex;align-items:center;gap:10px;min-width:0}.reader-header span{font-size:11px;color:#7890b6;background:#edf3ff;padding:4px 6px;border-radius:4px;white-space:nowrap}.reader-header strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reader-header button{display:flex;align-items:center;gap:5px;color:#6c7f9b;font-size:12px;white-space:nowrap}.reader-header button:hover{color:#3565d6}.requirements-markdown{padding:30px clamp(28px,5vw,70px) 50px;color:#36465e;font-size:15px;line-height:1.9;overflow-wrap:anywhere}.requirements-markdown h1,.requirements-markdown h2,.requirements-markdown h3{scroll-margin-top:20px;color:#273852}.requirements-markdown h1{font-size:27px;line-height:1.5;margin:0 0 20px}.requirements-markdown h2{font-size:21px;line-height:1.55;border-top:1px solid #e8edf4;margin:34px 0 15px;padding-top:27px}.requirements-markdown h3{font-size:18px;line-height:1.6;margin:27px 0 12px}.requirements-markdown h4{font-size:16px}.requirements-markdown p{margin:12px 0}.requirements-markdown a{color:#3565d6;text-decoration:underline;text-underline-offset:3px}.requirements-markdown ul,.requirements-markdown ol{padding-left:25px}.requirements-markdown li{margin:7px 0}.requirements-markdown table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;margin:20px 0;font-size:14px}.requirements-markdown th,.requirements-markdown td{padding:11px 13px;border:1px solid #dfe6ef;min-width:110px;vertical-align:top}.requirements-markdown th{background:#f1f5fb;text-align:left;font-weight:600}.requirements-markdown tr:nth-child(even){background:#fafbfd}.requirements-markdown pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;line-height:1.7;padding:18px;background:#f5f7fb;border:1px solid #e3e9f2;border-radius:7px;overflow:auto;white-space:pre}.requirements-markdown code{font-size:.9em;background:#f1f4f9;padding:2px 4px;border-radius:3px}.requirements-markdown pre code{padding:0;background:none;font-size:inherit}.requirements-markdown blockquote{margin:16px 0;border-left:3px solid #abc1eb;background:#f7faff;padding:5px 17px;color:#718198}.reader-footer{padding:15px 28px;border-top:1px solid #e9edf4;color:#8c99ac;font-size:11px}.requirements-view+footer{margin-top:2px}
@media(max-width:1000px){.requirements-layout{grid-template-columns:230px minmax(0,1fr)}.requirements-markdown{padding:25px 28px 45px}.requirements-library{max-height:calc(100vh - 100px)}}
@media(max-width:760px){.requirements-page-heading{align-items:flex-start;flex-direction:column}.requirements-layout{grid-template-columns:1fr}.requirements-library{position:static;max-height:none}.contents-list{max-height:220px}.document-list{max-height:240px}.requirements-markdown{padding:23px 18px 38px;font-size:14px}.reader-header{padding:14px 18px}.reader-header strong{display:none}.requirements-markdown h1{font-size:23px}.requirements-markdown h2{font-size:19px}.requirements-markdown h3{font-size:17px}.reader-footer{padding:13px 18px;line-height:1.6}}

/* Give the document library and chapter tree enough room for daily comparison work. */
.requirements-layout{grid-template-columns:clamp(260px,18vw,280px) minmax(0,1fr);gap:18px}
.requirements-library{top:0;height:calc(100vh - 220px);min-height:650px;max-height:none}
.library-title{padding:21px 20px 14px}.library-title span{font-size:17px}.library-title small{font-size:12px}
.document-search{margin:0 18px 15px;padding:11px 12px}.document-search input{font-size:14px}
.document-list{flex:0 0 42%;min-height:260px;max-height:none;padding:0 12px 14px;scrollbar-gutter:stable}
.document-list button{gap:12px;padding:14px 11px}.document-icon{width:34px;height:34px;border-radius:8px}.document-list strong{font-size:14px;line-height:1.5}.document-list small{font-size:12px;margin-top:4px}
.contents-title{padding:18px 20px 11px;font-size:14px;font-weight:600;flex-shrink:0}
.contents-list{flex:1;min-height:280px;padding:0 13px 18px;scrollbar-gutter:stable}.contents-list button{padding:9px 10px;font-size:13px;line-height:1.55}.contents-list button.nested{padding-left:25px;font-size:12px}
@media(max-width:1100px){.requirements-layout{grid-template-columns:1fr}.requirements-library{position:static;height:auto;min-height:0}.document-list{flex:none;min-height:0;max-height:340px}.contents-list{flex:none;min-height:0;max-height:460px}}
@media(max-width:760px){.document-list{max-height:300px}.contents-list{max-height:380px}}

/* Keep document switching compact and reserve the panel for the chapter tree. */
.document-picker{padding:0 16px 16px;border-bottom:1px solid #e9edf4}
.document-picker>label{display:block;margin-bottom:8px;color:#5e6f87;font-size:12px;font-weight:600}
.document-select-wrap{position:relative;display:flex;align-items:center;gap:9px;height:44px;padding:0 38px 0 12px;border:1px solid #d8e0ec;border-radius:7px;background:#fafbfd;color:#5270a0;transition:border-color .18s,box-shadow .18s,background .18s}
.document-select-wrap:focus-within{border-color:#7599e8;box-shadow:0 0 0 3px #e8efff;background:#fff}
.document-select-wrap select{width:100%;min-width:0;height:100%;border:0;outline:0;appearance:none;background:transparent;color:#31445f;font:inherit;font-size:14px;font-weight:550;cursor:pointer}
.document-select-wrap .select-arrow{position:absolute;right:12px;pointer-events:none;color:#71829a}
.document-picker>small{display:block;margin-top:8px;color:#77869b;font-size:12px}
.contents-title{padding:16px 16px 10px}
.contents-list{padding-left:9px;padding-right:9px}
.contents-list{min-height:0}
@media(max-width:1100px){.contents-list{max-height:520px}}
@media(max-width:760px){.document-picker{padding:0 14px 15px}.contents-list{max-height:420px}}
</style>
