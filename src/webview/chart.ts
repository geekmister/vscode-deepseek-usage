/**
 * Chart.js 图表配置生成器
 * 注意：此文件导出 JS 代码字符串，由 template.ts 内联注入 HTML 模板的 <script> 块中。
 * 不能直接 import 到 Webview，因为 Webview 运行在浏览器隔离环境，
 * 插件代码运行在 Node.js 环境——两者不通。
 */

export interface ChartDataPoint {
  date: string;
  tokens: number;
  cost: number;
}

/**
 * 生成 Chart.js 柱状图初始化 JS 代码字符串
 * 图表颜色通过运行时的 `getComputedStyle(document.body).color` 自动适配 VS Code 主题。
 */
export function generateChartJS(
  data: ChartDataPoint[],
): string {
  const labels = data.map(d => d.date.slice(5)); // "06-01"
  const tokenValues = data.map(d => d.tokens);
  const costValues = data.map(d => d.cost);

  return `
    // 从 VS Code CSS 变量动态获取主题色
    const bodyStyle = getComputedStyle(document.body);
    const fgColor = bodyStyle.color;
    const isDark = parseInt(fgColor.slice(1,3), 16) < 128;
    const tc = isDark ? '#cccccc' : '#333333';
    const gc = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    const ctx = document.getElementById('usageChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [
          {
            label: 'Token 消耗',
            data: ${JSON.stringify(tokenValues)},
            backgroundColor: 'rgba(108, 92, 231, 0.7)',
            borderColor: 'rgba(108, 92, 231, 1)',
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            label: '费用 (¥)',
            data: ${JSON.stringify(costValues)},
            backgroundColor: 'rgba(0, 206, 201, 0.5)',
            borderColor: 'rgba(0, 206, 201, 1)',
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: tc, font: { size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(30,30,30,0.95)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: { color: tc, maxRotation: 45 },
            grid: { color: gc },
          },
          y: {
            type: 'linear', display: true, position: 'left',
            ticks: { color: tc },
            grid: { color: gc },
            title: { display: true, text: 'Token', color: tc },
          },
          y1: {
            type: 'linear', display: true, position: 'right',
            ticks: { color: tc },
            grid: { drawOnChartArea: false },
            title: { display: true, text: '费用 (¥)', color: tc },
          },
        },
      },
    });
  `;
}
