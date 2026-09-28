<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OverviewView from './components/OverviewView.vue'
import AuditView from './components/AuditView.vue'
import AlertView from './components/AlertView.vue'
import UsageView from './components/UsageView.vue'
import ModelsView from './components/ModelsView.vue'
import RequirementsView from './components/RequirementsView.vue'
import './components/overview.css'
import { useRoute, useRouter } from 'vue-router'
import { Layers3, LayoutDashboard, Package, KeyRound, ChartNoAxesCombined, Boxes, UsersRound, Bell, ClipboardList, CircleHelp, BookOpen, Megaphone, MessagesSquare, ChevronDown, ChevronRight, ChevronsLeft, Menu, ArrowUpRight, PanelTop, Check, X } from 'lucide-vue-next'
const route = useRoute()
const router = useRouter()
const isSub = ref(false)
const mobileOpen = ref(false)
const compact = ref(false)
const helpOpen = ref(true)
const accountOpen = ref(false)
const alertUnread = ref(4)
const requirementsItem = { path: '/requirements', title: '需求文档', icon: BookOpen, description: '查阅用户门户需求与技术设计。' }
const mainItems = [
  { path: '/overview', title: '概览', icon: LayoutDashboard, description: '在这里了解账户、服务与近期用量。' },
  { path: '/services', title: '我的服务', icon: Package, description: '查看已订购的服务、可用额度与套餐信息。' },
  { path: '/api-keys', title: 'API 密钥', icon: KeyRound, description: '管理用于模型调用的访问凭证。' },
  { path: '/usage', title: '用量中心', icon: ChartNoAxesCombined, description: '了解模型调用的用量分布与逐笔明细。' },
  { path: '/models', title: '模型目录', icon: Boxes, description: '探索平台提供的模型能力与接入信息。' },
  { path: '/subaccounts', title: '子账户管理', icon: UsersRound, description: '管理子账户及其可使用的服务额度。' },
  { path: '/alerts', title: '告警中心', icon: Bell, description: '查看额度提醒与异常调用告警。' },
  { path: '/audit-logs', title: '操作审计', icon: ClipboardList, description: '查阅账户下的关键操作记录。' }
]
const helpItems = [
  { path: '/help/docs', title: '接入文档', icon: BookOpen, description: '查阅 API 接入指南与使用说明。' },
  { path: '/help/announcements', title: '平台公告', icon: Megaphone, description: '了解模型更新、维护通知与平台动态。' },
  { path: '/help/tickets', title: '我的工单', icon: MessagesSquare, description: '提交问题反馈并跟踪处理进展。' }
]
const visibleItems = computed(() => mainItems.filter(item => !isSub.value || !['/subaccounts', '/audit-logs'].includes(item.path)))
const current = computed(() => [...mainItems, ...helpItems, requirementsItem].find(item => item.path === route.path || route.path.startsWith(item.path + '/')) ?? mainItems[0]!)
const helpActive = computed(() => route.path.startsWith('/help'))
const pageLabel = computed(() => current.value.title)
function switchAccount(value: boolean) {
  isSub.value = value
  alertUnread.value = value ? 2 : 4
  accountOpen.value = false
  if (value && route.path === '/subaccounts') router.replace('/overview')
}
watch(() => route.path, path => {
  mobileOpen.value = false
  if (path.startsWith('/help')) helpOpen.value = true
  if (isSub.value && path === '/subaccounts') router.replace('/overview')
})
</script>

