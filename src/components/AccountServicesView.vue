<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BalancesView from './BalancesView.vue'
import OrdersView from './OrdersView.vue'
import { KeyRound } from 'lucide-vue-next'
import './account-services.css'
const route = useRoute()
const page = computed(() => route.path === '/orders' ? 'orders' : route.path === '/api-keys' ? 'keys' : route.path === '/balances' ? 'balances' : 'services')
const title = computed(() => ({ services: '我的服务', orders: '订单记录', keys: '密钥管理', balances: '余量查看' })[page.value])
</script>
<template>
  <div class="account-services-view">
    <header class="account-service-page-heading"><h1>{{ title }}</h1><p v-if="page !== 'services'">{{ page === 'orders' ? '查看当前账户的历史服务订单，订单记录只读。' : page === 'keys' ? '管理用于模型调用的访问凭证。' : '查看各服务的可用 Token 及当前生效的 Token 包。' }}</p></header>
    <OrdersView v-if="page === 'orders'" />
    <BalancesView v-else-if="page === 'balances'" />
    <section v-else-if="page === 'keys'" class="account-service-card account-service-state"><KeyRound :size="32" /><strong>密钥管理</strong><p>该模块尚未接入，功能内容将在后续补充。</p></section>
  </div>
</template>
