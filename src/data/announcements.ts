export type AnnouncementCategory = 'MODEL_CHANGE' | 'MAINTENANCE' | 'GENERAL'
export interface AnnouncementRecord {
  id: string; title: string; category: AnnouncementCategory; publishedAt: string
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE'; paragraphs: string[]
}
export const announcementCategories: Record<AnnouncementCategory, string> = {
  MODEL_CHANGE: '模型上下架', MAINTENANCE: '维护通知', GENERAL: '其他公告',
}
export function isAnnouncementVisible(record: AnnouncementRecord, asOf: string) {
  return record.status === 'PUBLISHED' && Date.parse(record.publishedAt) <= Date.parse(asOf)
}
export function announcementPreview(record: AnnouncementRecord) {
  // Body is plain text and rendered with escaped interpolation, never as raw HTML.
  return Array.from(record.paragraphs.join(' ').replace(/\s+/g, ' ').trim()).slice(0, 100).join('')
}
// Fictional demo notices; no account targeting, read status, pinning or operational metadata.
export const announcementRecords: AnnouncementRecord[] = [
  { id: 'model-update', title: '模型上下架通知：Chat Standard 将停止提供调用', category: 'MODEL_CHANGE', status: 'PUBLISHED', publishedAt: '2026-10-05T10:00:00+08:00', paragraphs: ['平台将停止对外提供 Chat Standard 模型调用，模型目录将同步更新可用状态。请在调用前确认目标模型仍处于可调用状态。', '如应用仍使用该模型，请提前评估替代模型的能力、输入输出限制与价格，完成配置调整和测试后再切换。具体生效信息以平台已发布说明为准。', '本公告为虚构演示内容，不代表真实模型的上线或下架安排。'] },
  { id: 'maintenance', title: '平台维护通知（10 月 6 日）', category: 'MAINTENANCE', status: 'PUBLISHED', publishedAt: '2026-10-04T09:00:00+08:00', paragraphs: ['平台计划于 2026 年 10 月 6 日 00:00 至 02:00（北京时间）进行例行维护，以提升运行稳定性。', '维护期间，部分模型调用和用量查询可能短暂中断或出现响应延迟，请提前安排批量任务，避免在维护窗口内集中发起请求。', '维护完成后服务将恢复正常。若仍遇到异常，请保留发生时间和公开请求标识，勿提交完整密钥或敏感请求正文。', '本公告仅用于演示页面，不代表实际维护计划。'] },
  { id: 'service-policy', title: '用量展示说明：核对调用消耗与可用余量', category: 'GENERAL', status: 'PUBLISHED', publishedAt: '2026-10-03T14:30:00+08:00', paragraphs: ['用量中心用于核对模型调用记录和消耗，额度信息应按当前服务的计量方式阅读。金额余额与 Token 包余量不互相换算。', 'Token 包余量按照同一应用或服务下当前有效且可共同抵扣的包汇总，不将不同应用的额度混在一起。', '该内容仅用于公告阅读演示。'] },
  { id: 'integration-guide', title: '欢迎使用 TokenHub', category: 'GENERAL', status: 'PUBLISHED', publishedAt: '2026-10-02T11:00:00+08:00', paragraphs: ['欢迎使用 TokenHub 用户门户。您可在模型目录查看模型能力，并通过接入文档了解服务准备、密钥使用和调用配置。', '请妥善保管访问凭证，不要公开分享完整密钥、密码或验证码。本文仅用于演示公告内容。'] },
  ...Array.from({ length: 30 }, (_, i): AnnouncementRecord => {
    const category = (['MODEL_CHANGE', 'MAINTENANCE', 'GENERAL'] as const)[i % 3]!
    const title = category === 'MODEL_CHANGE' ? `模型上下架说明：第 ${i + 1} 批目录状态更新` : category === 'MAINTENANCE' ? `平台维护通知：第 ${i + 1} 次例行检查` : `平台使用说明：第 ${i + 1} 期服务消息`
    return { id: `notice-${String(i + 1).padStart(3, '0')}`, title, category, status: 'PUBLISHED', publishedAt: new Date(Date.parse('2026-10-02T08:00:00+08:00') - i * 8 * 3600000).toISOString(), paragraphs: [`${title}。此公告为虚构演示数据，用于展示类型筛选、发布时间排序及多页阅读。`, category === 'MAINTENANCE' ? '检查期间可能出现短暂响应延迟，请提前安排重要任务。具体维护时间和影响范围由平台正式公告提供。' : '相关平台信息会在门户同步更新，使用前请核对当前服务状态和模型可用性。', '公告只读，所有已登录用户可阅读已发布内容。计划发布时间未到、草稿或已下线内容不对用户展示。'] }
  }),
  { id: 'draft-notice', title: '公告草稿', category: 'GENERAL', status: 'DRAFT', publishedAt: '2026-10-01T10:00:00+08:00', paragraphs: ['不应向用户展示的草稿。'] },
  { id: 'offline-notice', title: '已下线公告', category: 'GENERAL', status: 'OFFLINE', publishedAt: '2026-10-01T10:00:00+08:00', paragraphs: ['已下线，不应向用户展示。'] },
  { id: 'scheduled-notice', title: '尚未到发布时间的公告', category: 'MAINTENANCE', status: 'PUBLISHED', publishedAt: '2099-10-01T10:00:00+08:00', paragraphs: ['不应提前展示的计划公告。'] },
]
