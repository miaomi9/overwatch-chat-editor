// 守望先锋代码解析工具

interface Texture {
  id: string;
  fileName: string;
  imagePath: string;
  txCode: string;
  name: string;
  category: string;
}

interface Element {
  id: string;
  type: 'text' | 'color' | 'gradient' | 'texture';
  content?: string;
  color?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientOpacity?: number;
  texture?: Texture;
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// 将RGB转换为十六进制
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// 解析守望先锋代码为元素数组
export const parseOverwatchCode = async (code: string, existingTextures?: Texture[]): Promise<Element[]> => {
  const elements: Element[] = [];
  
  // 使用传入的纹理数据，如果没有则请求
  let textures: Texture[] = existingTextures || [];
  
  // 只有在没有传入纹理数据时才请求
  if (!existingTextures || existingTextures.length === 0) {
    try {
      const texturesResponse = await fetch('/api/textures');
      const texturesData = await texturesResponse.json();
      
      const dataResponse = await fetch('/api/texture-data');
      const data = await dataResponse.json();
      
      textures = texturesData.textures.map((texture: any) => {
        const info = data.textures[texture.fileName.replace('.png', '')] || {
          name: texture.fileName.replace('.png', ''),
          category: '未分类'
        };
        
        return {
          id: texture.fileName.replace('.png', ''),
          fileName: texture.fileName,
          imagePath: texture.imagePath,
          txCode: texture.txCode,
          name: info.name,
          category: info.category
        };
      });
    } catch (error) {
      console.error('Failed to load textures for parsing:', error);
    }
  }
  
  // 正则表达式匹配不同类型的代码
  const patterns = {
    // 匹配颜色代码 <FG + 8位十六进制>
    color: /<FG([0-9A-Fa-f]{8})>/g,
    // 匹配纹理代码 <TXC + 十六进制字符>
    texture: /<TXC([0-9A-Fa-f]+)>/g,
    // 匹配其他标签（暂时忽略）
    other: /<[^>]+>/g
  };
  
  let currentIndex = 0;
  let currentColor: string | null = null;
  
  // 分割代码为标签和文本片段
  const parts = code.split(/(<[^>]*>)/);
  
  for (const part of parts) {
    if (!part) continue;
    
    // 检查是否是标签
    if (part.startsWith('<') && part.endsWith('>')) {
      // 处理颜色标签
      const colorMatch = part.match(/<FG([0-9A-Fa-f]{8})>/);
      if (colorMatch) {
        const hexColor = colorMatch[1];
        // 提取RGB值（忽略Alpha通道）
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        currentColor = rgbToHex(r, g, b);
        continue;
      }
      
      // 处理纹理标签
      const textureMatch = part.match(/<TXC([0-9A-Fa-f]+)>/);
      if (textureMatch) {
        const textureId = textureMatch[1];
        // 查找匹配的纹理，先尝试完全匹配
        let texture = textures.find(t => t.txCode === part);
        
        // 如果没找到，尝试去掉前导零匹配
        if (!texture) {
          // 去掉前导零，保留最后的十六进制部分
          const cleanId = textureId.replace(/^0+/, '');
          const alternativeCode = `<TXC00${cleanId}>`;
          texture = textures.find(t => t.txCode === alternativeCode);
        }
        
        // 如果还是没找到，尝试直接用ID匹配
        if (!texture) {
          const cleanId = textureId.replace(/^0+/, '');
          texture = textures.find(t => t.id === cleanId);
        }
        
        if (texture) {
          elements.push({
            id: generateId(),
            type: 'texture',
            texture: texture
          });
        } else {
          // 如果找不到纹理，作为文本处理
          console.log(`Texture not found for code: ${part}, textureId: ${textureId}`);
          elements.push({
            id: generateId(),
            type: 'text',
            content: part
          });
        }
        continue;
      }
      
      // 其他标签暂时忽略或作为文本处理
      continue;
    } else {
      // 处理文本内容
      if (part.trim()) {
        if (currentColor) {
          // 有颜色的文本
          elements.push({
            id: generateId(),
            type: 'color',
            content: part,
            color: currentColor
          });
        } else {
          // 普通文本
          elements.push({
            id: generateId(),
            type: 'text',
            content: part
          });
        }
      }
    }
  }
  
  return elements;
};

// 检查文本是否包含守望先锋代码
export const containsOverwatchCode = (text: string): boolean => {
  const patterns = [
    /<FG[0-9A-Fa-f]{8}>/,  // 颜色代码
    /<TXC[0-9A-Fa-f]+>/,   // 纹理代码
    /<[^>]+>/              // 其他标签
  ];
  
  return patterns.some(pattern => pattern.test(text));
};