import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';
import { z } from 'zod';
import { initializeServerTasks } from '@/utils/serverInit';

// 创建速率限制器 - 每小时最多10次提交
const submitRateLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 60 * 1000, // 1小时
  message: '提交过于频繁，请1小时后再试。每小时最多可提交20次卡片交换。',
});

// 验证schema
const cardExchangeSchema = z.object({
  shareUrl: z.string().min(1, '分享链接不能为空'),
});

// 解析分享链接，提取shareToken
function extractShareToken(url: string): string | null {
  try {
    // 支持多种格式：shareToken=, share_token=, sharetoken=
    const match = url.match(/(?:shareToken|share_token|sharetoken)=([a-f0-9]+)/i);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

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
    
    // 检查API返回的状态码
    if (data.code !== 0) {
      // 特定错误码表示卡片已被领取或交换
      if (data.code === 41604 || data.message?.includes('已有玩家交换') || data.message?.includes('分享信息有误')) {
        return { claimed: true };
      }
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

// GET - 获取卡片交换列表
export async function GET(request: NextRequest) {
  // 速率限制检查 - 每分钟最多20次
  const getRateLimit = createRateLimit({
    max: 30,
    windowMs: 60 * 1000,
    message: '查询过于频繁，请稍后再试。',
  });
  const rateLimitResult = await getRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
  // 初始化服务器任务
  initializeServerTasks();
  
  // 用户代理检查
  const userAgent = request.headers.get('user-agent') || '';
  if (isSuspiciousUserAgent(userAgent)) {
    return NextResponse.json(
      { error: '检测到可疑的请求来源' },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const actionType = searchParams.get('actionType');
    const status = searchParams.get('status') || 'active';
    
    const skip = (page - 1) * limit;
    
    const where: any = {
      status: status,
    };
    
    if (actionType && ['ask', 'exchange', 'give'].includes(actionType)) {
      where.actionType = actionType;
    }
    
    const [exchanges, total] = await Promise.all([
      prisma.cardExchange.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cardExchange.count({ where }),
    ]);
    
    return NextResponse.json({
      exchanges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取卡片交换列表失败:', error);
    return NextResponse.json(
      { error: '获取卡片交换列表失败' },
      { status: 500 }
    );
  }
}

// 创建新的卡片交换
export async function POST(request: NextRequest) {
  try {
    // 1. 速率限制检查
    const rateLimitResult = await submitRateLimit(request);
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
    
    // 3. 解析请求体
    const body = await request.json();
    
    // 4. 输入验证
    const validation = cardExchangeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入验证失败', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { shareUrl } = validation.data;
    
    // 5. 提取shareToken
    const shareToken = extractShareToken(shareUrl);
    if (!shareToken) {
      return NextResponse.json(
        { error: '无法从链接中提取分享令牌' },
        { status: 400 }
      );
    }
    
    // 6. 检查是否已存在
    const existingExchange = await prisma.cardExchange.findUnique({
      where: { shareToken },
    });
    
    if (existingExchange) {
      return NextResponse.json(
        { error: '该卡片交换已经存在' },
        { status: 409 }
      );
    }
    
    // 7. 获取客户端IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // 8. 从暴雪API获取卡片信息
    let cardInfo;
    try {
      cardInfo = await fetchCardInfo(shareToken);
    } catch (error) {
      return NextResponse.json(
        { error: '获取卡片信息失败，请检查链接是否有效' },
        { status: 400 }
      );
    }
    
    // 如果卡片已被领取，返回错误
    if (cardInfo.claimed) {
      return NextResponse.json(
        { error: '该卡片已被领取' },
        { status: 410 }
      );
    }
    
    // 9. 创建卡片交换记录
    const exchange = await prisma.cardExchange.create({
      data: {
        shareToken,
        actionType: cardInfo.action_type,
        actionInitiatorAccount: cardInfo.action_initator_accountname,
        actionInitiatorCardId: cardInfo.action_initator_card_id,
        actionAcceptCardId: cardInfo.action_acceptcard_id || 0,
        creatorIp: ip,
        originalUrl: shareUrl,
      },
    });
    
    console.log(`卡片交换创建成功: ID=${exchange.id}, Token=${shareToken}, Type=${cardInfo.action_type}`);
    
    return NextResponse.json({
      id: exchange.id,
      shareToken: exchange.shareToken,
      actionType: exchange.actionType,
      actionInitiatorAccount: exchange.actionInitiatorAccount,
      actionInitiatorCardId: exchange.actionInitiatorCardId,
      actionAcceptCardId: exchange.actionAcceptCardId,
      status: exchange.status,
      createdAt: exchange.createdAt,
    });
  } catch (error) {
    console.error('创建卡片交换失败:', error);
    return NextResponse.json(
      { error: '创建卡片交换失败' },
      { status: 500 }
    );
  }
}