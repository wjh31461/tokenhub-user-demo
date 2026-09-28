export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED'
export interface AuditChange { label: string; before: string; after: string }
export interface AuditRecord {
  id: string; operationId: string; occurredAt: string; receivedAt: string;
  actorId: string; actorName: string; role: '主账户' | '子账户';
  module: string; event: string; eventLabel: string; targetType: string;
  targetId: string | null; targetName: string; serviceId: string; serviceName: string;
  result: AuditResult; summary: string; resultCode: string | null; changes: AuditChange[];
}
export const modules = [{ id: 'API_KEY', label: 'API 密钥' }, { id: 'SUBACCOUNT', label: '子账户管理' }, { id: 'ALERT', label: '告警中心' }]
export const events = [
  { id: 'API_KEY_CREATE', module: 'API_KEY', label: '创建密钥' },
  { id: 'API_KEY_PAUSE', module: 'API_KEY', label: '暂停密钥' },
  { id: 'API_KEY_RESUME', module: 'API_KEY', label: '恢复密钥' },
  { id: 'API_KEY_DELETE', module: 'API_KEY', label: '删除密钥' },
  { id: 'SUBACCOUNT_ADD', module: 'SUBACCOUNT', label: '添加子账户' },
  { id: 'SUBACCOUNT_QUOTA_SET', module: 'SUBACCOUNT', label: '设置子账户配额' },
  { id: 'SUBACCOUNT_QUOTA_CHANGE', module: 'SUBACCOUNT', label: '调整子账户配额' },
  { id: 'ALERT_MARK_READ', module: 'ALERT', label: '标记告警已读' }
]
export const actors = [{ id: 'main-demo', name: '主账户' }, { id: 'sub-dev', name: '研发子账户' }, { id: 'sub-test', name: '测试子账户' }]
export const services = [{ id: 'token-pro', name: 'Token 服务 · 专业版' }, { id: 'legal-assistant', name: '法律文书' }]
export const resultLabels = { SUCCESS: '成功', FAILURE: '失败', DENIED: '已拒绝' }
// 固定的虚构事件，用于展示；不读取真实账户或密钥。
export const auditRecords: AuditRecord[] = Array.from({ length: 68 }, (_, i) => {
  const event = events[i % events.length]!
  const actor = actors[event.module === 'API_KEY' ? i % actors.length : 0]!
  const result: AuditResult = i % 13 === 6 ? 'DENIED' : i % 11 === 4 ? 'FAILURE' : 'SUCCESS'
  const time = new Date(Date.parse('2026-09-28T16:30:00+08:00') - i * 5 * 60 * 60 * 1000)
  const service = services[event.module === 'ALERT' ? 1 : 0]!
  const names = ['生产环境接入', '数据分析助手', '研发测试 Key', '旧版集成密钥（历史记录）']
  const targetName = result === 'DENIED' ? '受限操作对象' : event.module === 'API_KEY' ? names[i % 4]! : event.module === 'ALERT' ? '法律文书额度较低提醒' : '研发子账户'
  let changes: AuditChange[] = []
  if (result === 'SUCCESS') {
    if (event.id === 'API_KEY_CREATE') changes = [{ label: '密钥名称', before: '不存在', after: targetName }, { label: '状态', before: '不存在', after: '正常' }]
    if (event.id === 'API_KEY_PAUSE') changes = [{ label: '状态', before: '正常', after: '已暂停' }]
    if (event.id === 'API_KEY_RESUME') changes = [{ label: '状态', before: '已暂停', after: '正常' }]
    if (event.id === 'API_KEY_DELETE') changes = [{ label: '生命周期', before: '存在', after: '已删除' }]
    if (event.id === 'SUBACCOUNT_ADD') changes = [{ label: '账户名称', before: '不存在', after: targetName }, { label: '关联状态', before: '不存在', after: '已关联' }]
    if (event.id === 'SUBACCOUNT_QUOTA_SET') changes = [{ label: '配额上限', before: '不存在', after: '1,000,000 Token' }, { label: '配额模式', before: '不存在', after: '周期性' }]
    if (event.id === 'SUBACCOUNT_QUOTA_CHANGE') changes = [{ label: '配额上限', before: '1,000,000 Token', after: '2,000,000 Token' }]
    if (event.id === 'ALERT_MARK_READ') changes = [{ label: '阅读状态', before: '未读', after: '已读' }]
  }
  return {
    id: `audit-${String(i + 1).padStart(4, '0')}`, operationId: `OP-202609-${String(i + 1).padStart(6, '0')}`,
    occurredAt: time.toISOString(), receivedAt: new Date(time.getTime() + 1500).toISOString(),
    actorId: actor.id, actorName: actor.name, role: actor.id === 'main-demo' ? '主账户' : '子账户',
    module: event.module, event: event.id, eventLabel: event.label,
    targetType: event.module === 'API_KEY' ? '用户密钥' : event.module === 'ALERT' ? '告警' : event.id.includes('QUOTA') ? '子账户配额' : '子账户',
    targetId: result === 'DENIED' || result === 'FAILURE' && event.id === 'API_KEY_CREATE' ? null : `${event.module.toLowerCase()}-${100 + i}`,
    targetName, serviceId: result === 'DENIED' || event.id === 'SUBACCOUNT_ADD' ? '' : service.id,
    serviceName: result === 'DENIED' || event.id === 'SUBACCOUNT_ADD' ? '' : service.name,
    result, summary: result === 'DENIED' ? '当前身份无权执行该操作，未进行任何变更。' : result === 'FAILURE' ? '业务校验未通过，本次操作未提交，请检查相关设置。' : `${event.label}已完成，变更已生效。`,
    resultCode: result === 'DENIED' ? 'PERMISSION_DENIED' : result === 'FAILURE' ? 'VALIDATION_FAILED' : null, changes
  }
})
