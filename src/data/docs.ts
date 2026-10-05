import { catalogModels } from './models'
export type DocKind = 'QUICKSTART' | 'GUIDE' | 'API_REFERENCE' | 'INTEGRATION'
export interface CodeExample { language: 'JSON' | 'Text'; code: string }
export interface DocSection {
  id: string; title: string; paragraphs?: string[]; bullets?: string[]; steps?: string[]
  note?: { tone: 'info' | 'warning'; title: string; text: string }
  examples?: CodeExample[]; table?: { headers: string[]; rows: string[][] }
  links?: { label: string; path: string }[]
}
export interface DocArticle {
  slug: string; category: string; title: string; summary: string; kind: DocKind
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE'; updatedAt: string; tags: string[]; sections: DocSection[]
}
export const docsCategories = [
  { key: 'general', title: '通用文档', type: 'GENERAL', description: 'API 访问方式、流控要求、错误码与 Agent 接入' },
  { key: 'text', title: '文生文', type: 'CAPABILITY', capability: 'TEXT_GENERATION', description: '文本生成能力的接口说明' },
  { key: 'image', title: '文生图', type: 'CAPABILITY', capability: 'IMAGE_GENERATION', description: '图像生成能力的接口说明' },
  { key: 'video', title: '文生视频', type: 'CAPABILITY', capability: 'VIDEO_GENERATION', description: '暂未发布接口文档' },
]
const placeholder = { tone: 'warning' as const, title: '演示占位，不能用于实际调用', text: '公开地址、请求方法、鉴权、参数、响应及限制尚待接口团队提供并验证。本页仅演示文档版式，不表示真实接口已经发布。' }
const articles: Omit<DocArticle, 'status' | 'updatedAt'>[] = [
  { slug: 'quickstart', category: 'general', title: '快速开始', summary: '准备服务、创建密钥、调用模型、查看用量。', kind: 'QUICKSTART', tags: ['接入', '首次调用'], sections: [
    { id: 'prepare-service', title: '准备服务', paragraphs: ['确认当前账户已开通所需服务，服务状态及可用额度满足调用条件。多个密钥不会增加服务额度。'], links: [{ label: '我的服务', path: '/services' }] },
    { id: 'create-key', title: '创建密钥', paragraphs: ['从“我的服务”的密钥管理位置创建用户自定义密钥。密钥仅在创建成功时展示一次，请妥善保存；业务密钥由 CRM 管理，在门户只读。'], links: [{ label: '前往服务密钥管理', path: '/services?section=keys&action=create' }] },
    { id: 'call-model', title: '调用模型', steps: ['在模型目录确认模型能力和可用状态。', '进入该模型关联的接口说明，核对实际发布的地址和参数。', '在服务端或受控环境安全配置密钥，按已验证示例发起请求。'], note: placeholder, links: [{ label: '模型目录', path: '/models' }] },
    { id: 'view-usage', title: '查看用量', paragraphs: ['调用后前往用量中心核对结果与消耗，记录可能稍后出现。请勿把完整密钥或原始请求正文粘贴到工单。'], links: [{ label: '用量中心', path: '/usage' }] },
  ] },
  { slug: 'api-access', category: 'general', title: 'API 访问方式', summary: '理解调用前准备、Base URL、鉴权及模型代码。', kind: 'GUIDE', tags: ['Base URL', 'API Key', 'modelCode'], sections: [
    { id: 'prerequisites', title: '调用前准备', bullets: ['当前账户的服务和额度可用。', '使用有效的用户自定义密钥，不在文档页读取或展示真实密钥。', '模型状态与能力符合需求。'] },
    { id: 'endpoint', title: '公开地址与鉴权', note: placeholder, table: { headers: ['项目', '说明'], rows: [['Base URL', '由接口团队提供，不是 /docs 门户网页地址'], ['公开接口路径与请求方法', '待接口团队确认'], ['鉴权方式', '待接口团队确认；示例只使用 YOUR_API_KEY']] } },
    { id: 'model-code', title: '如何选择模型', paragraphs: ['modelId 是平台模型编号，用于门户关联文档；modelCode 是实际请求中使用的模型代码。二者不能互相代替，调用参数名称以已发布接口规范为准。'] },
    { id: 'example', title: '最小调用示例（待确认）', examples: [{ language: 'Text', code: '公开地址：YOUR_PUBLIC_API_URL\n请求方法：YOUR_REQUEST_METHOD\n鉴权方式：YOUR_AUTH_SCHEME\n密钥占位：YOUR_API_KEY\n模型代码：YOUR_MODEL_CODE\n请求参数：由接口团队提供\n\n这是待确认的配置清单，不是可执行请求。' }] },
  ] },
  { slug: 'rate-limits', category: 'general', title: '流控要求', summary: '了解频率、并发与服务限制，并正确处理限流。', kind: 'GUIDE', tags: ['流控', '429', '并发'], sections: [
    { id: 'limits', title: '实际限制在哪里查看', table: { headers: ['限制维度', '说明', '实际数值'], rows: [['调用频率', '单位时间内可发起的请求数量', '待接口团队提供'], ['并发', '同一时刻处理的请求数量', '待接口团队提供'], ['请求大小', '内容、文件等体积限制', '待接口团队提供']] }, paragraphs: ['限制因服务或模型而异时，以对应服务说明及已发布能力接口文档为准。不在演示页承诺固定生产数值。'] },
    { id: 'retry', title: '被限流时如何处理', bullets: ['先核对 HTTP 状态和平台错误码，不将两者混为一谈。', '停止立即重复请求，按实际接口提供的重试提示控制节奏。', '排查调用频率、并发与应用重试策略；持续出现时携带公开 requestId 反馈。'], links: [{ label: '错误码说明', path: '/docs/articles/error-codes' }] },
  ] },
  { slug: 'error-codes', category: 'general', title: '错误码与排查方法', summary: '区分 HTTP 状态、平台错误码和 requestId，确认原因与重试规则。', kind: 'GUIDE', tags: ['错误码', 'requestId', 'PLATFORM_ERROR_CODE', '401', '429'], sections: [
    { id: 'concepts', title: '先区分三个概念', table: { headers: ['概念', '含义'], rows: [['HTTP 状态码', '请求的粗粒度结果，不等同于平台错误码'], ['平台错误码', '由实际网关提供的具体失败原因，待接口团队确认'], ['requestId', '用于工单排查的一次调用编号，不是 API Key']] } },
    { id: 'error-table', title: '平台错误码表（待确认）', note: placeholder, table: { headers: ['错误码', '错误含义', '常见原因', '处理方法', '是否重试'], rows: [['PLATFORM_ERROR_CODE', '由接口团队提供', '由接口团队提供', '由接口团队提供', '以已发布规范为准']] } },
    { id: 'feedback', title: '排查和反馈', bullets: ['保留问题时间、平台公开 requestId 及脱敏错误码。', '说明复现步骤与已尝试的处理方式。', '不要提交完整 API Key、密码、验证码或敏感请求正文。'] },
  ] },
  { slug: 'agent-integration', category: 'general', title: 'Agent 接入', summary: '了解工具支持范围、配置清单、验证步骤及常见问题。', kind: 'INTEGRATION', tags: ['Agent', '工具', 'Claude Code'], sections: [
    { id: 'supported-tools', title: '支持的工具', paragraphs: ['Agent 是调用模型完成任务的工具或程序。实际支持工具、版本及兼容范围由接口团队验证后发布。Claude Code 仅是候选示例，当前不提供未经验证的配置命令。'] },
    { id: 'configuration', title: '配置步骤（待验证）', steps: ['确认工具及其版本已被平台验证支持。', '获取已发布的公开地址、鉴权方式与模型代码。', '在工具的安全配置位置填写对应配置，密钥不写入公开仓库。'], examples: [{ language: 'Text', code: '工具及版本：待验证\n公开地址：YOUR_PUBLIC_API_URL\n密钥占位：YOUR_API_KEY\n模型代码：YOUR_MODEL_CODE\n具体配置字段：待接口团队验证后提供' }] },
    { id: 'verify', title: '如何验证成功', steps: ['使用不含敏感内容的最小测试任务。', '按已发布规范核对结果或公开错误信息。', '前往用量中心检查相应调用记录。'], links: [{ label: '用量中心', path: '/usage' }] },
    { id: 'troubleshoot', title: '常见问题', bullets: ['核对支持版本、公开地址与模型配置。', '检查密钥有效性、服务状态、余量与流控。', '失败时按错误码文章排查，不提交完整凭证。'], links: [{ label: '错误码说明', path: '/docs/articles/error-codes' }] },
  ] },
]
function capabilityArticle(slug: string, category: string, title: string, description: string): Omit<DocArticle, 'status' | 'updatedAt'> {
  return { slug, category, title, summary: description, kind: 'API_REFERENCE', tags: [title, '请求参数', '响应结果', 'MODEL_CODE'], sections: [
    { id: 'capability', title: '能做什么', paragraphs: [description, '适用模型以当前模型目录及经验证的模型与文章关联为准。'], note: placeholder },
    { id: 'endpoint', title: '调用哪里', table: { headers: ['项目', '值'], rows: [['公开 URL', 'YOUR_PUBLIC_API_URL（待确认）'], ['请求方法', '待接口团队提供'], ['鉴权方式', '待接口团队提供；密钥占位 YOUR_API_KEY']] } },
    { id: 'request-params', title: '要传什么：请求参数', table: { headers: ['参数名', '通俗说明', '数据类型', '是否必填', '示例或限制'], rows: [['待接口团队提供', '字段用途待确认', '待确认', '待确认', '默认值、可选值或长度限制待确认']] }, examples: [{ language: 'JSON', code: '{\n  "PLACEHOLDER_ONLY": "这是版式示意，不是实际请求参数",\n  "MODEL_CODE": "YOUR_MODEL_CODE",\n  "REQUEST_CONTENT": "由接口团队提供"\n}' }] },
    { id: 'response', title: '会返回什么：响应结果', table: { headers: ['字段名', '含义', '数据类型', '示例'], rows: [['待接口团队提供', '响应含义待确认', '待确认', '待确认']] }, examples: [{ language: 'JSON', code: '{\n  "PLACEHOLDER_ONLY": "这是响应版式示意，不代表真实字段",\n  "RESULT_CONTENT": "由接口团队提供"\n}' }], paragraphs: ['是否支持流式响应、流式事件格式和结束标识，需单独验证后发布。'] },
    { id: 'limitations', title: '有哪些限制', bullets: ['模型能力、输入输出大小及格式限制待接口团队提供。', '调用频率及并发限制以正式服务说明为准。', '用量字段的口径待接口团队提供；最终消耗以用量中心记录为准。'] },
    { id: 'errors', title: '失败怎么处理', paragraphs: ['按已发布错误码确认原因和是否重试；必要时提供公开 requestId 反馈。'], links: [{ label: '通用错误码说明', path: '/docs/articles/error-codes' }] },
  ] }
}
export const docArticles: DocArticle[] = [
  ...articles, capabilityArticle('text-api', 'text', '文生文接口说明', '输入文字并返回生成的文字内容。'), capabilityArticle('image-api', 'image', '文生图接口说明', '输入文字描述并返回生成的图片结果。'),
].map(article => ({ ...article, status: 'PUBLISHED', updatedAt: '2026-10-05' }))
// Fixtures verify that unpublished content never appears in navigation, results or related articles.
docArticles.push({ ...capabilityArticle('video-draft', 'video', '文生视频接口草稿', '未发布内容'), status: 'DRAFT', updatedAt: '2026-10-05' }, { slug: 'claude-code', category: 'general', title: 'Claude Code 旧配置', summary: '已下线', kind: 'INTEGRATION', status: 'OFFLINE', updatedAt: '2026-10-01', tags: ['旧配置'], sections: [] })
export const kindLabels: Record<DocKind, string> = { QUICKSTART: '快速开始', GUIDE: '通用指南', API_REFERENCE: '能力接口文档', INTEGRATION: 'Agent 接入' }
export const publishedDocs = docArticles.filter(article => article.status === 'PUBLISHED')
export const modelDocRelations = [
  { modelId: 'model-deepseek-v3', slug: 'text-api', anchor: 'request-params' },
  { modelId: 'model-qwen-max', slug: 'text-api', anchor: 'request-params' },
  { modelId: 'model-glm-4', slug: 'text-api', anchor: 'capability' },
  { modelId: 'model-image-create', slug: 'image-api', anchor: 'request-params' },
]
export function modelDocEntry(modelId: string) {
  const model = catalogModels.find(item => item.id === modelId && item.status !== 'DELISTED')
  if (!model) return { path: '/docs', query: { notice: 'model-doc-missing' } }
  const relation = modelDocRelations.find(item => item.modelId === modelId && publishedDocs.some(article => article.slug === item.slug))
  if (relation) return { path: `/docs/articles/${relation.slug}`, query: { modelId }, hash: `#${relation.anchor}` }
  const category = docsCategories.find(item => item.capability === model.type && publishedDocs.some(article => article.category === item.key))
  return { path: '/docs', query: { ...(category ? { category: category.key } : {}), notice: 'model-doc-missing', modelId } }
}
export const legacyDocSlugs: Record<string, string> = { 'quickstart/overview': 'quickstart', 'quickstart/first-request': 'quickstart', 'guides/base-url': 'api-access', 'guides/authentication': 'api-access', 'guides/streaming': 'text-api', 'guides/rate-limits': 'rate-limits', 'guides/errors': 'error-codes', 'api/text-openai': 'text-api', 'api/text-anthropic': 'text-api', 'agents/claude-code': 'claude-code', 'faq/authentication': 'error-codes' }
