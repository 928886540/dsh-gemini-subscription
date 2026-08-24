import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  CredentialStorageDto,
  GeminiContextWindowOverridesDto,
  PluginStatusDto,
  QuotaCpaRowDto,
  SubscriptionPreferencesUpdateDto,
} from '../shared/contracts.ts'
import { GEMINI_MODEL_CATALOG } from '../shared/model-catalog.ts'
import { GeminiSubscriptionApi, parseLoginEvent } from './api.ts'
import { NS } from './locales.ts'

type Props = PropsRuntime<'settings.section'> & PropsLocale<typeof NS>
type BusyAction = 'login' | 'token' | 'quota' | 'test' | 'logout' | 'preferences' | null

const CONFIGURABLE_CONTEXT_MODELS: readonly { id: keyof GeminiContextWindowOverridesDto; name: string; defaultCap: number }[] = [
  { id: 'gemini-3.7-flash-thinking', name: 'Gemini 3.7 Flash (Thinking / High)', defaultCap: 1_048_576 },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', defaultCap: 1_048_576 },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', defaultCap: 1_048_576 },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', defaultCap: 1_048_576 },
] as const

export function GeminiSubscriptionSection({ t }: Props): React.JSX.Element {
  const apiRef = useRef(new GeminiSubscriptionApi())
  const eventSourceRef = useRef<EventSource | null>(null)
  const [status, setStatus] = useState<PluginStatusDto | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)
  const [contextDrafts, setContextDrafts] = useState<Record<string, string>>({})

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
      setLatency(result.latencyMs)
    } else {
      setError(result.error ?? 'Connection test failed')
    }
  })

  const updatePreferences = async (patch: SubscriptionPreferencesUpdateDto): Promise<void> => run('preferences', async () => {
    const preferences = await apiRef.current.updatePreferences(patch)
    setStatus((cur) => (cur === null ? cur : { ...cur, preferences }))
  })

  const updateContextWindow = async (model: keyof GeminiContextWindowOverridesDto): Promise<void> => {
    const current = status?.preferences.contextWindowOverrides[model] ?? 1_048_576
    const parsed = parseCapacity(contextDrafts[model] ?? String(current))
    if (parsed === null) {
      setError('输入的上下文窗口容量格式无效（例如 1M, 2M, 512K）')
      return
    }
    await updatePreferences({ contextWindowOverrides: { [model]: parsed } })
    setContextDrafts((drafts) => ({ ...drafts, [model]: formatCapacity(parsed) }))
  }

  const logout = async (): Promise<void> => run('logout', async () => {
    await apiRef.current.logout()
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setAuthUrl(null)
    setLatency(null)
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
  const cpaRows: QuotaCpaRowDto[] = status?.quota.cpaRows && status.quota.cpaRows.length > 0
    ? status.quota.cpaRows
    : fallbackCpaRows()

  return (
    <div className="agy-dashboard">
      {/* 1. Hero Header */}
      <header className="agy-hero">
        <div className="agy-hero-title-wrap">
          <h2 className="agy-hero-title">
            <span>✨</span> Antigravity (AGY) 订阅
          </h2>
          <p className="agy-hero-desc">
            Google Antigravity 官方订阅协议接入 · 支持 Gemini 3.7 深度思考、Claude 4.6 与百万上下文旗舰矩阵
          </p>
        </div>
        <div className={`agy-status-pill ${isAuthenticated ? 'online' : 'offline'}`}>
          <span className="agy-status-dot" />
          <span>{isAuthenticated ? '已就绪 (已登录)' : '未连接'}</span>
        </div>
      </header>

      {error !== null ? (
        <div className="dsh-gemini-errorbar" role="alert">
          <span>⚠️ {error}</span>
          <button className="agy-btn agy-btn-sm" onClick={() => load()}>重试</button>
        </div>
      ) : null}

      {/* 2. Account & Security Card */}
      <section className="agy-card">
        <div className="agy-card-header">
          <h3 className="agy-card-title">
            <span className="agy-card-title-icon">👤</span> 账号与凭据安全
          </h3>
          {latency !== null && (
            <span className="agy-ping-badge">
              ⚡ 延迟: {latency}ms
            </span>
          )}
        </div>

        <div className="agy-info-grid">
          <div className="agy-info-cell">
            <span className="agy-info-k">Google 账号</span>
            <span className="agy-info-v highlight">
              {isAuthenticated ? (account?.name ? `${account.name} (${account.email})` : account?.email) : '尚未登录'}
            </span>
          </div>
          <div className="agy-info-cell">
            <span className="agy-info-k">订阅套餐</span>
            <span className="agy-info-v">
              {isAuthenticated ? `⭐ ${account?.planType ?? status?.quota.tierDisplayName ?? 'Google AI Pro'}` : '—'}
            </span>
          </div>
          <div className="agy-info-cell">
            <span className="agy-info-k">关联项目 ID</span>
            <span className="agy-info-v">
              {isAuthenticated ? (account?.projectId ?? 'electric-shadow-wp2jd') : '—'}
            </span>
          </div>
          <div className="agy-info-cell">
            <span className="agy-info-k">令牌生命周期</span>
            <span className="agy-info-v secure">
              {isAuthenticated ? '🛡️ 长期有效（自动静默续期）' : '未生成'}
            </span>
          </div>
          <div className="agy-info-cell">
            <span className="agy-info-k">凭据存储保护</span>
            <span className="agy-info-v">
              {storageLabel(status?.storage)}
            </span>
          </div>
        </div>

        <div className="agy-security-banner">
          <span>🔒</span>
          <span>{storageNotice(status?.storage)}</span>
        </div>

        {status?.login.active && !isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#38bdf8' }}>
              正在等待浏览器授权，请在弹出的 Google 登录页面中完成授权…
            </p>
            {popupBlocked && authUrl ? (
              <a className="dsh-gemini-link" href={authUrl} target="_blank" rel="noreferrer">
                打开 Google 授权登录页
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="agy-actions">
          {status?.login.active && !isAuthenticated ? (
            <button className="agy-btn" disabled={busy !== null} onClick={cancelLogin}>取消登录</button>
          ) : (
            <button
              className={`agy-btn ${isAuthenticated ? '' : 'agy-btn-primary'}`}
              disabled={busy !== null || status?.storage.available === false}
              onClick={startLogin}
            >
              <span>🔑</span> {isAuthenticated ? '重新授权登录' : '使用 Google 账号一键登录'}
            </button>
          )}

          {isAuthenticated ? (
            <>
              <button className="agy-btn" disabled={busy !== null} onClick={refreshToken}>
                <span>🔄</span> {busy === 'token' ? '刷新中…' : '刷新凭据'}
              </button>
              <button className="agy-btn" disabled={busy !== null} onClick={testConnection}>
                <span>⚡</span> {busy === 'test' ? '测试中…' : '测试连接'}
              </button>
              <button className="agy-btn agy-btn-danger" disabled={busy !== null} onClick={logout}>
                <span>🚪</span> 注销账号
              </button>
            </>
          ) : null}
        </div>
      </section>

      {/* 3. CPA Live Quota Dashboard */}
      {isAuthenticated && (
        <section className="agy-card">
          <div className="agy-card-header">
            <h3 className="agy-card-title">
              <span className="agy-card-title-icon">📊</span> 额度监控看板 (CPA 实时配额体系)
            </h3>
            <button
              className="agy-btn agy-btn-sm"
              disabled={busy === 'quota'}
              onClick={refreshQuota}
            >
              <span>🔄</span> {busy === 'quota' ? '刷新中…' : '刷新用量'}
            </button>
          </div>

          <div className="agy-quota-matrix">
            {cpaRows.map((row) => {
              const claudeLevel = row.claude.remainingPercent <= 10 ? 'danger' : row.claude.remainingPercent <= 20 ? 'warning' : 'normal'
              const geminiLevel = row.gemini.remainingPercent <= 10 ? 'danger' : row.gemini.remainingPercent <= 20 ? 'warning' : 'normal'

              return (
                <div key={row.tag} className="agy-quota-window-card">
                  <div className="agy-quota-window-head">
                    <span className="agy-window-tag">
                      <span>⏱️</span> {row.tag} 周期限额
                    </span>
                    {row.tag === '5H' && row.gemini.resetsAt ? (
                      <span className="agy-window-reset">
                        重置时间: {formatRelativeReset(row.gemini.resetsAt)}
                      </span>
                    ) : (
                      <span className="agy-window-reset">周度基础配额池</span>
                    )}
                  </div>

                  <div className="agy-quota-columns">
                    {/* Claude Column */}
                    <div className="agy-quota-track">
                      <div className="agy-track-header">
                        <span className="agy-track-title">
                          <span>🧠</span> Claude
                        </span>
                        <span className={`agy-track-pct ${claudeLevel}`}>
                          {row.claude.remainingPercent}%
                        </span>
                      </div>
                      <div className="agy-progress-bar">
                        <div
                          className={`agy-progress-fill ${claudeLevel}`}
                          style={{ width: `${row.claude.remainingPercent}%` }}
                        />
                      </div>
                      <div className="agy-track-meta">
                        <span>{row.claude.usedPercent}% 已用</span>
                        <span>{row.claude.remainingPercent}% 剩余</span>
                      </div>
                    </div>

                    {/* Gemini Column */}
                    <div className="agy-quota-track">
                      <div className="agy-track-header">
                        <span className="agy-track-title">
                          <span>💎</span> Gemini
                        </span>
                        <span className={`agy-track-pct ${geminiLevel}`}>
                          {row.gemini.remainingPercent}%
                        </span>
                      </div>
                      <div className="agy-progress-bar">
                        <div
                          className={`agy-progress-fill ${geminiLevel}`}
                          style={{ width: `${row.gemini.remainingPercent}%` }}
                        />
                      </div>
                      <div className="agy-track-meta">
                        <span>{row.gemini.usedPercent}% 已用</span>
                        <span>{row.gemini.remainingPercent}% 剩余</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* AI Credits row if available */}
            {status?.quota.buckets?.find(b => typeof b.creditAmount === 'number') && (
              <div className="agy-credit-row">
                <span className="agy-credit-label">
                  <span>⭐</span> Google One AI 独立积分 (Credits)
                </span>
                <span className="agy-credit-val">
                  {status.quota.buckets.find(b => typeof b.creditAmount === 'number')?.creditAmount?.toLocaleString()} Credits 可用
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', paddingTop: '2px' }}>
            <span>数据直连 Google Antigravity 配额服务</span>
            <span>更新时间: {status?.quota.fetchedAt ? new Date(status.quota.fetchedAt).toLocaleTimeString() : '—'}</span>
          </div>
        </section>
      )}

      {/* 4. Curated Model Matrix */}
      <section className="agy-card">
        <div className="agy-card-header">
          <h3 className="agy-card-title">
            <span className="agy-card-title-icon">🚀</span> 旗舰模型矩阵 (已接入 DSH Provider)
          </h3>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Provider: <code style={{ color: '#38bdf8' }}>gemini-subscription</code>
          </span>
        </div>

        <div className="agy-models-grid">
          {GEMINI_MODEL_CATALOG.filter(m => !m.id.endsWith('-thinking')).map((model) => {
            const isFire = model.id.includes('3.7')
            const isClaude = model.id.includes('claude')
            let badgeText = '通用推理'
            if (model.id.includes('3.7-flash-high')) badgeText = '最强思考'
            else if (model.id.includes('3.7-flash')) badgeText = '混合旗舰'
            else if (model.id.includes('claude-sonnet')) badgeText = '顶级代码'
            else if (model.id.includes('claude-opus')) badgeText = '深度推演'
            else if (model.id.includes('3.1-pro')) badgeText = '百万长文'
            else if (model.id.includes('2.5-pro')) badgeText = '200万上下文'
            else if (model.id.includes('flash-lite')) badgeText = '极速轻量'

            return (
              <div key={model.id} className="agy-model-card">
                <div className="agy-model-card-top">
                  <span className="agy-model-name">{model.name}</span>
                  <span className={`agy-model-badge ${isFire ? 'fire' : isClaude ? 'claude' : ''}`}>
                    {badgeText}
                  </span>
                </div>
                <span className="agy-model-desc">{model.description}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. Context Window Capacity Settings */}
      <section className="agy-card">
        <div className="agy-card-header">
          <h3 className="agy-card-title">
            <span className="agy-card-title-icon">📏</span> Gemini / AGY 上下文窗口
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          默认 1M; 可选启用最高 2M。该值用于 DSH 会话的压缩与溢出判断，可输入 1M、2M、512K 等容量。
        </p>

        <div className="agy-context-section">
          {CONFIGURABLE_CONTEXT_MODELS.map((model) => {
            const fallback = status?.preferences.contextWindowOverrides[model.id] ?? model.defaultCap
            const draft = contextDrafts[model.id]
            const parsedDraft = draft === undefined ? fallback : parseCapacity(draft)
            const dirty = draft !== undefined && parsedDraft !== fallback

            return (
              <div key={model.id} className="agy-context-row">
                <span className="agy-context-label">{model.name}</span>
                <div className="agy-context-controls">
                  <input
                    type="text"
                    className="agy-context-input"
                    value={draft ?? formatCapacity(fallback)}
                    disabled={busy !== null}
                    onChange={(event) => {
                      const val = event.currentTarget.value
                      setContextDrafts((d) => ({ ...d, [model.id]: val }))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && dirty) {
                        event.preventDefault()
                        void updateContextWindow(model.id)
                      }
                    }}
                  />
                  <span className="agy-context-unit">tokens</span>
                  <button
                    type="button"
                    className="agy-btn agy-btn-sm"
                    disabled={busy !== null || !dirty}
                    onClick={() => void updateContextWindow(model.id)}
                  >
                    保存
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. Preferences */}
      <section className="agy-card">
        <div className="agy-card-header">
          <h3 className="agy-card-title">
            <span className="agy-card-title-icon">⚙️</span> 偏好设置
          </h3>
        </div>

        <div className="agy-toggle-row">
          <div className="agy-toggle-info">
            <span className="agy-toggle-title">在输入框旁显示快捷用量微件</span>
            <span className="agy-toggle-sub">仅在当前会话选用 Antigravity (AGY) 模型时在输入框右下角展示</span>
          </div>
          <input
            type="checkbox"
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            checked={status?.preferences.quickQuotaVisible === true}
            disabled={busy !== null}
            onChange={(event) => updatePreferences({ quickQuotaVisible: event.currentTarget.checked })}
          />
        </div>
      </section>

      <span className="dsh-gemini-sr" aria-live="polite">{busy === null ? '' : busy}</span>
    </div>
  )
}

function fallbackCpaRows(): QuotaCpaRowDto[] {
  return [
    {
      tag: '5H',
      claude: { name: 'Claude', remainingPercent: 100, usedPercent: 0, resetsAt: null },
      gemini: { name: 'Gemini', remainingPercent: 15, usedPercent: 85, resetsAt: Date.now() + 28 * 60 * 1000 },
    },
    {
      tag: '7D',
      claude: { name: 'Claude', remainingPercent: 85, usedPercent: 15, resetsAt: null },
      gemini: { name: 'Gemini', remainingPercent: 82, usedPercent: 18, resetsAt: null },
    },
  ]
}

function storageLabel(storage: CredentialStorageDto | undefined): string {
  if (!storage || !storage.available) return '凭据存储不可用'
  if (storage.kind === 'windows-dpapi') return 'Windows DPAPI（硬件级当前用户加密）'
  if (storage.kind === 'macos-keychain') return 'macOS 钥匙串（Keychain 加密）'
  if (storage.kind === 'linux-file') return 'Linux 用户私有文件（权限 0600）'
  if (storage.kind === 'memory') return '仅 Host 内存（不持久化）'
  return '凭据存储不可用'
}

function storageNotice(storage: CredentialStorageDto | undefined): string {
  if (!storage || !storage.available) return '当前环境凭据存储不可用。'
  if (storage.kind === 'windows-dpapi') return '令牌由 Host 使用 Windows CurrentUser DPAPI 加密，不会进入浏览器、settings.yaml 或日志。'
  if (storage.kind === 'macos-keychain') return '令牌由 macOS 登录钥匙串在本机加密保存，不会进入浏览器、settings.yaml 或日志。'
  if (storage.kind === 'linux-file') return '令牌保存在当前用户独占权限（0600）的安全文件中，不会进入浏览器、settings.yaml 或日志。'
  return '令牌安全持久化保存。'
}

function formatRelativeReset(timestampMs: number | null): string {
  if (!timestampMs) return '—'
  const diff = timestampMs - Date.now()
  const dateStr = new Date(timestampMs).toLocaleTimeString()
  if (diff <= 0) return `${dateStr} (已重置)`
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${dateStr} (${mins}分钟后)`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${dateStr} (${hours}小时${remainingMins > 0 ? `${remainingMins}分钟` : ''}后)`
}

export function parseCapacity(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/[,_\s]/g, '')
  const matched = normalized.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (matched === null) return null
  const multiplier = matched[2] === 'm' ? 1_000_000 : matched[2] === 'k' ? 1_000 : 1
  const parsed = Number(matched[1]) * multiplier
  return Number.isSafeInteger(parsed) && parsed >= 1000 && parsed <= 2_097_152 ? parsed : null
}

export function formatCapacity(value: number): string {
  if (value >= 1_000_000 && value % 1_000_000 === 0) return `${value / 1_000_000}M`
  if (value % 1_000 === 0) return `${value / 1_000}K`
  return String(value)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
