import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  CredentialStorageDto,
  PluginStatusDto,
  QuotaBucketDto,
  QuotaWindowDto,
  SubscriptionPreferencesUpdateDto,
} from '../shared/contracts.ts'
import { GEMINI_MODEL_CATALOG } from '../shared/model-catalog.ts'
import { GeminiSubscriptionApi, parseLoginEvent } from './api.ts'
import { NS } from './locales.ts'

type Props = PropsRuntime<'settings.section'> & PropsLocale<typeof NS>
type BusyAction = 'login' | 'token' | 'quota' | 'test' | 'logout' | 'preferences' | null
type Translate = Props['t']

export function GeminiSubscriptionSection({ t }: Props): React.JSX.Element {
  const apiRef = useRef(new GeminiSubscriptionApi())
  const eventSourceRef = useRef<EventSource | null>(null)
  const [status, setStatus] = useState<PluginStatusDto | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [connection, setConnection] = useState<{ latencyMs: number; checkedAt: number } | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setError(null)
    try {
      const next = await apiRef.current.status()
      setStatus(next)
      if (next.error !== undefined) setError(next.error.message)
    } catch (cause) {
      if (!quiet) setError(messageOf(cause))
    }
  }, [])

  useEffect(() => {
    void load()
    const refreshWhenVisible = (): void => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
    const timer = window.setInterval(refreshWhenVisible, 60_000)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
      eventSourceRef.current?.close()
    }
  }, [load])

  const watchLogin = useCallback((loginId: string) => {
    eventSourceRef.current?.close()
    const source = apiRef.current.events(loginId)
    eventSourceRef.current = source

    const finish = async (message?: string): Promise<void> => {
      source.close()
      eventSourceRef.current = null
      setBusy(null)
      setAuthUrl(null)
      if (message !== undefined) setError(message)
      await load(true)
    }

    const handleParsed = (parsed: ReturnType<typeof parseLoginEvent>) => {
      if (!parsed) return
      if (parsed.type === 'completed') void finish()
      else if (parsed.type === 'cancelled') void finish()
      else if (parsed.type === 'failed') void finish(parsed.error.message)
    }

    source.onmessage = (event) => {
      handleParsed(parseLoginEvent(event))
    }
    source.addEventListener('completed', (event) => {
      handleParsed(parseLoginEvent(event as MessageEvent<string>))
    })
    source.addEventListener('cancelled', () => void finish())
    source.addEventListener('failed', (event) => {
      const parsed = parseLoginEvent(event as MessageEvent<string>)
      void finish(parsed?.type === 'failed' ? parsed.error.message : 'Google sign-in failed.')
    })
    source.onerror = () => {
      void finish()
    }
  }, [load])

  useEffect(() => {
    const loginId = status?.login.active && !status?.authenticated ? status.login.loginId : null
    if (loginId !== null && loginId !== undefined && eventSourceRef.current === null) {
      watchLogin(loginId)
    }
  }, [status?.login.active, status?.login.loginId, status?.authenticated, watchLogin])

  const startLogin = async (): Promise<void> => {
    setBusy('login')
    setError(null)
    setPopupBlocked(false)
    const popup = window.open('about:blank', 'dsh-gemini-oauth', 'popup,width=560,height=760')
    try {
      const login = await apiRef.current.startLogin()
      setAuthUrl(login.authUrl)
      if (popup === null) {
        setPopupBlocked(true)
      } else {
        popup.location.replace(login.authUrl)
      }
      watchLogin(login.loginId)
      await load(true)
    } catch (cause) {
      popup?.close()
      setBusy(null)
      setError(messageOf(cause))
    }
  }

  const cancelLogin = async (): Promise<void> => {
    const loginId = status?.login.loginId
    if (!loginId) return
    setBusy('login')
    try {
      await apiRef.current.cancelLogin(loginId)
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setAuthUrl(null)
      await load()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(null)
    }
  }

  const refreshToken = async (): Promise<void> => run('token', async () => {
    const res = await apiRef.current.refresh()
    setStatus(res)
  })

  const refreshQuota = async (): Promise<void> => run('quota', async () => {
    const quota = await apiRef.current.getQuota(true)
    setStatus((cur) => (cur === null ? cur : { ...cur, quota }))
  })

  const testConnection = async (): Promise<void> => run('test', async () => {
    const result = await apiRef.current.testConnection()
    if (result.ok) {
      setConnection({ latencyMs: result.latencyMs, checkedAt: Date.now() })
    } else {
      setError(result.error ?? 'Connection test failed')
    }
  })

  const updatePreferences = async (patch: SubscriptionPreferencesUpdateDto): Promise<void> => run('preferences', async () => {
    const preferences = await apiRef.current.updatePreferences(patch)
    setStatus((cur) => (cur === null ? cur : { ...cur, preferences }))
  })

  const logout = async (): Promise<void> => run('logout', async () => {
    await apiRef.current.logout()
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setAuthUrl(null)
    setConnection(null)
    await load()
  })

  const run = async (action: Exclude<BusyAction, null>, task: () => Promise<void>): Promise<void> => {
    setBusy(action)
    setError(null)
    try {
      await task()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(null)
    }
  }

  const account = status?.account
  const isAuthenticated = status?.authenticated === true

  return (
    <section className="dsh-gemini-page" aria-labelledby="dsh-gemini-title">
      <header>
        <h2 id="dsh-gemini-title" className="dsh-gemini-title">{t('title')}</h2>
        <p className="dsh-gemini-intro">{t('intro')}</p>
      </header>

      {error !== null ? (
        <div className="dsh-gemini-errorbar" role="alert">
          <span>{error}</span>
          {status === null ? <Button disabled={busy !== null} onClick={() => load()}>重试</Button> : null}
        </div>
      ) : null}

      {status === null && error === null ? (
        <Skeleton label={t('loading')} />
      ) : (
        <>
          <Section title={t('account')}>
            <InfoRow label={isAuthenticated ? t('signedIn') : t('signedOut')} value={account?.email ?? '—'} />
            {isAuthenticated ? (
              <>
                <InfoRow label={t('plan')} value={account?.planType ?? 'Google AI Pro'} />
                <InfoRow label={t('projectId')} value={account?.projectId ?? '—'} />
                <InfoRow label={t('expires')} value={t('tokenAutoRenew')} />
              </>
            ) : null}
            <InfoRow label={t('storage')} value={storageLabel(status?.storage, t)} />
            <p className="dsh-gemini-notice">{storageNotice(status?.storage, t)}</p>

            {status?.login.active && !isAuthenticated ? (
              <p className="dsh-gemini-muted" role="status">{t('pending')}</p>
            ) : null}
            {popupBlocked ? <p className="dsh-gemini-error">{t('popupBlocked')}</p> : null}
            {authUrl !== null && !isAuthenticated ? (
              <a className="dsh-gemini-link" href={authUrl} target="_blank" rel="noreferrer">{t('continueLogin')}</a>
            ) : null}

            <div className="dsh-gemini-actions">
              {status?.login.active && !isAuthenticated ? (
                <Button disabled={busy !== null} onClick={cancelLogin}>{t('cancel')}</Button>
              ) : (
                <Button primary disabled={busy !== null || status?.storage.available === false} onClick={startLogin}>
                  {isAuthenticated ? t('signInAgain') : t('signIn')}
                </Button>
              )}
              {isAuthenticated ? (
                <>
                  <Button disabled={busy !== null} onClick={refreshToken}>{t('refreshToken')}</Button>
                  <Button disabled={busy !== null} onClick={logout}>{t('signOut')}</Button>
                </>
              ) : null}
            </div>
          </Section>

          <Section title={t('connection')}>
            <InfoRow label={t('provider')} value="Antigravity（AGY 订阅） · gemini-subscription" />
            <InfoRow label={t('connectionState')} value={connection === null ? (isAuthenticated ? t('connected') : t('untested')) : t('connected')} />
            {connection !== null ? (
              <InfoRow label={t('latency')} value={`${connection.latencyMs} ms · ${formatDate(connection.checkedAt)}`} />
            ) : null}
            <div className="dsh-gemini-models" aria-label={t('models')}>
              {GEMINI_MODEL_CATALOG.map((model) => (
                <code key={model.id} title={model.id}>{model.name}</code>
              ))}
            </div>
            <div className="dsh-gemini-actions">
              <Button disabled={!isAuthenticated || busy !== null} onClick={testConnection}>
                {busy === 'test' ? t('testing') : t('testConnection')}
              </Button>
            </div>
          </Section>

          <Section title={t('enhancements')}>
            <label className="dsh-gemini-check">
              <input
                type="checkbox"
                checked={status?.preferences.quickQuotaVisible === true}
                disabled={busy !== null}
                onChange={(event) => updatePreferences({ quickQuotaVisible: event.currentTarget.checked })}
              />
              <span>
                <strong>{t('quickQuota')}</strong>
                <small>{t('quickQuotaHint')}</small>
              </span>
            </label>
          </Section>

          <Section
            title={t('quota')}
            aside={
              <Button disabled={!isAuthenticated || busy !== null} onClick={refreshQuota}>
                {busy === 'quota' ? t('refreshing') : t('refreshQuota')}
              </Button>
            }
          >
            <p className="dsh-gemini-muted">{t('quotaIntro')}</p>

            {/* CPA Style Quota List */}
            {status?.quota.buckets && status.quota.buckets.length > 0 ? (
              <div>
                {status.quota.buckets.map((bucket) => {
                  if (typeof bucket.creditAmount === 'number') {
                    return (
                      <div key={bucket.id} className="dsh-gemini-quota-fact">
                        <span>{bucket.name}</span>
                        <strong>{bucket.creditAmount.toLocaleString()} Credits</strong>
                      </div>
                    )
                  }

                  const primary = bucket.primary
                  if (!primary) return null
                  const remaining = typeof primary.remainingPercent === 'number'
                    ? primary.remainingPercent
                    : Math.max(0, 100 - (primary.usedPercent ?? 0))
                  const used = primary.usedPercent ?? (100 - remaining)
                  const level = remaining <= 10 ? 'danger' : remaining <= 20 ? 'warning' : 'normal'
                  const cleanName = formatBucketName(bucket.id, bucket.name)

                  return (
                    <article key={bucket.id} className="dsh-gemini-quota-card">
                      <div className="dsh-gemini-quota-title">
                        <strong>{cleanName}</strong>
                        <span>{bucket.planType || status.quota.tierDisplayName || 'Google AI Pro'}</span>
                      </div>

                      <div className="dsh-gemini-meter-wrap">
                        <div className="dsh-gemini-meter-row">
                          <div className={`dsh-gemini-meter-bar dsh-gemini-meter-${level}`}>
                            <span style={{ width: `${remaining}%` }} />
                          </div>
                          <span className={`dsh-gemini-meter-pct ${level}`}>{remaining}%</span>
                        </div>
                        <div className="dsh-gemini-meter-meta">
                          <span>{used}% {t('used')} · {remaining}% {t('remaining')}</span>
                          <span>{primary.resetsAt ? `${t('resets')}: ${formatRelativeReset(primary.resetsAt)}` : '—'}</span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="dsh-gemini-empty">{t('quotaUnavailable')}</p>
            )}

            {status?.quota.fetchedAt ? (
              <p className="dsh-gemini-timestamp">
                {t('updated')}: {formatDate(status.quota.fetchedAt)}
              </p>
            ) : null}
          </Section>
        </>
      )}

      <span className="dsh-gemini-sr" aria-live="polite">{busy === null ? '' : busy}</span>
    </section>
  )
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="dsh-gemini-group">
      <div className="dsh-gemini-grouphead">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Button({ primary = false, disabled, onClick, children }: { primary?: boolean; disabled?: boolean; onClick: () => void | Promise<void>; children: React.ReactNode }): React.JSX.Element {
  return (
    <button className={`dsh-gemini-button${primary ? ' dsh-gemini-button-primary' : ''}`} type="button" disabled={disabled} onClick={() => void onClick()}>
      {children}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="dsh-gemini-row">
      <span className="dsh-gemini-label">{label}</span>
      <span className="dsh-gemini-value">{value}</span>
    </div>
  )
}

function Skeleton({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="dsh-gemini-skeleton" role="status" aria-label={label}>
      <span />
      <span />
    </div>
  )
}

function storageLabel(storage: CredentialStorageDto | undefined, t: Translate): string {
  if (!storage || !storage.available) return t('storageUnavailable')
  if (storage.kind === 'windows-dpapi') return t('storageWindows')
  if (storage.kind === 'macos-keychain') return t('storageMacKeychain')
  if (storage.kind === 'linux-file') return t('storageLinuxFile')
  if (storage.kind === 'memory') return t('storageMemory')
  return t('storageUnavailable')
}

function storageNotice(storage: CredentialStorageDto | undefined, t: Translate): string {
  if (!storage || !storage.available) return t('securityUnavailable')
  if (storage.kind === 'windows-dpapi') return t('securityWindows')
  if (storage.kind === 'macos-keychain') return t('securityMacKeychain')
  if (storage.kind === 'linux-file') return t('securityLinuxFile')
  if (storage.kind === 'memory') return t('securityMemory')
  return t('securityUnavailable')
}

function formatBucketName(rawId: string, rawName?: string): string {
  if (rawName && !rawName.includes('_') && !rawName.includes('-tiered') && !rawName.includes('-high')) return rawName
  if (rawId === 'gemini-2.5-pro') return 'Gemini 2.5 Pro'
  if (rawId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash'
  if (rawId === 'gemini-2.5-flash-lite') return 'Gemini 2.5 Flash-Lite'
  if (rawId === 'gemini-3.7-flash') return 'Gemini 3.7 Flash'
  if (rawId === 'gemini-3.7-flash-thinking' || rawId === 'gemini-3.7-flash-high') return 'Gemini 3.7 Flash (Thinking)'
  if (rawId === 'gemini-3.1-pro') return 'Gemini 3.1 Pro'
  if (rawId === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash Lite'
  if (rawId === 'gemini-3.7-flash-tiered') return 'Gemini 3.7 Flash (Tiered)'
  if (rawId === 'gemini-3.6-flash-tiered') return 'Gemini 3.6 Flash (Tiered)'
  return rawId
    .replace(/^gemini-/, 'Gemini ')
    .replace(/-tiered$/, ' (Tiered)')
    .replace(/-high$/, ' (High)')
    .replace(/-/g, ' ')
}

function formatRelativeReset(timestampMs: number | null): string {
  if (!timestampMs) return '—'
  const diff = timestampMs - Date.now()
  const dateStr = new Date(timestampMs).toLocaleString()
  if (diff <= 0) return `${dateStr} (已重置)`
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${dateStr} (${mins}分钟后)`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${dateStr} (${hours}小时${remainingMins > 0 ? `${remainingMins}分钟` : ''}后)`
}

function formatDate(ms: number | undefined): string {
  if (ms === undefined) return '—'
  return new Date(ms).toLocaleString()
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
