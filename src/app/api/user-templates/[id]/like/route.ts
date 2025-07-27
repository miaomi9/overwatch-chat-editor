import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 点赞或取消点赞模板
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const templateId = id;

    // 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // 检查模板是否存在
    const template = await prisma.userTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    // 检查是否已经点赞
    const existingLike = await prisma.templateLike.findUnique({
      where: {
        templateId_userIp: {
          templateId,
          userIp,
        },
      },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.$transaction([
        prisma.templateLike.delete({
          where: { id: existingLike.id },
        }),
        prisma.userTemplate.update({
          where: { id: templateId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      return NextResponse.json({
        liked: false,
        message: '取消点赞成功',
      });
    } else {
      // 添加点赞
      await prisma.$transaction([
        prisma.templateLike.create({
          data: {
            templateId,
            userIp,
          },
        }),
        prisma.userTemplate.update({
          where: { id: templateId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return NextResponse.json({
        liked: true,
        message: '点赞成功',
      });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json(
      { error: '点赞操作失败' },
      { status: 500 }
    );
  }
}

// 检查用户是否已点赞
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const templateId = id;

    // 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // 检查是否已经点赞
    const existingLike = await prisma.templateLike.findUnique({
      where: {
        templateId_userIp: {
          templateId,
          userIp,
        },
      },
    });

    return NextResponse.json({
      liked: !!existingLike,
    });
  } catch (error) {
    console.error('检查点赞状态失败:', error);
    return NextResponse.json(
      { error: '检查点赞状态失败' },
      { status: 500 }
    );
  }
}