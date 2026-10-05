<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PublicLayout from './components/PublicLayout.vue'
import HomeView from './components/HomeView.vue'
import OverviewView from './components/OverviewView.vue'
import AuditView from './components/AuditView.vue'
import AlertView from './components/AlertView.vue'
import UsageView from './components/UsageView.vue'
import ModelsView from './components/ModelsView.vue'
import AnnouncementsView from './components/AnnouncementsView.vue'
import DocsView from './components/DocsView.vue'
import TicketsView from './components/TicketsView.vue'
import LoginView from './components/LoginView.vue'
import ProfileView from './components/ProfileView.vue'
import AccountServicesView from './components/AccountServicesView.vue'
import { clearProfileCache, hydrateProfile, logoutRequested, profileScenario, profileState } from './data/profile'
import './components/overview.css'
import './components/announcements.css'
import './components/tickets.css'
import './components/login.css'
import './components/account-menu.css'
import './components/docs-layout.css'
import './components/account-center.css'
import { isNavigationFailure, useRoute, useRouter } from 'vue-router'
import { Layers3, LayoutDashboard, Package, KeyRound, ChartNoAxesCombined, Boxes, UsersRound, Bell, ClipboardList, BookOpen, Megaphone, MessagesSquare, ChevronDown, ChevronRight, ChevronsLeft, Menu, ArrowUpRight, PanelTop, LogOut, House, UserRound, WalletCards, Coins, ReceiptText } from 'lucide-vue-next'
const route = useRoute()
const router = useRouter()
const authenticated = ref(sessionStorage.getItem('tokenhub-demo-session') !== null)
const isSub = ref(false)
const mobileOpen = ref(false)
const compact = ref(false)
const accountMenuOpen = ref(false)
const accountCenterOpen = ref(true)
const logoutBusy = ref(false), logoutError = ref(''), headerAvatarBroken = ref(false)
watch(() => profileState.value?.avatarUrl, () => { headerAvatarBroken.value = false })
watch(authenticated, value => { if (value) void hydrateProfile(); else clearProfileCache() }, { immediate: true })
const mainItems = [
  { path: '/overview', title: '概览', icon: LayoutDashboard, description: '在这里了解账户、服务与近期用量。' },
  { path: '/services', title: '我的服务', icon: Package, description: '查看已订购的服务、可用额度与套餐信息。' },
  { path: '/api-keys', title: '密钥管理', icon: KeyRound, description: '管理用于模型调用的访问凭证。' },
  { path: '/usage', title: '用量中心', icon: ChartNoAxesCombined, description: '了解模型调用的用量分布与逐笔明细。' },
  { path: '/models', title: '模型目录', icon: Boxes, description: '探索平台提供的模型能力与接入信息。' },
  { path: '/subaccounts', title: '子账户管理', icon: UsersRound, description: '管理子账户及其可使用的服务额度。' },
  { path: '/alerts', title: '告警管理', icon: Bell, description: '查看余额、Token 包余量与异常请求告警。' },
  { path: '/audit-logs', title: '操作审计', icon: ClipboardList, description: '查看当前账户的关键操作记录。' },
  { path: '/balances', title: '余量查看', icon: Coins, description: '查看账户服务的可用余量与额度信息。' },
  { path: '/orders', title: '订单记录', icon: ReceiptText, description: '查看服务订购与订单记录。' }
]
const homeItem = { path: '/home', title: '首页', icon: House, description: '了解 TokenHub 平台与模型接入。' }
const helpItems = [
  { path: '/docs', title: '接入文档', icon: BookOpen, description: '查阅 API 接入指南与使用说明。' },
  { path: '/announcements', title: '平台公告', icon: Megaphone, description: '查看模型上下架、维护通知等平台消息。' },
  { path: '/tickets', title: '工单反馈', icon: MessagesSquare, description: '提交问题反馈并跟踪处理进展。' }
]
const visibleItems = computed(() => mainItems.filter(item => item.path !== '/subaccounts' && (!isSub.value || item.path !== '/audit-logs')))
const accountPaths = ['/usage', '/services', '/balances', '/orders', '/api-keys']
const accountItems = computed(() => accountPaths.map(path => mainItems.find(item => item.path === path)!))
const accountCenterActive = computed(() => accountPaths.some(path => route.path === path || route.path.startsWith(path + '/')))
function toggleAccountCenter() { if (compact.value) { compact.value = false; accountCenterOpen.value = true } else accountCenterOpen.value = !accountCenterOpen.value }
const profileItem = { path: '/profile', title: '我的账户', icon: UserRound, description: '查看和修改你的个人资料。' }
const current = computed(() => [homeItem, ...mainItems, ...helpItems, profileItem].find(item => item.path === route.path || route.path.startsWith(item.path + '/')) ?? mainItems[0]!)
const pageLabel = computed(() => current.value.title)
async function logout() {
  if (logoutBusy.value) return
  logoutBusy.value = true; logoutError.value = ''; logoutRequested.value = true
  try {
    if (profileScenario.value === 'logoutError') { logoutError.value = '退出失败，请重试'; return }
    // Let the active form's navigation guard resolve before clearing the demo session.
    const failure = await router.push('/login')
    if (isNavigationFailure(failure)) return
    sessionStorage.removeItem('tokenhub-demo-session')
    clearProfileCache(); authenticated.value = false; accountMenuOpen.value = false
  } catch { logoutError.value = '退出失败，请重试' }
  finally { logoutBusy.value = false; logoutRequested.value = false }
}
watch(() => route.path, path => {
  authenticated.value = sessionStorage.getItem('tokenhub-demo-session') !== null
  mobileOpen.value = false
  accountMenuOpen.value = false
  if (accountPaths.some(item => path === item || path.startsWith(item + '/'))) accountCenterOpen.value = true
  if (isSub.value && path === '/subaccounts') router.replace('/overview')
})
</script>

