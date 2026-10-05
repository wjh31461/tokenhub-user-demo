export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketCategory = 'API' | 'USAGE' | 'SERVICE' | 'OTHER'
export const ticketCategoryNames: Record<TicketCategory, string> = { API: '接口问题', USAGE: '用量问题', SERVICE: '服务问题', OTHER: '其他问题' }
export const ticketStatusNames: Record<TicketStatus, string> = { PENDING: '待处理', IN_PROGRESS: '处理中', RESOLVED: '已解决', CLOSED: '已关闭' }
export interface TicketAttachment { id: string; name: string; bytes: number; url: string; state: 'UPLOADING' | 'READY' | 'FAILED'; error?: string; expiresAt?: number }
export function validateTicketImages(images: TicketAttachment[], now = Date.now()) {
  if (images.length > 10) return '每次最多 10 张图片'
  if (images.some(image => image.bytes > 10 * 1024 * 1024)) return '单张图片不能超过 10 MB'
  if (images.reduce((sum, image) => sum + image.bytes, 0) > 50 * 1024 * 1024) return '每次图片合计不能超过 50 MB'
  if (images.some(image => image.state !== 'READY')) return '请等待图片上传完成，失败图片请重新上传或移除'
  if (images.some(image => image.expiresAt !== undefined && image.expiresAt <= now)) return '临时图片已过期，请移除后重新上传'
  return ''
}
export interface TicketEvent { id: string; kind: 'STATUS' | 'MESSAGE'; sender: 'USER' | 'SUPPORT' | 'SYSTEM'; content: string; createdAt: string; attachments: TicketAttachment[] }
export interface TicketRecord { id: string; ticketNo: string; accountId: string; category: TicketCategory; status: TicketStatus; description: string; createdAt: string; needsUserReply: boolean; relatedTicketId?: string; attachments: TicketAttachment[]; timeline: TicketEvent[] }
export const currentTicketAccount = 'demo-account'
export const ticketTime = (value: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replaceAll('/', '-')
export const ticketSummary = (value: string) => Array.from(value).slice(0, 50).join('')
export const newEvent = (content: string, createdAt: string, sender: TicketEvent['sender'] = 'SUPPORT', kind: TicketEvent['kind'] = 'MESSAGE', attachments: TicketAttachment[] = []): TicketEvent => ({ id: crypto.randomUUID(), content, createdAt, sender, kind, attachments })
export const ticketRecords: TicketRecord[] = Array.from({ length: 25 }, (_, i) => {
  const createdAt = new Date(Date.parse('2026-10-05T10:30:00+08:00') - i * 8 * 3600000).toISOString()
  const status = (['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'PENDING'] as const)[Math.min(i, 3)]!
  const description = ['今天 10:20 左右模型接口持续返回 429。\n已尝试退避重试，仍有部分请求失败。公开请求编号：req_demo_7k2。请协助排查。', '服务详情与用量中心的余量需要核对，请说明 Token 包汇总口径。', '开发环境接口返回 401，请协助检查鉴权格式。'][i] || `第 ${i + 1} 条演示反馈：请协助确认当前服务使用情况。这是用于验证筛选和分页的虚构记录，不代表真实业务问题。`
  const timeline = [newEvent('工单已提交，待处理', createdAt, 'SYSTEM', 'STATUS')]
  const at = (n: number) => new Date(Date.parse(createdAt) + n * 60000).toISOString()
  if (status !== 'PENDING') timeline.push(newEvent('平台开始处理', at(30), 'SUPPORT', 'STATUS'))
  if (i === 0) timeline.push(newEvent('请补充问题发生时的并发量和报错截图，请遮盖敏感信息。', at(50)))
  if (status === 'RESOLVED') timeline.push(newEvent('已解决：同一应用或服务下当前有效且可共同抵扣的 Token 包余量汇总，不跨应用合并。金额余额与 Token 余量不互相换算。', at(60), 'SUPPORT', 'STATUS'))
  if (status === 'CLOSED') timeline.push(newEvent('已解决：修正 Bearer 请求头后调用恢复。', at(60), 'SUPPORT', 'STATUS'), newEvent('已关闭：已确认配置修正，结束本次处理。', at(90), 'SUPPORT', 'STATUS'))
  if (i === 3) for (let j = 0; j < 24; j++) timeline.push(newEvent(`第 ${j + 1} 次公开沟通：补充服务检查信息。`, at(j + 1), j % 2 ? 'USER' : 'SUPPORT'))
  return { id: ['ticket-rate-limit', 'ticket-quota-display', 'ticket-key-auth'][i] || `ticket-demo-${i + 1}`, ticketNo: `TH20261005A${String(i + 1).padStart(3, '0')}`, accountId: currentTicketAccount, category: (['API', 'USAGE', 'API', 'SERVICE', 'OTHER'] as const)[i % 5]!, status, description, createdAt, needsUserReply: i === 0, attachments: [], timeline }
})
ticketRecords.push({ ...structuredClone(ticketRecords[0]!), id: 'ticket-other-account', accountId: 'other-account', description: '其他账户工单，不应展示。' })
// Local-only demo storage. Real permissions, private uploads and idempotency require server APIs.
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('tokenhub-ticket-demo-v4', 1); request.onupgradeneeded = () => request.result.createObjectStore('tickets', { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
export async function loadTickets(): Promise<TicketRecord[]> {
  const db = await database()
  try { const saved = await new Promise<TicketRecord[]>((resolve, reject) => { const request = db.transaction('tickets').objectStore('tickets').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }); const records = new Map(ticketRecords.map(item => [item.id, structuredClone(item)])); saved.forEach(item => records.set(item.id, item)); return [...records.values()] } finally { db.close() }
}
export async function saveTicket(record: TicketRecord) {
  const db = await database()
  try { await new Promise<void>((resolve, reject) => { const transaction = db.transaction('tickets', 'readwrite'); transaction.objectStore('tickets').put(record); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error) }) } finally { db.close() }
}
