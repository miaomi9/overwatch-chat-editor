import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const texturesDir = path.join(process.cwd(), 'public', 'textures');
    
    // 检查目录是否存在
    if (!fs.existsSync(texturesDir)) {
      return NextResponse.json({ error: 'Textures directory not found' }, { status: 404 });
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(texturesDir);
    
    // 过滤出PNG文件并生成纹理数据
    const textures = files
      .filter(file => file.endsWith('.png'))
      .map(fileName => {
        const nameWithoutExt = fileName.replace('.png', '');
        return {
          id: nameWithoutExt,
          txCode: `<TXC00${nameWithoutExt}>`,
          imagePath: `/textures/${fileName}`,
          fileName
        };
      })
      .sort((a, b) => a.fileName.localeCompare(b.fileName)); // 按文件名排序

    return NextResponse.json({ textures });
  } catch (error) {
    console.error('Error reading textures directory:', error);
    return NextResponse.json({ error: 'Failed to read textures' }, { status: 500 });
  }
}