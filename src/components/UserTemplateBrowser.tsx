'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { parseOverwatchCode } from '@/utils/overwatchCodeParser';
import { loadTexturesWithCache, type Texture } from '@/utils/textureCache';
import { createApiThrottle, createDebounce } from '@/utils/debounceThrottle';
import Preview from './Preview';

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  overwatchCode: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserTemplateBrowserProps {
  onApplyTemplate?: (overwatchCode: string) => void;
  shareButton?: React.ReactNode;
}

const UserTemplateBrowser: React.FC<UserTemplateBrowserProps> = ({ onApplyTemplate, shareButton }) => {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likesCount'>('likesCount');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [likedTemplates, setLikedTemplates] = useState<Set<string>>(new Set());
  const [textures, setTextures] = useState<Texture[]>([]);
  const { showToast } = useToast();

  const limit = 4;

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

  useEffect(() => {
    const generatePreviews = async () => {
      if (textures.length === 0) return;
      
      const previews: { [key: string]: any[] } = {};
      for (const template of templates) {
        if (template.overwatchCode) {
          try {
            previews[template.id] = await parseOverwatchCode(template.overwatchCode, textures);
          } catch (error) {
            console.error('Failed to parse overwatch code for template:', template.id, error);
            previews[template.id] = [];
          }
        }
      }
      setTemplatePreviews(previews);
    };

    generatePreviews();
  }, [templates, textures]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy,
        order: 'desc',
      });

      const response = await fetch(`/api/user-templates?${params}`);
      if (!response.ok) {
        throw new Error('获取模板失败');
      }

      const data = await response.json();
      setTemplates(data.templates);
      setTotalPages(data.pagination.totalPages);

      // 检查用户点赞状态
      const likeStatuses = await Promise.all(
        data.templates.map(async (template: UserTemplate) => {
          try {
            const likeResponse = await fetch(`/api/user-templates/${template.id}/like`);
            if (likeResponse.ok) {
              const likeData = await likeResponse.json();
              return { id: template.id, liked: likeData.liked };
            }
          } catch (error) {
            console.error('检查点赞状态失败:', error);
          }
          return { id: template.id, liked: false };
        })
      );

      const newLikedTemplates = new Set<string>();
      likeStatuses.forEach(({ id, liked }) => {
        if (liked) newLikedTemplates.add(id);
      });
      setLikedTemplates(newLikedTemplates);
    } catch (error) {
      console.error('获取模板失败:', error);
      showToast('获取模板失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 搜索防抖
  const debouncedSetSearchTerm = useCallback(
    createDebounce((term: string) => {
      setDebouncedSearchTerm(term);
      setCurrentPage(1);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, debouncedSearchTerm, sortBy]);

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

      showToast(data.message, 'success');
    } catch (error) {
      console.error('点赞操作失败:', error);
      showToast('点赞操作失败', 'error');
    }
  }, [setLikedTemplates, setTemplates, showToast]);

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

  const handleApplyTemplate = (overwatchCode: string) => {
    onApplyTemplate?.(overwatchCode);
    showToast('模板已应用', 'success');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* 搜索框和分享按钮 */}
      <div className="mb-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜索模板名称或描述..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => {
              setSearchTerm('');
            }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {shareButton && (
          <div className="flex-shrink-0">
            {shareButton}
          </div>
        )}
      </div>

      {/* 排序选项和视图切换 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'grid'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="网格视图"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'list'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="列表视图"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as 'createdAt' | 'likesCount');
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
        >
          <option value="likesCount">按点赞数排序</option>
          <option value="createdAt">按时间排序</option>
        </select>
      </div>

      {/* 模板列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📝</div>
          <div>
            {searchTerm ? '没有找到匹配的模板' : '暂无用户模板'}
          </div>
          {!searchTerm && (
            <div className="text-sm mt-1 text-gray-500">
              点击上方按钮分享你的第一个模板
            </div>
          )}
        </div>
      ) : (
        <div className={`${
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
            : 'space-y-4'
        }`}>
          {templates.map((template) => (
             <div key={template.id} className={`bg-gray-700/30 border border-gray-600/50 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-200 group ${
               viewMode === 'grid' ? 'p-3' : 'p-3 flex gap-3'
             }`}>
               {viewMode === 'grid' ? (
                 // 网格视图布局
                 <>
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-medium text-white group-hover:text-orange-300 transition-colors truncate flex-1 text-sm">{template.name}</h3>
                     <button
                       onClick={() => handleLike(template.id)}
                       className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors duration-200 ${
                         likedTemplates.has(template.id)
                           ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                           : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30'
                       }`}
                     >
                       <svg className="w-3 h-3" fill={likedTemplates.has(template.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                       </svg>
                       {template.likesCount}
                     </button>
                   </div>
                   
                   {template.description && (
                     <p className="text-gray-300 text-xs mb-2 line-clamp-2">{template.description}</p>
                   )}
                   
                   <div className="bg-gray-800/50 border border-gray-600/30 rounded p-2 mb-2 min-h-[100px] max-h-[100px] overflow-hidden">
                     {templatePreviews[template.id] && templatePreviews[template.id].length > 0 ? (
                       <div className="text-sm h-full overflow-hidden">
                         <div className="flex flex-wrap items-center gap-1 h-full overflow-hidden">
                           {templatePreviews[template.id].slice(0, 15).map((element, index) => {
                             if (element.type === 'text') {
                               return (
                                 <span key={index} className="text-white font-mono text-xs break-all">
                                   {element.content.length > 20 ? element.content.substring(0, 20) + '...' : element.content}
                                 </span>
                               );
                             } else if (element.type === 'color') {
                               return (
                                 <span
                                   key={index}
                                   className="font-mono text-xs break-all"
                                   style={{ color: element.color }}
                                 >
                                   {element.content.length > 20 ? element.content.substring(0, 20) + '...' : element.content}
                                 </span>
                               );
                             } else if (element.type === 'texture' && element.texture) {
                               return (
                                 <img
                                   key={index}
                                   src={element.texture.imagePath}
                                   alt={element.texture.name}
                                   className="w-4 h-4 inline-block flex-shrink-0"
                                   onError={(e) => {
                                     e.currentTarget.style.display = 'none';
                                   }}
                                 />
                               );
                             }
                             return null;
                           })}
                           {templatePreviews[template.id].length > 15 && (
                             <span className="text-gray-400 text-xs flex-shrink-0">...</span>
                           )}
                         </div>
                       </div>
                     ) : (
                       <code className="text-xs text-gray-300 break-all line-clamp-3 font-mono block overflow-hidden">
                         {template.overwatchCode.length > 200 ? template.overwatchCode.substring(0, 200) + '...' : template.overwatchCode}
                       </code>
                     )}
                   </div>
                   
                   <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                     <span>{formatDate(template.createdAt)}</span>
                   </div>
                   
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleCopyCode(template.overwatchCode)}
                       className="flex-1 px-2 py-1 text-xs bg-gray-600/80 text-white rounded hover:bg-gray-600 transition-colors duration-200"
                     >
                       复制
                     </button>
                     <button
                       onClick={() => handleApplyTemplate(template.overwatchCode)}
                       className="flex-1 px-2 py-1 text-xs bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold"
                     >
                       应用
                     </button>
                   </div>
                 </>
               ) : (
                 // 列表视图布局
                 <>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-2">
                       <h3 className="font-medium text-white group-hover:text-orange-300 transition-colors truncate flex-1 mr-2 text-sm">
                         {template.name.length > 25 ? template.name.substring(0, 25) + '...' : template.name}
                       </h3>
                       <button
                         onClick={() => handleLike(template.id)}
                         className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors duration-200 flex-shrink-0 ${
                           likedTemplates.has(template.id)
                             ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                             : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30'
                         }`}
                       >
                         <svg className="w-3 h-3" fill={likedTemplates.has(template.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                         </svg>
                         {template.likesCount}
                       </button>
                     </div>
                     
                     {template.description && (
                         <p className="text-gray-300 text-xs mb-1.5 truncate">
                           {template.description.length > 40 ? template.description.substring(0, 40) + '...' : template.description}
                         </p>
                       )}
                     
                     <div className="text-xs text-gray-400 mb-1.5">
                         <span>{formatDate(template.createdAt)}</span>
                       </div>
                   </div>
                   
                   <div className="w-40 bg-gray-800/50 border border-gray-600/30 rounded p-1.5 flex-shrink-0">
                     {templatePreviews[template.id] && templatePreviews[template.id].length > 0 ? (
                       <div className="text-xs h-12 overflow-hidden">
                         <div className="flex flex-wrap items-center gap-1 h-full overflow-hidden">
                           {templatePreviews[template.id].slice(0, 8).map((element, index) => {
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
                                   className="w-3 h-3 inline-block flex-shrink-0"
                                   onError={(e) => {
                                     e.currentTarget.style.display = 'none';
                                   }}
                                 />
                               );
                             }
                             return null;
                           })}
                           {templatePreviews[template.id].length > 8 && (
                             <span className="text-gray-400 text-xs flex-shrink-0">...</span>
                           )}
                         </div>
                       </div>
                     ) : (
                       <code className="text-xs text-gray-300 break-all line-clamp-2 font-mono block overflow-hidden h-12">
                         {template.overwatchCode.length > 100 ? template.overwatchCode.substring(0, 100) + '...' : template.overwatchCode}
                       </code>
                     )}
                   </div>
                   
                   <div className="flex flex-col gap-1.5 w-16 flex-shrink-0">
                     <button
                         onClick={() => handleCopyCode(template.overwatchCode)}
                         className="px-1.5 py-0.5 text-xs bg-gray-600/80 text-white rounded hover:bg-gray-600 transition-colors duration-200"
                       >
                         复制
                       </button>
                       <button
                         onClick={() => handleApplyTemplate(template.overwatchCode)}
                         className="px-1.5 py-0.5 text-xs bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold"
                       >
                         应用
                       </button>
                   </div>
                 </>
               )}
             </div>
           ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-600 bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors duration-200"
          >
            上一页
          </button>
          
          <span className="px-4 py-1 text-sm text-gray-400">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-600 bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors duration-200"
          >
            下一页
          </button>
        </div>
      )}

      {/* 查看更多按钮 */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => window.open('/community-templates', '_blank')}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          查看更多社区模板
        </button>
      </div>
    </div>
  );
};

export default UserTemplateBrowser;