<template>
  <div class="portal" :class="{ compact }">
    <button v-if="mobileOpen" class="mobile-shade" aria-label="关闭菜单" @click="mobileOpen = false" />
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <RouterLink class="brand" to="/overview" aria-label="TokenHub 首页">
        <span class="brand-mark"><Layers3 :size="23" :stroke-width="2" /></span>
        <span class="brand-text">Token<span>Hub</span><small>用户门户</small></span>
      </RouterLink>
      <div class="nav-caption">工作空间</div>
      <nav aria-label="主导航">
        <RouterLink v-for="item in visibleItems" :key="item.path" :to="item.path" class="nav-link" :title="item.title" :class="{ selected: (route.path === item.path || route.path.startsWith(item.path + '/')) }" :aria-current="(route.path === item.path || route.path.startsWith(item.path + '/')) ? 'page' : undefined">
          <component :is="item.icon" :size="19" :stroke-width="1.7" /><span>{{ item.title }}</span><span v-if="item.path === '/subaccounts'" class="owner-tag">主账户</span>
        </RouterLink>
        <div class="nav-divider" />
        <button class="nav-link help-toggle" :class="{ 'help-selected': helpActive }" :aria-expanded="helpOpen" title="帮助与支持" @click="helpOpen = !helpOpen; compact = false">
          <CircleHelp :size="19" :stroke-width="1.7" /><span>帮助与支持</span><ChevronDown class="help-chevron" :size="15" :class="{ closed: !helpOpen }" />
        </button>
        <div v-if="helpOpen && !compact" class="help-children">
          <RouterLink v-for="item in helpItems" :key="item.path" :to="item.path" class="child-link" :class="{ selected: (route.path === item.path || route.path.startsWith(item.path + '/')) }" :aria-current="(route.path === item.path || route.path.startsWith(item.path + '/')) ? 'page' : undefined"><span class="child-dot" />{{ item.title }}</RouterLink>
        </div>
      </nav>
      <div class="sidebar-bottom"><span class="environment-dot" /><span class="sidebar-bottom-label">用户门户</span><button class="icon-button collapse-button" :aria-label="compact ? '展开侧栏' : '收起侧栏'" @click="compact = !compact"><ChevronsLeft :size="17" :class="{ rotated: compact }" /></button></div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb"><button class="icon-button mobile-menu" aria-label="打开菜单" @click="mobileOpen = true"><Menu :size="21" /></button><span>用户门户</span><ChevronRight :size="14" /><span v-if="helpActive">帮助与支持</span><ChevronRight v-if="helpActive" :size="14" /><strong>{{ current.title }}</strong></div>
        <div class="top-actions"><RouterLink class="top-alert-link" to="/alerts" aria-label="查看告警中心"><Bell :size="17" /><span v-if="alertUnread">{{ alertUnread > 99 ? '99+' : alertUnread }}</span></RouterLink><RouterLink class="requirements-link" :class="{ active: route.path === '/requirements' }" to="/requirements"><BookOpen :size="16" />需求文档</RouterLink><span class="demo-badge">DEMO</span><span class="top-divider" /><div class="account-control" @keydown.esc="accountOpen = false">
          <button class="account-button" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen"><span class="avatar">{{ isSub ? '子' : '主' }}</span><span class="account-label">{{ isSub ? '研发子账户' : '主账户' }}<small>{{ isSub ? '子账户' : '主账户管理员' }}</small></span><ChevronDown :size="14" /></button>
          <template v-if="accountOpen"><button class="dropdown-backdrop" aria-label="关闭账户选择" @click="accountOpen = false" /><div class="account-dropdown"><div class="dropdown-title">切换账户身份<button class="icon-button" aria-label="关闭" @click="accountOpen = false"><X :size="14" /></button></div><button @click="switchAccount(false)"><span>主账户<small>展示全部菜单</small></span><Check v-if="!isSub" :size="16" /></button><button @click="switchAccount(true)"><span>研发子账户<small>隐藏子账户管理与操作审计</small></span><Check v-if="isSub" :size="16" /></button></div></template>
        </div></div>
      </header>

      <main>
        <OverviewView v-if="route.path === '/overview'" :is-sub="isSub" />
        <UsageView v-else-if="route.path === '/usage'" :is-sub="isSub" />
        <ModelsView v-else-if="route.path === '/models' || route.path.startsWith('/models/')" :is-sub="isSub" />
        <AlertView v-else-if="route.path === '/alerts' || route.path.startsWith('/alerts/')" :is-sub="isSub" @unread-count="alertUnread = $event" />
        <AuditView v-else-if="route.path === '/audit-logs'" :is-sub="isSub" />
        <RequirementsView v-else-if="route.path === '/requirements'" />
        <div v-else class="page-heading"><div><div class="eyebrow">TOKENHUB CONSOLE</div><h1>{{ current.title }}</h1><p>{{ current.description }}</p></div><RouterLink v-if="route.path !== '/help/docs'" class="docs-link" to="/help/docs"><BookOpen :size="16" />接入文档<ArrowUpRight :size="15" /></RouterLink></div>
        <section v-if="!['/overview', '/usage', '/audit-logs', '/requirements'].includes(route.path) && !route.path.startsWith('/alerts') && !route.path.startsWith('/models')" class="page-panel" :aria-label="pageLabel">
          <div class="panel-header"><span>{{ current.title }}</span><span class="placeholder-badge">页面预留</span></div>
          <div class="empty-canvas">
            <div class="empty-art"><div class="art-halo" /><div class="art-window"><div class="art-window-bar"><i /><i /><i /></div><div class="art-window-body"><span class="art-mini-icon"><component :is="current.icon" :size="23" :stroke-width="1.4" /></span><div class="art-lines"><i /><i /></div></div><div class="art-skeleton"><i /><i /><i /></div></div><span class="art-corner"><PanelTop :size="17" /></span></div>
            <h2>{{ pageLabel }}</h2><p>该模块尚未接入，功能内容将在后续补充</p><span class="empty-note">{{ route.query.action === 'create' ? '已进入创建密钥入口，后续补充创建表单' : route.params.serviceId ? '当前服务：' + route.params.serviceId : route.params.alertId ? '当前告警：' + route.params.alertId : route.params.announcementId ? '当前公告：' + route.params.announcementId : route.query.serviceId ? '已按服务筛选：' + route.query.serviceId : route.query.startDate ? '统计范围：' + route.query.startDate + ' 至 ' + route.query.endDate : '当前展示用户门户的导航与页面结构' }}</span>
          </div>
        </section>
        <footer><span>TokenHub <span class="footer-dot">·</span> 多模型统一接入平台</span><span>用户门户</span></footer>
      </main>
    </div>
  </div>
</template>
