<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, BookOpen, CheckCircle2, KeyRound, Layers3, LockKeyhole, MessageSquareText, ShieldCheck } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const phone = ref('13800138000')
const code = ref('')
const agreed = ref(false)
const submitting = ref(false)
const error = ref('')
const countdown = ref(0)
let timer: number | undefined

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value.trim()))
const canSubmit = computed(() => phoneValid.value && code.value.length === 6 && agreed.value && !submitting.value)

function sendCode() {
  error.value = ''
  if (!phoneValid.value) {
    error.value = '请输入正确的 11 位手机号'
    return
  }
  countdown.value = 60
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(timer)
  }, 1000)
}

async function login() {
  error.value = ''
  if (!phoneValid.value) {
    error.value = '请输入正确的 11 位手机号'
    return
  }
  if (code.value !== '123456') {
    error.value = '验证码不正确，演示环境请输入 123456'
    return
  }
  if (!agreed.value) {
    error.value = '请先阅读并同意服务协议和隐私政策'
    return
  }
  submitting.value = true
  await new Promise(resolve => window.setTimeout(resolve, 450))
  sessionStorage.setItem('tokenhub-demo-session', JSON.stringify({
    authenticated: true,
    phoneMasked: `${phone.value.slice(0, 3)}****${phone.value.slice(-4)}`,
    accountType: 'PRIMARY',
    authenticatedAt: new Date().toISOString(),
  }))
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/models'
  await router.replace(redirect === '/login' ? '/models' : redirect)
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <main class="login-page">
    <section class="login-intro" aria-label="TokenHub 平台介绍">
      <div class="login-brand"><span><Layers3 :size="27" /></span><strong>Token<i>Hub</i><small>用户门户</small></strong></div>
      <div class="login-copy">
        <span class="login-eyebrow">多模型统一接入平台</span>
        <h1>一个入口，连接和管理<br />您的模型服务</h1>
        <p>统一查看服务额度、API 密钥、模型目录与调用用量，让模型接入和日常使用更清晰。</p>
        <ul>
          <li><span><KeyRound :size="18" /></span><div><strong>统一模型接入</strong><small>使用一个平台密钥访问已开通的模型能力</small></div></li>
          <li><span><ShieldCheck :size="18" /></span><div><strong>账户与额度保护</strong><small>调用前校验服务状态与可用额度</small></div></li>
          <li><span><BookOpen :size="18" /></span><div><strong>用量清晰可查</strong><small>按模型、密钥和时间查看调用记录</small></div></li>
        </ul>
      </div>
      <p class="login-intro-foot">TokenHub · 多模型统一接入平台</p>
    </section>

    <section class="login-panel">
      <div class="login-card"><RouterLink class="login-return" to="/home">← 返回首页</RouterLink>
        <div class="login-card-icon"><LockKeyhole :size="23" /></div>
        <h2>登录用户门户</h2>
        <p>使用已开通 TokenHub 服务的手机号登录</p>
        <form @submit.prevent="login">
          <label><span>手机号</span><div class="login-field" :class="{ invalid: error && !phoneValid }"><span class="country-code">+86</span><input v-model="phone" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="请输入手机号" aria-label="手机号" @input="error = ''" /></div></label>
          <label><span>短信验证码</span><div class="login-field code-field"><MessageSquareText :size="17" /><input v-model="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="请输入 6 位验证码" aria-label="短信验证码" @input="error = ''" /><button type="button" :disabled="countdown > 0" @click="sendCode">{{ countdown > 0 ? `${countdown}s 后重试` : '获取验证码' }}</button></div></label>
          <div class="login-demo-tip"><CheckCircle2 :size="15" /><span>演示环境验证码：<strong>123456</strong></span></div>
          <label class="login-agreement"><input v-model="agreed" type="checkbox" @change="error = ''" /><span>我已阅读并同意<a href="#" @click.prevent>《服务协议》</a>和<a href="#" @click.prevent>《隐私政策》</a></span></label>
          <div v-if="error" class="login-error" role="alert">{{ error }}</div>
          <button class="login-submit" type="submit" :disabled="!canSubmit">{{ submitting ? '正在登录…' : '登录' }}<ArrowRight v-if="!submitting" :size="17" /></button>
        </form>
        <div class="login-help"><span>尚未开通 TokenHub 服务？</span><a href="#" @click.prevent>请通过业务办理渠道开通</a></div>
      </div>
      <p class="login-copyright">登录遇到问题，请联系平台服务人员</p>
    </section>
  </main>
</template>
