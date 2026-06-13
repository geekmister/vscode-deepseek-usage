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
 */
export function generateChartJS(
  data: ChartDataPoint[],
  isDark: boolean,
): string {
  const labels = data.map(d => d.date.slice(5)); // "06-01"
  const tokenValues = data.map(d => d.tokens);
  const costValues = data.map(d => d.cost);

  const textColor = isDark ? '#cccccc' : '#333333';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return `
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
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: { color: '${textColor}', font: { size: 12 } },
          },
          tooltip: {
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#cccccc',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: { color: '${textColor}', maxRotation: 45 },
            grid: { color: '${gridColor}' },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: { color: '${textColor}' },
            grid: { color: '${gridColor}' },
            title: {
              display: true,
              text: 'Token',
              color: '${textColor}',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            ticks: { color: '${textColor}' },
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: '费用 (¥)',
              color: '${textColor}',
            },
          },
        },
      },
    });
  `;
}
