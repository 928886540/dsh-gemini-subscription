# DSH AGY Subscription (dsh-gemini-subscription)

[English Documentation](README_EN.md) | 简体中文

让 DSH（DeepSeek Harness）通过 Google Antigravity / Gemini 订阅使用 Google 官方 Gemini 系列模型的插件。

插件注册 `gemini-subscription` Provider（显示名 **“Antigravity（AGY 订阅）”**），以当前 Host 用户的 Google OAuth 登录态访问模型，并在设置页展示账号信息、连接状态与实时订阅配额。全链路对齐成熟的 CLIProxyAPI (CPA) Antigravity 架构标准，支持 Windows、macOS 与 Linux。

---

## 目录

- [功能特性](#功能特性)
- [模型目录](#模型目录)
- [环境要求](#环境要求)
- [安装](#安装)
- [使用指南](#使用指南)
- [安全边界](#安全边界)
- [插件路由](#插件路由)
- [开发与验证](#开发与验证)
- [故障排查](#故障排查)

---

## 功能特性

### 1. 登录与凭据存储

- **原生 Antigravity 授权链**：使用 Google 官方公开客户端凭据，基于 Authorization Code + PKCE（S256）完成安全登录，默认使用 `51121` 回环端口，无需用户手动申请或填写 Client ID / Secret，开箱即用；
- **完备权限范围 (Scopes)**：全量覆盖 `cloud-platform`、`userinfo.email`、`userinfo.profile`、`cclog` 以及 `experimentsandconfigs`；
- **安全跨平台凭据管理**：
  - **Windows**：使用 CurrentUser DPAPI 加密存储；
  - **macOS**：使用系统登录钥匙串（Keychain）加密存储；
  - **Linux**：使用当前用户私有的 `0600` 权限安全文件存储；
  - 自动同步镜像至 `~/.dsh/gemini-subscription-token.json`；
- **静默续期与重试**：Token 过期前自动在后台刷新，遭遇 401 Unauthorized 时自动强制刷新令牌并静默重试一次。

### 2. 模型接入与协议对齐

- **原生 v1internal 协议**：直接对接 Antigravity 原生 API 端点（`v1internal:streamGenerateContent?alt=sse`），完美对齐 CPA runtime 请求包装与 User-Agent 规范；
- **双端点高可用路由**：全链路采用 **Daily 优先 (`daily-cloudcode-pa.googleapis.com`) → Prod 兜底 (`cloudcode-pa.googleapis.com`)** 的生产级故障转移策略；
- **深度思考与多模态**：原生支持 Gemini 3.7 / 2.5 系列的 Thinking 深度思考过程（`thought: true`）、多模态图片输入与工具调用（Tool Calling）；
- **工具调用与环境自适应**：原样转发 DSH 暴露的工具 Schema，命令工具自适应兼容 `pwsh`、`powershell`、`bash` 与 `sh`。

### 3. 实时配额与 AI 积分

- **真实模型配额**：通过 `fetchAvailableModels` 实时获取各模型的真实可用额度 `remainingFraction`（如 `0.72` 换算为 **剩余 72% / 已用 28%**）与 ISO 重置时间 `resetTime`；
- **真实积分计量**：解析 `paidTier.availableCredits`，真实展示 Google One AI Credits 等可用积分总量（如 `1,000 Credits`），不混淆为百分比；
- **拒绝虚假占位**：若服务端未提供配额字段，如实展示提示，绝不编造虚假 0% 或 100% 占位；对话生成完成后自动触发缓存失效刷新。

### 4. 前端设置与交互

- **独立 AGY 设置页**：展示 Google 账号（邮箱、昵称、头像）、套餐类型（Tier）、关联项目 ID（Project ID）、凭据存储状态与网络延迟测试；
- **多模型配额卡片**：直观展示各模型剩余/已用进度条与本地化重置时间；
- **Composer 快捷用量徽标**：在对话输入框右侧显示当前选中模型的实时剩余额度；
- **子智能体委派路由**：支持全局自定义子代理默认模型、思考深度、最大嵌套深度与并发子智能体数量上限。

---

## 模型目录

插件支持通过 `fetchAvailableModels` 服务端接口**动态发现**当前账号与项目开放的模型，并内置以下高可用基准模型表：

| 模型显示名 | 模型 ID | 上下文窗口 | 能力特性 |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | 1,048,576 (可扩展至 2M) | 深度推理、长文本理解、多模态识图、工具调用 |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | 1,048,576 | 超低延迟、高吞吐、多模态、轻量推理 |
| **Gemini 2.5 Flash-Lite** | `gemini-2.5-flash-lite` | 1,048,576 | 极速高并发、低开销推理 |
| **Gemini 3.7 Flash** | `gemini-3.7-flash` | 1,048,576 | 新一代混合推理架构、多模态 |
| **Gemini 3.7 Flash (Thinking)** | `gemini-3.7-flash-thinking` | 1,048,576 | 深度扩展推理 (Thinking 高预算)、复杂问题攻坚 |
| **Gemini 3.1 Pro (Preview)** | `gemini-3.1-pro` | 1,048,576 | 前瞻预览版模型架构 |

> 提示：自动过滤 `chat_20706`、`tab_flash_lite_preview` 等内部补全调试模型。

---

## 环境要求

- **操作系统**：Windows 10/11、macOS (12+) 或 Linux；
  - Windows：需提供 PowerShell 以支持 CurrentUser DPAPI；
  - Linux：Host 用户需具备 `~/.dsh` 目录写权限（强制 `0700` 目录与 `0600` 权限凭据）；
- **运行环境**：Node.js >= 18；
- **宿主程序**：已安装并可运行 DeepSeek Harness (DSH)。

---

## 安装

### 方式 1：通过 DSH 插件系统添加（推荐）

```bash
# 全局安装了 dsh 时
dsh plugin --profile web add dsh-gemini-subscription

# 或使用 npx
npx @deepseek-ai/dsh plugin --profile web add dsh-gemini-subscription
```

### 方式 2：本地开发与源码链接（Link）

```bash
# 1. 克隆项目
git clone https://github.com/928886540/dsh-gemini-subscription.git
cd dsh-gemini-subscription

# 2. 安装依赖并构建
pnpm install
pnpm run build

# 3. 链接到 DSH Web Profile (Windows PowerShell)
npx @deepseek-ai/dsh plugin --profile web add "link:D:\apiWorkSpace\dsh-gemini-subscription"

# 3. 链接到 DSH Web Profile (Linux / macOS)
npx @deepseek-ai/dsh plugin --profile web add "link:/path/to/dsh-gemini-subscription"
```

---

## 使用指南

1. 启动或重启 DSH（`dsh web`）；
2. 点击左侧导航栏 **设置 → AGY 订阅**；
3. 点击 **“使用 Google 登录 (Sign in with Google)”**，浏览器将自动弹出 Google 授权页面；
4. 在浏览器中完成账号授权并关闭页面，回到 DSH 点击 **“测试连接延迟”** 确认服务畅通；
5. 在对话输入框上方的模型下拉菜单中，选择 **“Antigravity（AGY 订阅）”** 及其下的 Gemini 模型即可畅快对话！

---

## 安全边界

- **凭据零泄露**：OAuth 令牌（Access Token / Refresh Token）仅经过本机加密存储或受保护文件，**严禁且绝不会**进入浏览器前端、前端 LocalStorage、`settings.yaml` 或系统控制台日志；
- **回环监听保障**：OAuth 本地回调服务仅监听 `127.0.0.1:51121`，设置 5 分钟安全超时，授权完成后立即关闭回环端口；
- **受控 API 通信**：仅向 Google 官方 OAuth 端点（`oauth2.googleapis.com`）与 Antigravity API 端点（`*.cloudcode-pa.googleapis.com`）发起请求；
- **跨平台隔离**：Windows DPAPI 限制仅限当前登录用户解密；Linux 凭据文件采用所有者独占的 `0600` 文件权限。

---

## 插件路由

插件所有后端接口均以 `/api/gemini-subscription` 为统一前缀：

| 方法 | 路径 | 功能说明 |
| :--- | :--- | :--- |
| `GET` | `/status` | 查询当前账号脱敏信息、登录态、套餐类型与实时配额 |
| `POST` | `/login/start` | 启动 OAuth PKCE 授权监听并获取授权 URL |
| `GET` | `/login/events` | SSE 流式订阅登录授权进度与结果通知 |
| `POST` | `/login/cancel` | 取消当前正在进行的登录任务 |
| `POST` | `/logout` | 退出登录，安全擦除本机凭据与内存配额缓存 |
| `POST` | `/token/refresh` | 手动强制刷新 OAuth 令牌 |
| `POST` | `/quota/refresh` | 强制向 Antigravity 服务端刷新最新配额 |
| `POST` | `/connection/test` | 测试与 Antigravity 服务端的网络连接与延迟 |
| `POST` | `/preferences/update` | 更新子智能体路由与界面用量微件偏好设置 |

---

## 开发与验证

```bash
# 类型检查
pnpm run typecheck

# 运行完整单元测试套件 (25 tests)
pnpm test

# 生产环境双端构建 (Host ESM + Client CJS)
pnpm run build
```

---

## 故障排查

| 常见问题 | 原因与排查方案 |
| :--- | :--- |
| **51121 端口被占用** | 检查是否有旧的 DSH 实例或其它本地代理服务占用了 51121 端口，释放端口后重试登录。 |
| **Google 登录页面无法打开** | 检查本地网络或科学上网代理是否允许访问 `accounts.google.com` 与 `oauth2.googleapis.com`。 |
| **测试连接报 401 / 403** | 在设置页点击“刷新令牌”；若仍无法通过，点击“退出登录”后重新授权即可。 |
| **配额卡片显示未提供明细** | 部分新注册账号或非 Antigravity 白名单账号服务端未返回 `quotaInfo`，对话仍可正常进行。 |
| **Windows DPAPI 解密失败** | 请确保 DSH 是在与首次登录相同的 Windows 用户会话下运行；必要时点击退出登录后重登。 |
