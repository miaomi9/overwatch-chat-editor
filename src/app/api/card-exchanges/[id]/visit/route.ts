import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';

// 访问记录的速率限制器（每分钟最多30次）
const visitRateLimit = createRateLimit({
  max: 30,
  windowMs: 60 * 1000, // 1分钟
  message: '访问过于频繁，请稍后再试。',
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 速率限制检查
    const rateLimitResult = await visitRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // 检查可疑用户代理
    const userAgent = request.headers.get('user-agent') || '';
    if (isSuspiciousUserAgent(userAgent)) {
      return NextResponse.json(
        { error: '检测到可疑的请求来源' },
        { status: 403 }
      );
    }

    const { id: cardId } = await params;
    
    // 获取客户端IP
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // 先检查Redis缓存（只缓存非活跃状态）
    const redis = getRedisClient();
    const cacheKey = `card_status:${cardId}`;
    
    try {
      const cachedStatus = await redis.get(cacheKey);
      if (cachedStatus && cachedStatus !== 'active') {
        let statusMessage = '卡片已不是活跃状态';
        
        if (cachedStatus === 'claimed') {
          statusMessage = '卡片已被消费';
        } else if (cachedStatus === 'expired') {
          statusMessage = '卡片已过期';
        } else if (cachedStatus === 'invalid') {
          statusMessage = '卡片已失效';
        }
        
        console.log(`[访问记录-缓存] ${statusMessage}: ${cardId}, 状态: ${cachedStatus}`);
        
        return NextResponse.json({
          success: true,
          message: statusMessage,
          status: cachedStatus
        });
      }
    } catch (redisError) {
      console.error('[访问记录] Redis缓存查询失败:', redisError);
      // Redis失败时继续查询数据库
    }

    // 查找卡片
    const cardExchange = await prisma.cardExchange.findUnique({
      where: { id: cardId },
    });

    if (!cardExchange) {
      return NextResponse.json(
        { error: '卡片不存在' },
        { status: 404 }
      );
    }

    // 检查卡片状态，只对活跃状态的卡片记录访问
    if (cardExchange.status !== 'active') {
      let statusMessage = '卡片已不是活跃状态';
      
      if (cardExchange.status === 'claimed') {
        statusMessage = '卡片已被消费';
      } else if (cardExchange.status === 'expired') {
        statusMessage = '卡片已过期';
      } else if (cardExchange.status === 'invalid') {
        statusMessage = '卡片已失效';
      }
      
      console.log(`[访问记录] ${statusMessage}: ${cardId}, 状态: ${cardExchange.status}`);
      
      // 缓存非活跃状态，5分钟过期
      try {
        await redis.setex(cacheKey, 300, cardExchange.status);
      } catch (redisError) {
        console.error('[访问记录] Redis缓存设置失败:', redisError);
      }
      
      return NextResponse.json({
        success: true,
        message: statusMessage,
        status: cardExchange.status
      });
    }

    // 记录用户访问行为
    console.log(`[用户访问] 卡片: ${cardId}, IP: ${clientIP}, 时间: ${new Date().toISOString()}`);

    // 将卡片添加到Redis检测队列
    try {
      const queueItem = {
        cardId: cardId,
        shareToken: cardExchange.shareToken,
        originalUrl: cardExchange.originalUrl,
        visitedAt: new Date().toISOString(),
        priority: 1 // 基础优先级
      };

      // 使用Redis SET避免重复添加到队列
      const redis = getRedisClient();
      const setKey = `card_check_set`;
      const isAdded = await redis.sadd(setKey, cardId);
      
      // 如果成功添加到SET（返回1表示新增），则添加到检测队列
      if (isAdded === 1) {
        await redis.lpush('card_check_queue', JSON.stringify(queueItem));
        console.log(`[访问记录] 卡片 ${cardId} 已添加到检测队列`);
      } else {
        console.log(`[访问记录] 卡片 ${cardId} 已在检测队列中，跳过重复添加`);
      }
      
      console.log(`[检测队列] 卡片已添加到队列: ${cardId}`);
    } catch (redisError) {
      console.error('[检测队列] Redis操作失败:', redisError);
      // Redis失败不影响用户体验，继续返回成功
    }

    return NextResponse.json({
      success: true,
      message: '访问已记录，卡片已添加到检测队列'
    });

  } catch (error) {
    console.error('[用户访问] 处理失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}