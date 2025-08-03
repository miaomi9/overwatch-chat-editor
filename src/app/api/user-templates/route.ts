import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRateLimit, rateLimitConfigs } from '@/utils/rateLimiter';
import { validateData, userTemplateSchema, isSuspiciousUserAgent } from '@/utils/validation';

// 获取用户上传的模板列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, likesCount
    const order = searchParams.get('order') || 'desc';
    const includeLikeStatus = searchParams.get('includeLikeStatus') === 'true';
    const categoryId = searchParams.get('categoryId') || '';

    // 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    const skip = (page - 1) * limit;

    // 构建查询条件 - 只显示已审核的模板
    const where: any = {
      isApproved: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 获取模板列表
    const templates = await prisma.userTemplate.findMany({
      where,
      orderBy: {
        [sortBy]: order,
      },
      skip,
      take: limit,
      include: {
        _count: {
          select: { likes: true },
        },
        likes: includeLikeStatus ? {
          where: { userIp: ip },
          select: { id: true },
        } : false,
        category: {
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 获取总数
    const total = await prisma.userTemplate.count({ where });

    return NextResponse.json({
      templates: templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        overwatchCode: template.overwatchCode,
        likesCount: template.likesCount,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        liked: includeLikeStatus ? template.likes.length > 0 : undefined,
        category: template.category,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[用户模板] 获取列表失败:', error);
    return NextResponse.json(
      { error: '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 创建速率限制器 - 严格限制上传频率
const uploadRateLimit = createRateLimit(rateLimitConfigs.strict);

// 创建新的用户模板
export async function POST(request: NextRequest) {
  try {
    // 1. 速率限制检查
    const rateLimitResult = await uploadRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // 2. 用户代理检查（防止机器人）
    const userAgent = request.headers.get('user-agent') || '';
    if (isSuspiciousUserAgent(userAgent)) {
      return NextResponse.json(
        { error: '检测到可疑的请求来源' },
        { status: 403 }
      );
    }

    // 3. 解析请求体
    const body = await request.json();
    
    // 4. 输入验证和清理
    const validation = validateData(userTemplateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入验证失败', details: validation.errors },
        { status: 400 }
      );
    }

    const { name, description, overwatchCode, categoryId } = validation.data!;

    // 5. 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // 6. 检查是否存在重复的模板（相同IP在短时间内上传相同内容）
    const recentDuplicate = await prisma.userTemplate.findFirst({
      where: {
        creatorIp: ip,
        overwatchCode: overwatchCode,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1小时内
        },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        { error: '检测到重复提交，请稍后再试' },
        { status: 429 }
      );
    }

    // 7. 创建模板
    const template = await prisma.userTemplate.create({
      data: {
        name,
        description: description || null,
        overwatchCode,
        creatorIp: ip,
        categoryId: categoryId || 'uncategorized',
      },
    });

    // 8. 记录成功日志
    console.log(`[模板创建] 新模板已发布 - ID: ${template.id}, 名称: ${name}`);

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      overwatchCode: template.overwatchCode,
      likesCount: template.likesCount,
      createdAt: template.createdAt,
      message: '模板提交成功！您的模板正在等待审核，审核通过后将在模板库中显示。',
      needsApproval: true
    }, { status: 201 });
  } catch (error) {
    console.error('[用户模板] 创建失败:', error);
    return NextResponse.json(
      { error: '创建模板失败' },
      { status: 500 }
    );
  }
}