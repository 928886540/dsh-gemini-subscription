import type { QuotaStatusDto } from '../shared/contracts.ts'

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
  if (!quota || !quota.buckets || quota.buckets.length === 0) return null

  // Try matching model bucket first, otherwise use first bucket
  let matched = modelId
    ? quota.buckets.find(b => b.id === modelId || modelId.includes(b.id) || b.id.includes(modelId))
    : undefined
  if (!matched) {
    matched = quota.buckets[0]
  }
  if (!matched || !matched.primary) return null

  const primary = matched.primary
  const remaining = typeof primary.remainingPercent === 'number'
    ? primary.remainingPercent
    : Math.max(0, 100 - primary.usedPercent)
  const used = primary.usedPercent

  return {
    planType: matched.planType || quota.tierDisplayName || quota.tier || 'Free Tier',
    usedPercent: used,
    remainingPercent: remaining,
    tier: quota.tier || 'free-tier',
    resetsAt: primary.resetsAt,
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
