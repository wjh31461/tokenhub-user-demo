export type ModelType = 'TEXT_GENERATION' | 'MULTIMODAL' | 'IMAGE_GENERATION' | 'EMBEDDING'
export type Capability = 'TOOL_CALLING' | 'VISION_INPUT' | 'LONG_CONTEXT' | 'THINKING' | 'STRUCTURED_OUTPUT' | 'STREAMING'
export type Availability = 'AVAILABLE' | 'NOT_ENTITLED' | 'SERVICE_RESTRICTED' | 'DEPRECATED'
export type Protocol = 'OPENAI_CHAT' | 'ANTHROPIC_MESSAGES' | 'OPENAI_EMBEDDINGS' | 'IMAGE_API'

export interface ModelPriceItem {
  name: string
  amount: string
  unit: string
}

export interface CatalogModel {
  id: string
  name: string
  code: string
  summary: string
  description: string
  type: ModelType
  capabilities: Capability[]
  context: string | null
  maxOutput: string | null
  protocols: Protocol[]
  availability: Availability
  subAvailability: Availability
  pricingType: 'UNIT_PRICE' | 'MULTIPLIER'
  priceSummary: string
  prices: ModelPriceItem[]
  updatedAt: string
  notice: string | null
  deprecationDate?: string
  replacementId?: string
  tags: string[]
  limitations: string[]
}

export const modelTypeLabels: Record<ModelType, string> = {
  TEXT_GENERATION: '文生文',
  MULTIMODAL: '多模态',
  IMAGE_GENERATION: '文生图',
  EMBEDDING: '向量嵌入',
}

export const capabilityLabels: Record<Capability, string> = {
  TOOL_CALLING: '工具调用',
  VISION_INPUT: '视觉输入',
  LONG_CONTEXT: '长上下文',
  THINKING: '思考模式',
  STRUCTURED_OUTPUT: '结构化输出',
  STREAMING: '流式输出',
}

export const protocolLabels: Record<Protocol, string> = {
  OPENAI_CHAT: 'OpenAI Chat',
  ANTHROPIC_MESSAGES: 'Anthropic Messages',
  OPENAI_EMBEDDINGS: 'OpenAI Embeddings',
  IMAGE_API: '图像生成 API',
}

