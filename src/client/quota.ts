import type { QuotaBucketDto, QuotaStatusDto } from '../shared/contracts.ts'

export interface ModelQuotaSummary {
  planType: string
  usedPercent: number
  remainingPercent: number
  tier: string
  resetsAt: number | null
}

export function formatWindowLabel(bucket: QuotaBucketDto): string {
  const win = (bucket.window || '').trim().toLowerCase()
  const name = (bucket.displayName || '').trim().toLowerCase()
  const id = (bucket.bucketId || '').trim().toLowerCase()

  if (win === '5h' || win === 'five_hour' || win === 'fivehour' || id.includes('5h') || name.includes('5-hour') || name.includes('five hour') || name.includes('5小时')) {
    return '5小时限额'
  }
  if (win === 'weekly' || win === '7d' || win === 'week' || id.includes('weekly') || name.includes('weekly') || name.includes('周限额') || name.includes('7天')) {
    return '周限额剩余'
  }
  if (win === 'daily' || win === '24h' || win === 'day' || id.includes('daily') || name.includes('daily') || name.includes('日限额')) {
    return '日限额剩余'
  }
  if (win === 'monthly' || win === '30d' || win === 'month' || id.includes('monthly') || name.includes('monthly') || name.includes('月限额')) {
    return '月限额剩余'
  }

  return bucket.displayName || bucket.window || '额度'
}

export function formatWindowBadge(bucket: QuotaBucketDto): string {
  const win = (bucket.window || '').trim().toLowerCase()
  const name = (bucket.displayName || '').trim().toLowerCase()
  const id = (bucket.bucketId || '').trim().toLowerCase()

  if (win === '5h' || win === 'five_hour' || id.includes('5h') || name.includes('5-hour') || name.includes('five hour')) {
    return '5H'
  }
  if (win === 'weekly' || win === '7d' || id.includes('weekly') || name.includes('weekly')) {
    return '7D'
  }
  if (win === 'daily' || win === '24h' || id.includes('daily') || name.includes('daily')) {
    return '24H'
  }
  if (win === 'monthly' || id.includes('monthly') || name.includes('monthly')) {
    return 'Month'
  }
  return bucket.window ? bucket.window.toUpperCase() : 'Quota'
}

export function selectQuotaForModel(
  quota: QuotaStatusDto | undefined | null,
  modelId?: string,
): ModelQuotaSummary | null {
  if (!quota || !Array.isArray(quota.quotaGroups) || quota.quotaGroups.length === 0) {
    return null
  }

  const normalized = (modelId || '').toLowerCase()
  const isClaudeOrGpt = normalized.includes('claude') || normalized.includes('gpt') || normalized.includes('sonnet') || normalized.includes('opus')

  // Find target group
  let targetGroup = quota.quotaGroups.find((g) => {
    const name = g.displayName.toLowerCase()
    return isClaudeOrGpt
      ? (name.includes('claude') || name.includes('gpt') || name.includes('3p'))
      : (name.includes('gemini') || !name.includes('claude'))
  })

  if (!targetGroup) {
    targetGroup = quota.quotaGroups[0]
  }

  if (!targetGroup || !Array.isArray(targetGroup.buckets) || targetGroup.buckets.length === 0) {
    return null
  }

  const activeBuckets = targetGroup.buckets.filter((b) => !b.disabled)
  if (activeBuckets.length === 0) return null

  // 优先选取短期 5H 限额以反映最紧迫余量；若上游只返回了 weekly 或其他周期，则自然选取第一个真实 bucket
  let matchedBucket = activeBuckets.find((b) => {
    const w = (b.window || '').toLowerCase()
    const id = b.bucketId.toLowerCase()
    const n = b.displayName.toLowerCase()
    return w === '5h' || id.includes('5h') || n.includes('5h') || n.includes('five')
  })

  if (!matchedBucket) {
    matchedBucket = activeBuckets[0]
  }

  if (!matchedBucket || typeof matchedBucket.remainingPercent !== 'number') {
    return null
  }

  return {
    planType: quota.tierDisplayName || quota.tier || 'Google AI Pro',
    usedPercent: matchedBucket.usedPercent,
    remainingPercent: matchedBucket.remainingPercent,
    tier: quota.tier || 'google-ai-pro',
    resetsAt: matchedBucket.resetsAt ?? null,
  }
}

export function formatPercent(value: number): string {
  if (Number.isInteger(value)) return `${value}%`
  return `${value.toFixed(1)}%`
}

