import { UsageCache } from '../monitor/usage';
import { generateChartJS, ChartDataPoint } from './chart';
import { formatTokens, formatCost } from '../api/platform';

export interface GenerateHTMLData {
  balance: number;
  usage: UsageCache | null;
  month: number;
  year: number;
}

export function generateHTML(data: GenerateHTMLData): string {
  const { balance, usage, month, year } = data;
  const hasUsage = usage && usage.totalTokens > 0;

  // 准备图表数据（颜色由 Chart.js 在运行时时通过 getComputedStyle 动态适配主题）
  const chartDataPoints: ChartDataPoint[] =
    (usage?.dailyData || [])
      .filter(d => d.totalTokens > 0 || d.totalCost > 0)
      .slice(-31)
      .map(d => ({ date: d.date, tokens: d.totalTokens, cost: d.totalCost }));
  const chartJS = chartDataPoints.length > 1
    ? generateChartJS(chartDataPoints)
    : '';

  // 统计卡片
  const balanceStr = formatCost(balance);
  const costStr = usage ? formatCost(usage.totalCost) : '¥0.00';
  const tokenStr = usage ? formatTokens(usage.totalTokens) : '0';
  const requestStr = usage ? formatTokens(usage.totalRequests) : '0';

  // 模型明细行
  let modelRows = '';
  if (usage?.modelBreakdown) {
    for (const m of usage.modelBreakdown) {
      if (m.tokens === 0 && m.requests === 0) continue;
      // 编码模型名防止 & ' 等字符破坏 HTML
      const safeModel = m.model.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      modelRows += `
        <tr onclick="toggleDetail('${safeModel}')">
          <td>${m.model}</td>
          <td class="num">${formatTokens(m.tokens)}</td>
          <td class="num">${formatTokens(m.requests)}</td>
          <td class="num">${formatCost(m.cost)}</td>
        </tr>`;
    }
  }

  // 每日明细行（最近 7 天有数据的）
  let dailyRows = '';
  if (usage?.dailyData) {
    const recent = usage.dailyData
      .filter(d => d.totalTokens > 0 || d.totalCost > 0)
      .slice(-7)
      .reverse();
    for (const d of recent) {
      dailyRows += `
        <div class="daily-item" onclick="copyText('${d.date}  Token: ${formatTokens(d.totalTokens)}  费用: ${formatCost(d.totalCost)}')">
          <span class="daily-date">${d.date}</span>
          <span class="daily-tokens">Token: ${formatTokens(d.totalTokens)}</span>
          <span class="daily-cost">${formatCost(d.totalCost)}</span>
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; style-src 'unsafe-inline'; 
                 script-src 'unsafe-inline' https://cdn.jsdelivr.net; 
                 font-src 'self' https://cdn.jsdelivr.net;
                 img-src 'self' data:;">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --card-bg: rgba(255,255,255,0.04);
      --card-border: rgba(255,255,255,0.08);
      --accent: #6C5CE7;
      --accent-light: #A29BFE;
      --green: #00CEC9;
      --red: #FF6B6B;
      --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      font-size: 13px;
      line-height: 1.5;
    }

    /* 头部 */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
    }
    .header-title {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title .logo {
      color: var(--accent-light);
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-controls select {
      background: var(--card-bg);
      color: var(--fg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }
    .header-controls select:focus { outline: none; border-color: var(--accent); }
    .btn {
      background: var(--card-bg);
      color: var(--fg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s ease;
    }
    .btn:hover { background: rgba(255,255,255,0.08); border-color: var(--accent); }
    .btn:active { transform: scale(0.97); }

    /* 统计卡片网格 */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      animation: fadeInUp 0.3s ease forwards;
      opacity: 0;
    }
    .card:nth-child(1) { animation-delay: 0.05s; }
    .card:nth-child(2) { animation-delay: 0.1s; }
    .card:nth-child(3) { animation-delay: 0.15s; }
    .card:nth-child(4) { animation-delay: 0.2s; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .card-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      margin-bottom: 6px;
    }
    .card-value {
      font-size: 22px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-family: var(--font-mono);
    }
    .card-value.balance { color: var(--accent-light); }
    .card-value.cost { color: var(--green); }
    .card-value.tokens { color: var(--fg); }
    .card-value.requests { color: var(--red); }

    /* 图表 */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chart-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      height: 260px;
    }
    .chart-empty {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      font-size: 14px;
    }

    /* 模型明细表格 */
    .table-wrap {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      border-bottom: 1px solid var(--card-border);
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.15s;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.04); }
    td.num {
      text-align: right;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    /* 每日明细 */
    .daily-list {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .daily-item {
      display: flex;
      align-items: center;
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.15s;
      font-size: 12px;
    }
    .daily-item:last-child { border-bottom: none; }
    .daily-item:hover { background: rgba(255,255,255,0.04); }
    .daily-date { width: 90px; font-weight: 500; }
    .daily-tokens { flex: 1; opacity: 0.7; }
    .daily-cost { font-family: var(--font-mono); color: var(--green); }

    /* 底部 */
    .footer {
      margin-top: 16px;
      font-size: 11px;
      opacity: 0.4;
      text-align: center;
    }

    /* 空状态 */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }
    .empty-state .icon { font-size: 32px; margin-bottom: 12px; }
    .empty-state p { font-size: 14px; }

    /* 响应式 */
    @media (max-width: 700px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">
      <span class="logo">◈</span>
      DeepSeek 用量仪表盘
    </div>
    <div class="header-controls">
      <select id="monthSelect" onchange="changeMonth()">
        ${generateMonthOptions(month, year)}
      </select>
      <button class="btn" onclick="refresh()">↻ 刷新</button>
    </div>
  </div>

  ${hasUsage ? `
  <!-- 统计卡片 -->
  <div class="stats">
    <div class="card">
      <div class="card-label">💰 余额</div>
      <div class="card-value balance">${balanceStr}</div>
    </div>
    <div class="card">
      <div class="card-label">📊 月消费</div>
      <div class="card-value cost">${costStr}</div>
    </div>
    <div class="card">
      <div class="card-label">📦 Token</div>
      <div class="card-value tokens">${tokenStr}</div>
    </div>
    <div class="card">
      <div class="card-label">🔄 请求</div>
      <div class="card-value requests">${requestStr}</div>
    </div>
  </div>

  <!-- 图表 -->
  <div class="section">
    <div class="section-title">📈 每日消耗趋势</div>
    <div class="chart-container">
      ${chartDataPoints.length > 1
        ? '<canvas id="usageChart"></canvas>'
        : '<div class="chart-empty">暂无足够数据生成图表</div>'}
    </div>
  </div>

  <!-- 模型明细 -->
  <div class="section">
    <div class="section-title">📋 模型用量明细</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>模型</th>
            <th class="num">Token</th>
            <th class="num">请求</th>
            <th class="num">费用</th>
          </tr>
        </thead>
        <tbody>
          ${modelRows || '<tr><td colspan="4" style="text-align:center;opacity:0.5">暂无数据</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <!-- 每日明细 -->
  <div class="section">
    <div class="section-title">📅 每日明细 <span style="font-size:11px;opacity:0.4;font-weight:400">（点击复制）</span></div>
    <div class="daily-list">
      ${dailyRows || '<div class="empty-state"><p>暂无数据</p></div>'}
    </div>
  </div>
  ` : `
  <div class="empty-state">
    <div class="icon">📊</div>
    <p>暂无用量数据</p>
    <p style="font-size:12px;margin-top:8px;">请先配置平台 Token 并刷新</p>
  </div>
  `}

  <div class="footer">
    ⚡ 数据每 30 分钟自动刷新 | ${usage ? '上次更新: ' + new Date(usage.cachedAt).toLocaleTimeString('zh-CN') : ''}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function changeMonth() {
      const select = document.getElementById('monthSelect');
      const [y, m] = select.value.split('-').map(Number);
      vscode.postMessage({ command: 'changeMonth', month: m, year: y });
    }

    function copyText(text) {
      vscode.postMessage({ command: 'copy', text: text });
    }

    function toggleDetail(model) {
      // 预留：展开每日模型详情
    }

    ${chartJS}
  </script>
</body>
</html>`;
}

function generateMonthOptions(currentMonth: number, currentYear: number): string {
  const options: string[] = [];
  const now = new Date();
  // 生成最近 12 个月
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = `${y}年${m}月`;
    const value = `${y}-${String(m).padStart(2, '0')}`;
    const selected = y === currentYear && m === currentMonth ? 'selected' : '';
    options.push(`<option value="${value}" ${selected}>${label}</option>`);
  }
  return options.join('');
}
