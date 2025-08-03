import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';

// 【优化方案第二阶段】用户上报机制 - 允许用户上报卡片已被使用
// 上报卡片已使用的速率限制器（每小时最多50次）
const reportUsedLimiter = createRateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000, // 1小时
  message: '上报过于频繁，请稍后再试。每小时最多可上报50次。',
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 速率限制检查
    const rateLimitResult = await reportUsedLimiter(request);
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

    const cardId = params.id;
    
    // 获取客户端IP
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

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

    // 检查卡片状态
    if (cardExchange.status !== 'active') {
      return NextResponse.json(
        { 
          error: '卡片已不是活跃状态',
          currentStatus: cardExchange.status
        },
        { status: 400 }
      );
    }

    // 检查该IP是否已经上报过这张卡片
    const existingReport = await prisma.cardReport.findUnique({
      where: {
        cardExchangeId_reporterIp: {
          cardExchangeId: cardId,
          reporterIp: clientIP
        }
      }
    });

    if (existingReport) {
      return NextResponse.json({
        success: true,
        alreadyReported: true,
        message: '您已经为这张卡片贡献过上报了，感谢您的参与！',
        cardId: cardId
      }, { status: 200 });
    }

    // 记录上报信息
    await prisma.cardReport.create({
      data: {
        cardExchangeId: cardId,
        reporterIp: clientIP,
        reportType: 'used'
      }
    });

    // 检查该卡片的上报数量
    const reportCount = await prisma.cardReport.count({
      where: {
        cardExchangeId: cardId,
        reportType: 'used'
      }
    });

    console.log(`[用户上报] 收到上报 - ID: ${cardId}, IP: ${clientIP}, 总上报数: ${reportCount}`);

    // 如果达到3个不同IP上报，则标记卡片为已使用
    if (reportCount >= 3) {
      await prisma.cardExchange.update({
        where: { id: cardId },
        data: {
          status: 'claimed',
          updatedAt: new Date()
        }
      });

      console.log(`[用户上报] 卡片已标记为已使用 - ID: ${cardId} (达到3个独立IP上报)`);

      return NextResponse.json({
        success: true,
        message: '感谢您的上报！该卡片已收到足够的上报，状态已更新为已使用',
        cardId: cardId,
        newStatus: 'claimed',
        reportCount: reportCount
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '感谢您的上报！您的反馈已记录，我们会持续关注该卡片状态',
        cardId: cardId,
        reportCount: reportCount,
        requiredReports: 3
      });
    }

  } catch (error) {
    console.error('[用户上报] 处理失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}