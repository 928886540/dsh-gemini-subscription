import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { PROVIDER_ID } from '../compat.ts'
import type { PluginStatusDto } from '../shared/contracts.ts'
import { GeminiSubscriptionApi } from './api.ts'
import { NS } from './locales.ts'
import { formatPercent, formatWindowLabel, selectQuotaForModel } from './quota.ts'

type Props = PropsRuntime<'conversation.input.right'> & PropsLocale<typeof NS> & {
  api: GeminiSubscriptionApi
  directory: SnapshotStore<ModelDirectoryState>
  loadModelDirectory: () => void
}

export function GeminiComposerQuota({ api, directory, loadModelDirectory, t }: Props): React.JSX.Element | null {
  const modelState = useStore(directory)
  const [status, setStatus] = useState<PluginStatusDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const mountedRef = useRef(false)
  const containerRef = useRef<HTMLSpanElement | null>(null)

  const selected = modelState.current
  const isGemini = selected?.provider === PROVIDER_ID

  useEffect(() => {
    loadModelDirectory()
  }, [loadModelDirectory])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isGemini) return
    let disposed = false
    const refresh = async (): Promise<void> => {
      setLoading(true)
      try {
        const next = await api.status()
        if (!disposed && mountedRef.current) setStatus(next)
      } catch {
        if (!disposed && mountedRef.current) setStatus(null)
      } finally {
        if (!disposed && mountedRef.current) setLoading(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 60_000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [api, isGemini])

  // 点击外部自动关闭 Popover 弹窗
  useEffect(() => {
    if (!popoverOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popoverOpen])

  const quota = useMemo(() => selectQuotaForModel(status?.quota, selected?.model), [selected?.model, status?.quota])
  if (!isGemini || status?.preferences.quickQuotaVisible !== true) return null

  const level = quota === null
    ? 'normal'
    : quota.remainingPercent <= 5
      ? 'danger'
      : quota.remainingPercent <= 20
        ? 'warning'
        : 'normal'

  // 提取各 Bucket 详细限额信息（如 5小时、周限额等）
  const quotaGroups = status?.quota.quotaGroups ?? []

  return (
    <span
      ref={containerRef}
      className="dsh-gemini-composer-quota-wrap"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        className="dsh-gemini-composer-quota"
        data-level={level}
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-label={quota === null ? t('quickQuotaLoading') : `${t('quickQuotaLabel')}: ${formatPercent(quota.remainingPercent)}`}
      >
        <span>✨ {t('quickQuotaLabel')}</span>{' '}
        <strong>{quota === null ? (loading ? t('quickQuotaLoading') : '—') : formatPercent(quota.remainingPercent)}</strong>
      </button>

      {/* 点击弹出的配额详情浮层 */}
      {popoverOpen && (
        <div className="agy-quota-popover">
          <div className="agy-popover-header">
            <span className="agy-popover-title">✨ Antigravity 订阅额度详情</span>
            <span className="agy-popover-tier">{status?.quota.tierDisplayName || 'Google AI Pro'}</span>
          </div>

          <div className="agy-popover-body">
            {quotaGroups.length === 0 ? (
              <div className="agy-popover-empty">暂无可用额度数据</div>
            ) : (
              quotaGroups.map((group, idx) => (
                <div key={idx} className="agy-popover-group">
                  <div className="agy-popover-group-title">{group.displayName}</div>
                  <div className="agy-popover-buckets">
                    {group.buckets.map((b) => {
                      const label = formatWindowLabel(b)
                      const resetStr = formatRelativeReset(b.resetsAt)
                      return (
                        <div key={b.bucketId} className="agy-popover-bucket-row">
                          <div className="agy-popover-bucket-info">
                            <span className="agy-popover-bucket-name">{label}</span>
                            {resetStr && <span className="agy-popover-reset-time">🔄 {resetStr}</span>}
                          </div>
                          <div className="agy-popover-progress-bar">
                            <div
                              className="agy-popover-progress-fill"
                              style={{ width: `${Math.max(0, Math.min(100, b.remainingPercent))}%` }}
                            />
                          </div>
                          <div className="agy-popover-bucket-percent">
                            {formatPercent(b.remainingPercent)} 剩余
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </span>
  )
}

function formatRelativeReset(timestampMs?: number | null): string | null {
  if (!timestampMs) return null
  const diff = timestampMs - Date.now()
  if (diff <= 0) return '马上刷新'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins}分钟后刷新`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}小时${remainingMins > 0 ? `${remainingMins}分钟` : ''}后刷新`
}

function useStore<T>(store: SnapshotStore<T>): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  )
}
