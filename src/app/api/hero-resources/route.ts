import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

// GET - 获取英雄资源列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const heroId = searchParams.get('heroId');
    const resourceType = searchParams.get('resourceType');
    
    const where: any = {
      isActive: true
    };
    
    if (heroId) {
      where.heroId = heroId;
    }
    
    if (resourceType) {
      where.resourceType = resourceType;
    }
    
    const resources = await prisma.heroResource.findMany({
      where,
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true,
            role: true
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching hero resources:', error);
    return NextResponse.json(
      { error: '获取英雄资源失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新的英雄资源
export async function POST(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const formData = await request.formData();
    const heroId = formData.get('heroId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const resourceType = formData.get('resourceType') as string;
    const file = formData.get('file') as File | null;
    const displayOrder = parseInt(formData.get('displayOrder') as string) || 0;
    
    if (!heroId || !name || !resourceType || !file) {
      return NextResponse.json(
        { error: '英雄ID、资源名称、资源类型和文件不能为空' },
        { status: 400 }
      );
    }
    
    // 检查英雄是否存在
    const hero = await prisma.hero.findUnique({
      where: { id: heroId }
    });
    
    if (!hero) {
      return NextResponse.json(
        { error: '英雄不存在' },
        { status: 404 }
      );
    }
    
    // 验证资源类型
    const validTypes = ['image', 'video', 'audio', 'document'];
    if (!validTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: '无效的资源类型' },
        { status: 400 }
      );
    }
    
    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 生成文件名
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${heroId}_${timestamp}.${fileExtension}`;
    const filePath = `/uploads/hero-resources/${fileName}`;
    const fullPath = join(process.cwd(), 'public', filePath);
    
    // 确保目录存在
    const { mkdir } = await import('fs/promises');
    const dir = join(process.cwd(), 'public/uploads/hero-resources');
    await mkdir(dir, { recursive: true });
    
    await writeFile(fullPath, buffer);
    
    // 创建数据库记录
    const resource = await prisma.heroResource.create({
      data: {
        heroId,
        name,
        description: description || null,
        resourceType,
        filePath,
        fileSize: buffer.length,
        mimeType: file.type,
        displayOrder
      },
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true
          }
        }
      }
    });
    
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error('Error creating hero resource:', error);
    return NextResponse.json(
      { error: '创建英雄资源失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新英雄资源
export async function PUT(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const resourceType = formData.get('resourceType') as string;
    const file = formData.get('file') as File | null;
    const displayOrder = parseInt(formData.get('displayOrder') as string) || 0;
    const isActive = formData.get('isActive') === 'true';
    
    if (!id || !name || !resourceType) {
      return NextResponse.json(
        { error: '资源ID、名称和类型不能为空' },
        { status: 400 }
      );
    }
    
    // 检查资源是否存在
    const existingResource = await prisma.heroResource.findUnique({
      where: { id }
    });
    
    if (!existingResource) {
      return NextResponse.json(
        { error: '资源不存在' },
        { status: 404 }
      );
    }
    
    // 验证资源类型
    const validTypes = ['image', 'video', 'audio', 'document'];
    if (!validTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: '无效的资源类型' },
        { status: 400 }
      );
    }
    
    let filePath = existingResource.filePath;
    let fileSize = existingResource.fileSize;
    let mimeType = existingResource.mimeType;
    
    // 如果有新文件，处理文件更新
    if (file) {
      // 删除旧文件
      if (existingResource.filePath) {
        try {
          const oldFilePath = join(process.cwd(), 'public', existingResource.filePath);
          await unlink(oldFilePath);
        } catch (error) {
          console.warn('Failed to delete old file:', error);
        }
      }
      
      // 保存新文件
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${existingResource.heroId}_${timestamp}.${fileExtension}`;
      filePath = `/uploads/hero-resources/${fileName}`;
      const fullPath = join(process.cwd(), 'public', filePath);
      
      // 确保目录存在
      const { mkdir } = await import('fs/promises');
      const dir = join(process.cwd(), 'public/uploads/hero-resources');
      await mkdir(dir, { recursive: true });
      
      await writeFile(fullPath, buffer);
      
      fileSize = buffer.length;
      mimeType = file.type;
    }
    
    // 更新数据库记录
    const resource = await prisma.heroResource.update({
      where: { id },
      data: {
        name,
        description: description || null,
        resourceType,
        filePath,
        fileSize,
        mimeType,
        displayOrder,
        isActive
      },
      include: {
        hero: {
          select: {
            id: true,
            name: true,
            englishName: true
          }
        }
      }
    });
    
    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error updating hero resource:', error);
    return NextResponse.json(
      { error: '更新英雄资源失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除英雄资源
export async function DELETE(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '资源ID不能为空' },
        { status: 400 }
      );
    }
    
    // 检查资源是否存在
    const resource = await prisma.heroResource.findUnique({
      where: { id }
    });
    
    if (!resource) {
      return NextResponse.json(
        { error: '资源不存在' },
        { status: 404 }
      );
    }
    
    // 删除文件
    if (resource.filePath) {
      try {
        const filePath = join(process.cwd(), 'public', resource.filePath);
        await unlink(filePath);
      } catch (error) {
        console.warn('Failed to delete file:', error);
      }
    }
    
    // 删除数据库记录
    await prisma.heroResource.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: '资源删除成功' });
  } catch (error) {
    console.error('Error deleting hero resource:', error);
    return NextResponse.json(
      { error: '删除英雄资源失败' },
      { status: 500 }
    );
  }
}