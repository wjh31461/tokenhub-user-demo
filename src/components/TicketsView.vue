<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert,
  Clock3, Copy, FileText, Inbox, Link2, LoaderCircle, MessageSquareText, Paperclip,
  Plus, RefreshCw, RotateCcw, Search, Send, ShieldAlert, TicketCheck, X,
} from 'lucide-vue-next'
import {
  ticketCategoryNames, ticketImpactNames, ticketRecords, ticketStatusNames,
  type TicketAttachment, type TicketCategory, type TicketImpact, type TicketRecord, type TicketStatus,
} from '../data/tickets'

const props = defineProps<{ isSub: boolean }>()
const route = useRoute()
const router = useRouter()
const tickets = ref<TicketRecord[]>(structuredClone(ticketRecords))
const status = ref<'OPEN' | TicketStatus | ''>('OPEN')
const category = ref<TicketCategory | ''>('')
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')
const applied = ref({ status: 'OPEN' as 'OPEN' | TicketStatus | '', category: '' as TicketCategory | '', keyword: '', startDate: '', endDate: '' })
const page = ref(1)
const loading = ref(false)
const copied = ref('')
const notice = ref('')
const reply = ref('')
const replyAttachments = ref<TicketAttachment[]>([])
const continueReason = ref('')
const showContinue = ref(false)
const submitError = ref('')
const attachmentError = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

