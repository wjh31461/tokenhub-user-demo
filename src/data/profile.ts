import { createUuid } from '../utils/uuid'
import { ref } from 'vue'
import type { AuditChange, AuditRecord, AuditValue } from './audit'
export interface UserProfile { nickname: string; avatarUrl: string | null; avatarAssetId: string | null; mobileMasked: string | null; email: string | null; version: number }
export interface ProfileDraft { nickname: string; email: string | null; avatarAssetId: string | null; avatarUrl: string | null; version: number }
export const profileState = ref<UserProfile | null>(null)
export const profileScenario = ref('normal')
export const logoutRequested = ref(false)
export class ProfileError extends Error { constructor(public code: 'CONFLICT' | 'SESSION' | 'FAILURE' | 'TIMEOUT', message: string) { super(message) } }
const session = () => sessionStorage.getItem('tokenhub-demo-session')
function mobile() { try { return JSON.parse(session() || '{}').phoneMasked || null } catch { return null } }
const initial = (): UserProfile => ({ nickname: '张三', avatarUrl: null, avatarAssetId: null, mobileMasked: mobile(), email: 'zhangsan@example.com', version: 1 })
export function validateProfile(nickname: string, email: string) {
  const length = Array.from(nickname.trim()).length
  return { nickname: length < 1 || length > 32 ? '昵称去除首尾空格后须为 1～32 个字符' : '', email: email.trim().length > 254 || (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ? '请输入有效邮箱，最长 254 个字符' : '' }
}
export function validateAvatarFile(file: Pick<File, 'name' | 'type' | 'size'>, header?: Uint8Array) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) return '头像仅支持 JPG、JPEG、PNG 图片'
  if (file.size > 2 * 1024 * 1024) return '头像图片不能超过 2 MB'
  if (header && !((header[0] === 255 && header[1] === 216 && header[2] === 255) || [137,80,78,71,13,10,26,10].every((n, i) => header[i] === n))) return '图片内容不符合 JPG / PNG 格式，不能仅修改后缀'
  return ''
}
export function maskedProfileEmail(email: string | null): AuditValue {
  if (!email) return { state: 'EMPTY' }
  const [name, domain] = email.split('@')
  return { state: 'VALUE', value: `${name?.slice(0, 1)}***@${domain}` }
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('tokenhub-profile-demo-v2', 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('profile'); request.result.createObjectStore('audit', { keyPath: 'id' }) }
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
  })
}
export async function readProfile(): Promise<UserProfile> {
  const token = session(); if (!token) throw new ProfileError('SESSION', '登录已失效，请重新登录')
  const db = await database()
  try {
    const saved = await new Promise<UserProfile | undefined>((resolve, reject) => { const request = db.transaction('profile').objectStore('profile').get('current'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    if (session() !== token) throw new ProfileError('SESSION', '登录已失效，请重新登录')
    return { ...(saved || initial()), mobileMasked: mobile() }
  } finally { db.close() }
}
export async function hydrateProfile() { const token = session(); try { const profile = await readProfile(); if (token && token === session()) profileState.value = profile } catch { /* The editable page displays explicit loading errors; header keeps a default avatar. */ } }
export function clearProfileCache() { profileState.value = null; profileScenario.value = 'normal' }
// Demo: an IndexedDB transaction models atomic profile + audit save and cross-window versions.
// Production must use authenticated profile and temporary-asset APIs; local storage is not access control.
export async function persistProfile(draft: ProfileDraft): Promise<UserProfile> {
  const token = session(); if (!token) throw new ProfileError('SESSION', '登录已失效，请重新登录')
  const errors = validateProfile(draft.nickname, draft.email || '')
  if (errors.nickname || errors.email) throw new ProfileError('FAILURE', errors.nickname || errors.email)
  const db = await database()
  try {
    const saved = await new Promise<UserProfile>((resolve, reject) => {
      const transaction = db.transaction(['profile', 'audit'], 'readwrite'), profiles = transaction.objectStore('profile')
      let result: UserProfile, failure: Error | undefined
      const request = profiles.get('current')
      request.onsuccess = () => {
        if (session() !== token) { failure = new ProfileError('SESSION', '登录已失效，请重新登录'); transaction.abort(); return }
        const before: UserProfile = request.result || initial()
        const after: UserProfile = { ...before, nickname: draft.nickname.trim(), email: draft.email?.trim() || null, avatarAssetId: draft.avatarAssetId, avatarUrl: draft.avatarUrl, mobileMasked: mobile() }
        const changes: AuditChange[] = []
        const value = (text: string | null): AuditValue => text ? { state: 'VALUE', value: text } : { state: 'EMPTY' }
        if (before.nickname !== after.nickname) changes.push({ field: 'nickname', label: '用户昵称', before: value(before.nickname), after: value(after.nickname) })
        if (before.email !== after.email) changes.push({ field: 'email', label: '邮箱', before: maskedProfileEmail(before.email), after: maskedProfileEmail(after.email) })
        if (before.avatarAssetId !== after.avatarAssetId) changes.push({ field: 'avatarAssetId', label: '头像资源编号', before: value(before.avatarAssetId), after: value(after.avatarAssetId) })
        // A retry of an already-applied payload returns the current profile, without another audit record.
        if (!changes.length) { result = before; return }
        if (before.version !== draft.version) { failure = new ProfileError('CONFLICT', '资料已在其他窗口更新，请重新加载后修改'); transaction.abort(); return }
        after.version = before.version + 1; result = after
        profiles.put(after, 'current')
        transaction.objectStore('audit').add({ id: `profile-${createUuid()}`, occurredAt: new Date().toISOString(), actorName: after.nickname, actorId: 'user-demo-001', targetType: 'PROFILE', targetName: '个人资料', targetId: 'user-demo-001', operationType: 'EDIT', result: 'SUCCESS', summary: '个人资料修改成功。', resultMessage: '昵称、邮箱与头像统一保存成功。邮箱仅为联系方式，未进行邮箱验证。', changes } satisfies AuditRecord)
      }
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error || new Error('保存失败，请重试'))
      transaction.onabort = () => reject(failure || transaction.error || new Error('保存失败，请重试'))
    })
    if (session() !== token) throw new ProfileError('SESSION', '登录已失效，请重新登录')
    return saved
  } finally { db.close() }
}
export async function readProfileAudit(): Promise<AuditRecord[]> {
  const token = session(); if (!token) return []
  const db = await database()
  try { const records = await new Promise<AuditRecord[]>((resolve, reject) => { const request = db.transaction('audit').objectStore('audit').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }); return token === session() ? records : [] } finally { db.close() }
}
