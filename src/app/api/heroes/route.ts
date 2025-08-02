import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

// GET - 获取所有英雄
export async function GET() {
  try {
    const heroes = await prisma.hero.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ heroes });
  } catch (error) {
    console.error('Error fetching heroes:', error);
    return NextResponse.json(
      { error: '获取英雄列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新英雄
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
    const name = formData.get('name') as string;
    const englishName = formData.get('englishName') as string;
    const avatar = formData.get('avatar') as File | null;
    const extensions = formData.get('extensions') as string;
    
    if (!name || !englishName) {
      return NextResponse.json(
        { error: '英雄名称和英文名称不能为空' },
        { status: 400 }
      );
    }
    
    // 检查英文名称是否已存在
    const existingHero = await prisma.hero.findUnique({
      where: { englishName }
    });
    
    if (existingHero) {
      return NextResponse.json(
        { error: '英文名称已存在' },
        { status: 400 }
      );
    }
    
    let avatarPath = null;
    
    // 处理头像上传
    if (avatar && avatar.size > 0) {
      const bytes = await avatar.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // 生成文件名：英文名称+日期
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileExtension = avatar.name.split('.').pop() || 'png';
      const fileName = `${englishName}_${date}.${fileExtension}`;
      
      const heroDir = join(process.cwd(), 'public', 'hero');
      const filePath = join(heroDir, fileName);
      
      await writeFile(filePath, buffer);
      avatarPath = `/hero/${fileName}`;
    }
    
    // 解析扩展字段
    let parsedExtensions = null;
    if (extensions) {
      try {
        parsedExtensions = JSON.parse(extensions);
      } catch (error) {
        return NextResponse.json(
          { error: '扩展字段格式错误，请输入有效的JSON' },
          { status: 400 }
        );
      }
    }
    
    const hero = await prisma.hero.create({
      data: {
        name,
        englishName,
        avatar: avatarPath,
        extensions: parsedExtensions
      }
    });
    
    return NextResponse.json({ hero });
  } catch (error) {
    console.error('Error creating hero:', error);
    return NextResponse.json(
      { error: '创建英雄失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新英雄
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
    const englishName = formData.get('englishName') as string;
    const avatar = formData.get('avatar') as File | null;
    const extensions = formData.get('extensions') as string;
    const removeAvatar = formData.get('removeAvatar') === 'true';
    
    if (!id || !name || !englishName) {
      return NextResponse.json(
        { error: '英雄ID、名称和英文名称不能为空' },
        { status: 400 }
      );
    }
    
    // 检查英雄是否存在
    const existingHero = await prisma.hero.findUnique({
      where: { id }
    });
    
    if (!existingHero) {
      return NextResponse.json(
        { error: '英雄不存在' },
        { status: 404 }
      );
    }
    
    // 检查英文名称是否被其他英雄使用
    if (englishName !== existingHero.englishName) {
      const duplicateHero = await prisma.hero.findUnique({
        where: { englishName }
      });
      
      if (duplicateHero) {
        return NextResponse.json(
          { error: '英文名称已被其他英雄使用' },
          { status: 400 }
        );
      }
    }
    
    let avatarPath = existingHero.avatar;
    
    // 处理头像删除
    if (removeAvatar && existingHero.avatar) {
      try {
        const oldAvatarPath = join(process.cwd(), 'public', existingHero.avatar);
        await unlink(oldAvatarPath);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error);
      }
      avatarPath = null;
    }
    
    // 处理新头像上传
    if (avatar && avatar.size > 0) {
      // 删除旧头像
      if (existingHero.avatar) {
        try {
          const oldAvatarPath = join(process.cwd(), 'public', existingHero.avatar);
          await unlink(oldAvatarPath);
        } catch (error) {
          console.warn('Failed to delete old avatar:', error);
        }
      }
      
      const bytes = await avatar.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // 生成文件名：英文名称+日期
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileExtension = avatar.name.split('.').pop() || 'png';
      const fileName = `${englishName}_${date}.${fileExtension}`;
      
      const heroDir = join(process.cwd(), 'public', 'hero');
      const filePath = join(heroDir, fileName);
      
      await writeFile(filePath, buffer);
      avatarPath = `/hero/${fileName}`;
    }
    
    // 解析扩展字段
    let parsedExtensions = null;
    if (extensions) {
      try {
        parsedExtensions = JSON.parse(extensions);
      } catch (error) {
        return NextResponse.json(
          { error: '扩展字段格式错误，请输入有效的JSON' },
          { status: 400 }
        );
      }
    }
    
    const hero = await prisma.hero.update({
      where: { id },
      data: {
        name,
        englishName,
        avatar: avatarPath,
        extensions: parsedExtensions
      }
    });
    
    return NextResponse.json({ hero });
  } catch (error) {
    console.error('Error updating hero:', error);
    return NextResponse.json(
      { error: '更新英雄失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除英雄
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
        { error: '英雄ID不能为空' },
        { status: 400 }
      );
    }
    
    // 检查英雄是否存在
    const existingHero = await prisma.hero.findUnique({
      where: { id }
    });
    
    if (!existingHero) {
      return NextResponse.json(
        { error: '英雄不存在' },
        { status: 404 }
      );
    }
    
    // 删除头像文件
    if (existingHero.avatar) {
      try {
        const avatarPath = join(process.cwd(), 'public', existingHero.avatar);
        await unlink(avatarPath);
      } catch (error) {
        console.warn('Failed to delete avatar file:', error);
      }
    }
    
    await prisma.hero.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: '英雄删除成功' });
  } catch (error) {
    console.error('Error deleting hero:', error);
    return NextResponse.json(
      { error: '删除英雄失败' },
      { status: 500 }
    );
  }
}