const categories = Object.entries(ticketCategoryNames) as [TicketCategory, string][]
const account = computed(() => props.isSub ? 'SUB' : 'MAIN')
const isNew = computed(() => route.path === '/help/tickets/new')
const ticketId = computed(() => typeof route.params.ticketId === 'string' ? route.params.ticketId : '')
const isDetail = computed(() => Boolean(ticketId.value))
const selected = computed(() => tickets.value.find(item => item.id === ticketId.value && item.account === account.value))
const accountTickets = computed(() => tickets.value.filter(item => item.account === account.value))
const pageSize = 4
const filtered = computed(() => {
  const key = applied.value.keyword.trim().toLowerCase()
  return accountTickets.value
    .filter(item => applied.value.status !== 'OPEN'
      ? (!applied.value.status || item.status === applied.value.status)
      : ['PENDING', 'IN_PROGRESS', 'WAITING_USER'].includes(item.status))
    .filter(item => !applied.value.category || item.category === applied.value.category)
    .filter(item => !key || item.ticketNo.toLowerCase().includes(key) || item.title.toLowerCase().includes(key))
    .filter(item => !applied.value.startDate || item.createdAt.slice(0, 10) >= applied.value.startDate)
    .filter(item => !applied.value.endDate || item.createdAt.slice(0, 10) <= applied.value.endDate)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const openCount = computed(() => accountTickets.value.filter(item => ['PENDING', 'IN_PROGRESS', 'WAITING_USER'].includes(item.status)).length)
const unreadCount = computed(() => accountTickets.value.reduce((sum, item) => sum + item.unread, 0))

const form = ref({
  category: '' as TicketCategory | '',
  title: '',
  description: '',
  occurredAt: '',
  impact: 'SELF' as TicketImpact,
  service: '',
  model: '',
  apiKey: '',
  requestId: '',
  errorCode: '',
  attachments: [] as TicketAttachment[],
})

const source = computed(() => {
  const legacyAlert = typeof route.query.alertId === 'string' ? route.query.alertId : ''
  const type = typeof route.query.sourceType === 'string' ? route.query.sourceType : (legacyAlert ? 'ALERT' : '')
  const id = typeof route.query.sourceId === 'string' ? route.query.sourceId : legacyAlert
  if (!type || !id) return null
  const names: Record<string, string> = { ALERT: '告警', CALL: '调用记录', DOC: '接入文档', SERVICE: '服务', TICKET: '原工单' }
  return { type, id, name: names[type] ?? '关联信息' }
})

function showLoading() {
  clearTimeout(timer)
  loading.value = true
  timer = setTimeout(() => { loading.value = false }, 260)
}

function syncQuery() {
  const query: Record<string, string> = {}
  if (applied.value.status) query.status = applied.value.status
  if (applied.value.category) query.category = applied.value.category
  if (applied.value.keyword) query.keyword = applied.value.keyword
  if (applied.value.startDate) query.startDate = applied.value.startDate
  if (applied.value.endDate) query.endDate = applied.value.endDate
  if (page.value > 1) query.page = String(page.value)
  router.replace({ path: '/help/tickets', query })
}

function query() {
  applied.value = { status: status.value, category: category.value, keyword: keyword.value.trim(), startDate: startDate.value, endDate: endDate.value }
  page.value = 1
  syncQuery()
  showLoading()
}

function reset() {
  status.value = 'OPEN'
  category.value = ''
  keyword.value = ''
  startDate.value = ''
  endDate.value = ''
  query()
}

function selectPage(value: number) {
  page.value = Math.max(1, Math.min(value, pageCount.value))
  syncQuery()
  showLoading()
}

function goNew() {
  resetForm()
  router.push('/help/tickets/new')
}

function openTicket(item: TicketRecord) {
  router.push(`/help/tickets/${item.id}`)
}

function backToList() {
  router.push('/help/tickets')
}

function resetForm() {
  form.value = { category: '', title: '', description: '', occurredAt: '', impact: 'SELF', service: '', model: '', apiKey: '', requestId: '', errorCode: '', attachments: [] }
  submitError.value = ''
  attachmentError.value = ''
}

function applySource() {
  if (!isNew.value || !source.value) return
  if (source.value.type === 'ALERT') {
    form.value.category = 'CALL_FAILURE'
    form.value.title = '告警相关问题需要协助排查'
    form.value.description = `我从告警详情提交此工单，希望协助确认告警原因和处理方式。\n\n关联告警：${source.value.id}`
  } else if (source.value.type === 'CALL') {
    form.value.category = 'CALL_FAILURE'
    form.value.requestId = source.value.id
    form.value.title = '模型调用异常需要协助排查'
  } else if (source.value.type === 'DOC') {
    form.value.category = 'DOCUMENTATION'
    form.value.title = '接入文档内容需要确认'
  } else if (source.value.type === 'SERVICE') {
    form.value.category = 'SERVICE_ORDER'
    form.value.service = 'token-pro'
    form.value.title = '服务状态或套餐问题需要确认'
  } else if (source.value.type === 'TICKET') {
    form.value.category = 'OTHER'
    form.value.title = '原工单关闭后问题再次出现'
  }
}

function addFiles(event: Event, target: 'form' | 'reply') {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  const current = target === 'form' ? form.value.attachments : replyAttachments.value
  attachmentError.value = ''
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['png', 'jpg', 'jpeg', 'webp', 'pdf', 'txt', 'log', 'json'].includes(extension)) {
      attachmentError.value = `${file.name} 的文件类型不支持`
      continue
    }
    if (file.size > 20 * 1024 * 1024) {
      attachmentError.value = `${file.name} 超过 20 MB`
      continue
    }
    if (current.length >= 5) {
      attachmentError.value = '每次最多上传 5 个附件'
      break
    }
    current.push({ id: `attachment-${Date.now()}-${current.length}`, name: file.name, size: formatSize(file.size), type: extension === 'pdf' ? 'PDF' : ['png', 'jpg', 'jpeg', 'webp'].includes(extension) ? 'IMAGE' : extension === 'json' ? 'JSON' : 'TEXT' })
  }
  input.value = ''
}

function formatSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB` }
function removeAttachment(index: number, target: 'form' | 'reply') { (target === 'form' ? form.value.attachments : replyAttachments.value).splice(index, 1) }

function containsSensitive(value: string) { return /(?:sk|tk)-[a-zA-Z0-9_-]{16,}|Bearer\s+[a-zA-Z0-9._-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(value) }

function submitTicket() {
  submitError.value = ''
  if (!form.value.category) return void (submitError.value = '请选择问题类型')
  if (form.value.title.trim().length < 5) return void (submitError.value = '标题至少需要 5 个字符')
  if (form.value.description.trim().length < 20) return void (submitError.value = '问题描述至少需要 20 个字符')
  if (containsSensitive(`${form.value.title} ${form.value.description}`)) return void (submitError.value = '检测到疑似完整密钥或访问令牌，请删除后再提交')
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-').slice(0, 16)
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  const item: TicketRecord = {
    id: `ticket-${Date.now()}`,
    ticketNo: `TH${now.slice(0, 10).replaceAll('-', '')}${suffix}`,
    account: account.value,
    title: form.value.title.trim(),
    category: form.value.category,
    status: 'PENDING',
    description: form.value.description.trim(),
    impact: form.value.impact,
    occurredAt: form.value.occurredAt ? form.value.occurredAt.replace('T', ' ') : undefined,
    createdAt: now,
    updatedAt: now,
    unread: 0,
    references: [
      ...(source.value ? [{ type: source.value.type as 'ALERT' | 'CALL' | 'DOC' | 'SERVICE' | 'TICKET', label: source.value.name, detail: source.value.id }] : []),
      ...(form.value.service ? [{ type: 'SERVICE' as const, label: 'Token 专业版', detail: '用户选择的关联服务', path: '/services/token-pro' }] : []),
      ...(form.value.model ? [{ type: 'MODEL' as const, label: 'Qwen3-235B-A22B', detail: '平台公开模型', path: '/models/qwen3-235b' }] : []),
      ...(form.value.apiKey ? [{ type: 'API_KEY' as const, label: '生产环境 Key', detail: '****7K2P' }] : []),
      ...(form.value.requestId ? [{ type: 'CALL' as const, label: '请求标识', detail: form.value.requestId }] : []),
    ],
    messages: [{ id: `message-${Date.now()}`, sender: 'USER', content: form.value.description.trim(), createdAt: now, attachments: form.value.attachments }],
  }
  tickets.value.unshift(item)
  notice.value = `工单 ${item.ticketNo} 已提交`
  router.replace(`/help/tickets/${item.id}`)
}

function sendReply() {
  if (!selected.value || (!reply.value.trim() && !replyAttachments.value.length)) return
  if (containsSensitive(reply.value)) return void (attachmentError.value = '回复中包含疑似完整密钥或访问令牌，请删除后再发送')
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-').slice(0, 16)
  selected.value.messages.push({ id: `message-${Date.now()}`, sender: 'USER', content: reply.value.trim() || '补充附件', createdAt: now, attachments: replyAttachments.value })
  if (selected.value.status === 'WAITING_USER') selected.value.status = 'IN_PROGRESS'
  selected.value.updatedAt = now
  reply.value = ''
  replyAttachments.value = []
  attachmentError.value = ''
  notice.value = '补充信息已发送'
}

function confirmResolution() {
  if (!selected.value) return
  selected.value.status = 'CLOSED'
  selected.value.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-').slice(0, 16)
  notice.value = '已确认解决，工单已关闭'
}

function continueProcessing() {
  if (!selected.value || continueReason.value.trim().length < 5) return
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-').slice(0, 16)
  selected.value.messages.push({ id: `message-${Date.now()}`, sender: 'USER', content: `问题仍未解决：${continueReason.value.trim()}`, createdAt: now })
  selected.value.status = 'IN_PROGRESS'
  selected.value.updatedAt = now
  continueReason.value = ''
  showContinue.value = false
  notice.value = '已申请继续处理'
}

function createRelated() {
  if (!selected.value) return
  router.push({ path: '/help/tickets/new', query: { sourceType: 'TICKET', sourceId: selected.value.ticketNo } })
}

async function copy(value: string) {
  await navigator.clipboard?.writeText(value)
  copied.value = value
  setTimeout(() => { if (copied.value === value) copied.value = '' }, 1200)
}

function statusProgress(value: TicketStatus) {
  if (value === 'PENDING') return 1
  if (value === 'IN_PROGRESS') return 2
  if (value === 'WAITING_USER') return 3
  if (value === 'RESOLVED') return 4
  return 5
}

watch(() => props.isSub, () => {
  reset()
  resetForm()
  notice.value = ''
  if (route.path !== '/help/tickets') router.replace('/help/tickets')
})

watch(() => route.fullPath, () => {
  notice.value = ''
  reply.value = ''
  replyAttachments.value = []
  showContinue.value = false
  continueReason.value = ''
  if (isNew.value) {
    resetForm()
    applySource()
  }
  if (selected.value) selected.value.unread = 0
}, { immediate: true })
</script>

<template>
  <div class="tickets-view">
    <div v-if="notice" class="ticket-toast"><CheckCircle2 :size="17" />{{ notice }}<button aria-label="关闭提示" @click="notice = ''"><X :size="14" /></button></div>

    <template v-if="!isNew && !isDetail">
      <div class="tickets-heading">
        <div><h1>我的工单</h1><p>提交问题反馈，查看平台回复并跟踪处理进度。</p></div>
        <button class="ticket-primary" @click="goNew"><Plus :size="16" />提交工单</button>
      </div>
      <div class="ticket-summary-strip">
        <div><MessageSquareText :size="18" /><span>进行中<strong>{{ openCount }}</strong></span></div>
        <div><CircleAlert :size="18" /><span>待我处理<strong>{{ accountTickets.filter(item => item.status === 'WAITING_USER').length }}</strong></span></div>
        <div><Inbox :size="18" /><span>未读回复<strong>{{ unreadCount }}</strong></span></div>
        <small>当前身份：{{ isSub ? '研发子账户' : '主账户' }}</small>
      </div>

      <section class="ticket-panel">
        <div class="ticket-filter">
          <div class="ticket-filter-title"><Search :size="16" /><strong>筛选工单</strong><span>工单按当前业务身份隔离展示</span></div>
          <div class="ticket-filter-grid">
            <label>工单状态<select v-model="status"><option value="OPEN">全部进行中</option><option value="">全部状态</option><option v-for="(name, key) in ticketStatusNames" :key="key" :value="key">{{ name }}</option></select></label>
            <label>问题类型<select v-model="category"><option value="">全部类型</option><option v-for="item in categories" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label>
            <label>开始日期<input v-model="startDate" type="date" /></label>
            <label>结束日期<input v-model="endDate" type="date" /></label>
            <label class="ticket-keyword">工单编号或标题<div><Search :size="15" /><input v-model="keyword" maxlength="100" placeholder="输入工单编号或标题" @keyup.enter="query" /></div></label>
          </div>
          <div class="ticket-filter-actions"><button class="ticket-secondary" @click="reset"><RefreshCw :size="14" />重置</button><button class="ticket-primary compact-button" @click="query"><Search :size="14" />查询</button></div>
        </div>

        <div class="ticket-results-head"><div><h2>工单记录</h2><p>共 {{ filtered.length }} 条<span>·</span>按用户侧更新时间排序</p></div></div>
        <div v-if="loading" class="ticket-state"><LoaderCircle class="spinning" :size="29" /><strong>正在加载工单</strong></div>
        <div v-else-if="!rows.length" class="ticket-state"><Inbox :size="34" /><strong>暂无符合条件的工单</strong><p>可以调整筛选条件，或提交新的问题反馈。</p><button class="ticket-primary" @click="goNew"><Plus :size="15" />提交工单</button></div>
        <div v-else class="ticket-table-wrap">
          <table class="ticket-table">
            <thead><tr><th>工单编号</th><th>标题与类型</th><th>状态</th><th>提交时间</th><th>最近更新</th><th>操作</th></tr></thead>
            <tbody><tr v-for="item in rows" :key="item.id" @click="openTicket(item)">
              <td><button class="ticket-no" @click.stop="copy(item.ticketNo)">{{ item.ticketNo }}<Copy :size="12" /></button><small v-if="copied === item.ticketNo">已复制</small></td>
              <td><strong>{{ item.title }}</strong><span>{{ ticketCategoryNames[item.category] }}<i v-if="item.references.length">{{ item.references[0]?.label }}</i></span></td>
              <td><span class="ticket-status" :class="item.status.toLowerCase()">{{ ticketStatusNames[item.status] }}</span><small v-if="item.unread">{{ item.unread }} 条未读回复</small></td>
              <td>{{ item.createdAt }}</td><td>{{ item.updatedAt }}</td>
              <td><button class="ticket-text-action" @click.stop="openTicket(item)">{{ item.status === 'WAITING_USER' ? '去回复' : '查看' }}<ChevronRight :size="13" /></button></td>
            </tr></tbody>
          </table>
        </div>
        <div v-if="!loading && filtered.length" class="ticket-pagination"><span>第 {{ page }} / {{ pageCount }} 页</span><div><button :disabled="page <= 1" @click="selectPage(page - 1)"><ChevronLeft :size="15" /></button><button :disabled="page >= pageCount" @click="selectPage(page + 1)"><ChevronRight :size="15" /></button></div></div>
      </section>
    </template>

    <template v-else-if="isNew">
      <div class="ticket-detail-heading"><button class="ticket-back" @click="backToList"><ArrowLeft :size="16" />返回我的工单</button><span>当前身份：{{ isSub ? '研发子账户' : '主账户' }}</span></div>
      <section class="ticket-form-card">
        <header><div><h1>提交工单</h1><p>请提供发生时间、公开请求标识和错误码，帮助平台更快定位问题。</p></div><TicketCheck :size="30" /></header>
        <div v-if="source" class="ticket-source"><Link2 :size="17" /><div><strong>已关联{{ source.name }}</strong><span>{{ source.id }} · 平台将在提交时重新校验访问权限</span></div></div>
        <div class="ticket-security"><ShieldAlert :size="18" /><div><strong>提交前请检查敏感信息</strong><p>不要提交完整 API Key、访问令牌、密码、敏感 Prompt 或完整业务数据。通常只需要 requestId、发生时间和平台错误码。</p></div></div>
        <form class="ticket-form" @submit.prevent="submitTicket">
          <div class="ticket-form-grid">
            <label>问题类型<span>*</span><select v-model="form.category"><option value="">请选择问题类型</option><option v-for="item in categories" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select></label>
            <label>影响范围<span>*</span><select v-model="form.impact"><option v-for="(name, key) in ticketImpactNames" :key="key" :value="key">{{ name }}</option></select></label>
            <label class="full">标题<span>*</span><input v-model="form.title" maxlength="100" placeholder="概括您遇到的问题（5～100 字）" /></label>
            <label class="full">问题描述<span>*</span><textarea v-model="form.description" maxlength="5000" rows="7" placeholder="请描述问题现象、发生时间、复现步骤和已经尝试的处理方式。请勿粘贴完整密钥或敏感请求内容。" /><small>{{ form.description.length }} / 5000</small></label>
            <label>发生时间<input v-model="form.occurredAt" type="datetime-local" /></label>
            <label>关联服务<select v-model="form.service"><option value="">不关联</option><option value="token-pro">Token 专业版</option><option value="legal-assistant">法律文书 AI 应用</option></select></label>
            <label>关联模型<select v-model="form.model"><option value="">不关联</option><option value="qwen3-235b">Qwen3-235B-A22B</option><option value="deepseek-v3">DeepSeek-V3.1</option><option value="claude-sonnet-4">Claude Sonnet 4</option></select></label>
            <label>关联用户密钥<select v-model="form.apiKey"><option value="">不关联</option><option value="key-prod">生产环境 Key（****7K2P）</option><option value="key-dev">开发环境 Key（****2D9M）</option></select></label>
            <label>请求标识 requestId<input v-model="form.requestId" maxlength="128" placeholder="例如 req_9f3a7c2d" /></label>
            <label>平台错误码<input v-model="form.errorCode" maxlength="64" placeholder="例如 RATE_LIMITED" /></label>
            <div class="full ticket-upload-field"><span>附件</span><label class="ticket-upload"><Paperclip :size="16" /><input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.log,.json" @change="addFiles($event, 'form')" />选择文件</label><small>最多 5 个，单个不超过 20 MB；支持图片、PDF、TXT、LOG、JSON。</small></div>
          </div>
          <div v-if="form.attachments.length" class="ticket-attachment-list"><div v-for="(item, index) in form.attachments" :key="item.id"><FileText :size="15" /><span>{{ item.name }}<small>{{ item.size }}</small></span><button type="button" aria-label="移除附件" @click="removeAttachment(index, 'form')"><X :size="14" /></button></div></div>
          <p v-if="attachmentError" class="ticket-form-error"><CircleAlert :size="15" />{{ attachmentError }}</p>
          <p v-if="submitError" class="ticket-form-error"><CircleAlert :size="15" />{{ submitError }}</p>
          <footer><button type="button" class="ticket-secondary" @click="backToList">取消</button><button type="submit" class="ticket-primary"><Send :size="15" />提交工单</button></footer>
        </form>
      </section>
    </template>

    <template v-else-if="isDetail">
      <div class="ticket-detail-heading"><button class="ticket-back" @click="backToList"><ArrowLeft :size="16" />返回我的工单</button><span v-if="selected" class="ticket-status" :class="selected.status.toLowerCase()">{{ ticketStatusNames[selected.status] }}</span></div>
      <div v-if="!selected" class="ticket-panel ticket-state missing"><CircleAlert :size="36" /><strong>工单不存在或当前身份无权查看</strong><p>请检查工单地址，或返回当前身份的工单列表。</p><button class="ticket-secondary" @click="backToList">返回列表</button></div>
      <template v-else>
        <section class="ticket-detail-card">
          <header><div class="ticket-detail-title"><div><button class="ticket-no" @click="copy(selected.ticketNo)">{{ selected.ticketNo }}<Copy :size="13" /></button><span v-if="copied === selected.ticketNo">已复制</span></div><h1>{{ selected.title }}</h1><p>{{ ticketCategoryNames[selected.category] }}<i />提交于 {{ selected.createdAt }}<i />最近更新 {{ selected.updatedAt }}</p></div></header>
          <div class="ticket-progress" :class="`progress-${statusProgress(selected.status)}`">
            <div v-for="(step, index) in ['已提交', '处理中', '待我补充', '已解决', '已关闭']" :key="step" :class="{ active: index < statusProgress(selected.status) }"><span><CheckCircle2 v-if="index < statusProgress(selected.status)" :size="16" />{{ index + 1 }}</span><small>{{ step }}</small></div>
          </div>
        </section>

        <div class="ticket-detail-layout">
          <section class="ticket-conversation">
            <div class="ticket-section-title"><div><h2>沟通记录</h2><p>这里只展示您与平台支持之间的公开消息</p></div><MessageSquareText :size="19" /></div>
            <div class="ticket-timeline"><article v-for="message in selected.messages" :key="message.id" :class="message.sender.toLowerCase()"><div class="ticket-message-meta"><strong>{{ message.sender === 'USER' ? '我' : message.sender === 'SUPPORT' ? '平台支持' : '系统通知' }}</strong><time>{{ message.createdAt }}</time></div><p>{{ message.content }}</p><div v-if="message.attachments?.length" class="message-attachments"><span v-for="file in message.attachments" :key="file.id"><Paperclip :size="13" />{{ file.name }}<small>{{ file.size }}</small></span></div></article></div>

            <div v-if="selected.status === 'RESOLVED'" class="ticket-resolution"><CheckCircle2 :size="20" /><div><strong>平台已给出解决方案</strong><p>{{ selected.resolution }}</p><div><button class="ticket-secondary" @click="showContinue = true"><RotateCcw :size="14" />问题仍未解决</button><button class="ticket-primary" @click="confirmResolution"><CheckCircle2 :size="14" />确认解决并关闭</button></div></div></div>
            <div v-if="showContinue" class="ticket-continue"><label>请说明仍未解决的原因<textarea v-model="continueReason" rows="4" maxlength="1000" placeholder="至少填写 5 个字符" /></label><div><button class="ticket-secondary" @click="showContinue = false">取消</button><button class="ticket-primary" :disabled="continueReason.trim().length < 5" @click="continueProcessing">申请继续处理</button></div></div>

            <div v-if="selected.status !== 'CLOSED' && selected.status !== 'RESOLVED'" class="ticket-reply">
              <div><strong>{{ selected.status === 'WAITING_USER' ? '平台正在等待您补充信息' : '补充信息' }}</strong><span>请勿提交完整 API Key 或敏感业务数据</span></div>
              <textarea v-model="reply" rows="5" maxlength="3000" placeholder="补充问题现象、公开 requestId 或已经尝试的处理方式" />
              <div v-if="replyAttachments.length" class="ticket-attachment-list"><div v-for="(item, index) in replyAttachments" :key="item.id"><FileText :size="15" /><span>{{ item.name }}<small>{{ item.size }}</small></span><button aria-label="移除附件" @click="removeAttachment(index, 'reply')"><X :size="14" /></button></div></div>
              <p v-if="attachmentError" class="ticket-form-error"><CircleAlert :size="15" />{{ attachmentError }}</p>
              <footer><label class="ticket-upload"><Paperclip :size="15" /><input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.log,.json" @change="addFiles($event, 'reply')" />添加附件</label><button class="ticket-primary" :disabled="!reply.trim() && !replyAttachments.length" @click="sendReply"><Send :size="14" />发送回复</button></footer>
            </div>
            <div v-if="selected.status === 'CLOSED'" class="ticket-closed-note"><TicketCheck :size="20" /><div><strong>该工单已关闭</strong><p>如问题再次出现，可以创建新工单并关联当前记录。</p></div><button class="ticket-secondary" @click="createRelated"><Plus :size="14" />创建关联工单</button></div>
          </section>

          <aside class="ticket-info">
            <section><h2>工单信息</h2><dl><div><dt>问题类型</dt><dd>{{ ticketCategoryNames[selected.category] }}</dd></div><div><dt>影响范围</dt><dd>{{ ticketImpactNames[selected.impact] }}</dd></div><div><dt>发生时间</dt><dd>{{ selected.occurredAt || '未填写' }}</dd></div><div><dt>当前身份</dt><dd>{{ isSub ? '研发子账户' : '主账户' }}</dd></div></dl></section>
            <section v-if="selected.references.length"><h2>关联信息</h2><div class="ticket-references"><component :is="reference.path ? 'a' : 'div'" v-for="reference in selected.references" :key="`${reference.type}-${reference.label}`" :href="reference.path ? `#${reference.path}` : undefined"><span><Link2 :size="14" />{{ reference.label }}</span><small>{{ reference.detail }}</small><ArrowUpRight v-if="reference.path" :size="13" /></component></div></section>
            <section><h2>安全提示</h2><div class="ticket-side-notice"><ShieldAlert :size="16" /><p>平台支持不会要求您在工单中发送完整密钥、密码或供应商凭证。</p></div></section>
          </aside>
        </div>
      </template>
    </template>
  </div>
</template>
