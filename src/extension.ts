import * as vscode from 'vscode';
import { BalanceMonitor } from './monitor/balance';
import { RefreshScheduler } from './scheduler/scheduler';

let statusBarItem: vscode.StatusBarItem;
let scheduler: RefreshScheduler | undefined;

export function activate(context: vscode.ExtensionContext) {
    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.name = 'DeepSeek Usage Monitor';
    statusBarItem.tooltip = '点击查看详细用量信息';
    statusBarItem.command = 'deepseek-usage.showUsage';

    // 初始化各模块
    const balanceMonitor = new BalanceMonitor(context);

    // 注入限流回调：遇到 429 时通知 scheduler 自适应退避
    balanceMonitor.onRateLimit = () => scheduler?.handleRateLimit();

    const refreshCallback = async () => {
        await updateStatusBar(balanceMonitor);
    };

    const config = vscode.workspace.getConfiguration('deepseek');

    // 首次激活引导：API Key 未配置时弹欢迎提示
    const apiKey = config.get('apiKey') || '';
    if (!apiKey) {
        vscode.window.showInformationMessage(
            '🔑 DeepSeek Usage Monitor：请先配置 API Key 以查看余额',
            '配置 API Key'
        ).then(selection => {
            if (selection === '配置 API Key') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'deepseek.apiKey');
            }
        });
    }

    // 启动自动刷新调度
    const interval = config.get('autoRefreshInterval', 30);
    scheduler = new RefreshScheduler(refreshCallback, interval);
    scheduler.start();

    // 初始更新
    refreshCallback();

    // 监听配置变更（注册到 context 确保插件停用时自动清理）
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('deepseek.autoRefreshInterval')) {
                const newInterval = vscode.workspace.getConfiguration('deepseek')
                    .get('autoRefreshInterval', 30);
                scheduler?.updateInterval(newInterval);
            }
        })
    );

    // 注册命令
    context.subscriptions.push(
        statusBarItem,
        vscode.commands.registerCommand('deepseek-usage.showUsage', async () => {
            // 点击状态栏时先强制拉取最新余额，再弹窗
            await balanceMonitor.forceRefreshBalance();
            showUsageDetails(balanceMonitor);
        }),
        vscode.commands.registerCommand('deepseek-usage.refresh', async () => {
            await balanceMonitor.forceRefreshBalance();
            await updateStatusBar(balanceMonitor);
        })
    );
}

export function deactivate() {
    scheduler?.stop();
}

async function updateStatusBar(
    balanceMonitor: BalanceMonitor
): Promise<void> {
    try {
        const balance = await balanceMonitor.refreshBalance();
        const config = vscode.workspace.getConfiguration('deepseek');
        const apiKey = config.get('apiKey') || '';

        // API Key 未配置时显示提示，而非 ¥0.00 造成困惑
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

function showUsageDetails(
    balanceMonitor: BalanceMonitor
): void {
    const config = vscode.workspace.getConfiguration('deepseek');
    const balance = balanceMonitor.currentBalance;
    const apiKey = config.get('apiKey') || '';
    const isCache = balanceMonitor.isBalanceFromCache;

    const lowBalance = balance <= 10 && !!apiKey;

    const balanceLine = isCache
        ? `- 当前余额：¥${balance.toFixed(2)}（${lowBalance ? '⚠️ ' : ''}缓存，可能非实时）`
        : `- 当前余额：${lowBalance ? '⚠️ ' : ''}¥${balance.toFixed(2)}`;

    const keyLine = apiKey
        ? `- API Key：...${apiKey.slice(-8)}`
        : `- API Key：未配置 ⚠️ 余额来自上次缓存`;

    const message = `
📊 **DeepSeek 账户详情**

💰 **余额信息**
${balanceLine}
${keyLine}

💡 **提示**：余额每 ${config.get('autoRefreshInterval', 30)} 分钟自动刷新，也可点击下方「刷新」按钮手动更新
    `;

    vscode.window.showInformationMessage(message, { modal: true }, '刷新')
        .then(selection => {
            if (selection === '刷新') {
                vscode.commands.executeCommand('deepseek-usage.refresh');
            }
        });
}
