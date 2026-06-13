<p align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:1e1e1e,50:6C5CE7,100:00CEC9&text=DeepSeek%20Usage%20Monitor&fontColor=ffffff&fontSize=56" alt="DeepSeek Usage Monitor Banner" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-111827.svg?style=for-the-badge" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/Runtime-VS%20Code%20Extension-6C5CE7.svg?style=for-the-badge" alt="VS Code Extension" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Chart.js-4.4.0-FF6384.svg?style=for-the-badge&logo=chartdotjs" alt="Chart.js" />
  <img src="https://img.shields.io/badge/Build-esbuild-FFCF00.svg?style=for-the-badge&logo=esbuild" alt="esbuild" />
</p>

<p align="center">
  <a href="https://github.com/Geekmister/vscode-deepseek-usage/stargazers">
    <img src="https://img.shields.io/github/stars/Geekmister/vscode-deepseek-usage?style=flat-square&label=Stars&color=f59e0b" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/Geekmister/vscode-deepseek-usage/network/members">
    <img src="https://img.shields.io/github/forks/Geekmister/vscode-deepseek-usage?style=flat-square&label=Forks&color=0ea5e9" alt="GitHub Forks" />
  </a>
  <a href="https://github.com/Geekmister/vscode-deepseek-usage/issues">
    <img src="https://img.shields.io/github/issues/Geekmister/vscode-deepseek-usage?style=flat-square&label=Issues&color=ef4444" alt="GitHub Issues" />
  </a>
  <a href="https://github.com/Geekmister/vscode-deepseek-usage/commits">
    <img src="https://img.shields.io/github/last-commit/Geekmister/vscode-deepseek-usage?style=flat-square&label=Last%20Commit&color=22c55e" alt="Last Commit" />
  </a>
  <img src="https://img.shields.io/badge/VS%20Code-^1.90.0-007ACC.svg?style=flat-square&logo=visualstudiocode" alt="VS Code" />
</p>

<p align="center">
  A VS Code extension that brings DeepSeek's official usage dashboard right into your editor — monitor account balance, track token consumption, visualize daily usage trends, all without leaving your development workflow.
</p>

<p align="center">
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/中文-🇨🇳-111827.svg?style=for-the-badge" alt="中文版本" /></a>
</p>

<p align="center">
  <b>⚡ Quick Peek via QuickPick · 📊 Full Dashboard with Chart.js · 🔒 Credentials stored encrypted via SecretStorage</b>
</p>

---

![QuickPick Floating Panel Preview](demo.png)

![Full Dashboard with Chart.js Preview](demo-monitor.png)

## Features

| Emoji | Feature | Description |
|-------|---------|-------------|
| 💰 | **Balance Monitoring** | Real-time API account balance display in the status bar with low-balance alerts |
| 📊 | **Usage Statistics** | Monthly token consumption, request counts, and cost breakdown by model |
| 📈 | **Chart Visualization** | Dual Y-axis bar chart (tokens + cost) via Chart.js for daily consumption trends |
| 🚀 | **QuickPick Floating Panel** | One-click status bar → floating panel with balance, usage summary, and model breakdown |
| 📋 | **Model Breakdown** | Per-model token, request, and cost details in a sortable table |
| 📅 | **Daily Details** | Click-to-copy daily breakdown for the last 7 days |
| ⚙️ | **Inline Settings** | Manage API Key and Platform Token directly from the dashboard without leaving the editor |
| 🔒 | **Encrypted Storage** | Platform Token stored via VS Code SecretStorage (macOS Keychain / Windows Credential Vault) |
| 🔄 | **Auto Refresh** | Configurable auto-refresh scheduler with rate-limit backoff and cache optimization |
| 🎨 | **Dark Console Style** | Developer-oriented dark theme UI that adapts to your VS Code color scheme |

## Quick Start

### 1. Install the Extension

Search for **"DeepSeek Usage Monitor"** in the VS Code Extension Marketplace and install, or run:

```bash
code --install-extension geekmister.deepseek-usage-monitor
```

> **Note**: The extension activates automatically on VS Code startup (`onStartupFinished`). No manual activation needed.

### 2. Configure API Key (for Balance)

```bash
# Open VS Code settings → search for "deepseek.apiKey"
# Or run the command palette (Ctrl+Shift+P) → "Preferences: Open Settings (UI)"
# Paste your API Key from https://platform.deepseek.com/api_keys
```

### 3. Configure Platform Token (for Usage Stats)

