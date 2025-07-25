'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getTextureName } from '@/data/textureNames';
import { getTextureCategory } from '@/data/textureCategories';

interface Texture {
  id: string;
  fileName: string;
  imagePath: string;
  txCode: string;
  name: string;
  category: string;
}

interface TextureSelectorProps {
  onTextureSelect: (textureId: string) => void;
  textures: Texture[];
}

const TextureSelector: React.FC<TextureSelectorProps> = ({ onTextureSelect, textures }) => {
  const [filteredTextures, setFilteredTextures] = useState<Texture[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('英雄头像');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const itemsPerPage = 16;
  const totalPages = Math.ceil(filteredTextures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTextures = filteredTextures.slice(startIndex, startIndex + itemsPerPage);

  // 获取所有分类
  const categories = ['全部', ...Array.from(new Set(textures.map(texture => texture.category)))];

  // 当纹理数据变化时更新筛选结果
  useEffect(() => {
    setFilteredTextures(textures);
    if (textures.length > 0) {
      setIsLoading(false);
    }
  }, [textures]);

  // 过滤纹理
  useEffect(() => {
    let filtered = textures;

    // 按分类过滤
    if (selectedCategory !== '全部') {
      filtered = filtered.filter(texture => texture.category === selectedCategory);
    }

    // 按搜索词过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(texture => {
        return texture.name.toLowerCase().includes(searchLower) || 
               texture.id.toLowerCase().includes(searchLower) || 
               texture.txCode.toLowerCase().includes(searchLower);
      });
    }

    setFilteredTextures(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [textures, selectedCategory, searchTerm]);

  const handleTextureClick = (textureId: string) => {
    onTextureSelect(textureId);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-3"></div>
            加载纹理中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900/80 backdrop-blur-sm border border-orange-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">纹理选择</h3>
        </div>
        <div className="text-sm text-gray-400 font-medium">
          共 {filteredTextures.length} 个纹理
        </div>
      </div>
      
      {/* 分类筛选和搜索 */}
      <div className="flex gap-3 mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
        >
          {categories.map(category => (
            <option key={category} value={category} className="bg-gray-700 text-white">{category}</option>
          ))}
        </select>
        
        <input
          type="text"
          placeholder="搜索纹理名称、ID或TXC代码..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
        />
      </div>

      {/* 纹理网格 */}
      <div className="grid grid-cols-6 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
        {currentTextures.map((texture) => (
          <button
            key={texture.id}
            onClick={() => handleTextureClick(texture.id)}
            className="p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-200 group transform hover:scale-105"
            title={texture.name}
          >
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-600/30 rounded-lg flex items-center justify-center">
              <Image
                src={texture.imagePath}
                alt={texture.name}
                width={48}
                height={48}
                className="object-contain rounded"
              />
            </div>
            <div className="text-xs text-gray-300 truncate group-hover:text-orange-300 transition-colors">
              {texture.name}
            </div>
          </button>
        ))}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-xs bg-gray-700/50 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all duration-200"
          >
            上一页
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-xs rounded-lg transition-all duration-200 ${
                    currentPage === pageNum
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25'
                      : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-xs bg-gray-700/50 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all duration-200"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default TextureSelector;