import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { legacyDocSlugs } from './data/docs'
import { logoutRequested } from './data/profile'
const paths = ['/home', '/overview', '/services', '/api-keys', '/usage', '/models', '/models/:modelId', '/subaccounts', '/alerts', '/audit-logs', '/profile', '/docs', '/docs/search', '/docs/articles/:articleSlug', '/announcements', '/announcements/:announcementId', '/tickets', '/tickets/new', '/tickets/:ticketId', '/services/:serviceId', '/alerts/:alertId']
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: () => sessionStorage.getItem('tokenhub-demo-session') ? '/models' : '/home' },
  { path: '/login', component: { template: '<div />' }, meta: { public: true } },
  { path: '/account/alerts', redirect: to => ({ path: '/alerts', query: to.query }) },
  { path: '/help/announcements', redirect: to => ({ path: '/announcements', query: to.query }) },
  { path: '/help/announcements/:announcementId', redirect: to => ({ path: `/announcements/${to.params.announcementId}`, query: to.query }) },
  { path: '/help/tickets', redirect: to => ({ path: '/tickets', query: to.query }) },
  { path: '/help/tickets/new', redirect: to => ({ path: '/tickets/new', query: to.query }) },
  { path: '/help/tickets/:ticketId', redirect: to => ({ path: `/tickets/${to.params.ticketId}`, query: to.query }) },
  { path: '/help/docs', redirect: to => ({ path: '/docs', query: to.query, hash: to.hash }) },
  { path: '/help/docs/search', redirect: to => ({ path: '/docs/search', query: to.query }) },
  { path: '/help/docs/:articleSlug(.*)', redirect: to => ({ path: `/docs/articles/${legacyDocSlugs[String(to.params.articleSlug)] || to.params.articleSlug}`, query: to.query, hash: to.hash }) },
  ...paths.map(path => ({ path, component: { template: '<div />' }, meta: { public: path === '/home' } })),
  { path: '/:pathMatch(.*)*', redirect: '/home' }
] })
router.beforeEach(to => {
  const authenticated = sessionStorage.getItem('tokenhub-demo-session') !== null
  if (to.path === '/login' && authenticated && !logoutRequested.value) return '/models'
  if (!to.meta.public && !authenticated) return { path: '/login', query: { redirect: to.fullPath } }
})
createApp(App).use(router).mount('#app')
