export type DocKind = 'QUICKSTART' | 'GUIDE' | 'API_REFERENCE' | 'INTEGRATION' | 'FAQ'

export interface CodeExample {
  language: 'cURL' | 'Python' | 'JavaScript' | 'Shell'
  code: string
}

export interface DocSection {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  steps?: string[]
  note?: { tone: 'info' | 'warning'; title: string; text: string }
  examples?: CodeExample[]
  table?: { headers: string[]; rows: string[][] }
}

export interface DocArticle {
  slug: string
  category: string
  title: string
  summary: string
  kind: DocKind
  updatedAt: string
  readMinutes: number
  tags: string[]
  protocols?: string[]
  sections: DocSection[]
}

export const docsCategories = [
  { key: 'quickstart', title: '快速开始', description: '从准备到完成首次调用' },
  { key: 'guides', title: '基础指南', description: '鉴权、流式响应与调用规则' },
  { key: 'api', title: 'API 参考', description: '公开端点、参数和返回格式' },
  { key: 'agents', title: 'Agent 与工具接入', description: '接入已验证的开发工具' },
  { key: 'faq', title: '常见问题', description: '定位常见调用失败' },
] as const

const quickstartExamples: CodeExample[] = [
  {
    language: 'cURL',
    code: `curl "{TOKENHUB_BASE_URL}/v1/chat/completions" \\
  -H "Authorization: Bearer $TOKENHUB_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "your-model-code",
    "messages": [{ "role": "user", "content": "你好" }]
  }'`,
  },
  {
    language: 'Python',
    code: `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["TOKENHUB_API_KEY"],
    base_url="{TOKENHUB_BASE_URL}/v1",
)

response = client.chat.completions.create(
    model="your-model-code",
    messages=[{"role": "user", "content": "你好"}],
)
print(response.choices[0].message.content)`,
  },
  {
    language: 'JavaScript',
    code: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.TOKENHUB_API_KEY,
  baseURL: "{TOKENHUB_BASE_URL}/v1",
});

