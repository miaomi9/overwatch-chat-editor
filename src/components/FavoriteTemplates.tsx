'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { parseOverwatchCode } from '@/utils/overwatchCodeParser';
import { loadTexturesWithCache, type Texture } from '@/utils/textureCache';
import { createDebounce } from '@/utils/debounceThrottle';

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  overwatchCode: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    parent?: {
      id: string;
      name: string;
    };
  };
}

interface FavoriteTemplatesProps {
  onCopyCode: (code: string) => void;
  onShowDetails: (template: UserTemplate) => void;
  onLike: (templateId: string) => void;
  likedTemplates: Set<string>;
}

const FavoriteTemplates: React.FC<FavoriteTemplatesProps> = ({
  onCopyCode,
  onShowDetails,
  onLike,
  likedTemplates
}) => {
  const [favoriteTemplates, setFavoriteTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [templatePreviews, setTemplatePreviews] = useState<{ [key: string]: any[] }>({});
  const { showToast } = useGlobalToast();

  // 加载纹理数据
  useEffect(() => {
    const loadTextures = async () => {
      try {
        const texturesData = await loadTexturesWithCache();
        setTextures(texturesData);
      } catch (error) {
        console.error('Failed to load textures:', error);
      }
    };
    loadTextures();
  }, []);

  // 从localStorage加载收藏的模板
  const loadFavoriteTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const favoriteIds = JSON.parse(localStorage.getItem('favoriteTemplates') || '[]');
      if (favoriteIds.length === 0) {
        setFavoriteTemplates([]);
        setLoading(false);
        return;
      }

      // 批量获取收藏的模板详情
      const response = await fetch('/api/user-templates/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateIds: favoriteIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setFavoriteTemplates(data.templates || []);
      } else {
        // 如果API不存在，则清空收藏列表
        setFavoriteTemplates([]);
      }
    } catch (error) {
      console.error('Failed to load favorite templates:', error);
      setFavoriteTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavoriteTemplates();
  }, [loadFavoriteTemplates]);

  // 为每个模板生成预览元素
  const debouncedGeneratePreview = useCallback(
    createDebounce(async (template: UserTemplate) => {
      if (!template.overwatchCode || textures.length === 0) return;
      
      try {
        const preview = await parseOverwatchCode(template.overwatchCode, textures);
        setTemplatePreviews(prev => ({
          ...prev,
          [template.id]: preview
        }));
      } catch (error) {
        console.error('Failed to parse overwatch code for template:', template.id, error);
        setTemplatePreviews(prev => ({
          ...prev,
          [template.id]: []
        }));
      }
    }, 100),
    [textures]
  );

  useEffect(() => {
    if (textures.length === 0) return;
    
    favoriteTemplates.forEach(template => {
      if (!templatePreviews[template.id]) {
        debouncedGeneratePreview(template);
      }
    });
  }, [favoriteTemplates, textures, debouncedGeneratePreview, templatePreviews]);

  // 移除收藏
  const removeFavorite = (templateId: string) => {
    const favoriteIds = JSON.parse(localStorage.getItem('favoriteTemplates') || '[]');
    const updatedIds = favoriteIds.filter((id: string) => id !== templateId);
    localStorage.setItem('favoriteTemplates', JSON.stringify(updatedIds));
    setFavoriteTemplates(prev => prev.filter(template => template.id !== templateId));
    showToast('已取消收藏', 'success');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (favoriteTemplates.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-6xl mb-4">⭐</div>
        <div className="text-xl mb-2">暂无收藏的模板</div>
        <div className="text-gray-500 mt-4">
          在社区模板中点击收藏按钮来收藏喜欢的模板吧！
        </div>
        <div className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
          💡 收藏功能使用浏览器本地存储，换浏览器或清除缓存后收藏记录将丢失
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            共收藏 {favoriteTemplates.length} 个模板
          </div>
          <div className="text-xs text-gray-500">
            💡 收藏数据存储在浏览器本地，换浏览器或清除缓存后将丢失
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favoriteTemplates.map((template) => (
          <div key={template.id} className="bg-gray-800/50 border border-gray-600/50 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-200 group p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-orange-300 transition-colors truncate text-base">{template.name}</h3>
                {template.category && (
                  <div className="flex items-center gap-1 mt-2">
                    {template.category.parent && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded border border-blue-500/30">
                        {template.category.parent.name}
                      </span>
                    )}
                    <span className="inline-block px-2 py-1 text-xs bg-green-600/20 text-green-300 rounded border border-green-500/30">
                      {template.category.name}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => onLike(template.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors duration-200 ${
                    likedTemplates.has(template.id)
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                      : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill={likedTemplates.has(template.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {template.likesCount}
                </button>
                <button
                  onClick={() => removeFavorite(template.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-500/30 transition-colors duration-200"
                  title="取消收藏"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {template.description && (
              <p className="text-gray-300 text-sm mb-3 line-clamp-2">{template.description}</p>
            )}
            
            <div className="bg-gray-900/50 border border-gray-600/30 rounded p-3 mb-3 min-h-[120px] max-h-[120px] overflow-hidden">
              {templatePreviews[template.id] && templatePreviews[template.id].length > 0 ? (
                <div className="text-sm h-full overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1 h-full overflow-hidden">
                    {templatePreviews[template.id].slice(0, 20).map((element, index) => {
                      if (element.type === 'text') {
                        return (
                          <span key={index} className="text-white font-mono text-xs break-all">
                            {element.content}
                          </span>
                        );
                      } else if (element.type === 'color') {
                        return (
                          <span
                            key={index}
                            className="font-mono text-xs break-all"
                            style={{ color: element.color }}
                          >
                            {element.content.length > 15 ? element.content.substring(0, 15) + '...' : element.content}
                          </span>
                        );
                      } else if (element.type === 'texture' && element.texture) {
                        return (
                          <img
                            key={index}
                            src={element.texture.imagePath}
                            alt={element.texture.name}
                            className="w-5 h-5 inline-block flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                    {templatePreviews[template.id].length > 20 && (
                      <span className="text-gray-400 text-xs">...</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-xs h-full flex items-center justify-center">
                  预览加载中...
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
              <span>{formatDate(template.createdAt)}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => onCopyCode(template.overwatchCode)}
                className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                复制代码
              </button>
              <button
                onClick={() => onShowDetails(template)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                详情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoriteTemplates;