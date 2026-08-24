# DSH AGY Subscription (dsh-gemini-subscription)

English | [简体中文](README.md)

A native DeepSeek Harness (DSH) provider plugin enabling direct access to Google's official Gemini models through your Google Antigravity (AGY) / Gemini subscription.

This plugin registers the `gemini-subscription` provider (displayed as **"Antigravity (AGY 订阅)"** in the UI) and accesses models using the host user's Google OAuth session. It provides live account info, connection status, and real-time subscription quotas in the settings page across Windows, macOS, and Linux.

---

## Table of Contents

- [Features](#features)
- [Model Catalog](#model-catalog)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Security Boundaries](#security-boundaries)
- [Plugin Routes](#plugin-routes)
- [Development & Verification](#development--verification)
- [Troubleshooting](#troubleshooting)

---

## Features

### 1. Authentication & Secure Storage

- **Native Antigravity OAuth Chain**: Uses Google's official public desktop client credentials with Authorization Code + PKCE (S256) on loopback port `51121`. Zero manual setup required—no custom Client ID or Secret needed.
- **Complete Scopes**: Fully covers `cloud-platform`, `userinfo.email`, `userinfo.profile`, `cclog`, and `experimentsandconfigs`.
- **Cross-Platform Secure Storage**:
  - **Windows**: Encrypted via CurrentUser DPAPI;
  - **macOS**: Encrypted via macOS Login Keychain;
  - **Linux**: Stored in a private file with strict `0600` permissions (`0700` parent directory);
  - Mirrored automatically to `~/.dsh/gemini-subscription-token.json`.
- **Silent Refresh & Retry**: Automatically refreshes OAuth tokens before expiration. On 401 Unauthorized errors, tokens are refreshed and the request is transparently retried once.

### 2. Model Integration & Protocol Alignment

- **Native `v1internal` Protocol**: Direct SSE streaming via `v1internal:streamGenerateContent?alt=sse`, perfectly aligned with Antigravity runtime request envelopes and User-Agent standards.
- **High-Availability Endpoint Routing**: Full-stack **Daily-first (`daily-cloudcode-pa.googleapis.com`) → Prod fallback (`cloudcode-pa.googleapis.com`)** routing.
- **Deep Reasoning & Multimodal**: Native support for Gemini 3.7 / 3.6 / 3.5 / 3.1 & Claude 4.6 Thinking reasoning traces (`thought: true`), multimodal image attachments, and tool calling.
- **Tool Calling & Environment Adaptation**: Preserves DSH tool schemas with shell adaptation for `pwsh`, `powershell`, `bash`, and `sh`.

### 3. Live Quota & Dashboard

- **Live Subscription Quotas**: Dynamically queries `v1internal:retrieveUserQuotaSummary` to extract quota groups (Gemini Models, Claude and GPT Models) with exact percentages and reset times.
- **No False Placeholders**: If upstream quota data is unavailable, it displays an informative message rather than fabricating fake 0% or 100% metrics. Automatically invalidates cache on generation completion.

### 4. Frontend Settings & Interaction

- **Dedicated AGY Settings Panel**: Displays Google user profile (avatar, email, name), Tier/Plan, Companion Project ID, storage type, and latency test.
- **Quota Breakdown Cards**: Renders animated progress bars, remaining/used percentages, and localized reset timestamps for each group and bucket (Weekly / Five Hour).
- **Composer Quota Widget**: Displays real-time remaining quota badge for the currently selected model next to the chat input box.
- **Context Window Tiers**: 272K (default), 512K, and 1M configurable options.

---

## Model Catalog

The plugin aligns with official AGY CLI models with the following baseline catalog:

| Display Name | Model ID | Default Context | Capabilities |
| :--- | :--- | :--- | :--- |
| **Gemini 3.7 Flash (High)** | `gemini-3.7-flash-high` | 272,000 (up to 1M) | Deep reasoning & coding flagship (High effort) |
| **Gemini 3.7 Flash (Medium)** | `gemini-3.7-flash-medium` | 272,000 (up to 1M) | Hybrid reasoning (Medium effort) |
| **Gemini 3.7 Flash (Low)** | `gemini-3.7-flash-low` | 272,000 (up to 1M) | Ultra-fast response (Low effort) |
| **Gemini 3.6 Flash (High)** | `gemini-3.6-flash-high` | 272,000 (up to 1M) | 3.6 High thinking reasoning |
| **Gemini 3.6 Flash (Medium)** | `gemini-3.6-flash-medium` | 272,000 (up to 1M) | 3.6 Medium thinking |
| **Gemini 3.6 Flash (Low)** | `gemini-3.6-flash-low` | 272,000 (up to 1M) | 3.6 Low thinking fast model |
| **Gemini 3.5 Flash (High)** | `gemini-3.5-flash-high` | 272,000 (up to 1M) | 3.5 High thinking |
| **Gemini 3.5 Flash (Medium)** | `gemini-3.5-flash-medium` | 272,000 (up to 1M) | 3.5 Medium thinking |
| **Gemini 3.5 Flash (Low)** | `gemini-3.5-flash-low` | 272,000 (up to 1M) | 3.5 Low thinking |
| **Gemini 3.1 Pro (High)** | `gemini-3.1-pro-high` | 272,000 (up to 1M) | 3.1 Pro flagship (High effort) |
| **Gemini 3.1 Pro (Low)** | `gemini-3.1-pro-low` | 272,000 (up to 1M) | 3.1 Pro lightweight (Low effort) |
| **Claude Sonnet 4.6 (Thinking)** | `claude-sonnet-4-6` | 200,000 | Antigravity Claude Sonnet flagship |
| **Claude Opus 4.6 (Thinking)** | `claude-opus-4-6-thinking` | 200,000 | Antigravity Claude Opus deep reasoning |
| **GPT-OSS 120B (Medium)** | `gpt-oss-120b-medium` | 272,000 (up to 1M) | Open source LLM flagship |

> Note: Internal autocomplete/test models such as `chat_20706` and `tab_flash_lite_preview` are automatically filtered out.

---

## Requirements

- **OS**: Windows 10/11, macOS 12+, or Linux;
  - Windows requires PowerShell for DPAPI encryption.
  - Linux host user requires write access to `~/.dsh` with `0700`/`0600` permissions.
- **Runtime**: Node.js >= 18;
- **Host**: DeepSeek Harness (DSH).

---

## Installation

### Method 1: Via DSH CLI (Recommended)

```bash
# If dsh is globally installed
dsh plugin --profile web add dsh-gemini-subscription

# Or using npx
npx @deepseek-ai/dsh plugin --profile web add dsh-gemini-subscription
```

### Method 2: Local Development Link

```bash
# 1. Clone the repository
git clone https://github.com/928886540/dsh-gemini-subscription.git
cd dsh-gemini-subscription

# 2. Install dependencies & build
pnpm install
pnpm run build

# 3. Link to DSH Web Profile (Windows PowerShell)
npx @deepseek-ai/dsh plugin --profile web add "link:D:\apiWorkSpace\dsh-gemini-subscription"

# 3. Link to DSH Web Profile (Linux / macOS)
npx @deepseek-ai/dsh plugin --profile web add "link:/path/to/dsh-gemini-subscription"
```

---

## Usage Guide

1. Start or restart DSH (`dsh web`);
2. Open **Settings → AGY 订阅** (or **AGY Subscription** in English);
3. Click **"Sign in with Google"**;
4. Complete the OAuth consent flow in the browser;
5. Return to DSH and click **"Test Connection"** to verify latency;
6. In the model dropdown above the chat composer, select **"Antigravity (AGY 订阅)"** and start chatting!

---

## Security Boundaries

- **Zero Credential Leaks**: OAuth tokens (Access & Refresh Tokens) are stored strictly encrypted locally and **never** exposed to browser clients, LocalStorage, `settings.yaml`, or console logs.
- **Loopback Isolation**: The OAuth callback server binds exclusively to `127.0.0.1:51121` with a 5-minute timeout and terminates immediately upon completion.
- **Strict Endpoint Control**: Network requests are exclusively dispatched to official Google OAuth (`oauth2.googleapis.com`) and Antigravity APIs (`*.cloudcode-pa.googleapis.com`).

---

## Plugin Routes

All backend routes are prefixed with `/api/gemini-subscription`:

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/status` | Query sanitized account info, auth state, tier, and live quotas |
| `POST` | `/login/start` | Start OAuth PKCE listener and get authorization URL |
| `GET` | `/login/events` | SSE stream for real-time OAuth login status |
| `POST` | `/login/cancel` | Cancel an ongoing OAuth login session |
| `POST` | `/logout` | Sign out and erase local credentials and quota cache |
| `POST` | `/token/refresh` | Force manual token refresh |
| `POST` | `/quota/refresh` | Force quota synchronization with Antigravity upstream |
| `POST` | `/connection/test` | Test connectivity and measure network latency |
| `POST` | `/preferences/update` | Update subagent routing and UI quota badge preferences |

---

## Development & Verification

```bash
# Type check
pnpm run typecheck

# Run test suite (25 tests)
pnpm test

# Build production bundles (Host ESM + Client CJS)
pnpm run build
```

---

## Troubleshooting

| Issue | Resolution |
| :--- | :--- |
| **Port 51121 in use** | Ensure no orphan DSH instance or proxy service is occupying port 51121, then retry. |
| **Google auth page blocked** | Check your local proxy settings to allow access to `accounts.google.com` and `oauth2.googleapis.com`. |
| **401 / 403 Connection Errors** | Click "Refresh Token" in settings. If the refresh token expired, click "Sign Out" and re-authenticate. |
| **Quota Card says unavailable** | Newly registered or trial accounts may not yet have per-model `quotaInfo` from upstream; chatting remains fully functional. |
| **DPAPI Read Failures** | Ensure DSH is running under the same Windows user account that initialized the login. |
