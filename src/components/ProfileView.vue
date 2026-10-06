<script setup lang="ts">
import { createUuid } from '../utils/uuid'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, RefreshCw, UserRound, ShieldCheck } from 'lucide-vue-next'
import { ProfileError, clearProfileCache, persistProfile, profileScenario, profileState, readProfile, validateAvatarFile, validateProfile, type UserProfile } from '../data/profile'
import './profile.css'
const router = useRouter()
const baseline = ref<UserProfile | null>(null), draft = ref<UserProfile | null>(null)
const loading = ref(true), loadingError = ref(''), saving = ref(false), uploading = ref(false), avatarError = ref(''), saveError = ref(''), notice = ref(''), avatarBroken = ref(false)
const errors = ref({ nickname: '', email: '' })
const confirmMode = ref<'leave' | 'reload' | ''>('')
const confirmation = ref<HTMLElement>(), continueButton = ref<HTMLButtonElement>()
let previousFocus: HTMLElement | null = null
watch(confirmMode, async value => { if (value) { previousFocus = document.activeElement as HTMLElement; await nextTick(); continueButton.value?.focus() } else previousFocus?.focus({ preventScroll: true }) })
let leaveDecision: ((value: boolean) => void) | undefined, active = true, generation = 0, uploadGeneration = 0
let retryFile: File | undefined, temporaryExpiresAt = 0
const dirty = computed(() => Boolean(draft.value && baseline.value && (draft.value.nickname !== baseline.value.nickname || (draft.value.email || '') !== (baseline.value.email || '') || draft.value.avatarAssetId !== baseline.value.avatarAssetId)))
const locked = computed(() => loading.value || saving.value || uploading.value)
const avatarChanged = computed(() => draft.value?.avatarAssetId !== baseline.value?.avatarAssetId)
function setSaved(profile: UserProfile) { baseline.value = { ...profile }; draft.value = { ...profile }; profileState.value = { ...profile }; temporaryExpiresAt = 0; errors.value = { nickname: '', email: '' }; avatarError.value = ''; saveError.value = ''; avatarBroken.value = false; retryFile = undefined }
async function read(retry = false) {
  const request = ++generation; loading.value = true; loadingError.value = ''; notice.value = ''
  try {
    if (profileScenario.value === 'loadError' && !retry) throw new Error('资料加载失败，请重试')
    const profile = await readProfile(); if (!active || request !== generation) return
    setSaved(profile)
  } catch (cause) {
    if (!active || request !== generation) return
    if (cause instanceof ProfileError && cause.code === 'SESSION') { sessionStorage.removeItem('tokenhub-demo-session'); clearProfileCache(); await router.replace('/login'); return }
    loadingError.value = '资料加载失败，请重试'
  } finally { if (active && request === generation) loading.value = false }
}
function cancel() { if (locked.value || !baseline.value) return; uploadGeneration++; setSaved(baseline.value); notice.value = '已取消修改' }
function requestReload() { if (locked.value) return; if (dirty.value) confirmMode.value = 'reload'; else void read(true) }
function decision(leave: boolean) {
  const mode = confirmMode.value; confirmMode.value = ''
  if (mode === 'leave') { leaveDecision?.(leave); leaveDecision = undefined }
  else if (leave) void read(true)
}
async function upload(file: File) {
  if (locked.value || !draft.value) return
  avatarError.value = ''; notice.value = ''
  const validation = validateAvatarFile(file)
  if (validation) { retryFile = undefined; avatarError.value = validation; return }
  retryFile = file; uploading.value = true; const request = ++uploadGeneration
  try {
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    const contentError = validateAvatarFile(file, bytes)
    if (contentError) throw new Error(contentError)
    const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('头像读取失败，请重试')); reader.readAsDataURL(file) })
    await new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('图片损坏或无法解码')); image.src = url })
    if (profileScenario.value === 'uploadError') throw new Error('头像上传失败，请切换正常场景后重试')
    if (!active || request !== uploadGeneration || !draft.value) return
    draft.value.avatarUrl = url; draft.value.avatarAssetId = `avatar-${createUuid()}`; temporaryExpiresAt = Date.now() + 24 * 3600000; avatarBroken.value = false
    notice.value = '头像已上传，仅供预览；点击保存后正式生效'
  } catch (cause) { if (active && request === uploadGeneration) avatarError.value = cause instanceof Error ? cause.message : '头像上传失败，请重试' }
  finally { if (active && request === uploadGeneration) uploading.value = false }
}
function choose(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) void upload(file); input.value = '' }
async function save() {
  if (locked.value || !dirty.value || !draft.value) return
  errors.value = validateProfile(draft.value.nickname, draft.value.email || '')
  saveError.value = ''; notice.value = ''
  if (errors.value.nickname || errors.value.email) return
  if (avatarChanged.value && temporaryExpiresAt <= Date.now()) { saveError.value = '临时头像已过期，请重新选择图片'; return }
  saving.value = true
  try {
    if (profileScenario.value === 'saveError') throw new ProfileError('FAILURE', '保存失败，输入和头像预览已保留，请重试')
    if (profileScenario.value === 'conflict') throw new ProfileError('CONFLICT', '资料已在其他窗口更新，请重新加载后修改')
    const profile = await persistProfile({ nickname: draft.value.nickname, email: draft.value.email || null, avatarAssetId: draft.value.avatarAssetId, avatarUrl: draft.value.avatarUrl, version: draft.value.version })
    if (profileScenario.value === 'timeout') throw new ProfileError('TIMEOUT', '保存结果暂未确认，请重试或重新加载资料确认')
    if (!active) return
    setSaved(profile); notice.value = '保存成功'
  } catch (cause) {
    if (!active) return
    if (cause instanceof ProfileError && cause.code === 'SESSION') { saving.value = false; draft.value = null; baseline.value = null; sessionStorage.removeItem('tokenhub-demo-session'); clearProfileCache(); await router.replace('/login'); return }
    saveError.value = cause instanceof Error ? cause.message : '保存失败，请重试'
  } finally { if (active) saving.value = false }
}
function scenarioChange() { if (profileScenario.value === 'loadError' && !dirty.value) void read() }
const stopGuard = router.beforeEach((to, from) => {
  if (from.path !== '/profile' || to.path === from.path) return true
  if (!sessionStorage.getItem('tokenhub-demo-session')) return true
  if (confirmMode.value) return false
  if (locked.value) { notice.value = '正在处理资料，请稍候再离开'; return false }
  if (!dirty.value) return true
  confirmMode.value = 'leave'
  return new Promise<boolean>(resolve => { leaveDecision = resolve })
})
function trap(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); decision(false); return }
  if (event.key !== 'Tab') return
  const buttons = confirmation.value?.querySelectorAll<HTMLButtonElement>('button')
  if (!buttons?.length) return
  const first = buttons[0]!, last = buttons[buttons.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value || uploading.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { active = false; generation++; uploadGeneration++; stopGuard(); window.removeEventListener('beforeunload', beforeUnload); leaveDecision?.(false); retryFile = undefined; draft.value = null; baseline.value = null })
