import * as vscode from 'vscode';

export interface ErrorHandlerOptions {
    onRateLimit?: () => void;
    /** 错误来源：'api' = DeepSeek API Key，'platform' = 平台登录 Token */
    source?: 'api' | 'platform';
}

export class APIErrorHandler {
    private static retryCount = 0;

    static async handle(error: any, context: vscode.ExtensionContext, options?: ErrorHandlerOptions): Promise<void> {
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (options?.source === 'platform') {
                vscode.window.showWarningMessage(
                    'DeepSeek 平台登录凭证已过期，请重新设置平台 Token',
                    '配置 Token'
                ).then(selection => {
                    if (selection === '配置 Token') {
                        vscode.commands.executeCommand('deepseek-usage.setPlatformToken');
                    }
                });
            } else {
                vscode.window.showErrorMessage(
                    'DeepSeek API 认证失败，请检查 API Key 配置',
                    '配置 API Key'
                ).then(selection => {
                    if (selection === '配置 API Key') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'deepseek.apiKey');
                    }
                });
            }
        } else if (error.response?.status === 429) {
            vscode.window.showWarningMessage('DeepSeek API 请求过于频繁，请稍后再试');
            // 指数退避重试
            await this.exponentialBackoff();
            // 通知调度器延长刷新间隔
            options?.onRateLimit?.();
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            vscode.window.showWarningMessage('网络连接失败，将使用缓存数据');
        } else {
            console.error('Unhandled API error:', error);
        }
    }

    private static async exponentialBackoff(): Promise<void> {
        if (this.retryCount < 3) {
            const delay = Math.pow(2, this.retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            this.retryCount++;
        } else {
            this.retryCount = 0;
        }
    }
}
