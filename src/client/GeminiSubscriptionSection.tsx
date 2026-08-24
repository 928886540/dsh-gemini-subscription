import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginStatusDto } from '../shared/contracts.ts'
import { GeminiSubscriptionApi, parseLoginEvent } from './api.ts'
import { NS } from './locales.ts'

type Props = PropsLocale<typeof NS>

export function GeminiSubscriptionSection({ t }: Props): React.JSX.Element {
  const apiRef = useRef(new GeminiSubscriptionApi())
  const [status, setStatus] = useState<PluginStatusDto | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const load = useCallback(async (background = false): Promise<void> => {
    if (!background) setBusy('load')
    try {
      const data = await apiRef.current.status()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!background) setBusy(null)
    }
  }, [])

  const closeEvents = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const watchLogin = useCallback((loginId: string) => {
    closeEvents()
    const es = apiRef.current.events(loginId)
    eventSourceRef.current = es

    es.onmessage = (ev) => {
      const parsed = parseLoginEvent(ev)
      if (!parsed) return
      if (parsed.type === 'completed') {
        closeEvents()
        setBusy(null)
        setAuthUrl(null)
        void load(true)
      } else if (parsed.type === 'failed') {
        closeEvents()
        setBusy(null)
        setError(parsed.error.message)
      } else if (parsed.type === 'cancelled') {
        closeEvents()
        setBusy(null)
        setAuthUrl(null)
      }
    }

    es.onerror = () => {
      closeEvents()
      void load(true)
    }
  }, [closeEvents, load])

  useEffect(() => {
    void load()
    return () => closeEvents()
  }, [load, closeEvents])

  useEffect(() => {
    const loginId = status?.login.active ? status.login.loginId : null
    if (loginId && !eventSourceRef.current) {
      watchLogin(loginId)
    }
  }, [status?.login.active, status?.login.loginId, watchLogin])

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
    } catch (err) {
      popup?.close()
      setBusy(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const cancelLogin = async (): Promise<void> => {
    const loginId = status?.login.loginId
    if (!loginId) return
    setBusy('cancel')
    try {
      await apiRef.current.cancelLogin(loginId)
      closeEvents()
      setAuthUrl(null)
      await load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const logout = async (): Promise<void> => {
    setBusy('logout')
    try {
      await apiRef.current.logout()
      closeEvents()
      setAuthUrl(null)
      await load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const refreshToken = async (): Promise<void> => {
    setBusy('refresh')
    try {
      const data = await apiRef.current.refresh()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const testConnection = async (): Promise<void> => {
    setBusy('test')
    try {
      const res = await apiRef.current.testConnection()
      if (res.ok) {
        setLatency(res.latencyMs)
        setError(null)
      } else {
        setError(res.error ?? 'Connection test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const toggleQuickQuota = async (): Promise<void> => {
    if (!status) return
    try {
      const next = await apiRef.current.updatePreferences({
        quickQuotaVisible: !status.preferences.quickQuotaVisible,
      })
      setStatus({ ...status, preferences: next })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const account = status?.account
  const isAuthenticated = status?.authenticated === true

  return (
    <div className="dsh-gemini-section">
      <div className="dsh-gemini-card">
        <div className="dsh-gemini-card-header">
          <h2 className="dsh-gemini-title">
            <span>✨</span> {t('title')}
          </h2>
          {isAuthenticated ? (
            <span className="dsh-gemini-badge dsh-gemini-badge-success">{t('signedIn')}</span>
          ) : (
            <span className="dsh-gemini-badge dsh-gemini-badge-neutral">{t('signedOut')}</span>
          )}
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8' }}>
          {t('intro')}
        </p>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {status?.login.active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#38bdf8' }}>{t('pending')}</p>
            {popupBlocked && authUrl && (
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#fbbf24' }}>{t('popupBlocked')}</p>
                <a href={authUrl} target="_blank" rel="noreferrer" className="dsh-gemini-btn dsh-gemini-btn-primary">
                  {t('continueLogin')}
                </a>
              </div>
            )}
            <div>
              <button className="dsh-gemini-btn dsh-gemini-btn-secondary" onClick={cancelLogin} disabled={busy === 'cancel'}>
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : isAuthenticated && account ? (
          <div>
            <div className="dsh-gemini-account-info">
              <div className="dsh-gemini-info-item">
                <span className="dsh-gemini-info-label">{t('account')}</span>
                <span className="dsh-gemini-info-val">{account.name ? `${account.name} (${account.email})` : (account.email ?? '—')}</span>
              </div>
              <div className="dsh-gemini-info-item">
                <span className="dsh-gemini-info-label">{t('plan')}</span>
                <span className="dsh-gemini-info-val">{account.planType ?? 'Google Gemini'}</span>
              </div>
              <div className="dsh-gemini-info-item">
                <span className="dsh-gemini-info-label">{t('projectId')}</span>
                <span className="dsh-gemini-info-val">{account.projectId ?? 'default-cli-project'}</span>
              </div>
              <div className="dsh-gemini-info-item">
                <span className="dsh-gemini-info-label">{t('expires')}</span>
                <span className="dsh-gemini-info-val">{new Date(account.tokenExpiresAt).toLocaleTimeString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button className="dsh-gemini-btn dsh-gemini-btn-secondary" onClick={refreshToken} disabled={busy === 'refresh'}>
                {busy === 'refresh' ? t('refreshing') : t('refreshToken')}
              </button>
              <button className="dsh-gemini-btn dsh-gemini-btn-secondary" onClick={testConnection} disabled={busy === 'test'}>
                {busy === 'test' ? t('testing') : t('testConnection')}
              </button>
              <button className="dsh-gemini-btn dsh-gemini-btn-danger" onClick={logout} disabled={busy === 'logout'}>
                {t('signOut')}
              </button>
              {latency !== null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', color: '#4ade80', marginLeft: '8px' }}>
                  {t('latency')}: {latency}ms
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <button className="dsh-gemini-btn dsh-gemini-btn-primary" onClick={startLogin} disabled={busy === 'login'}>
              <span>🔑</span> {t('signIn')}
            </button>
          </div>
        )}
      </div>

      <div className="dsh-gemini-card">
        <h3 className="dsh-gemini-title" style={{ marginBottom: '12px' }}>
          <span>🚀</span> {t('models')}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
          {t('modelsList')}
        </p>
      </div>

      <div className="dsh-gemini-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{t('quickQuota')}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{t('quickQuotaHint')}</p>
          </div>
          <input
            type="checkbox"
            checked={status?.preferences.quickQuotaVisible ?? true}
            onChange={toggleQuickQuota}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  )
}
