export const demoAccount = 'demo-account'
export const quotaSnapshotAt = '2026-10-05T10:00:00+08:00'
export const serviceTypeNames = { AI_APP: 'AI 应用', TOKEN_SERVICE: 'Token 服务' }
export const orderTypeNames = { AI_APPLICATION: 'AI 应用订单', TOKEN_APPLICATION: 'Token 应用订单' }
export const orderContentNames = { EMERGENCY_PACKAGE: '急救包', TOKEN_PACKAGE: 'Token 包', RECHARGE: '充值' }
export const orderStatusNames = { ACTIVE: '有效', EXPIRED: '已过期', UNSUBSCRIBED: '已退订' }
export const packageTypeNames = { STANDARD: '普通包', RECURRING: '连续包', EMERGENCY: '急救包' }
export interface AccountService { id: string; accountId: string; name: string | null; type: keyof typeof serviceTypeNames; historical?: boolean }
export interface QuotaScope { id: string; serviceId: string; name: string | null; mode: 'VALIDITY_PACKAGE' | 'TOKEN_QUOTA'; available: string | null; dataStatus: 'READY' | 'PENDING_SYNC' | 'UNAVAILABLE'; serviceStatus: string; frozen: boolean; visible: boolean; updatedAt: string | null; version: string; packageCount: number }
export interface TokenPackage { id: string; scopeId: string; name: string; type: keyof typeof packageTypeNames; total: string; available: string | null; startsAt: string; expiresAt: string | null; lifecycle: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'INVALID'; updatedAt: string; version: string }
export interface OrderRecord { id: string; accountId: string; orderId: string; serviceId: string; serviceName: string | null; type: keyof typeof orderTypeNames; content: keyof typeof orderContentNames; amount: string | null; currency: string | null; createdAt: string; status: string; effectiveAt: string | null; expiresAt: string | null; purchasedQuota: string | null; quotaUnit: string | null }
export function accountTime(value: string | null) { return value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value)).replaceAll('/', '-') : '暂未提供' }
export function beijingDate(value: string) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(value)) }
export function tokens(value: string | null) { return value !== null && /^\d+$/.test(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—' }
export function decimal(value: string, digits: number) {
  const [whole, fraction = ''] = value.split('.')
  const padded = fraction.padEnd(digits + 1, '0')
  let units = BigInt(whole!) * 10n ** BigInt(digits) + BigInt(padded.slice(0, digits) || '0')
  if (Number(padded[digits]) >= 5) units++
  const result = units.toString().padStart(digits + 1, '0')
  return digits ? `${tokens(result.slice(0, -digits))}.${result.slice(-digits)}` : tokens(result)
}
export function orderMoney(record: Pick<OrderRecord, 'amount' | 'currency'>) {
  if (record.amount === null || !record.currency || !/^\d+(\.\d+)?$/.test(record.amount)) return '暂未提供'
  const symbol = ({ CNY: '¥', USD: '$', JPY: '¥' } as Record<string, string>)[record.currency] || record.currency
  return `${symbol}${decimal(record.amount, record.currency === 'JPY' ? 0 : 2)} ${record.currency}`
}
export function compareIds(a: string, b: string) { if (/^\d+$/.test(a) && /^\d+$/.test(b)) return BigInt(a) === BigInt(b) ? 0 : BigInt(a) > BigInt(b) ? 1 : -1; return a.localeCompare(b) }
export function isPackageActive(record: TokenPackage, at = quotaSnapshotAt) { return record.lifecycle === 'ACTIVE' && Date.parse(record.startsAt) <= Date.parse(at) && (!record.expiresAt || Date.parse(at) < Date.parse(record.expiresAt)) }
export const accountServices: AccountService[] = [
  { id: 'app-medical', accountId: demoAccount, name: '星海智医', type: 'AI_APP' },
  { id: 'token-pro', accountId: demoAccount, name: 'Token 推理', type: 'TOKEN_SERVICE' },
  { id: 'app-law', accountId: demoAccount, name: '法律文书', type: 'AI_APP' },
  { id: 'app-frozen', accountId: demoAccount, name: '知识助手', type: 'AI_APP' },
  { id: 'app-scopes', accountId: demoAccount, name: '多模态工作台', type: 'AI_APP' },
  { id: 'app-unknown', accountId: demoAccount, name: '数据分析助手', type: 'AI_APP' },
  { id: 'historical-service', accountId: demoAccount, name: '旧版文档服务（历史）', type: 'AI_APP', historical: true },
  { id: 'service-name-missing', accountId: demoAccount, name: null, type: 'TOKEN_SERVICE', historical: true },
  ...Array.from({ length: 18 }, (_, i): AccountService => ({ id: `demo-service-${i + 1}`, accountId: demoAccount, name: `演示服务 ${String(i + 1).padStart(2, '0')}`, type: i % 2 ? 'AI_APP' : 'TOKEN_SERVICE' })),
  { id: 'private-service', accountId: 'other-account', name: '其他账户服务', type: 'AI_APP' },
]
const scope = (id: string, serviceId: string, available: string | null, changes: Partial<QuotaScope> = {}): QuotaScope => ({ id, serviceId, name: null, mode: 'VALIDITY_PACKAGE', available, dataStatus: available === null ? 'PENDING_SYNC' : 'READY', serviceStatus: 'ACTIVE', frozen: false, visible: true, updatedAt: available === null ? null : quotaSnapshotAt, version: 'quota-v1', packageCount: 0, ...changes })
export const quotaScopes: QuotaScope[] = [
  scope('scope-medical', 'app-medical', '900000', { packageCount: 3 }),
  scope('scope-token', 'token-pro', '5000000', { packageCount: 25 }),
  scope('scope-law', 'app-law', '0'),
  scope('scope-frozen', 'app-frozen', '880000', { frozen: true, mode: 'TOKEN_QUOTA' }),
  scope('scope-multimodal-text', 'app-scopes', '1200000', { name: '文本额度', serviceStatus: 'CRM_STOPPED', mode: 'TOKEN_QUOTA' }),
  scope('scope-multimodal-image', 'app-scopes', '900719925474099312345678', { name: '视觉额度', mode: 'TOKEN_QUOTA' }),
  scope('scope-unknown', 'app-unknown', null),
  scope('scope-unavailable', 'demo-service-1', null, { dataStatus: 'UNAVAILABLE', serviceStatus: 'UNRECOGNIZED' }),
  ...Array.from({ length: 17 }, (_, i) => scope(`scope-demo-${i + 2}`, `demo-service-${i + 2}`, `${(i + 1) * 100000}`, { mode: 'TOKEN_QUOTA' })),
  scope('scope-historical', 'historical-service', '250000', { visible: false, serviceStatus: 'UNSUBSCRIBED' }),
  scope('private-scope', 'private-service', '777777'),
]
const pack = (id: string, scopeId: string, name: string, total: string, available: string | null, changes: Partial<TokenPackage> = {}): TokenPackage => ({ id, scopeId, name, total, available, type: 'STANDARD', startsAt: '2026-10-01T00:00:00+08:00', expiresAt: '2026-11-01T00:00:00+08:00', lifecycle: 'ACTIVE', updatedAt: quotaSnapshotAt, version: 'quota-v1', ...changes })
export const tokenPackages: TokenPackage[] = [
  pack('medical-recurring', 'scope-medical', '月度基础包', '1000000', '600000', { type: 'RECURRING' }),
  pack('medical-emergency', 'scope-medical', '急救包', '400000', '300000', { type: 'EMERGENCY', expiresAt: '2026-10-15T00:00:00+08:00' }),
  pack('medical-depleted', 'scope-medical', '补充包（已耗尽）', '100000', '0', { expiresAt: '2026-10-10T00:00:00+08:00' }),
  pack('medical-expired', 'scope-medical', '已过期包（不应展示）', '100000', '2000', { expiresAt: quotaSnapshotAt }),
  pack('medical-pending', 'scope-medical', '下周期包（不应展示）', '2000000', '2000000', { startsAt: '2026-11-01T00:00:00+08:00', expiresAt: '2026-12-01T00:00:00+08:00', lifecycle: 'PENDING' }),
  ...Array.from({ length: 25 }, (_, i) => pack(`token-package-${i + 1}`, 'scope-token', `推理额度包 ${String(i + 1).padStart(2, '0')}`, '200000', '200000', { expiresAt: i === 24 ? null : new Date(Date.parse('2026-10-10T00:00:00+08:00') + i * 86400000).toISOString() })),
  pack('private-package', 'private-scope', '其他账户的包', '777777', '777777'),
]
export const orderRecords: OrderRecord[] = Array.from({ length: 47 }, (_, i) => {
  const service = accountServices.filter(item => item.accountId === demoAccount)[i % 8]!
  const content = (['TOKEN_PACKAGE', 'EMERGENCY_PACKAGE', 'RECHARGE'] as const)[i % 3]!
  return { id: (90071992547409930000n + BigInt(i)).toString(), accountId: demoAccount, orderId: `CRM20261005${String(i + 1).padStart(8, '0')}`, serviceId: service.id, serviceName: service.name, type: service.type === 'AI_APP' ? 'AI_APPLICATION' : 'TOKEN_APPLICATION', content, amount: i === 1 ? null : i === 2 ? '0' : i === 3 ? '9007199254740993.12345678' : `${100 + i}.12500000`, currency: i === 1 ? null : i === 4 ? 'USD' : 'CNY', createdAt: new Date(Date.parse('2026-10-05T09:00:00+08:00') - Math.floor(i / 2) * 8 * 3600000).toISOString(), status: i === 5 ? 'UNRECOGNIZED' : (['ACTIVE', 'EXPIRED', 'UNSUBSCRIBED'] as const)[i % 3]!, effectiveAt: content === 'RECHARGE' ? null : '2026-10-01T00:00:00+08:00', expiresAt: content === 'RECHARGE' ? null : '2026-11-01T00:00:00+08:00', purchasedQuota: content === 'RECHARGE' || i === 1 ? null : '1000000', quotaUnit: content === 'RECHARGE' || i === 1 ? null : 'Token' }
})
orderRecords.push({ ...orderRecords[0]!, id: '90071992547409939999', orderId: 'PRIVATE-ORDER', accountId: 'other-account', serviceId: 'private-service', serviceName: '其他账户服务' })
