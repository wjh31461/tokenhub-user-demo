<script setup lang="ts">
import { computed, ref } from 'vue'
import { catalogModels, modelTypeLabels } from '../data/models'
const keyword = ref('')
const models = computed(() => catalogModels.filter(model => `${model.name} ${model.code}`.toLowerCase().includes(keyword.value.trim().toLowerCase())))
</script>

<template>
  <section class="pricing-view">
    <div class="page-heading"><div><h1>模型定价</h1><p>按需选择模型，清晰了解每项能力的计费方式。</p></div><RouterLink class="docs-link" to="/help/docs">查看接入文档 ↗</RouterLink></div>
    <div class="pricing-intro"><span>透明计价 · 按量使用</span><h2>找到适合您业务的模型</h2><p>支持按输入、输出 Token、图片张数或服务额度倍率计费。以下为演示价格，实际价格以开通服务约定为准。</p></div>
    <label class="pricing-search">搜索模型<input v-model="keyword" type="search" placeholder="输入模型名称或代码" /></label>
    <div class="pricing-grid">
      <article v-for="model in models" :key="model.id" class="pricing-card"><span class="pricing-type">{{ modelTypeLabels[model.type] }}</span><h2>{{ model.name }}</h2><p>{{ model.summary }}</p><span class="pricing-method">{{ model.pricingType === 'MULTIPLIER' ? '服务额度倍率' : '按量计费' }}</span><dl><div v-for="price in model.prices" :key="price.name"><dt>{{ price.name }}</dt><dd><strong>{{ price.amount }}</strong><small>{{ price.unit }}</small></dd></div></dl><RouterLink :to="`/models/${model.id}`">查看模型详情 →</RouterLink></article>
    </div>
    <p v-if="!models.length" class="pricing-empty">未找到匹配模型，请尝试其他名称。</p>
  </section>
</template>

<style scoped>
.pricing-intro{padding:30px;border:1px solid #dedafa;border-radius:16px;background:linear-gradient(120deg,#eeecff,#f0f6ff);margin-bottom:24px}.pricing-intro>span{font-size:13px;color:#6257e8}.pricing-intro h2{font-size:25px;margin:12px 0}.pricing-intro p{font-size:14px;color:#697286;line-height:1.8;max-width:750px}.pricing-search{display:flex;align-items:center;gap:16px;font-size:14px;margin-bottom:20px}.pricing-search input{width:320px;max-width:75%;padding:11px 14px;border:1px solid #deddea;border-radius:9px;background:white}.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.pricing-card{display:flex;flex-direction:column;padding:24px;border:1px solid #e5e3f0;border-radius:16px;background:white;box-shadow:0 6px 20px #36307005}.pricing-type{color:#6257e8;font-size:12px}.pricing-card h2{font-size:20px;margin:12px 0}.pricing-card p{font-size:13px;color:#697286;line-height:1.8;min-height:48px}.pricing-method{font-size:12px;color:#697286;margin-top:16px}.pricing-card dl{flex:1;margin:12px 0 24px}.pricing-card dl>div{padding:12px 0;border-bottom:1px solid #f0eef7;display:flex;justify-content:space-between;gap:12px}.pricing-card dt{font-size:13px;color:#697286}.pricing-card dd{margin:0;text-align:right}.pricing-card dd strong{font-size:16px}.pricing-card dd small{display:block;color:#8991a0;font-size:11px;margin-top:5px}.pricing-card>a{color:#6257e8;font-size:13px;text-decoration:none}.pricing-empty{text-align:center;padding:40px;color:#697286}@media(max-width:1100px){.pricing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.pricing-grid{grid-template-columns:1fr}.pricing-intro{padding:22px}}
</style>