void read()
</script>
<template>
  <div class="profile-view"><header><h1>我的账户</h1><p>查看和修改你的个人资料。</p></header>
    <div class="profile-demo"><label>页面场景<select v-model="profileScenario" aria-label="账户页面场景" :disabled="locked" @change="scenarioChange"><option value="normal">正常资料</option><option value="loadError">资料加载失败</option><option value="uploadError">头像上传失败</option><option value="saveError">保存失败</option><option value="timeout">保存结果未确认</option><option value="conflict">资料版本冲突</option><option value="logoutError">退出失败</option></select></label><span>本地演示 · 不上传到真实服务</span></div>
    <section v-if="loading" class="profile-card profile-state" role="status"><RefreshCw :size="27" class="spinning" />正在加载资料</section>
    <section v-else-if="loadingError" class="profile-card profile-state" role="alert"><strong>{{ loadingError }}</strong><button class="profile-primary" @click="read(true)">重试</button></section>
    <form v-else-if="draft" class="profile-card" @submit.prevent="save"><h2>个人资料</h2><div v-if="notice" class="profile-notice" role="status">{{ notice }}</div>
      <div class="profile-row"><span class="profile-field-name">头像</span><div><div class="profile-avatar-row"><div class="profile-avatar"><img v-if="draft.avatarUrl && !avatarBroken" :src="draft.avatarUrl" alt="头像预览" @error="avatarBroken = true" /><UserRound v-else :size="32" /></div><label class="profile-upload"><Camera :size="15" />{{ uploading ? '上传中…' : '更换头像' }}<input type="file" accept="image/jpeg,image/png" aria-label="选择头像图片" :disabled="locked" @change="choose" /></label><button v-if="avatarError && retryFile" type="button" class="profile-secondary" :disabled="locked" @click="upload(retryFile)">重试上传</button></div><small>支持 JPG、PNG，最大 2 MB；保存后生效。</small><p v-if="avatarError" class="profile-error" role="alert">{{ avatarError }}</p></div></div>
      <div class="profile-row"><label for="profile-nickname">用户昵称 <span class="profile-required">*</span></label><div><input id="profile-nickname" v-model="draft.nickname" :disabled="locked" autocomplete="nickname" placeholder="请输入用户昵称" :aria-invalid="Boolean(errors.nickname)" @input="errors.nickname = ''; notice = ''" /><small>去除首尾空格后 1～32 个字符，允许中文。</small><p v-if="errors.nickname" class="profile-error" role="alert">{{ errors.nickname }}</p></div></div>
      <div class="profile-row"><span class="profile-field-name">绑定手机号</span><div><div class="profile-mobile"><strong>{{ draft.mobileMasked || '未绑定' }}</strong><span><ShieldCheck :size="12" />只读</span></div><small>登录账号，暂不支持在此修改。</small></div></div>
      <div class="profile-row"><label for="profile-email">邮箱</label><div><input id="profile-email" v-model="draft.email" type="text" :disabled="locked" autocomplete="email" placeholder="选填，如 name@example.com" :aria-invalid="Boolean(errors.email)" @input="errors.email = ''; notice = ''" /><small>仅作为联系方式，保存不代表已验证，也不改变登录凭证。留空保存可清除。</small><p v-if="errors.email" class="profile-error" role="alert">{{ errors.email }}</p></div></div>
      <p v-if="saveError" class="profile-error profile-save-error" role="alert">{{ saveError }}<button type="button" :disabled="locked" @click="requestReload">重新加载资料</button></p>
      <footer><span v-if="dirty" class="profile-unsaved">有未保存修改</span><div><button class="profile-secondary" type="button" :disabled="locked || !dirty" @click="cancel">取消修改</button><button class="profile-primary" type="submit" :disabled="locked || !dirty">{{ saving ? '保存中…' : '保存' }}</button></div></footer>
    </form>
    <Teleport to="body"><div v-if="confirmMode" class="profile-confirm-layer" @keydown="trap"><section ref="confirmation" class="profile-confirm" role="dialog" aria-modal="true" aria-labelledby="profile-confirm-title"><h2 id="profile-confirm-title">{{ confirmMode === 'leave' ? '修改尚未保存，是否离开？' : '重新加载将丢弃当前修改，是否继续？' }}</h2><p>尚未保存的昵称、邮箱和头像预览将被丢弃。</p><div><button ref="continueButton" class="profile-secondary" @click="decision(false)">继续编辑</button><button class="profile-primary" @click="decision(true)">{{ confirmMode === 'leave' ? '放弃修改并离开' : '放弃修改并重新加载' }}</button></div></section></div></Teleport>
  </div>
</template>