1. Log in to [platform.deepseek.com](https://platform.deepseek.com)
2. Open DevTools → Network tab → find any XHR request
3. Copy the `Authorization: Bearer <token>` header value
4. In VS Code, run `Ctrl+Shift+P` → **"DeepSeek: Set Platform Token"**
5. Paste the token (it will be stored encrypted)

### 4. Start Monitoring

Click the DeepSeek status bar item to open the QuickPick floating panel for a quick overview, or select **"Open Full Dashboard"** to see the complete analytics with charts.

## Architecture

```
vscode-deepseek-usage/
├── src/
│   ├── extension.ts              ← Entry point: activation, commands, QuickPick, status bar
│   ├── api/
│   │   ├── client.ts             ← DeepSeekAPIClient (balance query, v1.0.0)
│   │   └── platform.ts           ← PlatformClient (usage/cost API, v1.0.1)
│   ├── monitor/
│   │   ├── balance.ts            ← BalanceMonitor (caching, rate-limit handling)
│   │   └── usage.ts              ← UsageMonitor (token management, cache, refresh)
│   ├── webview/
│   │   ├── panel.ts              ← UsageDashboardPanel (Webview lifecycle + settings)
│   │   ├── template.ts           ← HTML/CSS/JS template (dashboard + settings panel)
│   │   └── chart.ts              ← Chart.js configuration generator
│   ├── scheduler/
│   │   └── scheduler.ts          ← RefreshScheduler (configurable interval + backoff)
│   └── error/
│       └── handler.ts            ← APIErrorHandler (source-aware 401/403 handling)
├── docs/
│   └── v1.0.1-iteration.md       ← Full design document (Chinese)
├── package.json
└── tsconfig.json
```

### Data Flow

```
User copies Bearer Token from browser DevTools
  → SecretStorage (encrypted, OS keychain)
    → PlatformClient fetches /api/v0/usage/amount + /api/v0/usage/cost
      → UsageMonitor._buildCache() transforms raw data
        → globalState persistent cache (30min TTL)
          → Click status bar → QuickPick floating panel (fast preview)
            → "Open Full Dashboard" → Webview Panel (Chart.js + daily details)
```

## Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | VS Code Extension API ^1.90.0 | Webview, SecretStorage, QuickPick, StatusBar |
| Language | TypeScript 5.x | Type safety across all modules |
| Build | esbuild | Fast bundling (≈280KB output) |
| Charts | Chart.js 4.4.0 (CDN) | Dual Y-axis bar chart in Webview |
| HTTP | axios ^1.7.0 | Platform API requests |
| Storage | `context.secrets` (SecretStorage) | Encrypted token storage |
| Cache | `context.globalState` | Usage data and balance persistence |

## Commands

| Command | Description |
|---------|-------------|
| `DeepSeek: Open Usage Overview` | Open QuickPick floating panel (balance + model summary) |
| `DeepSeek: Refresh Data` | Force refresh balance and usage data |
| `DeepSeek: Set Platform Token` | Securely store platform Bearer Token |
| `DeepSeek: Clear Platform Token` | Remove stored platform Token |
| `DeepSeek: Open Full Dashboard` | Open Webview Panel with charts and daily details |

## Contributing

We welcome contributions! Please follow these guidelines:

### 🐛 Report Issues

- Search existing issues before creating a new one
- Clearly describe the problem, reproduction steps, and expected behavior
- Include VS Code version, extension version, and any relevant error messages

### 🚀 Submit Pull Requests

1. Fork the repository and create a feature branch from `main`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
3. Ensure TypeScript compiles with zero errors: `npx tsc --noEmit`
4. Ensure the build passes: `npm run build`
5. Update documentation if changing features
6. Submit PR to the `main` branch

### 🎨 Code Style

- Use TypeScript with strict type checking
- Follow the existing module structure (separation of concerns)
- Keep async initialization patterns consistent (`_initPromise` pattern)
- Write meaningful variable and function names in English
- Use `const` over `let` where possible

### 📝 Commit Convention

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Test related changes |
| `chore` | Build/tooling/maintenance |

## Real-time Trend Dashboard

<p align="center">
  <a href="https://star-history.com/#Geekmister/vscode-deepseek-usage&Date">
    <img alt="Star History Chart" width="100%" src="https://api.star-history.com/svg?repos=Geekmister/vscode-deepseek-usage&type=Date" />
  </a>
</p>

<p align="center">
  <img alt="Commit Activity Graph" src="https://github-readme-activity-graph.vercel.app/graph?username=Geekmister&bg_color=1e1e1e&color=d4d4d4&line=6C5CE7&point=00CEC9&area=true&hide_border=true" />
</p>

<p align="center">
  <a href="https://github.com/Geekmister/vscode-deepseek-usage/graphs/contributors"><img src="https://contrib.rocks/image?repo=Geekmister/vscode-deepseek-usage" alt="Contributors" /></a>
</p>

## License

[MIT](LICENSE)

<p align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=160&color=0:00CEC9,50:6C5CE7,100:1e1e1e&text=Happy%20Coding!&fontColor=ffffff&fontSize=40&section=footer" alt="Footer Banner" />
</p>