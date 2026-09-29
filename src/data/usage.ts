export type CallStatus = 'SUCCESS' | 'FAILED'
export type MeteringStatus = 'PENDING' | 'COMPLETE' | 'UNAVAILABLE' | 'NOT_APPLICABLE'
export type ChargeStatus = 'PENDING' | 'SETTLED' | 'NOT_CHARGED' | 'UNAVAILABLE'
export type KeyCategory = 'USER' | 'BUSINESS' | 'UNKNOWN'
export type ModelType = 'TEXT_TO_TEXT' | 'TEXT_TO_IMAGE' | 'VISION_TO_TEXT' | 'OTHER'

export interface UsageCall {
  id: string
  startedAt: string
  completedAt: string | null
  serviceId: string
  serviceName: string
  serviceType: 'TOKEN_SERVICE' | 'AI_APPLICATION'
  actorId: string
  actorName: string
  keyCategory: KeyCategory
  keyId: string | null
  keyName: string | null
  modelId: string | null
  modelName: string
  modelType: ModelType
  requestedModel: string
  status: CallStatus
  meteringStatus: MeteringStatus
  inputTokens: number | null
  outputTokens: number | null
  cacheReadTokens: number | null
  cacheMissTokens: number | null
  cacheWriteTokens: number | null
  chargeStatus: ChargeStatus
  chargeAmount: number | null
  currency: 'CNY' | null
  quotaAmount: number | null
  quotaUnit: 'token' | 'point' | null
  durationMs: number | null
  ttftMs: number | null
  errorCode: string | null
  resultMessage: string
}

export const services = [
  { id: 'svc-model-pro', label: '通用模型服务 Pro', type: 'TOKEN_SERVICE' },
  { id: 'svc-model-standard', label: '通用模型服务标准版', type: 'TOKEN_SERVICE' },
  { id: 'svc-legal', label: '法律文书助手', type: 'AI_APPLICATION' },
]

export const models = [
  { id: 'model-deepseek-v3', label: 'DeepSeek V3', type: 'TEXT_TO_TEXT' as const },
  { id: 'model-qwen-max', label: 'Qwen Max', type: 'TEXT_TO_TEXT' as const },
  { id: 'model-glm-4', label: 'GLM-4 Plus', type: 'TEXT_TO_TEXT' as const },
  { id: 'model-vision-pro', label: 'Vision Pro', type: 'VISION_TO_TEXT' as const },
  { id: 'model-image-pro', label: 'Image Pro', type: 'TEXT_TO_IMAGE' as const },
]

export const actors = [
  { id: 'account-main', label: '主账户', type: '主账户' },
  { id: 'account-sub-a', label: '研发团队', type: '子账户' },
  { id: 'account-sub-b', label: '客服机器人', type: '子账户' },
]

export const userKeys = [
  { id: 'key-main-prod', label: '生产环境 Key', actorId: 'account-main', serviceId: 'svc-model-pro' },
  { id: 'key-main-test', label: '测试环境 Key', actorId: 'account-main', serviceId: 'svc-model-standard' },
  { id: 'key-sub-dev', label: '研发 Agent Key', actorId: 'account-sub-a', serviceId: 'svc-model-pro' },
  { id: 'key-sub-bot', label: '客服机器人 Key', actorId: 'account-sub-b', serviceId: 'svc-model-pro' },
]

const start = Date.UTC(2026, 7, 15, 2, 0, 0)
const calls: UsageCall[] = []

