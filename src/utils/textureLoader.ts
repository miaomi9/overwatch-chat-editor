import { getTextureCategory } from '../data/textureCategories';

export interface Texture {
  id: string;
  txCode: string;
  imagePath: string;
  fileName: string;
  category: string;
}

// 从文件名生成TXC表达式
export const generateTxCode = (fileName: string): string => {
  // 移除.png扩展名
  const nameWithoutExt = fileName.replace('.png', '');
  // 在前面补两个0，然后加上TXC和括号
  return `<TXC00${nameWithoutExt}>`;
};

// 通过API获取真实的纹理文件列表
export const getAvailableTextures = async (): Promise<Texture[]> => {
  try {
    const response = await fetch('/api/textures');
    if (!response.ok) {
      throw new Error('Failed to fetch textures');
    }
    
    const data = await response.json();
    return data.textures.map((texture: any) => ({
      id: texture.fileName.replace('.png', ''),
      txCode: texture.txCode,
      imagePath: texture.imagePath,
      fileName: texture.fileName,
      category: getTextureCategory(texture.fileName.replace('.png', ''))
    }));
  } catch (error) {
    console.error('Error fetching textures:', error);
    return [];
  }
};

// 根据文件名搜索纹理
export const searchTextures = (textures: Texture[], searchTerm: string): Texture[] => {
  if (!searchTerm) return textures;
  
  const term = searchTerm.toLowerCase();
  return textures.filter(texture => 
    texture.id.toLowerCase().includes(term) ||
    texture.txCode.toLowerCase().includes(term)
  );
};