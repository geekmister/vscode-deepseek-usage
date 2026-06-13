import * as vscode from 'vscode';
import { BalanceMonitor } from './monitor/balance';
import { UsageMonitor } from './monitor/usage';
import { RefreshScheduler } from './scheduler/scheduler';
import { UsageDashboardPanel } from './webview/panel';

let statusBarItem: vscode.StatusBarItem;
let scheduler: RefreshScheduler | undefined;

export async function activate(context: vscode.ExtensionContext) {
    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.name = 'DeepSeek Usage Monitor';
    statusBarItem.tooltip = '点击打开用量仪表盘';
    statusBarItem.command = 'deepseek-usage.showUsage';

    // 初始化各模块
    const balanceMonitor = new BalanceMonitor(context);
    const usageMonitor = new UsageMonitor(context);

    // 注入限流回调
    balanceMonitor.onRateLimit = () => scheduler?.handleRateLimit();

    // 注入 Token 过期回调（APIErrorHandler 已处理用户通知，此回调用于额外副作用）
    usageMonitor.onTokenExpired = () => {
        console.warn('DeepSeek 平台 Token 已过期');
    };

    const config = vscode.workspace.getConfiguration('deepseek');

    // 首次激活两步向导（仅弹一次）
    const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
    if (!hasShownWelcome) {
        context.globalState.update('hasShownWelcome', true);
        const action = await vscode.window.showInformationMessage(
            '🔑 DeepSeek Usage Monitor：需配置 API Key 查余额 + 平台 Token 查用量统计',
            '配置 API Key',
            '配置 Token',
            '知道了'
        );
        if (action === '配置 API Key') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'deepseek.apiKey');
        } else if (action === '配置 Token') {
            vscode.commands.executeCommand('deepseek-usage.setPlatformToken');
        }
    }

    // 刷新回调：scheduler 定时触发
    const refreshCallback = async () => {
        // Step 1: 先刷新数据（各自内部判断缓存是否过期）
        await balanceMonitor.refreshBalance();
        await usageMonitor.refresh();

        // Step 2: 更新状态栏（直接传最新余额，避免 refreshBalance 二次调用）
        await updateStatusBar(balanceMonitor, usageMonitor, balanceMonitor.currentBalance);

        // Step 3: 如果面板已打开，同步更新面板视图
        if (UsageDashboardPanel.currentPanel) {
            UsageDashboardPanel.currentPanel.refreshView();
        }
    };

    // 启动自动刷新调度
    const interval = config.get('autoRefreshInterval', 30);
    scheduler = new RefreshScheduler(refreshCallback, interval);
    scheduler.start();

    // 初始更新（fire-and-forget，错误由内部捕获）
    refreshCallback().catch(console.error);

    // 监听配置变更
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('deepseek.autoRefreshInterval')) {
                const newInterval = vscode.workspace.getConfiguration('deepseek')
                    .get('autoRefreshInterval', 30);
                scheduler?.updateInterval(newInterval);
            }
            if (event.affectsConfiguration('deepseek.apiKey')) {
                await updateStatusBar(balanceMonitor, usageMonitor);
            }
        })
    );

    // 注册命令
    context.subscriptions.push(
        statusBarItem,
        vscode.commands.registerCommand('deepseek-usage.setPlatformToken', async () => {
            const token = await vscode.window.showInputBox({
                prompt: '粘贴 DeepSeek 开放平台的 Bearer Token',
                password: true,
                placeHolder: '从浏览器 DevTools → Network 中复制 authorization 头的值',
                ignoreFocusOut: true,
            });
            if (token) {
                await usageMonitor.storeToken(token);
                await usageMonitor.forceRefresh();
                await updateStatusBar(balanceMonitor, usageMonitor);
                vscode.window.showInformationMessage('✅ 平台 Token 已保存，用量数据已更新');
            }
        }),
        vscode.commands.registerCommand('deepseek-usage.clearPlatformToken', async () => {
            await usageMonitor.clearToken();
            await updateStatusBar(balanceMonitor, usageMonitor);
            vscode.window.showInformationMessage('已清除平台 Token');
        }),
        vscode.commands.registerCommand('deepseek-usage.showUsage', () => {
            UsageDashboardPanel.createOrShow(context, balanceMonitor, usageMonitor);
        }),
        vscode.commands.registerCommand('deepseek-usage.refresh', async () => {
            await balanceMonitor.forceRefreshBalance();
            await usageMonitor.forceRefresh();
            await updateStatusBar(balanceMonitor, usageMonitor);
            if (UsageDashboardPanel.currentPanel) {
                UsageDashboardPanel.currentPanel.refreshView();
            }
        }),
    );
}

export function deactivate() {
    scheduler?.stop();
    UsageDashboardPanel.currentPanel?.dispose();
}

async function updateStatusBar(
    balanceMonitor: BalanceMonitor,
    usageMonitor?: UsageMonitor,
    cachedBalance?: number,
): Promise<void> {
    try {
        const balance = cachedBalance !== undefined ? cachedBalance : await balanceMonitor.refreshBalance();
        const config = vscode.workspace.getConfiguration('deepseek');
        const apiKey: string = config.get<string>('apiKey') || '';

        // API Key 未配置时显示提示
        if (!apiKey) {
            statusBarItem.text = `$(key) DeepSeek: 未配置`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            statusBarItem.tooltip = '点击查看详情';
            statusBarItem.show();
            return;
        }

        // 格式化显示
        const icon = balance > 50 ? 'rocket' : (balance > 10 ? 'info' : 'alert');
        let statusText = `$(${icon}) DeepSeek: ¥${balance.toFixed(2)}`;

        // Token 已配置且数据有效时，追加月消费
        if (usageMonitor?.hasToken && usageMonitor.cachedData && usageMonitor.cachedData.totalCost > 0) {
            const cost = usageMonitor.cachedData.totalCost;
            const costStr = cost >= 10000
                ? `¥${(cost / 10000).toFixed(2)}万`
                : `¥${cost.toFixed(2)}`;
            statusText += ' | ' + costStr;
        }

        // 构建 Tooltip 提示缺失配置项
        const tooltipLines: string[] = [];
        tooltipLines.push(`余额: ¥${balance.toFixed(2)}`);
        if (usageMonitor?.hasToken && usageMonitor.cachedData) {
            tooltipLines.push(`月消费: ¥${usageMonitor.cachedData.totalCost.toFixed(2)}`);
        }
        tooltipLines.push('点击打开用量仪表盘');
        if (!apiKey) {
            tooltipLines.push('⚠️ 未配置 API Key → 设置中搜索 deepseek.apiKey');
        }
        if (!usageMonitor?.hasToken) {
            tooltipLines.push('⚠️ 未配置平台 Token → 命令面板搜索「DeepSeek」');
        }
        statusBarItem.tooltip = tooltipLines.join('\n');

        // 余额不足时改变颜色
        if (balance < 10) {
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            statusBarItem.backgroundColor = undefined;
        }

        statusBarItem.text = statusText;
        statusBarItem.show();

        // 余额检查
        await balanceMonitor.checkAlert(10);
    } catch (error) {
        statusBarItem.text = `$(alert) DeepSeek: API错误`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = '无法获取余额，稍后重试';
        statusBarItem.show();
    }
}
