import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';

// 创建速率限制器 - 每分钟最多5次检查
const checkRateLimit = createRateLimit({
  max: 5,
  windowMs: 60 * 1000, // 1分钟
  message: '检查过于频繁，请稍后再试。',
});

// 从暴雪API获取卡片信息
async function fetchCardInfo(shareToken: string) {
  try {
    const response = await fetch(
      `https://webapi.blizzard.cn/ow-champion-game-center/ccc-card/share/info?share_token=${shareToken}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || '获取卡片信息失败');
    }
    
    // 如果data为null，表示卡片已被领取
    if (data.data === null) {
      return { claimed: true };
    }
    
    return { claimed: false, ...data.data };
  } catch (error) {
    console.error('获取卡片信息失败:', error);
    throw error;
  }
}

// 检查并更新卡片状态
export async function POST(request: NextRequest) {
  // 1. 速率限制检查
  const rateLimitResult = await checkRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
   
  // 2. 用户代理检查
  const userAgent = request.headers.get('user-agent') || '';
  if (isSuspiciousUserAgent(userAgent)) {
    return NextResponse.json(
      { error: '检测到可疑的请求来源' },
      { status: 403 }
    );
  }
  
  try {
    // 获取所有活跃的卡片交换
    const activeExchanges = await prisma.cardExchange.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        lastCheckedAt: 'asc',
      },
      take: 50, // 每次最多检查50个
    });
    
    let updatedCount = 0;
    
    for (const exchange of activeExchanges) {
      try {
        const cardInfo = await fetchCardInfo(exchange.shareToken);
        
        // 更新最后检查时间
        const updateData: any = {
          lastCheckedAt: new Date(),
        };
        
        // 如果卡片已被领取，更新状态
        if (cardInfo.claimed) {
          updateData.status = 'claimed';
          updatedCount++;
        }
        
        await prisma.cardExchange.update({
          where: { id: exchange.id },
          data: updateData,
        });
        
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`检查卡片 ${exchange.shareToken} 状态失败:`, error);
        
        // 更新最后检查时间，即使失败也要记录
        await prisma.cardExchange.update({
          where: { id: exchange.id },
          data: { lastCheckedAt: new Date() },
        });
      }
    }
    
    console.log(`状态检查完成，检查了 ${activeExchanges.length} 个卡片，更新了 ${updatedCount} 个状态`);
    
    return NextResponse.json({
      checked: activeExchanges.length,
      updated: updatedCount,
      message: '状态检查完成',
    });
  } catch (error) {
    console.error('检查卡片状态失败:', error);
    return NextResponse.json(
      { error: '检查卡片状态失败' },
      { status: 500 }
    );
  }
}