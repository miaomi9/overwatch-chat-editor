import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';

// 创建速率限制器 - 每分钟最多3次检查
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

// 检查单个卡片状态
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    
    // 查找指定的卡片交换
    const exchange = await prisma.cardExchange.findUnique({
      where: { id },
    });
    
    if (!exchange) {
      return NextResponse.json(
        { error: '卡片交换不存在' },
        { status: 404 }
      );
    }
    
    if (exchange.status !== 'active') {
      return NextResponse.json(
        { error: '卡片已不是活跃状态' },
        { status: 400 }
      );
    }
    
    // 获取卡片信息
    const cardInfo = await fetchCardInfo(exchange.shareToken);
    
    // 更新数据
    const updateData: any = {
      lastCheckedAt: new Date(),
    };
    
    let statusChanged = false;
    
    // 如果卡片已被领取，更新状态
    if (cardInfo.claimed) {
      updateData.status = 'claimed';
      statusChanged = true;
    }
    
    const updatedExchange = await prisma.cardExchange.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      id: updatedExchange.id,
      status: updatedExchange.status,
      statusChanged,
      lastCheckedAt: updatedExchange.lastCheckedAt,
      message: statusChanged ? '卡片状态已更新为已领取' : '卡片仍然可用',
    });
    
  } catch (error) {
    console.error('检查卡片状态失败:', error);
    return NextResponse.json(
      { error: '检查卡片状态失败' },
      { status: 500 }
    );
  }
}