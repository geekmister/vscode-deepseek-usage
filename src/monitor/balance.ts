import * as vscode from 'vscode';
import { DeepSeekAPIClient } from '../api/client';
import { APIErrorHandler } from '../error/handler';

export class BalanceMonitor {
    private context: vscode.ExtensionContext;
    private apiClient: DeepSeekAPIClient;
    private _currentBalance: number = 0;
    private _lastFetchTime: number = 0;
    private _lastAlertTime: number = 0;

    // 由 extension.ts 注入：遇到 429 限流时通知 RefreshScheduler 延长间隔
    onRateLimit: (() => void) | undefined;

    get currentBalance(): number {
        return this._currentBalance;
    }

    // 当前 API Key 为空或缓存未过期时，标记数据来自缓存
    get isBalanceFromCache(): boolean {
        const config = vscode.workspace.getConfiguration('deepseek');
        const apiKey = config.get('apiKey') || '';
        return !apiKey || this.isCacheValid();
    }

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.apiClient = new DeepSeekAPIClient();
        this.loadCachedBalance();
    }

    private loadCachedBalance(): void {
        this._currentBalance = this.context.globalState.get('cachedBalance', 0);
        this._lastFetchTime = this.context.globalState.get('cachedBalanceTime', 0);
    }

    // 检查缓存是否仍在有效期内
    private isCacheValid(): boolean {
        const config = vscode.workspace.getConfiguration('deepseek');
        const ttlMinutes = config.get('cacheTTL', 5);
        const age = Date.now() - this._lastFetchTime;
        return age < ttlMinutes * 60 * 1000;
    }

    // 自动刷新：缓存有效则跳过
    async refreshBalance(): Promise<number> {
        if (this.isCacheValid()) {
            return this._currentBalance;
        }
        return this._fetchBalance();
    }

    // 手动刷新：强制请求 API，绕过缓存
    async forceRefreshBalance(): Promise<number> {
        return this._fetchBalance();
    }

    // 统一的 API 请求逻辑
    private async _fetchBalance(): Promise<number> {
        try {
            const response = await this.apiClient.getBalance();
            if (response && response.is_available && response.balance_infos.length > 0) {
                const balanceInfo = response.balance_infos[0];
                this._currentBalance = parseFloat(balanceInfo.total_balance);
                this._lastFetchTime = Date.now();
                await this.context.globalState.update('cachedBalance', this._currentBalance);
                await this.context.globalState.update('cachedBalanceTime', this._lastFetchTime);
                return this._currentBalance;
            }
            return this._currentBalance;
        } catch (error) {
            // 统一通过 APIErrorHandler 处理（弹提示、指数退避等）
            // void：降级优先，错误处理在后台完成，不阻塞返回缓存值
            void APIErrorHandler.handle(error, this.context, { onRateLimit: this.onRateLimit });
            return this._currentBalance;
        }
    }

    // 检查是否需要余额预警（同一阈值区间至少间隔 6 小时才重复弹窗）
    async checkAlert(threshold: number = 10): Promise<boolean> {
        const cooldown = 6 * 60 * 60 * 1000; // 6 小时
        if (this._currentBalance <= threshold && this._currentBalance > 0
            && Date.now() - this._lastAlertTime > cooldown) {
            this._lastAlertTime = Date.now();
            const action = await vscode.window.showWarningMessage(
                `DeepSeek 账户余额仅剩 ¥${this._currentBalance}，即将耗尽！`,
                '去充值', '稍后提醒'
            );
            if (action === '去充值') {
                vscode.env.openExternal(vscode.Uri.parse('https://platform.deepseek.com/top_up'));
            }
            return true;
        }
        return false;
    }
}
