// 纹理数据缓存管理工具

export interface Texture {
  id: string;
  fileName: string;
  imagePath: string;
  txCode: string;
  name: string;
  category: string;
}

// 缓存配置
const TEXTURE_CACHE_KEY = 'overwatch_textures_cache';
const TEXTURE_CACHE_EXPIRY_KEY = 'overwatch_textures_cache_expiry';
const TEXTURE_CACHE_VERSION_KEY = 'overwatch_textures_cache_version';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

// 内存缓存
let texturesCache: Texture[] | null = null;

// 从localStorage获取缓存的纹理数据
export const getCachedTextures = async (): Promise<Texture[] | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cachedData = localStorage.getItem(TEXTURE_CACHE_KEY);
    const cacheExpiry = localStorage.getItem(TEXTURE_CACHE_EXPIRY_KEY);
    const cachedVersion = localStorage.getItem(TEXTURE_CACHE_VERSION_KEY);
    
    if (cachedData && cacheExpiry && cachedVersion) {
      const expiryTime = parseInt(cacheExpiry);
      const now = Date.now();
      
      // 检查缓存是否过期
      if (now < expiryTime) {
        // 检查服务器版本是否有更新
        try {
          const versionResponse = await fetch('/api/texture-data/version');
          if (versionResponse.ok) {
            const { version: serverVersion } = await versionResponse.json();
            
            // 如果版本不匹配，清除缓存
            if (serverVersion !== cachedVersion) {
              console.log('检测到服务器数据更新，清除旧缓存');
              clearTextureCache();
              return null;
            }
          }
        } catch (error) {
          // 如果无法获取版本信息，继续使用缓存
          console.warn('无法检查服务器版本，继续使用本地缓存:', error);
        }
        
        const parsedData = JSON.parse(cachedData);
        // 同时更新内存缓存
        texturesCache = parsedData;
        return parsedData;
      } else {
        // 缓存过期，清除
        clearTextureCache();
      }
    }
  } catch (error) {
    console.error('Error reading texture cache:', error);
    // 清除损坏的缓存
    clearTextureCache();
  }
  
  return null;
};

// 将纹理数据保存到localStorage
export const setCachedTextures = (textures: Texture[], version?: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const expiryTime = Date.now() + CACHE_DURATION;
    localStorage.setItem(TEXTURE_CACHE_KEY, JSON.stringify(textures));
    localStorage.setItem(TEXTURE_CACHE_EXPIRY_KEY, expiryTime.toString());
    if (version) {
      localStorage.setItem(TEXTURE_CACHE_VERSION_KEY, version);
    }
    // 同时更新内存缓存
    texturesCache = textures;
    console.log('纹理数据已缓存到本地存储');
  } catch (error) {
    console.error('Error saving texture cache:', error);
  }
};

// 清除纹理缓存
export const clearTextureCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(TEXTURE_CACHE_KEY);
    localStorage.removeItem(TEXTURE_CACHE_EXPIRY_KEY);
    localStorage.removeItem(TEXTURE_CACHE_VERSION_KEY);
    texturesCache = null;
    console.log('纹理缓存已清除');
  } catch (error) {
    console.error('Error clearing texture cache:', error);
  }
};

// 获取内存缓存
export const getMemoryCache = (): Texture[] | null => {
  return texturesCache;
};

// 设置内存缓存
export const setMemoryCache = (textures: Texture[]) => {
  texturesCache = textures;
};

