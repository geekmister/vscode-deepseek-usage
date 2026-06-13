import * as vscode from 'vscode';
import { UsageMonitor, UsageCache } from '../monitor/usage';
import { BalanceMonitor } from '../monitor/balance';
import { generateHTML } from './template';

export class UsageDashboardPanel {
  public static currentPanel: UsageDashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _currentMonth: number;
  private _currentYear: number;
  private _viewCache: UsageCache | null = null; // 存储当前视图中显示的数据（可能为历史月份）

  private constructor(
    panel: vscode.WebviewPanel,
    private balanceMonitor: BalanceMonitor,
    private usageMonitor: UsageMonitor,
  ) {
    this._panel = panel;
    const now = new Date();
    this._currentMonth = now.getMonth() + 1;
    this._currentYear = now.getFullYear();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.command) {
          case 'refresh':
            await this._refresh();
            break;
          case 'changeMonth':
            await this._refreshMonth(msg.month, msg.year);
            break;
          case 'copy':
            vscode.env.clipboard.writeText(msg.text);
            break;
        }
      },
      null,
      this._disposables,
    );
    this._render();
  }

  static async createOrShow(
    context: vscode.ExtensionContext,
    balanceMonitor: BalanceMonitor,
    usageMonitor: UsageMonitor,
  ) {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    if (UsageDashboardPanel.currentPanel) {
      UsageDashboardPanel.currentPanel._panel.reveal(column);
      await UsageDashboardPanel.currentPanel._refresh();
      return;
    }

    // 首次打开面板前先同步刷新数据
    await balanceMonitor.forceRefreshBalance();
    await usageMonitor.forceRefresh();

    const panel = vscode.window.createWebviewPanel(
      'deepseekUsageDashboard',
      'DeepSeek 用量仪表盘',
      column,
      {
        enableScripts: true,
        localResourceRoots: [],
      },
    );

    UsageDashboardPanel.currentPanel = new UsageDashboardPanel(
      panel,
      balanceMonitor,
      usageMonitor,
    );
  }

  /** 对外暴露：供 scheduler 回调调用，刷新面板数据 */
  public async refreshView(): Promise<void> {
    // scheduler 刷新当前月时，清除历史月份视图缓存
    this._viewCache = null;
    const cache = this.usageMonitor.cachedData;
    // 仅当缓存月份与面板当前选中月份一致时才刷新视图
    if (cache && cache.month === this._currentMonth && cache.year === this._currentYear) {
      await this._render();
    }
  }

  private async _refresh() {
    await this.balanceMonitor.forceRefreshBalance();
    await this.usageMonitor.forceRefresh();
    // 切换到当前月，清除历史视图缓存
    this._viewCache = null;
    const now = new Date();
    this._currentMonth = now.getMonth() + 1;
    this._currentYear = now.getFullYear();
    await this._render();
  }

  private async _refreshMonth(m: number, y: number) {
    const result = await this.usageMonitor.refreshMonth(m, y);
    if (result) {
      // refreshMonth 已返回历史月份数据，但 _cache 可能仍是当前月
      // 将结果存入 _viewCache 供 _render 使用
      this._viewCache = result;
      this._currentMonth = m;
      this._currentYear = y;
    }
    await this._render();
  }

  private async _render() {
    const balance = this.balanceMonitor.currentBalance;
    // _viewCache 优先（历史月份），其次 usageMonitor.cachedData（当前月）
    const usage = this._viewCache || this.usageMonitor.cachedData;
    this._panel.webview.html = generateHTML({
      balance,
      usage,
      month: this._currentMonth,
      year: this._currentYear,
    });
  }

  public dispose() {
    UsageDashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}
