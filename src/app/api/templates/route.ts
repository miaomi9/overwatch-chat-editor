import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMPLATES_FILE_PATH = path.join(process.cwd(), 'src/data/templates.json');

interface TemplateElement {
  id: string;
  type: 'text' | 'color' | 'gradient' | 'texture';
  content?: string;
  color?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  texture?: {
    id: string;
    imagePath: string;
    txCode: string;
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  elements: TemplateElement[];
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesData {
  templates: Record<string, Template>;
  categories: string[];
}

// 读取模板数据
export async function GET() {
  try {
    const fileContent = fs.readFileSync(TEMPLATES_FILE_PATH, 'utf-8');
    const data: TemplatesData = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading templates data:', error);
    return NextResponse.json(
      { error: 'Failed to read templates data' },
      { status: 500 }
    );
  }
}

// 创建新模板
export async function POST(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const { name, description, elements, category } = await request.json();
    
    if (!name || !description || !elements || !Array.isArray(elements)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证字符长度限制
    if (name.length > 100) {
      return NextResponse.json(
        { error: '模板名称不能超过100个字符' },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: '模板描述不能超过500个字符' },
        { status: 400 }
      );
    }

    // 验证元素中的文本内容长度
    for (const element of elements) {
      if (element.content && element.content.length > 1000) {
        return NextResponse.json(
          { error: '元素内容不能超过1000个字符' },
          { status: 400 }
        );
      }
    }

    // 读取现有数据
    const fileContent = fs.readFileSync(TEMPLATES_FILE_PATH, 'utf-8');
    const data: TemplatesData = JSON.parse(fileContent);

    // 生成新的模板ID
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // 创建新模板
    const newTemplate: Template = {
      id: templateId,
      name,
      description,
      elements,
      category: category || '其他',
      createdAt: now,
      updatedAt: now
    };

    // 添加到数据中
    data.templates[templateId] = newTemplate;

    // 确保分类存在
    if (category && !data.categories.includes(category)) {
      data.categories.push(category);
      data.categories.sort();
    }

    // 写回文件
    fs.writeFileSync(TEMPLATES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(request: NextRequest) {
  // 生产环境禁止访问
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不允许此操作' },
      { status: 403 }
    );
  }
  
  try {
    const { id, name, description, elements, category } = await request.json();
    
    if (!id || !name || !description || !elements || !Array.isArray(elements)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证字符长度限制
    if (name.length > 100) {
      return NextResponse.json(
        { error: '模板名称不能超过100个字符' },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: '模板描述不能超过500个字符' },
        { status: 400 }
      );
    }

    // 验证元素中的文本内容长度
    for (const element of elements) {
      if (element.content && element.content.length > 1000) {
        return NextResponse.json(
          { error: '元素内容不能超过1000个字符' },
          { status: 400 }
        );
      }
    }

    // 读取现有数据
    const fileContent = fs.readFileSync(TEMPLATES_FILE_PATH, 'utf-8');
    const data: TemplatesData = JSON.parse(fileContent);

    // 检查模板是否存在
    if (!data.templates[id]) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // 更新模板
    const updatedTemplate: Template = {
      ...data.templates[id],
      name,
      description,
      elements,
      category: category || data.templates[id].category || '其他',
      updatedAt: new Date().toISOString()
    };

    data.templates[id] = updatedTemplate;

    // 确保分类存在
    if (category && !data.categories.includes(category)) {
      data.categories.push(category);
      data.categories.sort();
    }

    // 写回文件
    fs.writeFileSync(TEMPLATES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// 删除模板
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
    const templateId = searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // 读取现有数据
    const fileContent = fs.readFileSync(TEMPLATES_FILE_PATH, 'utf-8');
    const data: TemplatesData = JSON.parse(fileContent);

    // 检查模板是否存在
    if (!data.templates[templateId]) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // 删除模板
    delete data.templates[templateId];

    // 写回文件
    fs.writeFileSync(TEMPLATES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}