import type { QuotaBucketDto, QuotaStatusDto } from '../shared/contracts.ts'

export interface ModelQuotaSummary {
  planType: string
  usedPercent: number
  remainingPercent: number
  tier: string
  resetsAt: number | null
}

export function selectQuotaForModel(
  quota: QuotaStatusDto | undefined | null,
  modelId?: string,
): ModelQuotaSummary | null {
  if (!quota || !Array.isArray(quota.quotaGroups) || quota.quotaGroups.length === 0) {
    return null
  }

  const normalized = (modelId || '').toLowerCase()
  const isClaudeOrGpt = normalized.includes('claude') || normalized.includes('gpt')

  // Find target group
  let targetGroup = quota.quotaGroups.find(g => {
    const name = g.displayName.toLowerCase()
    return isClaudeOrGpt
      ? (name.includes('claude') || name.includes('gpt'))
      : (name.includes('gemini') || !name.includes('claude'))
  })

  if (!targetGroup) {
    targetGroup = quota.quotaGroups[0]
  }

  if (!targetGroup || !targetGroup.buckets || targetGroup.buckets.length === 0) {
    return null
  }

  // Find 5H bucket first, fallback to weekly or first bucket
  let matchedBucket: QuotaBucketDto | undefined = targetGroup.buckets.find(b =>
    b.bucketId.toLowerCase().includes('five_hour') ||
    b.bucketId.toLowerCase().includes('5h') ||
    b.displayName.toLowerCase().includes('five hour') ||
    b.displayName.toLowerCase().includes('5h')
  )

  if (!matchedBucket) {
    matchedBucket = targetGroup.buckets[0]
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

