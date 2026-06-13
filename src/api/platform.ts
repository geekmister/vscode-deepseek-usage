import axios, { AxiosInstance } from 'axios';

// ==================== 类型定义 ====================

export type UsageType =
  | 'PROMPT_TOKEN'
  | 'PROMPT_CACHE_HIT_TOKEN'
  | 'PROMPT_CACHE_MISS_TOKEN'
  | 'RESPONSE_TOKEN'
  | 'REQUEST';

export interface UsageItem {
  type: UsageType;
  amount: string;
}

export interface ModelUsage {
  model: string;
  usage: UsageItem[];
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  data: ModelUsage[];
}

export interface UsageAmountData {
  total: ModelUsage[];
  days: DailyUsage[];
}

export interface UsageCostData {
  total: ModelUsage[];
  days: DailyUsage[];
  currency: string;
}

// ==================== API 响应外层封装 ====================

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: {
    biz_code: number;
    biz_msg: string;
    biz_data: T;
  };
}

// ==================== 平台客户端 ====================

const PLATFORM_BASE = 'https://platform.deepseek.com';
const USER_AGENT = 'DeepSeek-Usage-Monitor/1.0.0';

export class PlatformClient {
  private http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: PLATFORM_BASE,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-App-Version': '1.0.0',
        'User-Agent': USER_AGENT,
        'Origin': PLATFORM_BASE,
        'Referer': `${PLATFORM_BASE}/usage`,
      },
    });
  }

  /** 查询某月 Token 用量 */
  async fetchUsageAmount(month: number, year: number): Promise<UsageAmountData | null> {
    try {
      const res = await this.http.get<ApiResponse<UsageAmountData>>('/api/v0/usage/amount', {
        params: { month, year },
      });
      if (res.data.code !== 0 || res.data.data.biz_code !== 0) {
        console.warn('fetchUsageAmount failed:', res.data.msg || res.data.data.biz_msg);
        return null;
      }
      return res.data.data.biz_data;
    } catch (error) {
      console.error('fetchUsageAmount error:', error);
      return null;
    }
  }

  /** 查询某月费用 */
  async fetchUsageCost(month: number, year: number): Promise<UsageCostData | null> {
    try {
      const res = await this.http.get<ApiResponse<UsageCostData[]>>('/api/v0/usage/cost', {
        params: { month, year },
      });
      if (res.data.code !== 0 || !res.data.data.biz_data?.length) {
        console.warn('fetchUsageCost failed:', res.data.msg);
        return null;
      }
      return res.data.data.biz_data[0];
    } catch (error) {
      console.error('fetchUsageCost error:', error);
      return null;
    }
  }

  /** 同时获取某月用量+费用 */
  async fetchMonth(month: number, year: number): Promise<{
    amount: UsageAmountData | null;
    cost: UsageCostData | null;
  }> {
    const [amount, cost] = await Promise.all([
      this.fetchUsageAmount(month, year),
      this.fetchUsageCost(month, year),
    ]);
    return { amount, cost };
  }

  /** 获取当前月数据（便捷方法） */
  async fetchCurrentMonth(): Promise<{
    amount: UsageAmountData | null;
    cost: UsageCostData | null;
  }> {
    const now = new Date();
    return this.fetchMonth(now.getMonth() + 1, now.getFullYear());
  }

  /** 校验 Token 是否有效 */
  async validate(): Promise<boolean> {
    try {
      const res = await this.http.get('/api/v0/users/get_user_summary');
      return res.data?.code === 0;
    } catch {
      return false;
    }
  }
}

// ==================== 数据处理工具函数 ====================

/** 从 ModelUsage[] 中汇总某 type 的总和 */
export function sumUsage(data: ModelUsage[], type: UsageType): number {
  return data.reduce((acc, m) => {
    const item = m.usage.find(u => u.type === type);
    return acc + (item ? parseFloat(item.amount) : 0);
  }, 0);
}

/**
 * 统计可计费量（缓存命中 + 缓存未命中 + 输出）
 * 注意：amount 接口传入时得到 Token 数，cost 接口传入时得到金额（元），逻辑相同
 */
export function sumChargeable(data: ModelUsage[]): number {
  return sumUsage(data, 'PROMPT_CACHE_HIT_TOKEN')
       + sumUsage(data, 'PROMPT_CACHE_MISS_TOKEN')
       + sumUsage(data, 'RESPONSE_TOKEN');
}

/** 格式化 Token 数为千分位（如 1,234,567） */
export function formatTokens(n: number): string {
  return n.toLocaleString('zh-CN');
}

/** 格式化费用为 ¥xx.xx */
export function formatCost(n: number): string {
  return `¥${n.toFixed(2)}`;
}
