export type ModelType = 'TEXT_GENERATION' | 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'SPEECH_RECOGNITION'
export type Capability = 'TOOL_CALLING' | 'VISION_INPUT' | 'LONG_CONTEXT' | 'THINKING'
export type ModelStatus = 'AVAILABLE' | 'MAINTENANCE' | 'DELISTED'
export type Protocol = 'OPENAI_CHAT' | 'OPENAI_RESPONSES' | 'ANTHROPIC_MESSAGES' | 'IMAGE_API' | 'VIDEO_API' | 'AUDIO_API'

export interface ModelPriceItem { name: string; amount: string; unit: string }
export interface CatalogModel {
  manufacturer: string; id: string; name: string; code: string; summary: string; description: string
  type: ModelType; capabilities: Capability[]; context: string | null; maxOutput: string | null
  knowledgeCutoff: string | null; protocols: Protocol[]; status: ModelStatus
  pricingType: 'UNIT_PRICE' | 'MULTIPLIER'; priceSummary: string; multiplierBase?: string
  prices: ModelPriceItem[]; effectiveAt: string; updatedAt: string; notice: string | null; tags: string[]
}

export const modelTypeLabels: Record<ModelType, string> = {
  TEXT_GENERATION: '文生文', IMAGE_GENERATION: '文生图', VIDEO_GENERATION: '文生视频', SPEECH_RECOGNITION: '语音识别',
}
export const capabilityLabels: Record<Capability, string> = {
  TOOL_CALLING: '工具调用', VISION_INPUT: '视觉输入', LONG_CONTEXT: '长上下文', THINKING: '思考模式',
}
export const protocolLabels: Record<Protocol, string> = {
  OPENAI_CHAT: 'OpenAI Completions', OPENAI_RESPONSES: 'OpenAI Responses', ANTHROPIC_MESSAGES: 'Anthropic Messages',
  IMAGE_API: '图像生成 API', VIDEO_API: '视频生成 API', AUDIO_API: '音频转写 API',
}
export const modelStatusLabels: Record<ModelStatus, string> = { AVAILABLE: '可调用', MAINTENANCE: '维护中', DELISTED: '已下架' }

