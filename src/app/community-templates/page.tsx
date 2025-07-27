'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { parseOverwatchCode } from '@/utils/overwatchCodeParser';
import { loadTexturesWithCache, type Texture } from '@/utils/textureCache';
import { createApiThrottle, createDebounce } from '@/utils/debounceThrottle';

// 动态导入组件
const TemplateDetailModal = dynamic(
  () => import('@/components/TemplateDetailModal'),
  { ssr: false, loading: () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  )}
);

const Preview = dynamic(() => import('@/components/Preview'), { ssr: false });

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  overwatchCode: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  overwatchCode: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

const CommunityTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likesCount'>('likesCount');

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likedTemplates, setLikedTemplates] = useState<Set<string>>(new Set());
  const [textures, setTextures] = useState<Texture[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<UserTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useGlobalToast();

  const limit = 12; // 增加每页显示数量

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

  // 为每个模板生成预览元素
  const [templatePreviews, setTemplatePreviews] = useState<{ [key: string]: any[] }>({});

  // 使用防抖优化预览生成
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
    
    templates.forEach(template => {
      if (!templatePreviews[template.id]) {
        debouncedGeneratePreview(template);
      }
    });
  }, [templates, textures, debouncedGeneratePreview, templatePreviews]);

  const fetchTemplates = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setTemplates([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const currentLength = reset ? 0 : templates.length;
      const params = new URLSearchParams({
        page: (Math.floor(currentLength / limit) + 1).toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy,
        order: 'desc',
      });

      const response = await fetch(`/api/user-templates?${params}&includeLikeStatus=true`);
      if (!response.ok) {
        throw new Error('获取模板失败');
      }

      const data = await response.json();
      
      if (reset) {
        setTemplates(data.templates);
      } else {
        setTemplates(prev => [...prev, ...data.templates]);
      }
      
      // 检查是否还有更多数据
      setHasMore(data.templates.length === limit);

      // 更新点赞状态
      const newLikedTemplates = new Set<string>();
      data.templates.forEach((template: UserTemplate & { liked: boolean }) => {
        if (template.liked) newLikedTemplates.add(template.id);
      });
      setLikedTemplates(newLikedTemplates);
    } catch (error) {
      console.error('获取模板失败:', error);
      showToast('获取模板失败', 'error');
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // 搜索防抖
  const debouncedSetSearchTerm = useCallback(
    createDebounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  useEffect(() => {
    fetchTemplates(true);
  }, [debouncedSearchTerm, sortBy]);

  // 加载更多按钮
  const handleLoadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      fetchTemplates(false);
    }
  };

  // 实际的点赞操作函数
  const performLike = useCallback(async (templateId: string) => {
    try {
      const response = await fetch(`/api/user-templates/${templateId}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('点赞操作失败');
      }

      const data = await response.json();
      
      // 更新本地状态
      setLikedTemplates(prev => {
        const newSet = new Set(prev);
        if (data.liked) {
          newSet.add(templateId);
        } else {
          newSet.delete(templateId);
        }
        return newSet;
      });

      // 更新模板的点赞数
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, likesCount: template.likesCount + (data.liked ? 1 : -1) }
          : template
      ));

      // 如果模态框打开且是当前模板，也更新模态框中的模板数据
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(prev => prev ? {
          ...prev,
          likesCount: prev.likesCount + (data.liked ? 1 : -1)
        } : null);
      }

      showToast(data.message, 'success');
    } catch (error) {
      console.error('点赞操作失败:', error);
      showToast('点赞操作失败', 'error');
    }
  }, [setLikedTemplates, setTemplates, showToast, selectedTemplate]);

  // 防抖的点赞函数
  const throttledLike = useCallback(createApiThrottle(performLike, 1000), [performLike]);

  const handleLike = (templateId: string) => {
    throttledLike(templateId);
  };

  const handleCopyCode = async (overwatchCode: string) => {
    try {
      await navigator.clipboard.writeText(overwatchCode);
      showToast('代码已复制到剪贴板', 'success');
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败', 'error');
    }
  };

  const handleShowDetails = (template: UserTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 页面头部 */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                社区模板
              </h1>
              <p className="text-gray-400 mt-2">发现和分享优秀的守望先锋聊天模板</p>
            </div>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              返回编辑器
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 搜索和筛选区域 */}
        <div className="mb-8 space-y-4">
          {/* 搜索框 */}
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="搜索模板名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 排序控制 */}
          <div className="flex justify-end items-center">
            
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'createdAt' | 'likesCount');
                }}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="likesCount">按点赞数排序</option>
                <option value="createdAt">按时间排序</option>
              </select>
              
              <div className="text-sm text-gray-400">
                共 {templates.length} 个模板
              </div>
            </div>
          </div>
        </div>

        {/* 模板列表 */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">📝</div>
            <div className="text-xl mb-2">
              {searchTerm ? '没有找到匹配的模板' : '暂无社区模板'}
            </div>
            {!searchTerm && (
              <div className="text-gray-500 mt-4">
                成为第一个分享模板的用户吧！
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-gray-800/50 border border-gray-600/50 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-200 group p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-white group-hover:text-orange-300 transition-colors truncate flex-1 text-base">{template.name}</h3>
                    <button
                      onClick={() => handleLike(template.id)}
                      className={`ml-2 flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors duration-200 ${
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
                                  {element.content.length > 15 ? element.content.substring(0, 15) + '...' : element.content}
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
                            <span className="text-gray-400 text-xs flex-shrink-0">...</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <code className="text-xs text-gray-300 break-all line-clamp-4 font-mono block overflow-hidden">
                        {template.overwatchCode.length > 300 ? template.overwatchCode.substring(0, 300) + '...' : template.overwatchCode}
                      </code>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                    <span>{formatDate(template.createdAt)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyCode(template.overwatchCode)}
                      className="flex-1 px-3 py-2 text-sm bg-gray-600/80 text-white rounded hover:bg-gray-600 transition-colors duration-200"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => handleShowDetails(template)}
                      className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold"
                    >
                      详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      加载中...
                    </>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 加载更多指示器 */}
        {loadingMore && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-400">加载更多...</span>
          </div>
        )}
        
        {!hasMore && templates.length > 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg">🎉</div>
            <div className="mt-2">已加载全部模板</div>
          </div>
        )}
      </div>

      {/* 模板详情模态框 */}
      <TemplateDetailModal
        template={selectedTemplate}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTemplate(null);
        }}
        onCopy={handleCopyCode}
        onLike={handleLike}
        isLiked={selectedTemplate ? likedTemplates.has(selectedTemplate.id) : false}
        templatePreview={selectedTemplate ? templatePreviews[selectedTemplate.id] || [] : []}
      />
    </div>
  );
};

export default CommunityTemplatesPage;