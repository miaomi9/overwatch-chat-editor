import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// 检查是否为生产环境
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

// 获取所有英雄天赋
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const heroId = searchParams.get('heroId');
    const type = searchParams.get('type');
    
    let whereClause: any = {
      isActive: true
    };
    
    if (heroId) {
      whereClause.heroId = heroId;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    const talents = await prisma.heroTalent.findMany({
      where: whereClause,
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { heroId: 'asc' },
        { type: 'asc' },
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    return NextResponse.json({ talents });
  } catch (error) {
    console.error('Error fetching hero talents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero talents' },
      { status: 500 }
    );
  }
}

// 添加新的英雄天赋
export async function POST(request: NextRequest) {
  // 生产环境下禁止访问
  if (isProduction()) {
    return NextResponse.json(
      { error: 'Access denied in production' },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const { name, type, icon, cost, description, heroId, displayOrder } = body;
    
    // 验证必填字段
    if (!name || !type || !description || !heroId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, description, heroId' },
        { status: 400 }
      );
    }
    
    // 验证技能类型
    const validTypes = ['weapon', 'skill', 'survival', 'ability'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: weapon, skill, survival, ability' },
        { status: 400 }
      );
    }
    
    // 验证英雄是否存在
    const hero = await prisma.hero.findUnique({
      where: { id: heroId }
    });
    
    if (!hero) {
      return NextResponse.json(
        { error: 'Hero not found' },
        { status: 404 }
      );
    }
    
    // 异能类型不应该有花费
    const finalCost = type === 'ability' ? null : cost;
    
    const talent = await prisma.heroTalent.create({
      data: {
        name,
        type,
        icon,
        cost: finalCost,
        description,
        heroId,
        displayOrder: displayOrder || 0
      },
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true,
            avatar: true
          }
        }
      }
    });
    
    return NextResponse.json({ talent }, { status: 201 });
  } catch (error) {
    console.error('Error creating hero talent:', error);
    return NextResponse.json(
      { error: 'Failed to create hero talent' },
      { status: 500 }
    );
  }
}

// 更新英雄天赋
export async function PUT(request: NextRequest) {
  // 生产环境下禁止访问
  if (isProduction()) {
    return NextResponse.json(
      { error: 'Access denied in production' },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const { id, name, type, icon, cost, description, heroId, displayOrder, isActive } = body;
    
    // 验证必填字段
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    // 验证技能类型（如果提供）
    if (type) {
      const validTypes = ['weapon', 'skill', 'survival', 'ability'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid type. Must be one of: weapon, skill, survival, ability' },
          { status: 400 }
        );
      }
    }
    
    // 验证英雄是否存在（如果提供）
    if (heroId) {
      const hero = await prisma.hero.findUnique({
        where: { id: heroId }
      });
      
      if (!hero) {
        return NextResponse.json(
          { error: 'Hero not found' },
          { status: 404 }
        );
      }
    }
    
    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      updateData.type = type;
      // 异能类型不应该有花费
      updateData.cost = type === 'ability' ? null : cost;
    } else if (cost !== undefined) {
      updateData.cost = cost;
    }
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (heroId !== undefined) updateData.heroId = heroId;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const talent = await prisma.heroTalent.update({
      where: { id },
      data: updateData,
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true,
            avatar: true
          }
        }
      }
    });
    
    return NextResponse.json({ talent });
  } catch (error) {
    console.error('Error updating hero talent:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Hero talent not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update hero talent' },
      { status: 500 }
    );
  }
}

// 删除英雄天赋
export async function DELETE(request: NextRequest) {
  // 生产环境下禁止访问
  if (isProduction()) {
    return NextResponse.json(
      { error: 'Access denied in production' },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }
    
    await prisma.heroTalent.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Hero talent deleted successfully' });
  } catch (error) {
    console.error('Error deleting hero talent:', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Hero talent not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete hero talent' },
      { status: 500 }
    );
  }
}