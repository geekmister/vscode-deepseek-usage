import * as vscode from 'vscode';
import axios from 'axios';

export const DEEPSEEK_API_BASE = 'https://api.deepseek.com';

export interface DeepSeekBalanceResponse {
    is_available: boolean;
    balance_infos: Array<{
        currency: string;
        total_balance: string;
        granted_balance: string;
        topped_up_balance: string;
    }>;
}

export class DeepSeekAPIClient {
    // 每次调用时实时读取 API Key，支持用户在运行时修改配置
    private getApiKey(): string {
        const config = vscode.workspace.getConfiguration('deepseek');
        return config.get('apiKey') || '';
    }

    // 查询账户余额
    async getBalance(): Promise<DeepSeekBalanceResponse | null> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            console.warn('DeepSeek API Key 未配置，跳过余额请求');
            return null;
        }
        const response = await axios.get(`${DEEPSEEK_API_BASE}/user/balance`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });
        return response.data;
    }
}
