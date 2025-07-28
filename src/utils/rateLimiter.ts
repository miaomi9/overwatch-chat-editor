import { NextRequest, NextResponse } from 'next/server';

// 内存存储的速率限制器（生产环境建议使用Redis）
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 时间窗口内允许的最大请求数 */
  max: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 自定义键生成函数，默认使用IP */
  keyGenerator?: (req: NextRequest) => string;
  /** 超出限制时的错误消息 */
  message?: string;
  /** 是否跳过成功的请求计数 */
  skipSuccessfulRequests?: boolean;
  /** 是否跳过失败的请求计数 */
  skipFailedRequests?: boolean;
}

/**
 * 默认配置
 */
const defaultConfig: RateLimitConfig = {
  max: 100, // 每个时间窗口最多100个请求
  windowMs: 15 * 60 * 1000, // 15分钟
  message: 'Too many requests, please try again later.',
  keyGenerator: (req: NextRequest) => {
    // 获取真实IP地址
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return ip;
  },
};

/**
 * 创建速率限制中间件
 */
export function createRateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();
    
    // 清理过期的记录
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    // 初始化或获取当前记录
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + finalConfig.windowMs,
      };
    }

    // 增加请求计数
    store[key].count++;

    // 检查是否超出限制
    if (store[key].count > finalConfig.max) {
      return NextResponse.json(
        { error: finalConfig.message },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': finalConfig.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
            'Retry-After': Math.ceil((store[key].resetTime - now) / 1000).toString(),
          },
        }
      );
    }

    // 返回null表示通过限制检查
    return null;
  };
}

/**
 * 预定义的速率限制配置
 */
export const rateLimitConfigs = {
  // 严格限制 - 用于敏感操作如上传
  strict: {
    max: 2,
    windowMs: 60 * 60 * 1000, // 1小时2次
    message: 'Too many upload attempts, please try again in 1 hour.',
  },
  // 中等限制 - 用于一般API
  moderate: {
    max: 50,
    windowMs: 15 * 60 * 1000, // 15分钟50次
    message: 'Too many requests, please try again later.',
  },
  // 宽松限制 - 用于读取操作
  lenient: {
    max: 200,
    windowMs: 15 * 60 * 1000, // 15分钟200次
    message: 'Too many requests, please slow down.',
  },
};

/**
 * 清理过期的速率限制记录（定期调用）
 */
export function cleanupExpiredRecords() {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }
  });
}

// 每5分钟清理一次过期记录
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}