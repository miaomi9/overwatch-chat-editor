import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit } from '@/utils/rateLimiter';
import { isSuspiciousUserAgent } from '@/utils/validation';

// 创建速率限制器 - 1小时最多3次
const contributionRateLimit = createRateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1小时
  message: '提交过于频繁，请1小时后再试。每小时最多可提交3次纹理贡献。',
});

// 验证TXC代码格式
function validateTxcCode(txcCode: string): boolean {
  // TXC代码应该是 <TXC + 数字/字母> 的格式
  const txcPattern = /^<TXC[0-9A-Fa-f]+>$/;
  return txcPattern.test(txcCode);
}

// 获取纹理贡献列表（管理员用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, pending, approved

    const skip = (page - 1) * limit;

    // 构建查询条件
    let where: any = {};
    
    if (search) {
      where.OR = [
        { txcCode: { contains: search } },
        { chineseName: { contains: search } },
      ];
    }

    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    // 获取贡献列表
    const contributions = await prisma.textureContribution.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // 获取总数
    const total = await prisma.textureContribution.count({ where });

    return NextResponse.json({
      contributions: contributions.map((contribution) => ({
        id: contribution.id,
        txcCode: contribution.txcCode,
        chineseName: contribution.chineseName,
        canDisplayInGame: contribution.canDisplayInGame,
        isApproved: contribution.isApproved,
        createdAt: contribution.createdAt,
        updatedAt: contribution.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取纹理贡献列表失败:', error);
    return NextResponse.json(
      { error: '获取贡献列表失败' },
      { status: 500 }
    );
  }
}

// 提交新的纹理贡献
export async function POST(request: NextRequest) {
  try {
    // 1. 速率限制检查
    const rateLimitResult = await contributionRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // 2. 用户代理检查（防止机器人）
    const userAgent = request.headers.get('user-agent') || '';
    if (isSuspiciousUserAgent(userAgent)) {
      return NextResponse.json(
        { error: '请求被拒绝' },
        { status: 403 }
      );
    }

    // 3. 获取客户端IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // 4. 解析请求数据
    const { txcCode, chineseName, canDisplayInGame } = await request.json();

    // 5. 数据验证
    if (!txcCode || !chineseName || typeof canDisplayInGame !== 'boolean') {
      return NextResponse.json(
        { error: '请填写完整的信息' },
        { status: 400 }
      );
    }

    // 验证TXC代码格式
    if (!validateTxcCode(txcCode)) {
      return NextResponse.json(
        { error: 'TXC代码格式不正确，应为 <TXC + 数字/字母> 格式，如：<TXC00000000A180>' },
        { status: 400 }
      );
    }

    // 验证中文名称长度
    if (chineseName.length > 50) {
      return NextResponse.json(
        { error: '中文名称不能超过50个字符' },
        { status: 400 }
      );
    }

    // 验证中文名称不能为空
    if (chineseName.trim().length === 0) {
      return NextResponse.json(
        { error: '中文名称不能为空' },
        { status: 400 }
      );
    }

    // 6. 检查是否已存在相同的TXC代码
    const existingContribution = await prisma.textureContribution.findFirst({
      where: {
        txcCode: txcCode,
      },
    });

    if (existingContribution) {
      return NextResponse.json(
        { error: '该TXC代码已经被提交过了' },
        { status: 409 }
      );
    }

    // 7. 检查同一IP是否在短时间内提交了重复内容
    const recentDuplicate = await prisma.textureContribution.findFirst({
      where: {
        contributorIp: ip,
        txcCode: txcCode,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5分钟内
        },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        { error: '检测到重复提交，请稍后再试' },
        { status: 429 }
      );
    }

    // 8. 创建纹理贡献记录
    const contribution = await prisma.textureContribution.create({
      data: {
        txcCode,
        chineseName,
        canDisplayInGame,
        contributorIp: ip,
      },
    });

    // 9. 记录成功日志
    console.log(`纹理贡献创建成功: ID=${contribution.id}, IP=${ip}, TXC=${txcCode}, Name=${chineseName}`);

    return NextResponse.json({
      id: contribution.id,
      txcCode: contribution.txcCode,
      chineseName: contribution.chineseName,
      canDisplayInGame: contribution.canDisplayInGame,
      createdAt: contribution.createdAt,
      message: '纹理贡献提交成功！您的贡献正在等待审核，审核通过后将添加到纹理库中。感谢您的贡献！',
      needsApproval: true
    }, { status: 201 });
  } catch (error) {
    console.error('创建纹理贡献失败:', error);
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { status: 500 }
    );
  }
}