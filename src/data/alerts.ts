export type AlertType = 'BALANCE_THRESHOLD' | 'TOKEN_QUOTA_THRESHOLD' | 'ABNORMAL_REQUEST'
export type AlertLevel = 'LEVEL_1' | 'LEVEL_2' | 'URGENT'
export type AlertStatus = 'UNREAD' | 'READ' | 'PROCESSED'
export interface AlertRecord {
  id: string
  type: AlertType
  level: AlertLevel
  status: AlertStatus
  content: string
  occurredAt: string
  related: { label: string; value: string }[]
  suggestion: string
  usageQuery?: Record<string, string>
  readAt?: string
  processedAt?: string
  processedBy?: string
  remark?: string
  deletedAt?: string
}
export const typeLabels: Record<AlertType, string> = { BALANCE_THRESHOLD: '余额阈值告警', TOKEN_QUOTA_THRESHOLD: 'Token 包余量告警', ABNORMAL_REQUEST: '异常请求告警' }
export const levelLabels: Record<AlertLevel, string> = { LEVEL_1: '一级', LEVEL_2: '二级', URGENT: '紧急' }
export const statusLabels: Record<AlertStatus, string> = { UNREAD: '未读', READ: '已读', PROCESSED: '已处理' }

// 当前演示账户收到的消息；所有关联值均为告警发生时的快照。
export const alertRecords: AlertRecord[] = [
  { id: 'balance-low', type: 'BALANCE_THRESHOLD', level: 'LEVEL_1', status: 'UNREAD', occurredAt: '2026-10-03T10:00:00+08:00',
    content: '账户扣费后余额为 9.00 元，首次低于 10 元，建议充值或购买 Token 包。',
    related: [{ label: '关联服务', value: 'Token 服务' }, { label: '扣费后余额', value: '¥9.00（CNY）' }, { label: '触发阈值', value: '低于 ¥10.00（CNY）' }],
    suggestion: '请通过现有订购渠道补充余额或购买 Token 包。' },
  { id: 'medical-low', type: 'TOKEN_QUOTA_THRESHOLD', level: 'LEVEL_1', status: 'UNREAD', occurredAt: '2026-10-03T09:00:00+08:00',
    content: '星海智医 Token 包扣减后剩余 90,000 Token，占有效总额度的 9%，首次低于 10%。',
    related: [{ label: '应用／服务', value: '星海智医' }, { label: '额度范围', value: '星海智医 · 当前有效且可共同抵扣的 Token 包' }, { label: '有效总额度', value: '1,000,000 Token' }, { label: '剩余 Token', value: '90,000 Token' }, { label: '剩余比例', value: '9%' }, { label: '触发阈值', value: '低于 10%' }],
    suggestion: 'Token 包余量较低，请通过现有订购渠道及时补充额度。' },
  { id: 'request-warning', type: 'ABNORMAL_REQUEST', level: 'URGENT', status: 'READ', occurredAt: '2026-10-02T15:30:00+08:00', readAt: '2026-10-02T15:40:00+08:00',
    content: '生产环境 Key 在短时间内请求过于频繁，请检查调用频率及重试策略。',
    related: [{ label: '关联服务', value: 'Token 服务' }, { label: '密钥名称', value: '生产环境 Key' }, { label: '请求时间', value: '2026-10-02 15:29:58' }, { label: '请求编号', value: 'call-202609-0019' }],
    suggestion: '请检查调用频率和重试策略，如需进一步排查，可查看相关用量或提交工单。', usageQuery: { tab: 'details', userKeyId: 'key-main-prod', startDate: '2026-10-02', endDate: '2026-10-02' } },
  { id: 'balance-critical', type: 'BALANCE_THRESHOLD', level: 'LEVEL_2', status: 'PROCESSED', occurredAt: '2026-09-30T16:20:00+08:00', readAt: '2026-09-30T16:25:00+08:00', processedAt: '2026-09-30T16:30:00+08:00', processedBy: '当前账户', remark: '已通过订购渠道补充余额。',
    content: '账户扣费后余额为 0.40 元，首次低于 0.50 元，余额过低可能导致请求被拒绝。',
    related: [{ label: '扣费后余额', value: '¥0.40（CNY）' }, { label: '触发阈值', value: '低于 ¥0.50（CNY）' }], suggestion: '请及时补充余额；实际是否拒绝请求由实时额度校验决定。' },
  { id: 'quota-low', type: 'TOKEN_QUOTA_THRESHOLD', level: 'LEVEL_2', status: 'UNREAD', occurredAt: '2026-09-29T14:32:00+08:00',
    content: '法律文书 Token 包扣减后剩余 8,000 Token，占有效总额度的 0.8%，首次低于 1%。',
    related: [{ label: '应用／服务', value: '法律文书' }, { label: '额度范围', value: '法律文书 · 当前有效且可共同抵扣的 Token 包' }, { label: '有效总额度', value: '1,000,000 Token' }, { label: '剩余 Token', value: '8,000 Token' }, { label: '剩余比例', value: '0.8%' }, { label: '触发阈值', value: '低于 1%' }],
    suggestion: 'Token 包余量过低，请及时补充额度。二级告警为提前提醒，实际服务可用性由实时额度校验决定。' },
  { id: 'abuse-critical', type: 'ABNORMAL_REQUEST', level: 'LEVEL_2', status: 'UNREAD', occurredAt: '2026-09-28T15:29:00+08:00',
    content: '研发 Agent Key 出现异常请求，请核对使用方及调用参数。', related: [{ label: '关联服务', value: 'Token 服务' }, { label: '密钥名称', value: '研发 Agent Key' }],
    suggestion: '请检查使用方、调用参数与错误信息，必要时提交工单。', usageQuery: { tab: 'details', userKeyId: 'key-sub-dev', startDate: '2026-09-28', endDate: '2026-09-28' } },
  { id: 'quota-exhausted', type: 'TOKEN_QUOTA_THRESHOLD', level: 'LEVEL_1', status: 'READ', occurredAt: '2026-09-27T16:45:00+08:00', readAt: '2026-09-27T17:00:00+08:00',
    content: 'Token 服务的有效 Token 包余量首次低于 10%，建议及时补充额度。', related: [{ label: '应用／服务', value: 'Token 服务 · Token 包' }, { label: '有效总额度', value: '2,000,000 Token' }, { label: '剩余 Token', value: '180,000 Token' }, { label: '剩余比例', value: '9%' }, { label: '触发阈值', value: '低于 10%' }], suggestion: '请通过现有订购渠道补充 Token 包额度。' },
]
