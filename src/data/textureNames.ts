// 纹理数据缓存
let textureDataCache: { textures: Record<string, { name: string; category: string }> } | null = null;

// 获取纹理数据
const getTextureData = async () => {
  if (textureDataCache) {
    return textureDataCache;
  }
  
  try {
    const response = await fetch('/api/texture-data');
    if (response.ok) {
      textureDataCache = await response.json();
      return textureDataCache;
    }
  } catch (error) {
    console.error('Failed to load texture data:', error);
  }
  
  // 返回空数据作为后备
  return { textures: {} };
};

// 纹理ID到名称的映射（同步版本，用于已缓存的数据）
export const textureNames: Record<string, string> = {};

// 获取纹理显示名称
export const getTextureName = (textureId: string): string => {
  if (textureDataCache && textureDataCache.textures[textureId]) {
    return textureDataCache.textures[textureId].name;
  }
  return textureId;
};

// 异步获取纹理显示名称
export const getTextureNameAsync = async (textureId: string): Promise<string> => {
  const data = await getTextureData();
  if (data && data.textures[textureId]) {
    return data.textures[textureId].name;
  }
  return textureId;
};

// 搜索纹理（包括名称）
export const searchTexturesByName = (searchTerm: string): string[] => {
  if (!searchTerm || !textureDataCache) return [];
  
  const term = searchTerm.toLowerCase();
  return Object.entries(textureDataCache.textures)
    .filter(([id, info]) => 
      id.toLowerCase().includes(term) || 
      info.name.toLowerCase().includes(term)
    )
    .map(([id]) => id);
};

// 初始化纹理数据缓存
export const initTextureData = async () => {
  await getTextureData();
};

// 清除缓存（用于数据更新后）
export const clearTextureDataCache = () => {
  textureDataCache = null;
};