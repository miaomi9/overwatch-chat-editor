import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { templateIds } = await request.json();

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { error: 'Template IDs array is required' },
        { status: 400 }
      );
    }

    // 批量获取模板
    const templates = await prisma.userTemplate.findMany({
      where: {
        id: {
          in: templateIds
        },
        isApproved: true
      },
      include: {
        category: {
          include: {
            parent: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      templates: templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        overwatchCode: template.overwatchCode,
        likesCount: template.likesCount,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        category: template.category,
      })),
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching batch templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}