for (let index = 0; index < 92; index += 1) {
  const dayOffset = (index * 7) % 45
  const hour = 8 + (index * 3) % 11
  const date = new Date(start + dayOffset * 86_400_000 + hour * 3_600_000 + (index % 17) * 61_000)
  const service = services[index % (index % 7 === 0 ? 3 : 2)]!
  const isBusiness = service.type === 'AI_APPLICATION'
  const actor = isBusiness ? actors[0]! : actors[index % actors.length]!
  const availableKeys = userKeys.filter(item => item.actorId === actor.id && item.serviceId === service.id)
  const key = availableKeys[0] ?? userKeys.find(item => item.actorId === actor.id) ?? userKeys[0]!
  const model = models[index % models.length]!
  const isPending = index % 19 === 0
  const isUnavailable = !isPending && index % 23 === 0
  const isNonToken = !isPending && !isUnavailable && index % 29 === 0
  const meteringStatus: MeteringStatus = isPending ? 'PENDING' : isUnavailable ? 'UNAVAILABLE' : isNonToken ? 'NOT_APPLICABLE' : 'COMPLETE'
  const input = meteringStatus === 'COMPLETE' ? 340 + (index * 173) % 7_800 : null
  const output = meteringStatus === 'COMPLETE' ? 80 + (index * 71) % 2_100 : null
  const cacheSupported = meteringStatus === 'COMPLETE' && index % 6 !== 0
  const cacheRead = cacheSupported && input !== null ? Math.floor(input * ((index % 5) / 10)) : null
  const cacheMiss = cacheSupported && input !== null && cacheRead !== null ? input - cacheRead : null
  const callStatus: CallStatus = index % 11 === 0 ? 'FAILED' : 'SUCCESS'
  const chargeStatus: ChargeStatus = isPending ? 'PENDING' : index % 31 === 0 ? 'UNAVAILABLE' : index % 13 === 0 ? 'NOT_CHARGED' : 'SETTLED'
  const charge = chargeStatus === 'SETTLED' && input !== null && output !== null ? Number(((input * 0.000002 + output * 0.000006) * (isBusiness ? 1.15 : 1)).toFixed(8)) : chargeStatus === 'NOT_CHARGED' ? 0 : null
  const seconds = 2 + index % 28
  calls.push({
    id: `call-202609-${String(index + 1).padStart(4, '0')}`,
    startedAt: date.toISOString(),
    completedAt: isPending ? null : new Date(date.getTime() + seconds * 1000).toISOString(),
    serviceId: service.id,
    serviceName: service.label,
    serviceType: service.type as UsageCall['serviceType'],
    actorId: actor.id,
    actorName: actor.label,
    keyCategory: isBusiness ? 'BUSINESS' : index % 37 === 0 ? 'UNKNOWN' : 'USER',
    keyId: isBusiness ? null : key.id,
    keyName: isBusiness ? null : key.label,
    modelId: index % 41 === 0 ? null : model.id,
    modelName: index % 41 === 0 ? '未识别模型' : model.label,
    modelType: index % 41 === 0 ? 'OTHER' : model.type,
    requestedModel: index % 41 === 0 ? 'auto' : model.id,
    status: callStatus,
    meteringStatus,
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    cacheMissTokens: cacheMiss,
    cacheWriteTokens: cacheMiss === null ? null : Math.floor(cacheMiss * 0.18),
    chargeStatus,
    chargeAmount: charge,
    currency: chargeStatus === 'SETTLED' ? 'CNY' : null,
    quotaAmount: meteringStatus === 'COMPLETE' && input !== null && output !== null ? input + output : null,
    quotaUnit: meteringStatus === 'COMPLETE' ? 'token' : null,
    durationMs: isPending ? null : seconds * 1000 + index * 7,
    ttftMs: isPending || isNonToken ? null : 210 + (index * 37) % 1_600,
    errorCode: callStatus === 'FAILED' ? (index % 2 ? 'MODEL_TIMEOUT' : 'RATE_LIMITED') : null,
    resultMessage: callStatus === 'FAILED' ? '本次调用失败，未返回有效模型结果。' : isPending ? '调用成功，Token 与额度消耗仍在更新。' : '调用成功，计量结果已更新。',
  })
}

export const usageCalls = calls.sort((left, right) => right.startedAt.localeCompare(left.startedAt) || right.id.localeCompare(left.id))
