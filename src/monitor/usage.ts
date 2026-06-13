import * as vscode from 'vscode';
import {
  PlatformClient,
  UsageAmountData,
  UsageCostData,
  UsageItem,
  ModelUsage,
  sumUsage,
  sumChargeable,
  getModelUsage,
} from '../api/platform';

// ==================== 缓存数据类型 ====================

export interface UsageCache {
  totalTokens: number;           // 当月 Token 总消耗
  totalRequests: number;         // 当月请求总次数
  totalCost: number;             // 当月总费用（元）
  modelBreakdown: Array<{       // 按模型细分
    model: string;
    tokens: number;
    requests: number;
    cost: number;
  }>;
  dailyData: Array<{             // 每日统计
    date: string;
    totalTokens: number;
    totalCost: number;
  }>;
  month: number;                 // 缓存对应的月份
  year: number;                  // 缓存对应的年份
  cachedAt: number;              // 缓存时间戳
}

// ==================== UsageMonitor ====================

export class UsageMonitor {
  private context: vscode.ExtensionContext;
  private _client: PlatformClient | null = null;
  private _cache: UsageCache | null = null;
  private _hasToken: boolean = false;

  // 注入：Token 过期时由 extension.ts 处理
  onTokenExpired: (() => void) | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this._cache = context.globalState.get<UsageCache | null>('cachedUsageData', null);
    // 不阻塞构造，惰性初始化
    this._initClient();
  }

  // ===== 读取缓存 =====

  get cachedData(): UsageCache | null {
    return this._cache;
  }

  get hasToken(): boolean {
    return this._hasToken;
  }

  // ===== 惰性初始化 + Token 状态追踪 =====

  private async _initClient(): Promise<void> {
    const token = await this.context.secrets.get('deepseek.platformToken');
    if (!token) return;
    this._client = new PlatformClient(token);
    this._hasToken = true;
  }

  // ===== Token 管理（通过 SecretStorage 加密存储） =====

  async storeToken(token: string): Promise<void> {
    await this.context.secrets.store('deepseek.platformToken', token);
    this._client = new PlatformClient(token);
    this._hasToken = true;
  }

  async clearToken(): Promise<void> {
    await this.context.secrets.delete('deepseek.platformToken');
    this._client = null;
    this._cache = null;
    this._hasToken = false;
    await this.context.globalState.update('cachedUsageData', undefined);
  }

  // ===== 刷新策略 =====

  /** 自动刷新（缓存 30min 有效则跳过） */
  async refresh(): Promise<UsageCache | null> {
    if (this.isCacheValid()) {
      return this._cache;
    }
    return this._forceRefresh();
  }

  /** 强制刷新 */
  async forceRefresh(): Promise<UsageCache | null> {
    return this._forceRefresh();
  }

  /** 按月份查询 */
  async refreshMonth(m: number, y: number): Promise<UsageCache | null> {
    // 当前月走缓存，历史月实时请求
    const now = new Date();
    if (
      this._cache &&
      this._cache.month === m &&
      this._cache.year === y &&
      now.getMonth() + 1 === m &&
      now.getFullYear() === y &&
      this.isCacheValid()
    ) {
      return this._cache;
    }
    return this._forceRefreshMonth(m, y);
  }

  // ===== 内部方法 =====

  private isCacheValid(): boolean {
    if (!this._cache) return false;
    return Date.now() - this._cache.cachedAt < 30 * 60 * 1000; // 30 分钟
  }

  private async _getClient(): Promise<PlatformClient | null> {
    return this._client;
  }

  private async _forceRefresh(): Promise<UsageCache | null> {
    const client = await this._getClient();
    if (!client) return null;
    try {
      const now = new Date();
      const { amount, cost } = await client.fetchMonth(
        now.getMonth() + 1,
        now.getFullYear(),
      );
      if (!amount) return null;
      return this._buildCache(amount, cost);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.onTokenExpired?.();
      }
      return null;
    }
  }

  private async _forceRefreshMonth(m: number, y: number): Promise<UsageCache | null> {
    const client = await this._getClient();
    if (!client) return null;
    try {
      const { amount, cost } = await client.fetchMonth(m, y);
      if (!amount) return null;
      return this._buildCache(amount, cost);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.onTokenExpired?.();
      }
      return null;
    }
  }

  private async _buildCache(
    amount: UsageAmountData,
    cost: UsageCostData | null,
  ): Promise<UsageCache> {
    // 按模型拆解
    const modelBreakdown: UsageCache['modelBreakdown'] = amount.total.map(m => ({
      model: m.model,
      tokens: sumChargeable([m]),
      requests: sumUsage([m], 'REQUEST'),
      cost: cost
        ? sumChargeable([cost.total.find(c => c.model === m.model)!].filter(Boolean) as ModelUsage[])
        : 0,
    }));

    // 按天拆解
    const dailyData: UsageCache['dailyData'] = amount.days.map(d => ({
      date: d.date,
      totalTokens: sumChargeable(d.data),
      totalCost: cost
        ? sumChargeable(cost.days.find(cd => cd.date === d.date)?.data || [])
        : 0,
    }));

    const cache: UsageCache = {
      totalTokens: sumChargeable(amount.total),
      totalRequests: sumUsage(amount.total, 'REQUEST'),
      totalCost: cost ? sumChargeable(cost.total) : 0,
      modelBreakdown,
      dailyData,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      cachedAt: Date.now(),
    };

    this._cache = cache;
    await this.context.globalState.update('cachedUsageData', cache);
    return cache;
  }
}