export const catalogModels: CatalogModel[] = [
  {
    manufacturer: 'DeepSeek', id: 'model-deepseek-v3', name: 'DeepSeek V3.1', code: 'deepseek-chat',
    summary: '适用于通用对话、内容生成和复杂任务处理的高性能文本模型。',
    description: '面向通用文本生成场景开放，适合内容创作、信息提取、多轮对话和复杂任务处理。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'THINKING'], context: '128K Tokens', maxOutput: '8K Tokens', knowledgeCutoff: '2025-01',
    protocols: ['OPENAI_CHAT', 'OPENAI_RESPONSES'], status: 'AVAILABLE', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥2.00 / 百万 Tokens 起',
    prices: [{ name: '输入价格', amount: '¥2.00', unit: '/ 百万 Tokens' }, { name: '输出价格', amount: '¥8.00', unit: '/ 百万 Tokens' }, { name: '缓存命中价格', amount: '¥0.50', unit: '/ 百万 Tokens' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-28 10:00', notice: null, tags: ['通用对话', '代码', '复杂任务'],
  },
  {
    manufacturer: '阿里云', id: 'model-qwen-max', name: 'Qwen Max', code: 'qwen-max',
    summary: '适合中文理解、企业知识问答和多轮对话的通用模型。', description: '在中文理解与生成场景中表现稳定，支持工具调用、思考模式和长上下文。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT', 'THINKING'], context: '128K Tokens', maxOutput: '16K Tokens', knowledgeCutoff: '2025-03',
    protocols: ['OPENAI_CHAT'], status: 'AVAILABLE', pricingType: 'MULTIPLIER', priceSummary: '定价倍率 1.2×', multiplierBase: '平台基准价格',
    prices: [{ name: '定价倍率', amount: '1.2×', unit: '平台基准价格' }], effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-26 16:20', notice: null, tags: ['中文', '知识问答', '长文本'],
  },
  {
    manufacturer: '智谱', id: 'model-glm-4', name: 'GLM-4 Plus', code: 'glm-4-plus',
    summary: '兼顾中文写作、信息提取与工具编排的文本生成模型。', description: '适用于企业办公、摘要提取和 Agent 工具编排等文本场景。',
    type: 'TEXT_GENERATION', capabilities: ['TOOL_CALLING', 'LONG_CONTEXT'], context: '64K Tokens', maxOutput: '8K Tokens', knowledgeCutoff: null,
    protocols: ['OPENAI_CHAT'], status: 'MAINTENANCE', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥1.50 / 百万 Tokens 起',
    prices: [{ name: '输入价格', amount: '¥1.50', unit: '/ 百万 Tokens' }, { name: '输出价格', amount: '¥5.00', unit: '/ 百万 Tokens' }, { name: '缓存命中价格', amount: '暂未提供', unit: '' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-22 09:10', notice: '模型正在维护，当前暂不可调用，恢复时间请留意平台公告。', tags: ['中文写作', '信息提取', 'Agent'],
  },
  {
    manufacturer: 'OpenAI', id: 'model-vision-pro', name: 'Vision Pro', code: 'vision-pro',
    summary: '支持图片理解、图表分析与多模态内容问答。', description: '面向图片理解和图文混合问答场景开放，可通过统一对话接口提交视觉内容。',
    type: 'TEXT_GENERATION', capabilities: ['VISION_INPUT', 'LONG_CONTEXT'], context: '64K Tokens', maxOutput: '8K Tokens', knowledgeCutoff: null,
    protocols: ['OPENAI_RESPONSES'], status: 'AVAILABLE', pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥4.00 / 百万 Tokens 起',
    prices: [{ name: '输入价格', amount: '¥4.00', unit: '/ 百万 Tokens' }, { name: '输出价格', amount: '¥12.00', unit: '/ 百万 Tokens' }, { name: '缓存命中价格', amount: '暂未提供', unit: '' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-25 14:35', notice: null, tags: ['图片理解', '图表分析', 'OCR'],
  },
  {
    manufacturer: '平台演示', id: 'model-image-create', name: 'Image Creator', code: 'image-creator',
    summary: '根据文本描述生成适用于创意设计和内容生产的图片。', description: '通过平台统一图像生成接口按张生成图片，支持常见宽高比例。',
    type: 'IMAGE_GENERATION', capabilities: [], context: null, maxOutput: null, knowledgeCutoff: null, protocols: ['IMAGE_API'], status: 'AVAILABLE',
    pricingType: 'UNIT_PRICE', priceSummary: '¥0.08 / 张起', prices: [{ name: '标准图片', amount: '¥0.08', unit: '/ 张' }, { name: '高清图片', amount: '¥0.18', unit: '/ 张' }, { name: '缓存命中价格', amount: '暂未提供', unit: '' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-18 12:30', notice: null, tags: ['图片生成', '创意设计'],
  },
  {
    manufacturer: '平台演示', id: 'model-video-create', name: 'Video Creator', code: 'video-creator',
    summary: '根据文本提示生成短视频，适用于营销和内容创作。', description: '支持通过异步任务生成短视频，具体规格和时长以接入文档为准。',
    type: 'VIDEO_GENERATION', capabilities: [], context: null, maxOutput: '10 秒', knowledgeCutoff: null, protocols: ['VIDEO_API'], status: 'AVAILABLE',
    pricingType: 'MULTIPLIER', priceSummary: '定价倍率 1.5×', multiplierBase: '平台视频生成基准额度', prices: [{ name: '定价倍率', amount: '1.5×', unit: '平台视频生成基准额度' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-20 10:15', notice: null, tags: ['短视频', '营销素材'],
  },
  {
    manufacturer: '平台演示', id: 'model-speech-recognizer', name: 'Speech Recognizer', code: 'speech-recognizer',
    summary: '将音频内容转换为文本，适用于会议和客服录音转写。', description: '支持普通话及常见中英文混合音频转写，返回带时间戳的文本结果。',
    type: 'SPEECH_RECOGNITION', capabilities: [], context: null, maxOutput: '2 小时音频', knowledgeCutoff: null, protocols: ['AUDIO_API'], status: 'AVAILABLE',
    pricingType: 'UNIT_PRICE', priceSummary: '¥0.06 / 分钟', prices: [{ name: '音频转写', amount: '¥0.06', unit: '/ 分钟' }],
    effectiveAt: '2026-10-01 00:00', updatedAt: '2026-09-19 15:00', notice: null, tags: ['语音转写', '会议纪要'],
  },
  {
    manufacturer: '平台演示', id: 'model-chat-legacy', name: 'Chat Standard', code: 'chat-standard',
    summary: '基础对话模型，已停止对外提供调用。', description: '该模型已下架，仅在目录中保留历史信息。',
    type: 'TEXT_GENERATION', capabilities: [], context: '16K Tokens', maxOutput: '4K Tokens', knowledgeCutoff: '2023-12', protocols: ['OPENAI_CHAT'], status: 'DELISTED',
    pricingType: 'UNIT_PRICE', priceSummary: '输入 ¥1.00 / 百万 Tokens 起', prices: [{ name: '输入价格', amount: '¥1.00', unit: '/ 百万 Tokens' }, { name: '输出价格', amount: '¥3.00', unit: '/ 百万 Tokens' }],
    effectiveAt: '2026-01-01 00:00', updatedAt: '2026-09-15 09:00', notice: '该模型已下架，无法继续调用。', tags: ['基础对话'],
  },
]