<template>
  <LoginView v-if="route.path === '/login'" />
  <PublicLayout v-else-if="!authenticated">
    <HomeView v-if="route.path === '/home'" :authenticated="false" />
    <ModelsView v-else-if="route.path === '/models' || route.path.startsWith('/models/')" :is-sub="false" guest />
  </PublicLayout>
  <div v-else class="portal" :class="{ compact }">
    <button v-if="mobileOpen" class="mobile-shade" aria-label="关闭菜单" @click="mobileOpen = false" />
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <RouterLink class="brand" to="/overview" aria-label="TokenHub 控制台">
        <span class="brand-mark"><Layers3 :size="23" :stroke-width="2" /></span>
        <span class="brand-text">Token<span>Hub</span><small>用户门户</small></span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink v-for="item in visibleItems.filter(item => !accountPaths.includes(item.path) && !['/audit-logs', '/alerts'].includes(item.path))" :key="item.path" :to="item.path" class="nav-link" :title="item.title" :class="{ selected: (route.path === item.path || route.path.startsWith(item.path + '/')) }" :aria-current="(route.path === item.path || route.path.startsWith(item.path + '/')) ? 'page' : undefined">
          <component :is="item.icon" :size="19" :stroke-width="1.7" /><span>{{ item.title }}</span>
        </RouterLink>
        <button class="nav-link account-center-toggle" :class="{ active: accountCenterActive }" title="账户中心" :aria-expanded="!compact && accountCenterOpen" aria-controls="account-center-children" @click="toggleAccountCenter"><WalletCards :size="19" :stroke-width="1.7" /><span>账户中心</span><ChevronDown class="account-center-chevron" :size="15" :class="{ closed: !accountCenterOpen }" /></button>
        <div v-if="!compact && accountCenterOpen" id="account-center-children" class="account-center-children"><RouterLink v-for="item in accountItems" :key="item.path" :to="item.path" class="child-link" :title="item.title" :class="{ selected: route.path === item.path || route.path.startsWith(item.path + '/') }" :aria-current="(route.path === item.path || route.path.startsWith(item.path + '/')) ? 'page' : undefined"><component :is="item.icon" :size="16" :stroke-width="1.7" /><span>{{ item.title }}</span></RouterLink></div>
        <RouterLink to="/alerts" class="nav-link" title="告警管理" :class="{ selected: route.path === '/alerts' || route.path.startsWith('/alerts/') }" :aria-current="route.path === '/alerts' || route.path.startsWith('/alerts/') ? 'page' : undefined"><Bell :size="19" :stroke-width="1.7" /><span>告警管理</span></RouterLink>
      </nav>
      <div class="sidebar-fixed-docs"><RouterLink to="/docs" class="nav-link" title="接入文档" :class="{ selected: route.path === '/docs' || route.path.startsWith('/docs/') }" :aria-current="route.path === '/docs' || route.path.startsWith('/docs/') ? 'page' : undefined"><BookOpen :size="19" :stroke-width="1.7" /><span>接入文档</span></RouterLink></div>
      <div class="sidebar-fixed-tickets"><RouterLink to="/tickets" class="nav-link" title="工单反馈" :class="{ selected: route.path === '/tickets' || route.path.startsWith('/tickets/') }" :aria-current="route.path === '/tickets' || route.path.startsWith('/tickets/') ? 'page' : undefined"><MessagesSquare :size="19" :stroke-width="1.7" /><span>工单反馈</span></RouterLink></div>
      <div class="sidebar-bottom"><span class="environment-dot" /><span class="sidebar-bottom-label">用户门户</span><button class="icon-button collapse-button" :aria-label="compact ? '展开侧栏' : '收起侧栏'" @click="compact = !compact"><ChevronsLeft :size="17" :class="{ rotated: compact }" /></button></div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb"><button class="icon-button mobile-menu" aria-label="打开菜单" @click="mobileOpen = true"><Menu :size="21" /></button><span>用户门户</span><ChevronRight :size="14" /><span v-if="accountCenterActive">账户中心</span><ChevronRight v-if="accountCenterActive" :size="14" /><strong>{{ current.title }}</strong></div>
        <div class="top-actions"><RouterLink v-if="!authenticated" class="public-login" to="/login">登录</RouterLink><template v-else><RouterLink v-if="route.meta.public" class="docs-link" to="/overview">进入控制台</RouterLink><RouterLink class="top-announcements" to="/announcements" :class="{ active: route.path.startsWith('/announcements') }"><Megaphone :size="16" />平台公告</RouterLink><span class="demo-badge">DEMO</span><span class="top-divider" /><div class="account-menu-control" @keydown.esc="accountMenuOpen = false"><button class="account-control account-fixed" aria-label="我的头像" :aria-expanded="accountMenuOpen" aria-controls="account-menu" @click="accountMenuOpen = !accountMenuOpen"><span class="avatar"><img v-if="profileState?.avatarUrl && !headerAvatarBroken" :src="profileState.avatarUrl" alt="" @error="headerAvatarBroken = true" /><UserRound v-else :size="18" /></span><span class="account-label" :title="profileState?.nickname || '未设置'">{{ profileState ? profileState.nickname || '未设置' : '张三' }}<small>当前账户</small></span><ChevronDown :size="14" /></button><template v-if="accountMenuOpen"><button class="account-menu-backdrop" aria-label="关闭头像菜单" @click="accountMenuOpen = false" /><div id="account-menu" class="account-menu"><RouterLink to="/profile" @click="accountMenuOpen = false"><UserRound :size="16" />我的账户</RouterLink><RouterLink to="/audit-logs" @click="accountMenuOpen = false"><ClipboardList :size="16" />操作审计</RouterLink><button :disabled="logoutBusy" @click="logout"><LogOut :size="16" />{{ logoutBusy ? '正在退出…' : '退出登录' }}</button><p v-if="logoutError" class="account-menu-error" role="alert">{{ logoutError }}</p></div></template></div></template></div>
      </header>

      <main>
        <OverviewView v-if="route.path === '/overview'" :is-sub="isSub" />
        <UsageView v-else-if="route.path === '/usage'" :is-sub="isSub" />
        <AccountServicesView v-else-if="['/services', '/balances', '/orders', '/api-keys'].includes(route.path)" />
        <ModelsView v-else-if="route.path === '/models' || route.path.startsWith('/models/')" :is-sub="isSub" :guest="!authenticated" />
        <AlertView v-else-if="route.path === '/alerts' || route.path.startsWith('/alerts/')" />
        <AuditView v-else-if="route.path === '/audit-logs'" />
        <ProfileView v-else-if="route.path === '/profile'" />
        <AnnouncementsView v-else-if="route.path === '/announcements' || route.path.startsWith('/announcements/')" />
        <DocsView v-else-if="route.path === '/docs' || route.path.startsWith('/docs/')" />
        <TicketsView v-else-if="route.path === '/tickets' || route.path.startsWith('/tickets/')" />
        <div v-else class="page-heading"><div><h1>{{ current.title }}</h1><p>{{ current.description }}</p></div><RouterLink class="docs-link" to="/docs"><BookOpen :size="16" />接入文档<ArrowUpRight :size="15" /></RouterLink></div>
        <section v-if="!['/home', '/overview', '/usage', '/audit-logs', '/profile', '/services', '/balances', '/orders', '/api-keys'].includes(route.path) && !route.path.startsWith('/alerts') && !route.path.startsWith('/models') && !route.path.startsWith('/announcements') && !route.path.startsWith('/docs') && !route.path.startsWith('/tickets')" class="page-panel" :aria-label="pageLabel">
          <div class="panel-header"><span>{{ current.title }}</span><span class="placeholder-badge">页面预留</span></div>
          <p v-if="route.path === '/services' && route.query.section === 'keys'" class="docs-demo-note">已定位到“我的服务”的密钥管理入口。当前服务页面仍为演示预留，尚未接入实际创建密钥功能。</p>
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