const response = await client.chat.completions.create({
  model: "your-model-code",
  messages: [{ role: "user", content: "你好" }],
});`,
  },
]

export const docArticles: DocArticle[] = [
  {
    slug: 'quickstart/overview', category: 'quickstart', title: 'TokenHub 接入概览', kind: 'QUICKSTART',
    summary: '了解从开通服务、创建密钥到完成模型调用的完整接入路径。', updatedAt: '2026-09-29', readMinutes: 4,
    tags: ['接入', '快速开始', 'API 密钥'],
    sections: [
      { id: 'workflow', title: '接入流程', steps: ['确认当前账户已开通可用的 Token 服务。', '在 API 密钥页面创建用户密钥，并妥善保存。', '从模型目录选择当前账户可使用的模型，复制公开 model 标识。', '按照对应协议配置 Base URL 和鉴权请求头。', '发起首次请求，并在用量中心核对调用记录。'] },
      { id: 'prerequisites', title: '接入前准备', bullets: ['一个状态正常的主账户或子账户身份', '至少一项可用的 Token 服务或已分配配额', '一个由当前身份创建的用户 API 密钥', '一个当前服务允许使用的平台模型'] },
      { id: 'boundaries', title: '需要注意', note: { tone: 'info', title: '密钥和额度是两个概念', text: 'API 密钥是调用凭证，额度属于关联服务。创建多个密钥不会增加可用额度。AI 应用的业务密钥由开通流程管理。' } },
    ],
  },
  {
    slug: 'quickstart/first-request', category: 'quickstart', title: '发起第一个请求', kind: 'QUICKSTART',
    summary: '使用安全占位变量发起一条最小文生文请求。', updatedAt: '2026-09-29', readMinutes: 6,
    tags: ['首次调用', 'cURL', 'Python', 'JavaScript'], protocols: ['OpenAI 兼容'],
    sections: [
      { id: 'before-start', title: '开始之前', paragraphs: ['准备用户 API 密钥和模型目录中的公开 model 标识。示例使用受控占位地址，正式环境以平台公布的 Base URL 为准。'], note: { tone: 'warning', title: '不要粘贴真实密钥', text: '示例从环境变量 TOKENHUB_API_KEY 读取凭证。不要将密钥写入前端代码、公开仓库、URL 或日志。' } },
      { id: 'send-request', title: '发送请求', paragraphs: ['选择熟悉的语言，复制后替换示例模型标识，并在本地安全地配置环境变量。'], examples: quickstartExamples },
      { id: 'verify-result', title: '验证结果', bullets: ['HTTP 状态为 200，并返回模型结果。', '响应包含公开请求标识，可用于排障。', '用量中心出现对应调用记录；计量可能存在短暂延迟。'] },
    ],
  },
  {
    slug: 'guides/base-url', category: 'guides', title: 'Base URL 与接口版本', kind: 'GUIDE',
    summary: '区分 Base URL、公开端点、协议和模型标识。', updatedAt: '2026-09-29', readMinutes: 5,
    tags: ['Base URL', '版本', '端点'],
    sections: [
      { id: 'concepts', title: '四个容易混淆的概念', table: { headers: ['概念', '作用', '示例'], rows: [['Base URL', '平台公开 API 的基础地址', '{TOKENHUB_BASE_URL}'], ['路径', '某项能力的公开接口', '/v1/chat/completions'], ['协议', '请求与响应兼容格式', 'OpenAI 兼容'], ['model 标识', '请求中选择平台模型', 'your-model-code']] } },
      { id: 'environment', title: '环境与版本', paragraphs: ['正式 Base URL 和 API 版本由开放接口管理统一发布。文档示例不会使用供应商地址，也不会要求用户感知实际路由渠道。'] },
      { id: 'compatibility', title: '兼容性边界', note: { tone: 'info', title: '兼容不等于完全相同', text: '平台只对文档明确列出的协议、字段和行为作出兼容承诺。第三方 SDK 的额外功能需要单独验证。' } },
    ],
  },
  {
    slug: 'guides/authentication', category: 'guides', title: '鉴权方式', kind: 'GUIDE',
    summary: '使用用户 API 密钥安全访问 TokenHub 的公开接口。', updatedAt: '2026-09-29', readMinutes: 7,
    tags: ['鉴权', 'API 密钥', '401', '403'],
    sections: [
      { id: 'user-key', title: '用户密钥', paragraphs: ['Token 服务用户可以在 API 密钥页面创建、暂停、恢复和删除自己的密钥。业务产品密钥由 CRM 开通流程管理。'] },
      { id: 'request-header', title: '请求头', paragraphs: ['不同兼容协议可能使用不同鉴权头，最终以对应 API 参考为准。'], examples: [{ language: 'cURL', code: 'Authorization: Bearer $TOKENHUB_API_KEY\nContent-Type: application/json' }] },
      { id: 'security', title: '安全建议', bullets: ['只在服务端或受控开发环境使用密钥。', '为不同应用创建不同密钥，便于暂停和排查。', '怀疑泄露时立即暂停或删除密钥并重新创建。', '不要通过聊天、工单正文或截图提交完整密钥。'] },
      { id: 'errors', title: '常见鉴权错误', table: { headers: ['状态', '可能原因', '建议'], rows: [['401', '缺少、格式错误或无效密钥', '检查请求头并确认密钥有效'], ['403', '账户、服务或密钥被限制', '查看服务和账户状态'], ['429', '达到请求频率或并发限制', '按退避建议稍后重试']] } },
    ],
  },
  {
    slug: 'guides/streaming', category: 'guides', title: '流式响应', kind: 'GUIDE',
    summary: '逐步接收模型输出并正确处理结束与异常。', updatedAt: '2026-09-29', readMinutes: 8,
    tags: ['流式', 'stream', 'SSE'],
    sections: [
      { id: 'enable', title: '启用流式输出', paragraphs: ['在支持的端点中按文档设置 stream 参数。客户端应逐条处理事件。'], examples: [{ language: 'cURL', code: '{\n  "model": "your-model-code",\n  "stream": true,\n  "messages": [{ "role": "user", "content": "请生成一段介绍" }]\n}' }] },
      { id: 'lifecycle', title: '响应生命周期', steps: ['建立连接并校验响应状态。', '逐条读取事件并拼接公开内容字段。', '识别正常结束标识。', '记录公开 requestId，必要时用于排查。', '按接口约定读取 usage。'] },
      { id: 'disconnect', title: '客户端断开', note: { tone: 'warning', title: '断开不一定代表不计量', text: '客户端主动断开后，平台可能继续读取上游结果完成计量。最终用量以平台记录为准。' } },
    ],
  },
  {
    slug: 'guides/rate-limits', category: 'guides', title: '流控与请求限制', kind: 'GUIDE',
    summary: '了解请求频率、并发、请求体和模型限制。', updatedAt: '2026-09-29', readMinutes: 6,
    tags: ['流控', '429', '限制'],
    sections: [
      { id: 'dimensions', title: '限制维度', table: { headers: ['维度', '说明'], rows: [['请求频率', '单位时间允许发起的请求数量'], ['并发数', '同一时刻正在处理的请求数量'], ['请求体大小', '请求内容和附件允许的最大体积'], ['模型限制', '上下文、图片数量或生成参数限制']] } },
      { id: 'when-limited', title: '遇到 429', bullets: ['停止立即重复请求。', '读取公开错误码和重试提示。', '使用指数退避并加入少量随机抖动。', '持续出现时检查应用并发设置和服务限制。'] },
      { id: 'values', title: '当前限制', note: { tone: 'info', title: '数值由服务端配置', text: '不同账户、服务和模型可能具有不同限制。Demo 不展示未经确认的生产数值。' } },
    ],
  },
  {
    slug: 'guides/errors', category: 'guides', title: '错误码与故障排查', kind: 'GUIDE',
    summary: '根据 HTTP 状态、平台错误码和 requestId 定位调用问题。', updatedAt: '2026-09-29', readMinutes: 9,
    tags: ['错误码', 'requestId', '401', '429'],
    sections: [
      { id: 'error-shape', title: '错误响应', paragraphs: ['错误响应应包含机器可读错误码、用户消息和公开请求标识。实际字段以发布规范为准。'], examples: [{ language: 'cURL', code: '{\n  "error": {\n    "code": "RATE_LIMIT_EXCEEDED",\n    "message": "请求过于频繁，请稍后重试",\n    "request_id": "req_demo_01"\n  }\n}' }] },
      { id: 'common-errors', title: '常见错误', table: { headers: ['HTTP', '示例错误', '重试', '处理建议'], rows: [['400', 'INVALID_REQUEST', '否', '检查参数和请求体'], ['401', 'INVALID_API_KEY', '否', '检查鉴权头和密钥'], ['403', 'SERVICE_RESTRICTED', '否', '检查账户与服务状态'], ['404', 'MODEL_NOT_FOUND', '否', '使用模型目录公开标识'], ['429', 'RATE_LIMIT_EXCEEDED', '是', '退避后重试'], ['503', 'TEMPORARILY_UNAVAILABLE', '是', '稍后重试并保留 requestId']] } },
      { id: 'ticket', title: '提交工单前', bullets: ['记录发生时间、公开 requestId、接口路径和错误码。', '说明问题是否稳定复现以及已尝试的操作。', '不要提交完整 API 密钥、敏感 Prompt 或供应商信息。'] },
    ],
  },
  {
    slug: 'api/text-openai', category: 'api', title: '文生文 · OpenAI 兼容接口', kind: 'API_REFERENCE',
    summary: '查看文生文请求的公开路径、核心参数和返回结构。', updatedAt: '2026-09-29', readMinutes: 12,
    tags: ['文生文', 'OpenAI', 'messages'], protocols: ['OpenAI 兼容'],
    sections: [
      { id: 'endpoint', title: '接口信息', table: { headers: ['项目', '值'], rows: [['方法', 'POST'], ['公开路径', '/v1/chat/completions'], ['鉴权', '用户 API 密钥'], ['内容类型', 'application/json']] } },
      { id: 'request', title: '请求参数', table: { headers: ['字段', '类型', '必填', '说明'], rows: [['model', 'string', '是', '平台公开 model 标识'], ['messages', 'array', '是', '对话消息列表'], ['stream', 'boolean', '否', '是否启用流式输出'], ['temperature', 'number', '否', '模型支持时生效'], ['max_tokens', 'integer', '否', '输出上限，受模型限制']] } },
      { id: 'example', title: '请求示例', examples: quickstartExamples },
      { id: 'response', title: '响应与计量', paragraphs: ['非流式响应一次返回结果；流式响应按事件逐步返回。usage 是否返回以实际接口配置为准，最终扣减以平台计量记录为准。'] },
    ],
  },
  {
    slug: 'api/text-anthropic', category: 'api', title: '文生文 · Anthropic 兼容接口', kind: 'API_REFERENCE',
    summary: '查看 Anthropic 兼容消息接口和平台鉴权关系。', updatedAt: '2026-09-29', readMinutes: 11,
    tags: ['Anthropic', 'messages', '文生文'], protocols: ['Anthropic 兼容'],
    sections: [
      { id: 'availability', title: '适用范围', note: { tone: 'info', title: '以已发布能力为准', text: '平台只对文档明确列出的 Anthropic 兼容字段作出承诺。底层供应商和协议转换对用户不可见。' } },
      { id: 'endpoint', title: '接口信息', table: { headers: ['项目', '值'], rows: [['方法', 'POST'], ['公开路径', '/v1/messages'], ['Base URL', '{TOKENHUB_ANTHROPIC_BASE_URL}'], ['鉴权', '以正式鉴权说明为准']] } },
      { id: 'parameters', title: '核心参数', bullets: ['model：平台公开模型标识。', 'messages：用户和助手消息。', 'max_tokens：允许生成的最大 Token 数。', 'stream：是否使用流式响应。'] },
    ],
  },
  {
    slug: 'agents/claude-code', category: 'agents', title: 'Claude Code 接入', kind: 'INTEGRATION',
    summary: '通过 ANTHROPIC_BASE_URL 将 Claude Code 指向 TokenHub。', updatedAt: '2026-09-29', readMinutes: 8,
    tags: ['Claude Code', 'ANTHROPIC_BASE_URL', 'Agent'], protocols: ['Anthropic 兼容'],
    sections: [
      { id: 'requirements', title: '适用前提', bullets: ['当前账户具有可用 Token 服务或子账户配额。', '已经创建用户 API 密钥。', '平台已为当前服务开放 Anthropic 兼容接口。', '使用平台已验证的 Claude Code 版本。'] },
      { id: 'configure', title: '配置环境变量', paragraphs: ['下面是结构示例，正式地址、密钥变量和模型映射以平台验证配置为准。'], examples: [{ language: 'Shell', code: 'export ANTHROPIC_BASE_URL="{TOKENHUB_ANTHROPIC_BASE_URL}"\nexport ANTHROPIC_API_KEY="$TOKENHUB_API_KEY"\n\nclaude' }] },
      { id: 'verify', title: '验证接入', steps: ['启动 Claude Code。', '发起一条不含敏感信息的测试请求。', '确认工具正常返回结果。', '在用量中心核对调用记录。'] },
      { id: 'troubleshoot', title: '常见问题', table: { headers: ['现象', '检查项'], rows: [['401', '密钥变量是否正确设置'], ['403', '账户、服务和密钥状态'], ['未知模型', '模型映射是否使用平台公开标识'], ['429', '是否超过频率或并发限制'], ['额度不足', '服务余量和子账户配额']] } },
      { id: 'security', title: '配置安全', note: { tone: 'warning', title: '避免密钥泄露', text: '不要把真实密钥写入项目文件、提交到 Git，或粘贴到工单和聊天记录。' } },
    ],
  },
  {
    slug: 'faq/authentication', category: 'faq', title: '为什么请求返回 401 或 403？', kind: 'FAQ',
    summary: '区分密钥无效、身份无权限和服务受限。', updatedAt: '2026-09-29', readMinutes: 4,
    tags: ['401', '403', '鉴权失败'],
    sections: [
      { id: 'difference', title: '先区分状态', table: { headers: ['状态', '通常含义'], rows: [['401', '未携带有效凭证，或凭证格式不正确'], ['403', '身份已识别，但账户、服务、密钥或模型权限不允许调用']] } },
      { id: 'checklist', title: '排查顺序', steps: ['检查是否使用当前账户创建的用户密钥。', '检查请求头名称、前缀和格式。', '确认密钥未暂停或删除。', '确认账户及 Token 服务状态正常。', '确认 model 标识在当前服务范围内。'] },
      { id: 'still-failing', title: '仍未解决', paragraphs: ['保留发生时间、接口路径、平台错误码和公开 requestId 后提交工单。不要提交完整密钥。'] },
    ],
  },
]

export const kindLabels: Record<DocKind, string> = {
  QUICKSTART: '快速开始', GUIDE: '基础指南', API_REFERENCE: 'API 参考', INTEGRATION: '工具接入', FAQ: '常见问题',
}
