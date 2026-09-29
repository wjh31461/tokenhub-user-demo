export type AlertCategory = 'QUOTA' | 'USAGE_ANOMALY'
export type AlertSeverity = 'NOTICE' | 'WARNING' | 'CRITICAL'
export type AlertLifecycle = 'ACTIVE' | 'RECOVERED'
export type AlertSubjectType = 'SERVICE' | 'SUBACCOUNT' | 'USER_API_KEY' | 'AI_APPLICATION'

export interface AlertMetric {
  label: string
  value: string
  threshold?: string
  note?: string
}

export interface AlertTimelineItem {
  type: 'OPENED' | 'OCCURRED' | 'ESCALATED' | 'RECOVERED'
  title: string
  description: string
  occurredAt: string
}

export interface AlertAction {
  code: 'VIEW_SERVICE' | 'VIEW_USAGE' | 'VIEW_CALLS' | 'MANAGE_KEY' | 'CREATE_TICKET'
  label: string
  path: string
  primary?: boolean
}

export interface AlertRecord {
  id: string
  alertNo: string
  category: AlertCategory
  type: string
  typeLabel: string
  title: string
  description: string
  severity: AlertSeverity
  lifecycle: AlertLifecycle
  initiallyRead: boolean
  ownerContext: 'main' | 'sub-a' | 'sub-b'
  serviceId: string
  serviceName: string
  subaccountId: string | null
  subaccountName: string | null
  subjectType: AlertSubjectType
  subjectId: string
  subjectName: string
  subjectMasked: string | null
  impactSummary: string
  firstOccurredAt: string
  lastOccurredAt: string
  recoveredAt: string | null
  occurrenceCount: number
  metrics: AlertMetric[]
  requestIds: string[]
  timeline: AlertTimelineItem[]
  actions: AlertAction[]
}

export const alertServices = [
  { id: 'token-pro', name: 'Token 服务 · 专业版' },
  { id: 'legal-assistant', name: '法律文书' },
  { id: 'medical-assistant', name: '星海智医' },
]

export const alertSubaccounts = [
  { id: 'sub-a', name: '研发子账户' },
  { id: 'sub-b', name: '测试子账户' },
]

const serviceAction = (serviceId: string): AlertAction => ({ code: 'VIEW_SERVICE', label: '查看服务与额度', path: `/services/${serviceId}?tab=quota`, primary: true })
const usageAction = (serviceId: string): AlertAction => ({ code: 'VIEW_USAGE', label: '查看相关用量', path: `/usage?tab=statistics&serviceId=${serviceId}&startDate=2026-09-22&endDate=2026-09-28` })
const callAction = (serviceId: string, keyId?: string): AlertAction => ({ code: 'VIEW_CALLS', label: '查看调用明细', path: `/usage?tab=details&serviceId=${serviceId}${keyId ? `&userKeyId=${keyId}` : ''}&startDate=2026-09-22&endDate=2026-09-28`, primary: true })
const ticketAction = (alertId: string): AlertAction => ({ code: 'CREATE_TICKET', label: '提交工单', path: `/help/tickets/new?sourceType=ALERT&sourceId=${alertId}` })