// 分页加载纹理数据
export const loadTexturesPage = async (page: number = 1, limit: number = 50): Promise<{
  textures: Texture[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}> => {
  try {
    const texturesResponse = await fetch(`/api/textures?page=${page}&limit=${limit}`);
    const texturesData = await texturesResponse.json();
    
    // 加载纹理数据
    const dataResponse = await fetch('/api/texture-data');
    const data = await dataResponse.json();
    
    // 合并数据
    const mergedTextures = texturesData.textures.map((texture: any) => {
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
    
    return {
      textures: mergedTextures,
      total: texturesData.total,
      page: texturesData.page,
      totalPages: texturesData.totalPages,
      hasMore: texturesData.hasMore
    };
  } catch (error) {
    console.error('Failed to load textures page:', error);
    throw error;
  }
};

// 按需加载特定纹理
export const loadSpecificTextures = async (textureIds: string[]): Promise<Texture[]> => {
  if (textureIds.length === 0) return [];
  
  try {
    const idsParam = textureIds.join(',');
    const texturesResponse = await fetch(`/api/textures?ids=${idsParam}`);
    const texturesData = await texturesResponse.json();
    
    // 加载纹理数据
    const dataResponse = await fetch('/api/texture-data');
    const data = await dataResponse.json();
    
    // 合并数据
    const mergedTextures = texturesData.textures.map((texture: any) => {
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
    
    return mergedTextures;
  } catch (error) {
    console.error('Failed to load specific textures:', error);
    throw error;
  }
};

// 加载纹理数据（带缓存，优化版本）
export const loadTexturesWithCache = async (options: {
  useCache?: boolean;
  pageSize?: number;
  loadAll?: boolean;
} = {}): Promise<Texture[]> => {
  const { useCache = true, pageSize = 100, loadAll = false } = options;
  
  // 优先检查内存缓存
  if (useCache && texturesCache) {
    console.log('使用内存缓存的纹理数据');
    return texturesCache;
  }
  
  // 检查localStorage缓存
  if (useCache) {
    const cachedTextures = await getCachedTextures();
    if (cachedTextures && cachedTextures.length > 0) {
      console.log('使用本地缓存的纹理数据，避免重复请求服务器');
      return cachedTextures;
    }
  }
  
  console.log('正在从服务器获取纹理信息，请稍候...');
  
  try {
    let allTextures: Texture[] = [];
    
    if (loadAll) {
      // 分页加载所有纹理
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const pageData = await loadTexturesPage(page, pageSize);
        allTextures.push(...pageData.textures);
        hasMore = pageData.hasMore;
        page++;
        
        // 避免无限循环
        if (page > 100) {
          console.warn('达到最大页数限制，停止加载');
          break;
        }
      }
    } else {
      // 只加载第一页
      const pageData = await loadTexturesPage(1, pageSize);
      allTextures = pageData.textures;
    }
    
    // 获取数据版本并缓存
    if (useCache && loadAll) {
      let version = Date.now().toString();
      try {
        const versionResponse = await fetch('/api/texture-data/version');
        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          version = versionData.version;
        }
      } catch (error) {
        console.warn('无法获取数据版本，使用时间戳作为版本');
      }
      
      setCachedTextures(allTextures, version);
      console.log('纹理数据加载完成并已缓存');
    }
    
    return allTextures;
  } catch (error) {
    console.error('Failed to load textures:', error);
    throw error;
  }
};

// 快速加载纹理列表（轻量级，只包含ID和txCode）
export const loadTexturesLite = async (page: number = 1, limit: number = 100): Promise<{
  textures: { id: string; txCode: string }[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}> => {
  try {
    const response = await fetch(`/api/textures/lite?page=${page}&limit=${limit}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load lite textures:', error);
    throw error;
  }
};

// 快速初始化（只加载基本纹理信息）
export const quickLoadTextures = async (): Promise<Texture[]> => {
  // 优先检查内存缓存
  if (texturesCache) {
    console.log('使用内存缓存的纹理数据');
    return texturesCache;
  }
  
  // 检查localStorage缓存
  const cachedTextures = await getCachedTextures();
  if (cachedTextures && cachedTextures.length > 0) {
    console.log('使用本地缓存的纹理数据');
    return cachedTextures;
  }
  
  console.log('快速加载纹理基本信息...');
  
  try {
    // 使用轻量级API快速获取纹理列表
    const liteData = await loadTexturesLite(1, 200); // 加载前200个
    
    // 转换为完整的纹理对象（暂时不包含详细信息）
    const quickTextures: Texture[] = liteData.textures.map(texture => ({
      id: texture.id,
      fileName: `${texture.id}.png`,
      imagePath: `/textures/${texture.id}.png`,
      txCode: texture.txCode,
      name: texture.id, // 暂时使用ID作为名称
      category: '未分类' // 默认分类
    }));
    
    // 设置内存缓存（不设置localStorage，因为这是不完整的数据）
    setMemoryCache(quickTextures);
    
    console.log(`快速加载完成，获取到 ${quickTextures.length} 个纹理`);
    
    // 后台异步加载完整数据
    setTimeout(async () => {
      try {
        console.log('后台加载完整纹理数据...');
        const fullTextures = await loadTexturesWithCache({ 
          useCache: false, 
          loadAll: true,
          pageSize: 100 
        });
        console.log('后台加载完成');
      } catch (error) {
        console.error('后台加载失败:', error);
      }
    }, 1000);
    
    return quickTextures;
  } catch (error) {
    console.error('快速加载失败，回退到常规加载:', error);
    // 回退到常规加载
    return loadTexturesWithCache({ loadAll: false, pageSize: 50 });
  }
};

// 搜索纹理
export const searchTextures = async (query: string, limit: number = 20): Promise<Texture[]> => {
  try {
    const texturesResponse = await fetch(`/api/textures?search=${encodeURIComponent(query)}&limit=${limit}`);
    const texturesData = await texturesResponse.json();
    
    // 加载纹理数据
    const dataResponse = await fetch('/api/texture-data');
    const data = await dataResponse.json();
    
    // 合并数据
    const mergedTextures = texturesData.textures.map((texture: any) => {
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
    
    return mergedTextures;
  } catch (error) {
    console.error('Failed to search textures:', error);
    throw error;
  }
};

// 获取缓存状态信息
export const getCacheInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const cacheExpiry = localStorage.getItem(TEXTURE_CACHE_EXPIRY_KEY);
  const cachedData = localStorage.getItem(TEXTURE_CACHE_KEY);
  const cachedVersion = localStorage.getItem(TEXTURE_CACHE_VERSION_KEY);
  
  return {
    hasMemoryCache: texturesCache !== null,
    hasLocalStorageCache: !!(cacheExpiry && cachedData),
    lastUpdated: cacheExpiry ? new Date(parseInt(cacheExpiry) - CACHE_DURATION) : null,
    version: cachedVersion,
    dataSize: cachedData ? new Blob([cachedData]).size : 0
  };
};