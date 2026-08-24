import { describe, expect, it } from 'vitest'
import {
  formatPercent,
  formatWindowBadge,
  formatWindowLabel,
  selectQuotaForModel,
} from '../src/client/quota.ts'
import type { QuotaBucketDto, QuotaStatusDto } from '../src/shared/contracts.ts'

describe('Client Quota Utils', () => {
  it('formats window labels dynamically without hardcoding assumptions', () => {
    const weeklyBucket: QuotaBucketDto = {
      bucketId: 'gemini-weekly',
      displayName: 'Weekly Limit Remaining',
      window: 'weekly',
      remainingFraction: 0.8,
      remainingPercent: 80,
      usedPercent: 20,
    }
    expect(formatWindowLabel(weeklyBucket)).toBe('周限额剩余')
    expect(formatWindowBadge(weeklyBucket)).toBe('7D')

    const fiveHourBucket: QuotaBucketDto = {
      bucketId: 'gemini-5h',
      displayName: 'Five Hour Limit Remaining',
      window: '5h',
      remainingFraction: 0.5,
      remainingPercent: 50,
      usedPercent: 50,
    }
    expect(formatWindowLabel(fiveHourBucket)).toBe('5小时限额')
    expect(formatWindowBadge(fiveHourBucket)).toBe('5H')

    const customBucket: QuotaBucketDto = {
      bucketId: 'custom-burst',
      displayName: 'Burst Rate',
      window: '10m',
      remainingFraction: 1,
      remainingPercent: 100,
      usedPercent: 0,
    }
    expect(formatWindowLabel(customBucket)).toBe('Burst Rate')
    expect(formatWindowBadge(customBucket)).toBe('10M')
  })

  it('selects correct quota for Gemini vs Claude models based on available buckets only', () => {
    const quotaData: QuotaStatusDto = {
      tier: 'google-ai-pro',
      tierDisplayName: 'Google AI Pro',
      projectId: 'test-project',
      fetchedAt: Date.now(),
      quotaGroups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            {
              bucketId: 'gemini-weekly',
              displayName: 'Weekly Limit',
              window: 'weekly',
              remainingFraction: 0.75,
              remainingPercent: 75,
              usedPercent: 25,
            },
            {
              bucketId: 'gemini-5h',
              displayName: 'Five Hour Limit',
              window: '5h',
              remainingFraction: 0.45,
              remainingPercent: 45,
              usedPercent: 55,
            },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          buckets: [
            {
              bucketId: '3p-weekly',
              displayName: 'Weekly Limit Remaining',
              window: 'weekly',
              remainingFraction: 0.9,
              remainingPercent: 90,
              usedPercent: 10,
            },
          ],
        },
      ],
    }

    // Gemini selects 5H bucket when available (most pressing)
    const geminiSelected = selectQuotaForModel(quotaData, 'gemini-3.7-flash-high')
    expect(geminiSelected).toBeDefined()
    expect(geminiSelected?.remainingPercent).toBe(45)

    // Claude only has weekly bucket, returns weekly percent (never fabricates 5H)
    const claudeSelected = selectQuotaForModel(quotaData, 'claude-opus-4-6-thinking')
    expect(claudeSelected).toBeDefined()
    expect(claudeSelected?.remainingPercent).toBe(90)

    // Sonnet selects 3p group
    const sonnetSelected = selectQuotaForModel(quotaData, 'claude-sonnet-4-6')
    expect(sonnetSelected?.remainingPercent).toBe(90)
  })

  it('skips disabled buckets and selects the most pressing active quota', () => {
    const quotaData: QuotaStatusDto = {
      tier: 'google-ai-pro',
      tierDisplayName: 'Google AI Pro',
      projectId: 'test-project',
      fetchedAt: Date.now(),
      quotaGroups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            {
              bucketId: 'gemini-weekly',
              displayName: 'Weekly Limit',
              window: 'weekly',
              remainingFraction: 0.3,
              remainingPercent: 30,
              usedPercent: 70,
              disabled: false,
            },
            {
              bucketId: 'gemini-5h',
              displayName: 'Five Hour Limit',
              window: '5h',
              remainingFraction: 0.1,
              remainingPercent: 10,
              usedPercent: 90,
              disabled: true, // disabled bucket should be ignored
            },
          ],
        },
      ],
    }

    const selected = selectQuotaForModel(quotaData, 'gemini-3.7-flash-high')
    expect(selected).toBeDefined()
    expect(selected?.remainingPercent).toBe(30) // selected weekly because 5h is disabled
  })

  it('returns null when quota or group has no buckets', () => {
    expect(selectQuotaForModel(null, 'gemini-3.7-flash-high')).toBeNull()
    expect(selectQuotaForModel({ quotaGroups: [] } as any, 'gemini-3.7-flash-high')).toBeNull()
  })

  it('formats percent correctly', () => {
    expect(formatPercent(80)).toBe('80%')
    expect(formatPercent(84.41)).toBe('84.4%')
  })
})
