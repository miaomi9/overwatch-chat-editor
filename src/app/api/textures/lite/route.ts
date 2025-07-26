import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

// 轻量级纹理数据缓存
let cachedLiteTextures: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

function getLiteTexturesList() {
  const now = Date.now();
  
  // 如果缓存存在且未过期，直接返回
  if (cachedLiteTextures && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedLiteTextures;
  }
  
  const texturesDir = path.join(process.cwd(), 'public', 'textures');
  
  // 检查目录是否存在
  if (!fs.existsSync(texturesDir)) {
    throw new Error('Textures directory not found');
  }

  // 读取目录中的所有文件
  const files = fs.readdirSync(texturesDir);
  
  // 过滤出PNG文件并生成轻量级纹理数据（只包含必要字段）
  const textures = files
    .filter(file => file.endsWith('.png'))
    .map(fileName => {
      const nameWithoutExt = fileName.replace('.png', '');
      return {
        id: nameWithoutExt,
        txCode: `<TXC00${nameWithoutExt}>`,
        // 不包含imagePath，减少数据量
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id)); // 按ID排序
  
  // 更新缓存
  cachedLiteTextures = textures;
  cacheTimestamp = now;
  
  return textures;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    
    // 获取所有轻量级纹理数据
    let textures = getLiteTexturesList();
    
    // 如果指定了特定ID，只返回这些纹理
    if (ids.length > 0) {
      textures = textures.filter(texture => ids.includes(texture.id));
      return NextResponse.json({ 
        textures,
        total: textures.length,
        page: 1,
        limit: textures.length,
        totalPages: 1
      });
    }
    
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      textures = textures.filter(texture => 
        texture.id.toLowerCase().includes(searchLower)
      );
    }
    
    const total = textures.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedTextures = textures.slice(startIndex, endIndex);
    
    const response = NextResponse.json({
      textures: paginatedTextures,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    });
    
    // 添加缓存头和压缩
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5分钟缓存
    response.headers.set('Content-Encoding', 'gzip');
    
    return response;
  } catch (error) {
    console.error('Error reading textures directory:', error);
    return NextResponse.json({ error: 'Failed to read textures' }, { status: 500 });
  }
}