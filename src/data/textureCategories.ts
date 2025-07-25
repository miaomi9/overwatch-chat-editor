// 从textureNames导入缓存相关函数
import { initTextureData } from './textureNames';

// 纹理数据缓存
let textureDataCache: { textures: Record<string, { name: string; category: string }>; categories: string[] } | null = null;

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
  return { textures: {}, categories: ['未分类'] };
};

// 纹理分类映射（同步版本，用于已缓存的数据）
export const textureCategories: Record<string, string> = {};

// 获取纹理分类
export const getTextureCategory = (textureId: string): string => {
  if (textureDataCache && textureDataCache.textures[textureId]) {
    const category = textureDataCache.textures[textureId].category;
    // 如果分类为空或未设置，归入未分类
    return category && category.trim() !== '' ? category : '未分类';
  }
  // 没有任何数据关联的纹理文件，归入未分类
  return '未分类';
};

// 异步获取纹理分类
export const getTextureCategoryAsync = async (textureId: string): Promise<string> => {
  const data = await getTextureData();
  if (data && data.textures[textureId]) {
    const category = data.textures[textureId].category;
    // 如果分类为空或未设置，归入未分类
    return category && category.trim() !== '' ? category : '未分类';
  }
  // 没有任何数据关联的纹理文件，归入未分类
  return '未分类';
};

// 获取所有分类
export const getAllCategories = (): string[] => {
  if (textureDataCache && textureDataCache.categories) {
    return textureDataCache.categories;
  }
  return ['未分类'];
};

// 异步获取所有分类
export const getAllCategoriesAsync = async (): Promise<string[]> => {
  const data = await getTextureData();
  if (data && data.categories) {
    return data.categories;
  }
  return ['未分类'];
};

// 根据分类筛选纹理
export const getTexturesByCategory = (textureIds: string[], category: string): string[] => {
  if (category === '全部') return textureIds;
  
  return textureIds.filter(id => {
    const textureCategory = getTextureCategory(id);
    return textureCategory === category;
  });
};

// 根据分类获取纹理列表
export const getTextureListByCategory = (category: string): string[] => {
  if (!textureDataCache) return [];
  
  if (category === '全部') {
    return Object.keys(textureDataCache.textures);
  }
  
  if (category === '未分类') {
    // 未分类包含：1）没有分类或分类为空的纹理，2）没有任何数据关联的纹理文件
    return Object.entries(textureDataCache.textures)
      .filter(([, info]) => !info.category || info.category.trim() === '')
      .map(([id]) => id);
  }
  
  return Object.entries(textureDataCache.textures)
    .filter(([, info]) => info.category === category)
    .map(([id]) => id);
};

// 初始化分类数据缓存
export const initCategoryData = async () => {
  await getTextureData();
};

// 清除缓存（用于数据更新后）
export const clearCategoryDataCache = () => {
  textureDataCache = null;
};