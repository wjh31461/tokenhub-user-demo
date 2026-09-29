export type AnnouncementCategory = 'MAINTENANCE' | 'MODEL_CHANGE' | 'SERVICE_NOTICE' | 'GENERAL'
export type AnnouncementAudience = 'ALL' | 'MAIN_ACCOUNT' | 'SUB_ACCOUNT'

export interface AnnouncementLink {
  type: 'MODEL' | 'SERVICE' | 'DOCUMENT'
  label: string
  path: string
}

export interface AnnouncementRecord {
  id: string
  title: string
  summary: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  importance: 'NORMAL' | 'IMPORTANT'
  pinned: boolean
  publishedAt: string
  impactStartAt?: string
  impactEndAt?: string
  impactDescription?: string
  paragraphs: string[]
  links: AnnouncementLink[]
  initialRead: boolean
}

export const announcementCategories: Record<AnnouncementCategory, string> = {
  MAINTENANCE: '维护通知',
  MODEL_CHANGE: '模型变更',
  SERVICE_NOTICE: '服务通知',
  GENERAL: '一般公告',
}

export const announcementRecords: AnnouncementRecord[] = [
  {
    id: 'maintenance',
    title: '平台例行维护通知（10 月 1 日）',
    summary: '平台将进行例行升级维护，维护期间部分模型调用可能出现短暂中断。',
    category: 'MAINTENANCE',
    audience: 'ALL',
    importance: 'IMPORTANT',
    pinned: true,
    publishedAt: '2026-09-28 10:00',
    impactStartAt: '2026-10-01 00:00',
    impactEndAt: '2026-10-01 02:00',
    impactDescription: '维护期间，模型调用、用量查询等服务可能出现短暂不可用或响应延迟。',
    paragraphs: [
      '为持续提升平台稳定性，TokenHub 将于 2026 年 10 月 1 日 00:00 至 02:00 进行例行升级维护。',
      '请尽量避开维护窗口发起批量调用；如调用失败，可在维护结束后重试。维护结束后，平台会恢复正常服务。',
    ],
    links: [{ type: 'DOCUMENT', label: '查看接入文档', path: '/help/docs' }],
    initialRead: false,
  },
  {
    id: 'model-update',
    title: '模型目录更新：查看最新可用模型与能力说明',
    summary: '平台模型目录已更新，补充了模型能力、上下文和调用方式说明。',
    category: 'MODEL_CHANGE',
    audience: 'ALL',
    importance: 'NORMAL',
    pinned: false,
    publishedAt: '2026-09-28 09:20',
    paragraphs: [
      '模型目录已完成更新，用户可以查看当前开放模型的能力说明，包括视觉输入、工具调用、长上下文和思考模式等信息。',
      '建议在接入前阅读对应模型的能力说明，并根据应用场景选择合适的模型。',
    ],
    links: [{ type: 'MODEL', label: '查看模型目录', path: '/models' }],
    initialRead: true,
  },
  {
    id: 'service-policy',
    title: 'Token 服务用量展示口径更新说明',
    summary: '用量中心将逐步展示输入、输出和缓存命中用量，方便核对调用消耗。',
    category: 'SERVICE_NOTICE',
    audience: 'MAIN_ACCOUNT',
    importance: 'NORMAL',
    pinned: false,
    publishedAt: '2026-09-27 16:40',
    paragraphs: [
      '用量中心将逐步补充输入 Token、输出 Token 与缓存命中 Token 的展示。缓存命中 Token 是输入 Token 的组成部分，不会额外计入总 Token。',
      '实际 Token 计量与套餐额度扣减可能存在不同口径，请以服务详情中的额度信息为准。',
    ],
    links: [{ type: 'DOCUMENT', label: '查看接入文档', path: '/help/docs' }],
    initialRead: false,
  },
  {
    id: 'subaccount-quota',
    title: '子账户配额使用说明',
    summary: '子账户可使用主账户分配的配额，调用时同时受服务状态和配额限制。',
    category: 'SERVICE_NOTICE',
    audience: 'SUB_ACCOUNT',
    importance: 'NORMAL',
    pinned: false,
    publishedAt: '2026-09-26 14:10',
    paragraphs: [
      '子账户可以创建自己的 API 密钥并使用分配配额。实际调用还会受到主账户服务状态和可用额度影响。',
      '如需调整配额，请联系主账户管理员处理。',
    ],
    links: [{ type: 'SERVICE', label: '查看用量中心', path: '/usage?tab=statistics' }],
    initialRead: false,
  },
  {
    id: 'integration-guide',
    title: '欢迎使用 TokenHub：模型接入与 API 密钥使用指南',
    summary: '通过创建 API 密钥、选择模型和配置访问地址，即可将模型能力接入您的应用。',
    category: 'GENERAL',
    audience: 'ALL',
    importance: 'NORMAL',
    pinned: true,
    publishedAt: '2026-09-25 11:00',
    paragraphs: [
      'TokenHub 为多模型调用提供统一入口。您可以先在模型目录了解能力，再创建 API 密钥完成应用接入。',
      '请妥善保管 API 密钥，不要将密钥提交到代码仓库或公开分享。',
    ],
    links: [
      { type: 'DOCUMENT', label: '查看接入文档', path: '/help/docs' },
      { type: 'MODEL', label: '浏览模型目录', path: '/models' },
    ],
    initialRead: true,
  },
]
