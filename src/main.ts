import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
const paths = ['/home', '/overview', '/services', '/api-keys', '/usage', '/pricing', '/models', '/models/:modelId', '/subaccounts', '/alerts', '/audit-logs', '/help/docs', '/help/docs/search', '/help/docs/:articleSlug(.*)', '/help/announcements', '/help/tickets', '/help/tickets/new', '/help/tickets/:ticketId', '/services/:serviceId', '/alerts/:alertId', '/help/announcements/:announcementId']
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/home' },
  { path: '/login', component: { template: '<div />' }, meta: { public: true } },
  ...paths.map(path => ({ path, component: { template: '<div />' }, meta: { public: path === '/home' || path === '/pricing' || path === '/models' || path.startsWith('/models/') || path.startsWith('/help/docs') } })),
  { path: '/:pathMatch(.*)*', redirect: '/home' }
] })
router.beforeEach(to => {
  const authenticated = sessionStorage.getItem('tokenhub-demo-session') !== null
  if (to.path === '/login' && authenticated) return '/overview'
  if (!to.meta.public && !authenticated) return { path: '/login', query: { redirect: to.fullPath } }
})
createApp(App).use(router).mount('#app')
