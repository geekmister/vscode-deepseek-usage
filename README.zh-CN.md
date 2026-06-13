<p align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:1e1e1e,50:6C5CE7,100:00CEC9&text=DeepSeek%20Usage%20Monitor&fontColor=ffffff&fontSize=56" alt="DeepSeek Usage Monitor 横幅" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-111827.svg?style=for-the-badge" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/Runtime-VS%20Code%20Extension-6C5CE7.svg?style=for-the-badge" alt="VS Code 插件" />
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
	<a href="README.md">
		<img src="https://img.shields.io/badge/English-🇺🇸-111827.svg?style=for-the-badge" alt="English Version" />
	</a>
</p>

<p align="center">
  一款将 DeepSeek 官方用量仪表盘直接带入编辑器的 VS Code 插件——无需离开开发环境即可监控账户余额、追踪 Token 消耗、可视化每日用量趋势。
</p>

<p align="center">
  <b>⚡ QuickPick 悬浮面板快速预览 · 📊 Chart.js 完整仪表盘 · 🔒 SecretStorage 加密存储凭证</b>
</p>

---

![QuickPick 悬浮面板预览](demo.png)

![Chart.js 完整仪表盘预览](demo-monitor.png)

## 功能特性

| Emoji | 功能 | 描述 |
|-------|------|------|
| 💰 | **余额监控** | 状态栏实时显示 API 账户余额，低余额告警 |
| 📊 | **用量统计** | 按月统计 Token 消耗、请求次数、各模型费用明细 |
| 📈 | **图表可视化** | 双 Y 轴柱状图（Token + 费用），基于 Chart.js 展示每日消耗趋势 |
| 🚀 | **QuickPick 悬浮面板** | 点击状态栏 → 浮层面板，快速浏览余额、用量汇总、模型明细 |
| 📋 | **模型明细** | 每个模型的 Token、请求数、费用详情，表格展示 |
| 📅 | **每日明细** | 最近 7 天每日数据，点击复制到剪贴板 |
| ⚙️ | **内联设置** | 仪表盘内直接管理 API Key 和平台 Token，无需离开编辑区 |
| 🔒 | **加密存储** | 平台 Token 通过 VS Code SecretStorage 存储（macOS Keychain / Windows Credential Vault） |
| 🔄 | **自动刷新** | 可配置的自动刷新调度器，支持限流退避和缓存优化 |
| 🎨 | **深色工具台风格** | 面向开发者的深色主题 UI，自动适配 VS Code 配色方案 |

## 快速开始

### 1. 安装插件

在 VS Code 扩展市场搜索 **"DeepSeek Usage Monitor"** 并安装，或运行：

```bash
code --install-extension geekmister.deepseek-usage-monitor
```

> **注意**：插件在 VS Code 启动时自动激活（`onStartupFinished`），无需手动启用。

### 2. 配置 API Key（用于余额查询）

```bash
# 打开 VS Code 设置 → 搜索 "deepseek.apiKey"
# 或打开命令面板 (Ctrl+Shift+P) → "首选项: 打开设置 (UI)"
# 从 https://platform.deepseek.com/api_keys 复制你的 API Key 并粘贴
```

### 3. 配置平台 Token（用于用量统计）

