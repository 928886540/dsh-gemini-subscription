import type { QuotaStatusDto } from '../shared/contracts.ts'

export interface ModelQuotaSummary {
  planType: string
  usedPercent: number
  remainingPercent: number
  tier: string
}

export function selectQuotaForModel(
  quota: QuotaStatusDto | undefined | null,
  _modelId?: string,
): ModelQuotaSummary | null {
  if (!quota || !quota.tier) return null
  const bucket = quota.buckets[0]
  const used = bucket?.primary?.usedPercent ?? 0
  return {
    planType: quota.tierDisplayName || quota.tier || 'Free Tier',
    usedPercent: used,
    remainingPercent: Math.max(0, 100 - used),
    tier: quota.tier,
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
