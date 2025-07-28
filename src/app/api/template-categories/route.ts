import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 获取所有启用的分类，按层级和显示顺序排序
    const categories = await prisma.templateCategory.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { parentId: 'asc' }, // 先显示一级分类（parentId为null）
        { displayOrder: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        parentId: true,
        displayOrder: true
      }
    });

    // 构建层级结构
    const topLevelCategories = categories.filter((cat: any) => !cat.parentId);
    const categoryTree = topLevelCategories.map((parent: any) => ({
      ...parent,
      children: categories.filter((cat: any) => cat.parentId === parent.id)
    }));

    return NextResponse.json({
      success: true,
      categories: categoryTree
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { error: '获取分类失败' },
      { status: 500 }
    );
  }
}