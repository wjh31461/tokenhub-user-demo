import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
const paths = ['/overview', '/services', '/api-keys', '/usage', '/models', '/models/:modelId', '/subaccounts', '/alerts', '/audit-logs', '/requirements', '/help/docs', '/help/docs/search', '/help/docs/:articleSlug(.*)', '/help/announcements', '/help/tickets', '/help/tickets/new', '/help/tickets/:ticketId', '/services/:serviceId', '/alerts/:alertId', '/help/announcements/:announcementId']
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/overview' },
  { path: '/login', component: { template: '<div />' }, meta: { public: true } },
  ...paths.map(path => ({ path, component: { template: '<div />' } })),
  { path: '/:pathMatch(.*)*', redirect: '/overview' }
] })
router.beforeEach(to => {
  const authenticated = sessionStorage.getItem('tokenhub-demo-session') !== null
  if (to.meta.public && authenticated) return '/overview'
  if (!to.meta.public && !authenticated) return { path: '/login', query: { redirect: to.fullPath } }
})
createApp(App).use(router).mount('#app')
