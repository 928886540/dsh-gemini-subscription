# dsh-gemini-subscription

DeepSeek Harness (DSH) Google Gemini & Antigravity Subscription Provider Plugin.

## Features

- **Zero-Config Google OAuth PKCE**: Built-in official Google Cloud Code / Antigravity public client ID with local callback server.
- **Secure Cross-Platform Token Storage**: Windows DPAPI (CurrentUser encrypted), macOS Keychain, Linux 0600 file store, and automatic file mirroring to `~/.dsh/gemini-subscription-token.json`.
- **Silent Auto-Refresh**: Automatically refreshes OAuth tokens before expiration and transparently retries requests on 401 Unauthorized.
- **Native Antigravity / Gemini Code Assist Protocol**: Direct streaming SSE integration supporting Gemini 2.5 Pro (1M/2M context), Gemini 2.5 Flash, Gemini 3.7 Flash (Thinking), and Gemini 3.1 Pro Preview.
- **Deep Reasoning & Multimodal**: Native mapping of thinking steps (`thought: true`), multimodal image attachments, and tool calls.
- **Modern React Client**: One-click "Sign in with Google" button, account status, quota indicators, reasoning effort settings, and latency testing.

## Supported Models

| Model | Context Window | Capabilities |
| :--- | :--- | :--- |
| **Gemini 2.5 Pro** | 1,048,576 (up to 2M) | Reasoning, Multimodal Vision, Tools |
| **Gemini 2.5 Flash** | 1,048,576 | Fast Reasoning, Vision, Tools |
| **Gemini 3.7 Flash** | 1,048,576 | Hybrid Thinking, Vision, Tools |
| **Gemini 3.7 Flash (Thinking)** | 1,048,576 | Deep Reasoning (High Budget), Vision, Tools |
| **Gemini 3.1 Pro (Preview)** | 1,048,576 | Advanced Reasoning, Vision, Tools |

## Scripts

```bash
pnpm run typecheck  # TypeScript validation
pnpm run test       # Vitest unit test suite
pnpm run build      # Build host ESM and client CJS bundles via tsdown
```