export const alertRecords: AlertRecord[] = [
  {
    id: 'quota-low', alertNo: 'AL202609280001', category: 'QUOTA', type: 'SERVICE_QUOTA_CRITICAL', typeLabel: '服务额度严重不足',
    title: '法律文书服务额度严重不足', description: '当前可用额度已跌破严重阈值，继续调用可能导致额度耗尽。', severity: 'WARNING', lifecycle: 'ACTIVE', initiallyRead: false,
    ownerContext: 'main', serviceId: 'legal-assistant', serviceName: '法律文书', subaccountId: null, subaccountName: null,
    subjectType: 'AI_APPLICATION', subjectId: 'legal-assistant', subjectName: '法律文书', subjectMasked: null,
    impactSummary: '预计很快影响法律文书应用调用，当前尚未阻断。', firstOccurredAt: '2026-09-28T13:40:00+08:00', lastOccurredAt: '2026-09-28T14:32:00+08:00', recoveredAt: null, occurrenceCount: 4,
    metrics: [{ label: '当前剩余额度', value: '126,000 Token' }, { label: '严重阈值', value: '150,000 Token' }, { label: '本轮累计提醒', value: '4 次' }, { label: '影响调用', value: '0 次', note: '当前尚未因额度不足拒绝请求' }],
    requestIds: [],
    timeline: [
      { type: 'OPENED', title: '额度不足提醒', description: '剩余额度首次跌破 300,000 Token 预警阈值。', occurredAt: '2026-09-28T13:40:00+08:00' },
      { type: 'ESCALATED', title: '升级为严重不足', description: '剩余额度跌破 150,000 Token 严重阈值，告警重新置为未读。', occurredAt: '2026-09-28T14:25:00+08:00' },
      { type: 'OCCURRED', title: '额度继续下降', description: '最近一次扣减后剩余 126,000 Token。', occurredAt: '2026-09-28T14:32:00+08:00' },
    ],
    actions: [serviceAction('legal-assistant'), usageAction('legal-assistant'), ticketAction('quota-low')],
  },
  {
    id: 'request-warning', alertNo: 'AL202609280002', category: 'USAGE_ANOMALY', type: 'CONTINUOUS_FAILURE', typeLabel: '持续调用失败',
    title: '生产环境接入出现连续异常调用', description: '生产环境接入在 10 分钟窗口内出现较高比例的失败请求，请检查请求参数和重试逻辑。', severity: 'WARNING', lifecycle: 'ACTIVE', initiallyRead: false,
    ownerContext: 'main', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: null, subaccountName: null,
    subjectType: 'USER_API_KEY', subjectId: 'key-prod', subjectName: '生产环境接入', subjectMasked: 'sk-****83KD',
    impactSummary: '部分模型调用失败，尚未触发密钥停用。', firstOccurredAt: '2026-09-28T10:58:00+08:00', lastOccurredAt: '2026-09-28T11:08:00+08:00', recoveredAt: null, occurrenceCount: 28,
    metrics: [{ label: '异常请求次数', value: '28 次', threshold: '阈值 20 次' }, { label: '窗口错误率', value: '42.4%', threshold: '阈值 30%' }, { label: '统计窗口', value: '10 分钟' }, { label: '主要错误码', value: '400 / 429' }],
    requestIds: ['call-20260928-1038A', 'call-20260928-1041C', 'call-20260928-1107F'],
    timeline: [
      { type: 'OPENED', title: '检测到持续失败', description: '10 分钟窗口内失败次数达到 20 次。', occurredAt: '2026-09-28T10:58:00+08:00' },
      { type: 'OCCURRED', title: '异常仍在持续', description: '累计异常请求 28 次，主要错误码为 400 和 429。', occurredAt: '2026-09-28T11:08:00+08:00' },
    ],
    actions: [callAction('token-pro', 'key-prod'), { code: 'MANAGE_KEY', label: '管理用户密钥', path: '/api-keys?keyId=key-prod' }, ticketAction('request-warning')],
  },
  {
    id: 'abuse-critical', alertNo: 'AL202609280003', category: 'USAGE_ANOMALY', type: 'API_KEY_SUSPECTED_ABUSE', typeLabel: '密钥疑似滥用',
    title: '研发测试 Key 调用行为异常', description: '该密钥在短时间内出现显著偏离历史模式的调用行为，建议立即核对使用方。', severity: 'CRITICAL', lifecycle: 'ACTIVE', initiallyRead: false,
    ownerContext: 'sub-a', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: 'sub-a', subaccountName: '研发子账户',
    subjectType: 'USER_API_KEY', subjectId: 'key-dev', subjectName: '研发测试 Key', subjectMasked: 'sk-****6P2Q',
    impactSummary: '密钥仍可使用，平台已加强频率限制。', firstOccurredAt: '2026-09-28T15:06:00+08:00', lastOccurredAt: '2026-09-28T15:29:00+08:00', recoveredAt: null, occurrenceCount: 356,
    metrics: [{ label: '异常请求次数', value: '356 次', threshold: '阈值 120 次' }, { label: '峰值请求频率', value: '48 RPS', threshold: '阈值 20 RPS' }, { label: '统计窗口', value: '30 分钟' }, { label: '平台处置', value: '已加强限流' }],
    requestIds: ['call-20260928-1511D', 'call-20260928-1528G'],
    timeline: [
      { type: 'OPENED', title: '调用行为偏离正常模式', description: '30 分钟请求量超过历史同期基线。', occurredAt: '2026-09-28T15:06:00+08:00' },
      { type: 'ESCALATED', title: '升级为严重告警', description: '峰值请求频率达到 48 RPS，平台已加强限流。', occurredAt: '2026-09-28T15:20:00+08:00' },
      { type: 'OCCURRED', title: '异常调用仍在持续', description: '最近窗口累计异常请求 356 次。', occurredAt: '2026-09-28T15:29:00+08:00' },
    ],
    actions: [callAction('token-pro', 'key-dev'), { code: 'MANAGE_KEY', label: '暂停或管理密钥', path: '/api-keys?keyId=key-dev' }, ticketAction('abuse-critical')],
  },
  {
    id: 'sub-quota-low', alertNo: 'AL202609280004', category: 'QUOTA', type: 'SUBACCOUNT_QUOTA_LOW', typeLabel: '子账户配额不足',
    title: '研发子账户本周期配额即将用尽', description: '研发子账户剩余配额已低于预警阈值，请联系主账户管理员调整。', severity: 'NOTICE', lifecycle: 'ACTIVE', initiallyRead: false,
    ownerContext: 'sub-a', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: 'sub-a', subaccountName: '研发子账户',
    subjectType: 'SUBACCOUNT', subjectId: 'sub-a', subjectName: '研发子账户', subjectMasked: null,
    impactSummary: '子账户尚可调用，同时仍受主账户服务额度限制。', firstOccurredAt: '2026-09-28T09:10:00+08:00', lastOccurredAt: '2026-09-28T12:16:00+08:00', recoveredAt: null, occurrenceCount: 3,
    metrics: [{ label: '剩余配额', value: '82,000 Token' }, { label: '预警阈值', value: '100,000 Token' }, { label: '本周期已用', value: '1,918,000 Token' }, { label: '周期结束', value: '2026-09-30 23:59' }],
    requestIds: [],
    timeline: [
      { type: 'OPENED', title: '配额不足提醒', description: '研发子账户剩余配额首次跌破 100,000 Token。', occurredAt: '2026-09-28T09:10:00+08:00' },
      { type: 'OCCURRED', title: '配额继续消耗', description: '最近一次扣减后剩余 82,000 Token。', occurredAt: '2026-09-28T12:16:00+08:00' },
    ],
    actions: [usageAction('token-pro'), ticketAction('sub-quota-low')],
  },
  {
    id: 'rate-anomaly', alertNo: 'AL202609270001', category: 'USAGE_ANOMALY', type: 'REQUEST_RATE_ANOMALY', typeLabel: '请求频率异常',
    title: '数据分析助手请求频率持续超过限制', description: '该用户密钥的请求频率连续超过平台限制，部分请求已被限流。', severity: 'WARNING', lifecycle: 'ACTIVE', initiallyRead: true,
    ownerContext: 'sub-b', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: 'sub-b', subaccountName: '测试子账户',
    subjectType: 'USER_API_KEY', subjectId: 'key-analysis', subjectName: '数据分析助手', subjectMasked: 'sk-****91LX',
    impactSummary: '最近窗口有 16 次请求因限流被拒绝。', firstOccurredAt: '2026-09-27T17:42:00+08:00', lastOccurredAt: '2026-09-28T08:50:00+08:00', recoveredAt: null, occurrenceCount: 74,
    metrics: [{ label: '峰值请求频率', value: '32 RPS', threshold: '限制 20 RPS' }, { label: '受限请求', value: '16 次' }, { label: '统计窗口', value: '5 分钟' }],
    requestIds: ['call-20260928-0849K'],
    timeline: [
      { type: 'OPENED', title: '请求频率超过限制', description: '5 分钟窗口峰值达到 29 RPS。', occurredAt: '2026-09-27T17:42:00+08:00' },
      { type: 'OCCURRED', title: '异常再次发生', description: '最近窗口峰值 32 RPS，16 次请求被限流。', occurredAt: '2026-09-28T08:50:00+08:00' },
    ],
    actions: [callAction('token-pro', 'key-analysis'), { code: 'MANAGE_KEY', label: '管理用户密钥', path: '/api-keys?keyId=key-analysis' }, ticketAction('rate-anomaly')],
  },
  {
    id: 'quota-exhausted', alertNo: 'AL202609270002', category: 'QUOTA', type: 'SERVICE_QUOTA_EXHAUSTED', typeLabel: '服务额度耗尽',
    title: '历史急救包额度已耗尽', description: 'Token 服务下的历史急救包已经耗尽，连续包仍有可用额度。', severity: 'CRITICAL', lifecycle: 'RECOVERED', initiallyRead: true,
    ownerContext: 'main', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: null, subaccountName: null,
    subjectType: 'SERVICE', subjectId: 'token-pro', subjectName: 'Token 服务 · 专业版', subjectMasked: null,
    impactSummary: '服务可用额度已切换至连续包，本轮告警已恢复。', firstOccurredAt: '2026-09-27T16:45:00+08:00', lastOccurredAt: '2026-09-27T16:51:00+08:00', recoveredAt: '2026-09-27T17:02:00+08:00', occurrenceCount: 2,
    metrics: [{ label: '急救包剩余', value: '0 Token' }, { label: '服务总可用额度', value: '8,640,000 Token' }, { label: '恢复原因', value: '切换至连续包可用额度' }],
    requestIds: [],
    timeline: [
      { type: 'OPENED', title: '急救包额度耗尽', description: '历史急救包剩余额度降为 0 Token。', occurredAt: '2026-09-27T16:45:00+08:00' },
      { type: 'RECOVERED', title: '告警已恢复', description: '服务切换至仍有余额的连续包，模型调用未中断。', occurredAt: '2026-09-27T17:02:00+08:00' },
    ],
    actions: [serviceAction('token-pro'), usageAction('token-pro')],
  },
  {
    id: 'oversized-request', alertNo: 'AL202609260001', category: 'USAGE_ANOMALY', type: 'OVERSIZED_REQUEST', typeLabel: '请求体持续超限',
    title: '研发测试 Key 多次提交超大请求', description: '该密钥多次提交超过平台大小限制的请求体，相关请求已被拒绝。', severity: 'NOTICE', lifecycle: 'RECOVERED', initiallyRead: true,
    ownerContext: 'sub-a', serviceId: 'token-pro', serviceName: 'Token 服务 · 专业版', subaccountId: 'sub-a', subaccountName: '研发子账户',
    subjectType: 'USER_API_KEY', subjectId: 'key-dev', subjectName: '研发测试 Key', subjectMasked: 'sk-****6P2Q',
    impactSummary: '5 次超限请求被拒绝，其他调用未受影响。', firstOccurredAt: '2026-09-26T11:20:00+08:00', lastOccurredAt: '2026-09-26T11:46:00+08:00', recoveredAt: '2026-09-26T12:20:00+08:00', occurrenceCount: 5,
    metrics: [{ label: '超限请求', value: '5 次' }, { label: '最大请求体', value: '28.6 MB', threshold: '限制 20 MB' }, { label: '恢复依据', value: '连续 30 分钟未再次发生' }],
    requestIds: ['call-20260926-1120A'],
    timeline: [
      { type: 'OPENED', title: '检测到超大请求', description: '请求体大小超过平台 20 MB 限制。', occurredAt: '2026-09-26T11:20:00+08:00' },
      { type: 'RECOVERED', title: '告警已恢复', description: '连续 30 分钟未再次出现超限请求。', occurredAt: '2026-09-26T12:20:00+08:00' },
    ],
    actions: [callAction('token-pro', 'key-dev'), ticketAction('oversized-request')],
  },
  {
    id: 'medical-low', alertNo: 'AL202609240001', category: 'QUOTA', type: 'SERVICE_QUOTA_LOW', typeLabel: '服务额度不足',
    title: '星海智医图像额度较低', description: '星海智医的图像生成额度已低于预警阈值，不与其他额度池互相抵扣。', severity: 'NOTICE', lifecycle: 'ACTIVE', initiallyRead: true,
    ownerContext: 'main', serviceId: 'medical-assistant', serviceName: '星海智医', subaccountId: null, subaccountName: null,
    subjectType: 'AI_APPLICATION', subjectId: 'medical-assistant', subjectName: '星海智医', subjectMasked: null,
    impactSummary: '仅影响图像生成能力，其他额度仍可使用。', firstOccurredAt: '2026-09-24T15:30:00+08:00', lastOccurredAt: '2026-09-28T09:00:00+08:00', recoveredAt: null, occurrenceCount: 8,
    metrics: [{ label: '当前剩余额度', value: '18 次' }, { label: '预警阈值', value: '20 次' }, { label: '额度单位', value: '图像生成次数' }],
    requestIds: [],
    timeline: [
      { type: 'OPENED', title: '图像额度不足', description: '剩余图像生成次数首次跌破 20 次。', occurredAt: '2026-09-24T15:30:00+08:00' },
      { type: 'OCCURRED', title: '额度继续消耗', description: '当前剩余图像生成次数为 18 次。', occurredAt: '2026-09-28T09:00:00+08:00' },
    ],
    actions: [serviceAction('medical-assistant'), usageAction('medical-assistant'), ticketAction('medical-low')],
  },
]

export const severityLabels: Record<AlertSeverity, string> = { NOTICE: '提醒', WARNING: '重要', CRITICAL: '严重' }
export const lifecycleLabels: Record<AlertLifecycle, string> = { ACTIVE: '告警中', RECOVERED: '已恢复' }
export const categoryLabels: Record<AlertCategory, string> = { QUOTA: '额度告警', USAGE_ANOMALY: '异常调用' }
