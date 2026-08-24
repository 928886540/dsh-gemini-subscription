import http, { type IncomingMessage, type ServerResponse } from 'node:http'

export interface CallbackServerOptions {
  expectedState: string
  preferredPort?: number
  exchange: (code: string, redirectUri: string, signal: AbortSignal) => Promise<void>
}

/** One-shot localhost Google OAuth callback listener. */
export class OAuthCallbackServer {
  private readonly abortController = new AbortController()
  private server: http.Server | null = null
  private settled = false
  private assignedPort = 0
  private resolveCompletion!: () => void
  private rejectCompletion!: (error: Error) => void
  readonly completion = new Promise<void>((resolve, reject) => {
    this.resolveCompletion = resolve
    this.rejectCompletion = reject
  })

  constructor(private readonly options: CallbackServerOptions) {}

  get port(): number {
    return this.assignedPort
  }

  get redirectUri(): string {
    return `http://127.0.0.1:${this.assignedPort}/callback`
  }

  async listen(): Promise<number> {
    if (this.server !== null) throw new Error('OAuth callback server already started')
    const server = http.createServer((request, response) => {
      void this.handle(request, response)
    })
    this.server = server

    const tryListen = (port: number): Promise<number> => {
      return new Promise((resolve, reject) => {
        const onError = (error: Error): void => {
          server.off('listening', onListening)
          reject(error)
        }
        const onListening = (): void => {
          server.off('error', onError)
          const addr = server.address()
          const actualPort = typeof addr === 'object' && addr !== null ? addr.port : port
          this.assignedPort = actualPort
          resolve(actualPort)
        }
        server.once('error', onError)
        server.once('listening', onListening)
        server.listen(port, '127.0.0.1')
      })
    }

    try {
      if (this.options.preferredPort && this.options.preferredPort > 0) {
        try {
          return await tryListen(this.options.preferredPort)
        } catch {
          // Preferred port busy, fallback to dynamic available port
          return await tryListen(0)
        }
      }
      return await tryListen(0)
    } catch (error) {
      this.server = null
      server.close()
      throw error
    }
  }

  cancel(reason: Error): void {
    this.finish(reason)
  }

  dispose(): void {
    if (!this.settled) this.finish(new Error('OAuth callback listener disposed'))
    else this.close()
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (this.settled) {
      await writeHtml(response, 410, 'This Google sign-in attempt is no longer active.')
      return
    }
    if (!isLoopback(request.socket.remoteAddress)) {
      await writeHtml(response, 403, 'OAuth callback rejected.')
      return
    }
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${this.assignedPort}`)
    if (url.pathname !== '/callback' && url.pathname !== '/oauth/callback') {
      await writeHtml(response, 404, 'Not found.')
      return
    }
    const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error')
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (providerError !== null || code === null || code === '' || state !== this.options.expectedState) {
      await writeHtml(response, 400, 'Google returned an invalid OAuth callback.')
      this.finish(new Error(providerError === null ? 'invalid OAuth callback' : `Google OAuth rejected sign-in: ${providerError}`))
      return
    }
    try {
      await this.options.exchange(code, this.redirectUri, this.abortController.signal)
      await writeHtml(response, 200, 'Google Sign-In completed successfully! You can close this tab and return to DeepSeek Harness.')
      this.finish()
    } catch (error) {
      await writeHtml(response, 500, `Google Sign-In could not be completed: ${error instanceof Error ? error.message : String(error)}. Return to DSH for details.`)
      this.finish(error instanceof Error ? error : new Error('OAuth token exchange failed'))
    }
  }

  private finish(error?: Error): void {
    if (this.settled) return
    this.settled = true
    this.abortController.abort()
    this.close()
    if (error === undefined) this.resolveCompletion()
    else this.rejectCompletion(error)
  }

  private close(): void {
    const server = this.server
    this.server = null
    server?.close()
    server?.closeAllConnections()
  }
}

function isLoopback(address: string | undefined): boolean {
  if (address === undefined) return false
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function writeHtml(response: ServerResponse, status: number, message: string): Promise<void> {
  const isSuccess = status >= 200 && status < 300
  const escaped = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    connection: 'close',
  })
  return new Promise((resolve) => {
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    response.once('finish', done)
    response.once('close', done)
    response.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DeepSeek Harness - Google Gemini Sign-In</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 32px 40px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 12px 0;
      color: ${isSuccess ? '#38bdf8' : '#f87171'};
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }
    .hint {
      font-size: 13px;
      color: #38bdf8;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '✨' : '⚠️'}</div>
    <h1>${isSuccess ? 'Google Gemini 授权成功' : '授权未完成'}</h1>
    <p>${escaped}</p>
    ${isSuccess ? '<p class="hint">页面将在 <strong id="countdown">3</strong> 秒后自动关闭，并返回 DeepSeek Harness…</p>' : ''}
  </div>
  ${isSuccess ? `
  <script>
    let remaining = 3;
    const el = document.getElementById('countdown');
    const interval = setInterval(function() {
      remaining--;
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        try { window.close(); } catch(e) {}
      }
    }, 1000);
    setTimeout(function() {
      try { window.close(); } catch(e) {}
    }, 3000);
  </script>
  ` : ''}
</body>
</html>`)
  })
}
