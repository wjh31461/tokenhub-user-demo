export type TicketAccount = 'MAIN' | 'SUB'
export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED'
export type TicketCategory = 'CALL_FAILURE' | 'API_KEY' | 'USAGE_QUOTA' | 'SERVICE_ORDER' | 'MODEL_CAPABILITY' | 'ACCOUNT_SUBACCOUNT' | 'DOCUMENTATION' | 'OTHER'
export type TicketImpact = 'SELF' | 'APPLICATION' | 'MULTIPLE_USERS' | 'UNKNOWN'

export interface TicketAttachment {
  id: string
  name: string
  size: string
  type: 'IMAGE' | 'TEXT' | 'PDF' | 'JSON'
}

export interface TicketMessage {
  id: string
  sender: 'USER' | 'SUPPORT' | 'SYSTEM'
  content: string
  createdAt: string
  attachments?: TicketAttachment[]
}

export interface TicketReference {
  type: 'ALERT' | 'CALL' | 'DOC' | 'SERVICE' | 'MODEL' | 'API_KEY' | 'TICKET'
  label: string
  detail?: string
  path?: string
}

export interface TicketRecord {
  id: string
  ticketNo: string
  account: TicketAccount
  title: string
  category: TicketCategory
  status: TicketStatus
  description: string
  impact: TicketImpact
  occurredAt?: string
  createdAt: string
  updatedAt: string
  unread: number
  resolution?: string
  references: TicketReference[]
  messages: TicketMessage[]
}

export const ticketCategoryNames: Record<TicketCategory, string> = {
  CALL_FAILURE: '调用失败或响应异常',
  API_KEY: 'API 密钥问题',
  USAGE_QUOTA: '用量或额度问题',
  SERVICE_ORDER: '服务或订购问题',
  MODEL_CAPABILITY: '模型与能力问题',
  ACCOUNT_SUBACCOUNT: '账户或子账户问题',
  DOCUMENTATION: '文档问题',
  OTHER: '其他问题',
}

export const ticketStatusNames: Record<TicketStatus, string> = {
  PENDING: '待受理',
  IN_PROGRESS: '处理中',
  WAITING_USER: '待我补充',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
}

export const ticketImpactNames: Record<TicketImpact, string> = {
  SELF: '仅当前用户',
  APPLICATION: '当前应用',
  MULTIPLE_USERS: '多个使用方',
  UNKNOWN: '暂不确定',
}

