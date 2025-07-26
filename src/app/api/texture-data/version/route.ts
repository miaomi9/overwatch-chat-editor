import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取纹理数据版本信息
export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'src/data/textureData.json');
    
    // 获取文件的最后修改时间作为版本号
    const stats = fs.statSync(dataPath);
    const version = stats.mtime.getTime().toString();
    
    return NextResponse.json({
      version,
      lastModified: stats.mtime.toISOString()
    });
  } catch (error) {
    console.error('Error getting texture data version:', error);
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    );
  }
}