export const catalogModels: CatalogModel[] = [
  {
    id: 'model-deepseek-v3', name: 'DeepSeek V3', code: 'deepseek-v3',
    summary: '适用于通用对话、内容生成和复杂任务处理的高性能文本模型。',
    description: '面向通用文本生成场景开放，支持流式输出、工具调用和结构化输出。平台会在用户不可见的可用渠道间完成路由与容灾。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'THINKING', 'STRUCTURED_OUTPUT', 'STREAMING'],
    context: '128,000 Token', maxOutput: '8,192 Token', protocols: ['OPENAI_CHAT', 'ANTHROPIC_MESSAGES'],
    availability: 'AVAILABLE', subAvailability: 'AVAILABLE', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥2 / 百万 Token 起',
    prices: [
      { name: '输入 Token', amount: '¥2.00', unit: '/ 百万 Token' },
      { name: '缓存命中输入', amount: '¥0.50', unit: '/ 百万 Token' },
      { name: '输出 Token', amount: '¥8.00', unit: '/ 百万 Token' },
    ],
    updatedAt: '2026-09-28 10:00', notice: null, tags: ['通用对话', '代码', '复杂任务'],
    limitations: ['视觉内容需要选择支持视觉输入的模型。', '具体请求体大小同时受开放接口限制。'],
  },
  {
    id: 'model-qwen-max', name: 'Qwen Max', code: 'qwen-max',
    summary: '适合中文理解、企业知识问答和多轮对话的通用模型。',
    description: '在中文理解与生成场景中表现稳定，支持工具调用、思考模式和长上下文。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'THINKING', 'STRUCTURED_OUTPUT', 'STREAMING'],
    context: '128,000 Token', maxOutput: '16,384 Token', protocols: ['OPENAI_CHAT'],
    availability: 'AVAILABLE', subAvailability: 'AVAILABLE', pricingType: 'MULTIPLIER', priceSummary: '1.2 倍额度',
    prices: [{ name: '额度扣减倍率', amount: '1.2', unit: '倍' }],
    updatedAt: '2026-09-26 16:20', notice: null, tags: ['中文', '知识问答', '长文本'],
    limitations: ['额度扣减结果以用量中心最终记录为准。'],
  },
  {
    id: 'model-glm-4', name: 'GLM-4 Plus', code: 'glm-4-plus',
    summary: '兼顾中文写作、信息提取与工具编排的文本生成模型。',
    description: '适用于企业办公、摘要提取和 Agent 工具编排等文本场景。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'STREAMING'],
    context: '64,000 Token', maxOutput: '8,192 Token', protocols: ['OPENAI_CHAT'],
    availability: 'AVAILABLE', subAvailability: 'NOT_ENTITLED', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥1.5 / 百万 Token 起',
    prices: [
      { name: '输入 Token', amount: '¥1.50', unit: '/ 百万 Token' },
      { name: '输出 Token', amount: '¥5.00', unit: '/ 百万 Token' },
    ],
    updatedAt: '2026-09-22 09:10', notice: null, tags: ['中文写作', '信息提取', 'Agent'],
    limitations: ['当前不支持视觉输入。', '结构化输出能力未公开承诺。'],
  },
  {
    id: 'model-vision-pro', name: 'Vision Pro', code: 'vision-pro',
    summary: '支持图片理解、图表分析与多模态内容问答。',
    description: '面向图片理解和图文混合问答场景开放，可通过统一对话接口提交视觉内容。',
    type: 'MULTIMODAL', capabilities: ['VISION_INPUT', 'LONG_CONTEXT', 'STRUCTURED_OUTPUT', 'STREAMING'],
    context: '64,000 Token', maxOutput: '8,192 Token', protocols: ['OPENAI_CHAT'],
    availability: 'AVAILABLE', subAvailability: 'AVAILABLE', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥4 / 百万 Token 起',
    prices: [
      { name: '文本输入', amount: '¥4.00', unit: '/ 百万 Token' },
      { name: '输出 Token', amount: '¥12.00', unit: '/ 百万 Token' },
      { name: '图片输入', amount: '按实际折算', unit: '详见计价说明' },
    ],
    updatedAt: '2026-09-25 14:35', notice: '图片大小与格式同时受开放接口限制。', tags: ['图片理解', '图表分析', 'OCR'],
    limitations: ['不用于生成图片。', '单次可提交的图片数量以接入文档为准。'],
  },
  {
    id: 'model-coder-pro', name: 'Coder Pro', code: 'coder-pro',
    summary: '面向代码生成、补全、解释和重构场景优化。',
    description: '适合研发辅助和代码 Agent 使用，支持工具调用及长上下文代码理解。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'STRUCTURED_OUTPUT', 'STREAMING'],
    context: '200,000 Token', maxOutput: '16,384 Token', protocols: ['OPENAI_CHAT', 'ANTHROPIC_MESSAGES'],
    availability: 'NOT_ENTITLED', subAvailability: 'NOT_ENTITLED', pricingType: 'MULTIPLIER', priceSummary: '1.5 倍额度',
    prices: [{ name: '额度扣减倍率', amount: '1.5', unit: '倍' }],
    updatedAt: '2026-09-21 11:40', notice: null, tags: ['代码生成', '代码审查', '重构'],
    limitations: ['当前账户服务暂未包含该模型。'],
  },
  {
    id: 'model-embed-large', name: 'Embedding Large', code: 'embedding-large',
    summary: '用于语义检索、知识库召回和文本聚类的向量模型。',
    description: '将文本转换为高维向量，适用于企业知识库、RAG 检索和相似度计算。',
    type: 'EMBEDDING', capabilities: [], context: '8,192 Token', maxOutput: null, protocols: ['OPENAI_EMBEDDINGS'],
    availability: 'AVAILABLE', subAvailability: 'AVAILABLE', pricingType: 'UNIT_PRICE', priceSummary: '¥0.8 / 百万 Token',
    prices: [{ name: '输入 Token', amount: '¥0.80', unit: '/ 百万 Token' }],
    updatedAt: '2026-09-19 15:00', notice: null, tags: ['RAG', '语义检索', '向量化'],
    limitations: ['只返回向量，不生成自然语言内容。'],
  },
  {
    id: 'model-image-create', name: 'Image Creator', code: 'image-creator',
    summary: '根据文本描述生成适用于创意设计和内容生产的图片。',
    description: '通过平台统一图像生成接口按张生成图片，支持常见宽高比例。',
    type: 'IMAGE_GENERATION', capabilities: [], context: null, maxOutput: null, protocols: ['IMAGE_API'],
    availability: 'AVAILABLE', subAvailability: 'NOT_ENTITLED', pricingType: 'UNIT_PRICE', priceSummary: '¥0.08 / 张起',
    prices: [
      { name: '标准图片', amount: '¥0.08', unit: '/ 张' },
      { name: '高清图片', amount: '¥0.18', unit: '/ 张' },
    ],
    updatedAt: '2026-09-18 12:30', notice: null, tags: ['图片生成', '创意设计'],
    limitations: ['不使用 Token 作为计量单位。', '生成内容须符合平台内容安全规范。'],
  },
  {
    id: 'model-chat-legacy', name: 'Chat Standard', code: 'chat-standard',
    summary: '基础对话模型，已进入下架迁移期。',
    description: '该模型已进入迁移期，现有用户可继续使用至停止服务时间。建议尽快迁移至 DeepSeek V3。',
    type: 'TEXT_GENERATION', capabilities: ['STREAMING'], context: '16,000 Token', maxOutput: '4,096 Token', protocols: ['OPENAI_CHAT'],
    availability: 'DEPRECATED', subAvailability: 'DEPRECATED', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥1 / 百万 Token 起',
    prices: [
      { name: '输入 Token', amount: '¥1.00', unit: '/ 百万 Token' },
      { name: '输出 Token', amount: '¥3.00', unit: '/ 百万 Token' },
    ],
    updatedAt: '2026-09-15 09:00', notice: '将于 2026-11-30 停止服务，请迁移至 DeepSeek V3。', deprecationDate: '2026-11-30 23:59', replacementId: 'model-deepseek-v3', tags: ['基础对话'],
    limitations: ['停止服务后将不再接受新调用。', '不支持工具调用和长上下文。'],
  },
]