export const ticketRecords: TicketRecord[] = [
  {
    id: 'ticket-rate-limit',
    ticketNo: 'TH20260929A7K2P9',
    account: 'MAIN',
    title: '生产环境模型调用持续返回限流错误',
    category: 'CALL_FAILURE',
    status: 'WAITING_USER',
    description: '生产环境从今天上午开始持续出现 429，已经按照文档进行退避重试，但仍有部分请求失败。希望协助确认当前服务限制。',
    impact: 'APPLICATION',
    occurredAt: '2026-09-29 09:18',
    createdAt: '2026-09-29 09:32',
    updatedAt: '2026-09-29 10:26',
    unread: 2,
    references: [
      { type: 'CALL', label: '请求标识', detail: 'req_9f3a7c2d' },
      { type: 'SERVICE', label: 'Token 专业版', detail: '服务状态正常', path: '/services/token-pro' },
      { type: 'MODEL', label: 'Qwen3-235B-A22B', detail: 'OpenAI 兼容接口', path: '/models/qwen3-235b' },
      { type: 'API_KEY', label: '生产环境 Key', detail: '****7K2P' },
    ],
    messages: [
      { id: 'm-rate-1', sender: 'USER', content: '生产环境从今天上午开始持续出现 429，退避重试后仍有部分失败。关联 requestId：req_9f3a7c2d。', createdAt: '2026-09-29 09:32' },
      { id: 'm-rate-2', sender: 'SYSTEM', content: '工单已受理，平台支持正在排查。', createdAt: '2026-09-29 09:46' },
      { id: 'm-rate-3', sender: 'SUPPORT', content: '我们已检查到该时段请求并发明显上升。请补充当时的预期并发数，以及问题是否在所有模型上都能复现。请勿提交完整 API Key。', createdAt: '2026-09-29 10:26' },
    ],
  },
  {
    id: 'ticket-quota-display',
    ticketNo: 'TH20260928D4M8Q1',
    account: 'MAIN',
    title: '服务详情与用量中心的额度显示需要核对',
    category: 'USAGE_QUOTA',
    status: 'IN_PROGRESS',
    description: '服务详情显示的剩余额度与用量中心近期统计无法直接对应，希望确认两个页面的数据口径。',
    impact: 'SELF',
    createdAt: '2026-09-28 16:20',
    updatedAt: '2026-09-29 09:10',
    unread: 0,
    references: [
      { type: 'SERVICE', label: 'Token 专业版', detail: '连续包', path: '/services/token-pro' },
      { type: 'DOC', label: 'Token 计量与 usage', detail: '接入文档', path: '/help/docs/token-metering' },
    ],
    messages: [
      { id: 'm-quota-1', sender: 'USER', content: '服务详情显示的剩余额度与近 7 天 Token 统计无法直接对应，请协助确认口径。', createdAt: '2026-09-28 16:20' },
      { id: 'm-quota-2', sender: 'SUPPORT', content: '已收到问题。实际 Token 计量与套餐额度扣减属于不同口径，我们正在核对该服务当前周期的额度包记录。', createdAt: '2026-09-29 09:10' },
    ],
  },
  {
    id: 'ticket-doc-example',
    ticketNo: 'TH20260927J6C3R8',
    account: 'MAIN',
    title: 'Claude Code 配置示例中的模型名称无法使用',
    category: 'DOCUMENTATION',
    status: 'RESOLVED',
    description: '按照接入文档配置后返回未知模型，希望确认示例中的 model 参数。',
    impact: 'SELF',
    occurredAt: '2026-09-27 14:05',
    createdAt: '2026-09-27 14:18',
    updatedAt: '2026-09-28 11:42',
    unread: 1,
    resolution: '文档示例中的旧模型别名已经更新。请使用模型目录展示的公开 modelCode，并重新加载 Claude Code 配置。',
    references: [
      { type: 'DOC', label: 'Claude Code 接入', detail: '模型配置章节', path: '/help/docs/claude-code' },
      { type: 'MODEL', label: 'Claude Sonnet 4', detail: '公开 modelCode 已更新', path: '/models/claude-sonnet-4' },
    ],
    messages: [
      { id: 'm-doc-1', sender: 'USER', content: '按照 Claude Code 文档配置后返回 UNKNOWN_MODEL，使用的是示例中的模型名称。', createdAt: '2026-09-27 14:18' },
      { id: 'm-doc-2', sender: 'SUPPORT', content: '问题已定位，文档示例引用了旧模型别名，现已完成更新。请使用模型目录中的公开 modelCode。', createdAt: '2026-09-28 11:42' },
    ],
  },
  {
    id: 'ticket-key-auth',
    ticketNo: 'TH20260924B2N5T7',
    account: 'MAIN',
    title: '开发环境密钥鉴权问题已处理',
    category: 'API_KEY',
    status: 'CLOSED',
    description: '新建的开发环境密钥请求返回 401。',
    impact: 'SELF',
    createdAt: '2026-09-24 10:12',
    updatedAt: '2026-09-25 15:30',
    unread: 0,
    resolution: '请求头格式配置错误，修正为文档要求的 Bearer 鉴权格式后调用恢复。',
    references: [{ type: 'API_KEY', label: '开发环境 Key', detail: '****2D9M' }],
    messages: [
      { id: 'm-key-1', sender: 'USER', content: '新建的开发环境密钥请求返回 401，密钥状态显示正常。', createdAt: '2026-09-24 10:12' },
      { id: 'm-key-2', sender: 'SUPPORT', content: '请检查鉴权头格式。该接口使用 Authorization: Bearer，请不要把完整密钥发送到工单。', createdAt: '2026-09-24 13:45' },
      { id: 'm-key-3', sender: 'USER', content: '已修正请求头并恢复调用，可以关闭。', createdAt: '2026-09-25 15:30' },
    ],
  },
  {
    id: 'ticket-sub-quota',
    ticketNo: 'TH20260929S8L1F4',
    account: 'SUB',
    title: '研发子账户提示可用配额不足',
    category: 'ACCOUNT_SUBACCOUNT',
    status: 'PENDING',
    description: '用量中心显示仍有少量配额，但调用返回额度不足，希望确认当前子账户实际可用状态。',
    impact: 'SELF',
    occurredAt: '2026-09-29 08:55',
    createdAt: '2026-09-29 09:06',
    updatedAt: '2026-09-29 09:06',
    unread: 0,
    references: [
      { type: 'SERVICE', label: 'Token 专业版', detail: '子账户分配配额' },
      { type: 'CALL', label: '请求标识', detail: 'req_sub_6c1f02' },
    ],
    messages: [
      { id: 'm-sub-1', sender: 'USER', content: '当前页面显示仍有少量配额，但调用返回额度不足。requestId：req_sub_6c1f02。', createdAt: '2026-09-29 09:06' },
    ],
  },
  {
    id: 'ticket-sub-model',
    ticketNo: 'TH20260926H3V9C5',
    account: 'SUB',
    title: '模型目录中未找到视觉模型',
    category: 'MODEL_CAPABILITY',
    status: 'CLOSED',
    description: '需要调用视觉模型，但当前子账户模型目录没有对应模型。',
    impact: 'SELF',
    createdAt: '2026-09-26 11:22',
    updatedAt: '2026-09-27 14:08',
    unread: 0,
    resolution: '该模型尚未包含在当前子账户关联服务的可用范围内，请联系主账户管理员确认服务权限。',
    references: [{ type: 'MODEL', label: '视觉模型', detail: '当前身份不可用' }],
    messages: [
      { id: 'm-sub-model-1', sender: 'USER', content: '需要调用视觉模型，但当前目录中没有可选项。', createdAt: '2026-09-26 11:22' },
      { id: 'm-sub-model-2', sender: 'SUPPORT', content: '当前子账户关联服务未包含视觉模型，请联系主账户管理员确认权限。', createdAt: '2026-09-27 14:08' },
    ],
  },
]
