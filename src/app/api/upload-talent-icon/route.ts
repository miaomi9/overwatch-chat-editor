import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('icon') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '没有找到上传的文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 格式的图片' },
        { status: 400 }
      );
    }

    // 验证文件大小 (限制为 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 2MB' },
        { status: 400 }
      );
    }

    // 从表单数据中获取天赋信息
    const talentId = formData.get('talentId') as string;
    const talentType = formData.get('talentType') as string;
    const timestamp = Date.now();
    
    // 获取文件扩展名
    const fileExtension = file.name.split('.').pop() || 'png';
    
    // 生成文件名：天赋ID+类型+时间戳
    const fileName = `${talentId || 'new'}_${talentType || 'skill'}_${timestamp}.${fileExtension}`;
    
    // 确保目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'talent-icons');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);
    
    // 返回相对路径
    const relativePath = `/talent-icons/${fileName}`;
    
    return NextResponse.json({
      success: true,
      path: relativePath,
      message: '图标上传成功'
    });
    
  } catch (error) {
    console.error('上传图标时出错:', error);
    return NextResponse.json(
      { error: '上传失败，请重试' },
      { status: 500 }
    );
  }
}