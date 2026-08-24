import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { PROVIDER_ID } from '../compat.ts'
import type { PluginStatusDto } from '../shared/contracts.ts'
import { GeminiSubscriptionApi } from './api.ts'
import { NS } from './locales.ts'
import { formatPercent, selectQuotaForModel } from './quota.ts'

type Props = PropsRuntime<'conversation.input.right'> & PropsLocale<typeof NS> & {
  api: GeminiSubscriptionApi
  directory: SnapshotStore<ModelDirectoryState>
  loadModelDirectory: () => void
}

export function GeminiComposerQuota({ api, directory, loadModelDirectory, t }: Props): React.JSX.Element | null {
  const modelState = useStore(directory)
  const [status, setStatus] = useState<PluginStatusDto | null>(null)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(false)
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

  const quota = useMemo(() => selectQuotaForModel(status?.quota, selected?.model), [selected?.model, status?.quota])
  if (!isGemini || status?.preferences.quickQuotaVisible !== true) return null

  const level = quota === null
    ? 'normal'
    : quota.remainingPercent <= 5
      ? 'danger'
      : quota.remainingPercent <= 20
        ? 'warning'
        : 'normal'

  return (
    <span
      className="dsh-gemini-composer-quota"
      data-level={level}
      aria-label={quota === null ? t('quickQuotaLoading') : `${t('quickQuotaLabel')}: ${formatPercent(quota.remainingPercent)}`}
    >
      <span>✨ {t('quickQuotaLabel')}</span>
      <strong>{quota === null ? (loading ? t('quickQuotaLoading') : '—') : formatPercent(quota.remainingPercent)}</strong>
    </span>
  )
}

function useStore<T>(store: SnapshotStore<T>): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  )
}
