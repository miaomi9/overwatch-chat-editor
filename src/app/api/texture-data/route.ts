import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'src/data/textureData.json');

// 读取纹理数据
export async function GET() {
  try {
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading texture data:', error);
    return NextResponse.json(
      { error: 'Failed to read texture data' },
      { status: 500 }
    );
  }
}

// 更新纹理数据
export async function POST(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const { textureId, name, category } = await request.json();
    
    if (!textureId || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 读取现有数据
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    // 更新纹理数据
    data.textures[textureId] = {
      name,
      category
    };

    // 确保分类存在
    if (!data.categories.includes(category)) {
      data.categories.push(category);
      data.categories.sort();
    }

    // 写回文件
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // 更新文件修改时间以触发版本变更
    const now = new Date();
    fs.utimesSync(DATA_FILE_PATH, now, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating texture data:', error);
    return NextResponse.json(
      { error: 'Failed to update texture data' },
      { status: 500 }
    );
  }
}

// 批量更新纹理数据
export async function PUT(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const { textures, categories } = await request.json();
    
    const data = {
      textures: textures || {},
      categories: categories || []
    };

    // 写回文件
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // 更新文件修改时间以触发版本变更
    const now = new Date();
    fs.utimesSync(DATA_FILE_PATH, now, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error batch updating texture data:', error);
    return NextResponse.json(
      { error: 'Failed to batch update texture data' },
      { status: 500 }
    );
  }
}