import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
const paths = ['/overview', '/services', '/api-keys', '/usage', '/models', '/models/:modelId', '/subaccounts', '/alerts', '/audit-logs', '/requirements', '/help/docs', '/help/announcements', '/help/tickets', '/services/:serviceId', '/alerts/:alertId', '/help/announcements/:announcementId']
const router = createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', redirect: '/overview' },
  ...paths.map(path => ({ path, component: { template: '<div />' } })),
  { path: '/:pathMatch(.*)*', redirect: '/overview' }
] })
createApp(App).use(router).mount('#app')
