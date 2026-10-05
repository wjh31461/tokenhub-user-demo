export type AuditOperation = 'CREATE' | 'EDIT' | 'PAUSE' | 'RESUME' | 'DELETE' | 'EXPORT'
export type AuditResult = 'SUCCESS' | 'FAILURE'
export interface AuditValue { state: 'VALUE' | 'EMPTY' | 'ABSENT' | 'UNKNOWN'; value?: string }
export interface AuditChange { field: string; label: string; before: AuditValue; after: AuditValue }
export interface AuditRecord {
  id: string; occurredAt: string; actorName: string; actorId: string;
  targetType: 'API_KEY' | 'PROFILE' | 'AUDIT_LOG'; targetName: string; targetId: string | null;
  serviceName?: string; operationType: AuditOperation; result: AuditResult;
  summary: string; resultMessage: string; changes: AuditChange[];
}
export const operationLabels: Record<AuditOperation, string> = { CREATE: '创建', EDIT: '编辑', PAUSE: '暂停', RESUME: '恢复', DELETE: '删除', EXPORT: '导出' }
export const resultLabels = { SUCCESS: '成功', FAILURE: '失败' }
export const targetLabels = { API_KEY: '密钥', PROFILE: '个人资料', AUDIT_LOG: '操作审计' }
export function valueLabel(value?: AuditValue) {
  if (!value || value.state === 'UNKNOWN') return '未记录'
  if (value.state === 'EMPTY') return '未设置'
  if (value.state === 'ABSENT') return '不存在'
  return value.value ?? '未记录'
}
export function detailText(record: AuditRecord) {
  if (record.result === 'FAILURE') return record.resultMessage
  return record.changes.length ? record.changes.map(c => `${c.label}：${valueLabel(c.before)} → ${valueLabel(c.after)}`).join('；') : record.resultMessage
}
const value = (text: string): AuditValue => ({ state: 'VALUE', value: text })
const change = (field: string, label: string, before: AuditValue, after: AuditValue): AuditChange => ({ field, label, before, after })
// 固定虚构快照，仅演示当前账户的已确认业务结果，不包含密钥值或真实个人资料。
export const auditRecords: AuditRecord[] = Array.from({ length: 72 }, (_, i) => {
  const operationType = (['PAUSE', 'EDIT', 'CREATE', 'RESUME', 'DELETE'] as const)[i % 5]!
  const failed = i % 13 === 6 || i % 11 === 4
  const denied = i % 13 === 6
  const targetType = operationType === 'EDIT' ? 'PROFILE' : 'API_KEY'
  const targetName = denied ? '受限操作对象' : targetType === 'PROFILE' ? '个人资料' : ['测试环境密钥', '数据分析助手密钥', '生产环境接入密钥', '旧版集成密钥（已删除，保留历史名称）'][i % 4]!
  let changes: AuditChange[] = []
  if (!failed) {
    if (operationType === 'CREATE') changes = [change('name', '密钥名称', { state: 'ABSENT' }, value(targetName))]
    if (operationType === 'PAUSE') changes = [change('status', '密钥状态', value('可用'), value('已暂停'))]
    if (operationType === 'RESUME') changes = [change('status', '密钥状态', value('已暂停'), value('可用'))]
    if (operationType === 'DELETE') changes = [change('deleted', '删除状态', value('未删除'), value('已删除'))]
    if (operationType === 'EDIT') changes = [change('nickname', '用户昵称', value('张三'), value('张小三')), change('email', '邮箱', i % 3 === 0 ? { state: 'EMPTY' } : value('z***@example.com'), value('l***@example.com'))]
    if (i === 10) changes = [change('status', '密钥状态', { state: 'UNKNOWN' }, value('已暂停'))]
  }
  const resultMessage = denied ? '无权执行该操作。未进行任何变更。' : failed ? '业务校验未通过，本次操作未生效，请检查相关设置。' : `${operationLabels[operationType]}已完成，变更已生效。`
  return { id: `audit-${String(i + 1).padStart(4, '0')}`, occurredAt: new Date(Date.parse('2026-10-05T10:30:00+08:00') - i * 4 * 3600000).toISOString(), actorName: i > 30 ? '' : '张三', actorId: 'user-demo-001', targetType, targetName, targetId: denied || (failed && operationType === 'CREATE') ? null : targetType === 'PROFILE' ? 'profile-demo-001' : `custom-key-${100 + i}`, serviceName: denied || targetType === 'PROFILE' ? undefined : 'Token 服务', operationType, result: failed ? 'FAILURE' : 'SUCCESS', summary: resultMessage, resultMessage, changes }
})
