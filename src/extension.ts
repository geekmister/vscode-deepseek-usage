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
    statusBarItem.tooltip = '点击打开用量概览';
    statusBarItem.command = 'deepseek-usage.showUsage';

    // 初始化各模块
    const balanceMonitor = new BalanceMonitor(context);
    const usageMonitor = new UsageMonitor(context);

    // 注入限流回调
    balanceMonitor.onRateLimit = () => scheduler?.handleRateLimit();

    // 注入 Token 过期回调
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
        await balanceMonitor.refreshBalance();
        await usageMonitor.refresh();
        await updateStatusBar(balanceMonitor, usageMonitor, balanceMonitor.currentBalance);
        // 编辑器 Tab 面板（如果打开）
        if (UsageDashboardPanel.currentPanel) {
            UsageDashboardPanel.currentPanel.refreshView();
        }
    };

    // 启动自动刷新调度
    const interval = config.get('autoRefreshInterval', 30);
    scheduler = new RefreshScheduler(refreshCallback, interval);
    scheduler.start();

    // 初始更新
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
        vscode.commands.registerCommand('deepseek-usage.showUsage', async () => {
            await showQuickPick(balanceMonitor, usageMonitor);
        }),
        vscode.commands.registerCommand('deepseek-usage.openDashboard', () => {
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

// ==================== QuickPick 悬浮面板 ====================

async function showQuickPick(
    balanceMonitor: BalanceMonitor,
    usageMonitor: UsageMonitor,
): Promise<void> {
    // 先同步刷新数据
    await balanceMonitor.forceRefreshBalance();
    await usageMonitor.forceRefresh();

    const balance = balanceMonitor.currentBalance;
    const usage = usageMonitor.cachedData;
    const hasToken = usageMonitor.hasToken;

    const items: vscode.QuickPickItem[] = [];

    // ─── 余额 & 消费概要 ───
    items.push({
        label: `$(rocket) 余额：¥${balance.toFixed(2)}`,
        description: '',
        detail: `缓存更新: ${balanceMonitor.lastUpdated}`,
    });

    if (usage) {
        items.push({
            label: `$(graph) 月消费：¥${usage.totalCost.toFixed(2)}`,
            description: `Token ${_fmt(usage.totalTokens)}`,
            detail: `请求 ${_fmt(usage.totalRequests)} 次`,
        });
    }

    // ─── 分隔线 ───
    items.push({ label: '', description: '', detail: '', kind: vscode.QuickPickItemKind.Separator });

    // ─── 模型用量明细 ───
    if (usage && usage.modelBreakdown.length > 0) {
        items.push({
            label: '$(list-tree) 模型用量明细',
            description: 'Token / 请求 / 费用',
            detail: '',
        });

        for (const m of usage.modelBreakdown) {
            items.push({
                label: `  ${m.model}`,
                description: `${_fmt(m.tokens)} Tokens`,
                detail: `${_fmt(m.requests)} 次 · ¥${m.cost.toFixed(4)}`,
            });
        }
    } else if (!hasToken) {
        items.push({
            label: '$(key) 未配置平台 Token',
            description: '',
            detail: '执行命令「DeepSeek: 设置平台 Token」以查看用量',
        });
    }

    // ─── 分隔线 ───
    items.push({ label: '', description: '', detail: '', kind: vscode.QuickPickItemKind.Separator });

    // ─── 操作项 ───
    items.push({
        label: '$(arrow-right) 打开完整仪表盘',
        description: '',
        detail: '在编辑器 Tab 中查看图表和每日明细',
    });
    items.push({
        label: '$(refresh) 刷新数据',
        description: '',
        detail: '强制刷新余额和用量数据',
    });
    items.push({
        label: '$(key) 设置平台 Token',
        description: '',
        detail: '从 platform.deepseek.com 复制 Bearer Token',
    });

    const pick = await vscode.window.showQuickPick(items, {
        title: 'DeepSeek 用量概览',
        placeHolder: 'Esc 关闭 · 点击「打开完整仪表盘」查看图表',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (!pick) return;

    if (pick.label.includes('打开完整仪表盘')) {
        vscode.commands.executeCommand('deepseek-usage.openDashboard');
    } else if (pick.label.includes('刷新数据')) {
        vscode.commands.executeCommand('deepseek-usage.refresh');
    } else if (pick.label.includes('设置平台 Token')) {
        vscode.commands.executeCommand('deepseek-usage.setPlatformToken');
    } else if (pick.label.startsWith('  ')) {
        // 点击模型行 → 复制模型名
        const model = pick.label.trim();
        const desc = pick.description || '';
        const det = pick.detail || '';
        const text = `${model}\n${desc}\n${det}`;
        vscode.env.clipboard.writeText(text);
        vscode.window.setStatusBarMessage('$(check) 已复制到剪贴板', 2000);
    }
}

function _fmt(n: number): string {
    if (n >= 1_0000_0000) return (n / 1_0000_0000).toFixed(2) + '亿';
    if (n >= 1_0000) return (n / 1_0000).toFixed(2) + '万';
    return n.toLocaleString();
}

// ==================== 状态栏更新 ====================

async function updateStatusBar(
    balanceMonitor: BalanceMonitor,
    usageMonitor?: UsageMonitor,
    cachedBalance?: number,
): Promise<void> {
    try {
        const balance = cachedBalance !== undefined ? cachedBalance : await balanceMonitor.refreshBalance();
        const config = vscode.workspace.getConfiguration('deepseek');
        const apiKey: string = config.get<string>('apiKey') || '';

        if (!apiKey) {
            statusBarItem.text = `$(key) DeepSeek: 未配置`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            statusBarItem.tooltip = '点击打开用量概览';
            statusBarItem.show();
            return;
        }

        const icon = balance > 50 ? 'rocket' : (balance > 10 ? 'info' : 'alert');
        let statusText = `$(${icon}) DeepSeek: ¥${balance.toFixed(2)}`;

        if (usageMonitor?.hasToken && usageMonitor.cachedData && usageMonitor.cachedData.totalCost > 0) {
            const cost = usageMonitor.cachedData.totalCost;
            const costStr = cost >= 10000
                ? `¥${(cost / 10000).toFixed(2)}万`
                : `¥${cost.toFixed(2)}`;
            statusText += ' | ' + costStr;
        }

        const tooltipLines: string[] = [];
        tooltipLines.push(`余额: ¥${balance.toFixed(2)}`);
        if (usageMonitor?.hasToken && usageMonitor.cachedData) {
            tooltipLines.push(`月消费: ¥${usageMonitor.cachedData.totalCost.toFixed(2)}`);
        }
        tooltipLines.push('点击打开用量概览');
        if (!apiKey) {
            tooltipLines.push('⚠️ 未配置 API Key → 设置中搜索 deepseek.apiKey');
        }
        if (!usageMonitor?.hasToken) {
            tooltipLines.push('⚠️ 未配置平台 Token → 命令面板搜索「DeepSeek」');
        }
        statusBarItem.tooltip = tooltipLines.join('\n');

        if (balance < 10) {
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            statusBarItem.backgroundColor = undefined;
        }

        statusBarItem.text = statusText;
        statusBarItem.show();

        await balanceMonitor.checkAlert(10);
    } catch (error) {
        statusBarItem.text = `$(alert) DeepSeek: API错误`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = '无法获取余额，稍后重试';
        statusBarItem.show();
    }
}