1. 登录 [platform.deepseek.com](https://platform.deepseek.com)
2. 打开 DevTools → Network 标签 → 找到任意 XHR 请求
3. 复制 `Authorization: Bearer <token>` 请求头的值
4. 在 VS Code 中按 `Ctrl+Shift+P` → **"DeepSeek: 设置平台 Token"**
5. 粘贴 Token（将加密存储）

### 4. 开始监控

点击状态栏上的 DeepSeek 项打开 QuickPick 悬浮面板快速浏览概要，或选择 **"打开完整仪表盘"** 查看带图表的完整统计分析。

## 项目架构

```
vscode-deepseek-usage/
├── src/
│   ├── extension.ts              ← 入口：激活、命令、QuickPick、状态栏
│   ├── api/
│   │   ├── client.ts             ← DeepSeekAPIClient（余额查询，v1.0.0）
│   │   └── platform.ts           ← PlatformClient（用量/费用 API，v1.0.1）
│   ├── monitor/
│   │   ├── balance.ts            ← BalanceMonitor（缓存、限流处理）
│   │   └── usage.ts              ← UsageMonitor（Token 管理、缓存、刷新）
│   ├── webview/
│   │   ├── panel.ts              ← UsageDashboardPanel（Webview 生命周期 + 设置）
│   │   ├── template.ts           ← HTML/CSS/JS 模板（仪表盘 + 设置面板）
│   │   └── chart.ts              ← Chart.js 图表配置生成器
│   ├── scheduler/
│   │   └── scheduler.ts          ← RefreshScheduler（可配置间隔 + 退避）
│   └── error/
│       └── handler.ts            ← APIErrorHandler（来源感知的 401/403 处理）
├── docs/
│   └── v1.0.1-iteration.md       ← 完整设计文档
├── package.json
└── tsconfig.json
```

### 数据流

```
用户从浏览器 DevTools 复制 Bearer Token
  → SecretStorage 加密存储（系统密钥链）
    → PlatformClient 请求 /api/v0/usage/amount + /api/v0/usage/cost
      → UsageMonitor._buildCache() 转换原始数据
        → globalState 持久缓存（30 分钟 TTL）
          → 点击状态栏 → QuickPick 悬浮面板（快速预览）
            → "打开完整仪表盘" → Webview 面板（Chart.js + 每日明细）
```

## 核心技术栈

| 层 | 技术 | 用途 |
|----|------|------|
| 运行环境 | VS Code Extension API ^1.90.0 | Webview、SecretStorage、QuickPick、StatusBar |
| 语言 | TypeScript 5.x | 全模块类型安全 |
| 构建 | esbuild | 快速打包（≈280KB） |
| 图表 | Chart.js 4.4.0（CDN） | Webview 内双 Y 轴柱状图 |
| HTTP | axios ^1.7.0 | 平台 API 请求 |
| 存储 | `context.secrets`（SecretStorage） | 加密的 Token 存储 |
| 缓存 | `context.globalState` | 用量数据和余额持久化 |

## 命令列表

| 命令 | 描述 |
|------|------|
| `DeepSeek: 打开用量概览` | 打开 QuickPick 悬浮面板（余额 + 模型汇总） |
| `DeepSeek: 刷新数据` | 强制刷新余额和用量数据 |
| `DeepSeek: 设置平台 Token` | 安全存储平台的 Bearer Token |
| `DeepSeek: 清除平台 Token` | 移除已存储的平台 Token |
| `DeepSeek: 打开完整仪表盘` | 打开含图表和每日明细的 Webview 面板 |

## 参与贡献

欢迎各种形式的贡献！请遵循以下指南：

### 🐛 报告问题

- 提交新 Issue 前请先搜索是否已有重复
- 清晰描述问题、复现步骤和预期行为
- 附上 VS Code 版本、插件版本及相关错误信息

### 🚀 提交 Pull Request

1. Fork 本仓库并从 `main` 创建功能分支
2. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交
3. 确保 TypeScript 编译零错误：`npx tsc --noEmit`
4. 确保构建通过：`npm run build`
5. 更新相关文档
6. 向 `main` 分支提交 PR

### 🎨 编码风格

- 使用 TypeScript 严格类型检查
- 遵循现有模块结构（关注点分离）
- 保持异步初始化模式一致（`_initPromise` 模式）
- 变量和函数名使用有意义的英文
- 优先使用 `const` 而非 `let`

### 📝 提交规范

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/维护 |

## 实时趋势面板

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

## 许可证

[MIT](LICENSE)

<p align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=160&color=0:00CEC9,50:6C5CE7,100:1e1e1e&text=%E5%BC%80%E5%BF%83%E7%BC%96%E7%A0%81!&fontColor=ffffff&fontSize=40&section=footer" alt="Footer Banner" />
</p>
