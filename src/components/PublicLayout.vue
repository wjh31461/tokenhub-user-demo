<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ArrowRight, Layers3 } from 'lucide-vue-next'
const route = useRoute()
const items = [{ path: '/home', title: '首页' }, { path: '/models', title: '模型目录' }, { path: '/pricing', title: '定价' }, { path: '/help/docs', title: '接入文档' }]
const active = (path: string) => route.path === path || route.path.startsWith(path + '/')
</script>

<template>
  <div class="public-site">
    <header class="public-header"><div class="public-header-inner">
      <RouterLink class="public-brand" to="/home" aria-label="TokenHub 首页"><span><Layers3 :size="23" /></span><strong>Token<span>Hub</span></strong></RouterLink>
      <nav aria-label="公开导航"><RouterLink v-for="item in items" :key="item.path" :to="item.path" :class="{ active: active(item.path) }" :aria-current="active(item.path) ? 'page' : undefined">{{ item.title }}</RouterLink></nav>
      <RouterLink class="public-signin" to="/login">登录<ArrowRight :size="15" /></RouterLink>
    </div></header>
    <main class="public-content" :class="{ 'public-home': route.path === '/home' }"><slot /></main>
    <footer class="public-footer"><span>TokenHub · 多模型统一接入平台</span><nav aria-label="页脚导航"><RouterLink v-for="item in items.slice(1)" :key="item.path" :to="item.path">{{ item.title }}</RouterLink></nav></footer>
  </div>
</template>

<style scoped>
.public-site{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;background:#f8f9fd}.public-header{flex-shrink:0;background:#ffffffef;border-bottom:1px solid #e9e8f1}.public-header-inner{max-width:1200px;min-height:80px;margin:auto;display:flex;align-items:center;gap:36px;padding:18px 32px}.public-brand{display:flex;align-items:center;gap:10px;color:#252a3d;flex-shrink:0}.public-brand>span{display:flex;padding:9px;background:linear-gradient(135deg,#7466ef,#527ce8);border-radius:12px;color:white}.public-brand strong{font-size:23px;letter-spacing:-.8px}.public-brand strong span{color:#6257e8}.public-header nav{display:flex;align-items:center;gap:30px;margin:auto}.public-header nav a{font-size:14px;color:#606a80}.public-header nav a:hover,.public-header nav a.active{color:#6257e8}.public-signin{display:inline-flex;align-items:center;justify-content:center;gap:12px;color:white;background:linear-gradient(125deg,#6257e8,#5578e7);border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600;flex-shrink:0}.public-signin:hover{filter:brightness(.94)}.public-content{width:100%;max-width:1200px;margin:auto;flex:1 0 auto;padding:36px 32px 24px}.public-content.public-home{padding-top:0;padding-bottom:0}.public-footer{flex-shrink:0;width:calc(100% - 64px);max-width:1136px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:24px 0 32px;border-top:1px solid #e7e7f1;color:#8c93a5;font-size:12px}.public-footer nav{display:flex;gap:22px}.public-footer a{color:#8c93a5}.public-site a:focus-visible{outline:3px solid #bdb7ff;outline-offset:4px}@media(max-width:1000px){.public-header-inner{gap:20px}.public-header nav{gap:20px}}@media(max-width:720px){.public-header-inner{flex-wrap:wrap;gap:16px;padding:16px 20px}.public-header nav{order:3;width:100%;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px solid #eeecf6}.public-signin{margin-left:auto}.public-content{padding:28px 20px 20px}.public-footer{flex-shrink:0;width:calc(100% - 40px);flex-wrap:wrap;gap:16px;padding:24px 0}}
</style>
