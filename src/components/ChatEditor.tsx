'use client';

import React, { useState, useEffect } from 'react';
import TextureSelector from './TextureSelector';
import TextInput from './TextInput';
import TemplateSelector from './TemplateSelector';

import Preview from './Preview';
import CodeGenerator from './CodeGenerator';
import { parseOverwatchCode, containsOverwatchCode } from '@/utils/overwatchCodeParser';

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

const ChatEditor: React.FC = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [activeTab, setActiveTab] = useState<'template' | 'texture' | 'text'>('template');


  // 加载纹理数据
  useEffect(() => {
    const loadTextures = async () => {
      try {
        // 加载纹理文件列表
        const texturesResponse = await fetch('/api/textures');
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
        
        setTextures(mergedTextures);
      } catch (error) {
        console.error('Failed to load textures:', error);
      }
    };

    loadTextures();
  }, []);

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // 添加文字
  const handleAddText = (text: string) => {
    const newElement: Element = {
      id: generateId(),
      type: 'text',
      content: text
    };
    setElements(prev => [...prev, newElement]);
  };

  // 添加彩色文字
  const handleAddColoredText = (text: string, color: string) => {
    const newElement: Element = {
      id: generateId(),
      type: 'color',
      content: text,
      color: color
    };
    setElements(prev => [...prev, newElement]);
  };

  // 添加渐变文字
  const handleAddGradientText = (text: string, startColor: string, endColor: string) => {
    const newElement: Element = {
      id: generateId(),
      type: 'gradient',
      content: text,
      gradientStartColor: startColor,
      gradientEndColor: endColor
    };
    setElements(prev => [...prev, newElement]);
  };

  // 添加纹理
  const handleAddTexture = (textureId: string) => {
    const texture = textures.find(t => t.id === textureId);
    if (texture) {
      const newElement: Element = {
        id: generateId(),
        type: 'texture',
        texture: texture
      };
      setElements(prev => [...prev, newElement]);
    }
  };

  // 移动元素
  const handleMoveElement = (fromIndex: number, toIndex: number) => {
    setElements(prev => {
      const newElements = [...prev];
      const [movedElement] = newElements.splice(fromIndex, 1);
      newElements.splice(toIndex, 0, movedElement);
      return newElements;
    });
  };

  // 删除元素
  const handleRemoveElement = (index: number) => {
    setElements(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有元素
  const handleClearAll = () => {
    setElements([]);
  };

  // 应用模板
  const handleApplyTemplate = async (templateElements: any[]) => {
    let newElements: Element[] = [];
    
    for (const element of templateElements) {
      // 检查是否是包含守望先锋代码的文本元素
      if (element.type === 'text' && element.content && containsOverwatchCode(element.content)) {
        // 解析守望先锋代码为元素数组
        try {
          const parsedElements = await parseOverwatchCode(element.content);
          newElements.push(...parsedElements);
        } catch (error) {
          console.error('Failed to parse Overwatch code:', error);
          // 解析失败时，仍然作为普通文本元素添加
          newElements.push({
            ...element,
            id: generateId()
          });
        }
      } else {
        // 普通元素直接添加
        newElements.push({
          ...element,
          id: generateId() // 重新生成ID以避免冲突
        });
      }
    }
    
    setElements(newElements);
  };

  // 保存到本地缓存
  const handleSaveToLocal = () => {
    if (elements.length === 0) {
      alert('没有内容可以保存');
      return;
    }

    const templateName = prompt('请输入模板名称:');
    if (!templateName) return;

    const template = {
      id: Date.now().toString(),
      name: templateName,
      description: `本地模板 - ${new Date().toLocaleDateString()}`,
      elements: elements,
      category: '我的模板',
      createdAt: new Date().toISOString(),
      isLocal: true
    };

    // 获取现有的本地模板
    const existingTemplates = JSON.parse(localStorage.getItem('userTemplates') || '[]');
    existingTemplates.push(template);
    
    // 保存到localStorage
    localStorage.setItem('userTemplates', JSON.stringify(existingTemplates));
    
    alert('模板已保存到本地缓存！\n注意：更新后可能会丢失');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-orange-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-center text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">守望先锋聊天编辑器</h1>
          <button
            onClick={handleSaveToLocal}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            disabled={elements.length === 0}
            title={elements.length === 0 ? '请先添加一些元素' : '保存到本地缓存（更新后可能丢失）'}
          >
            保存为模板
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-8 h-full">
            {/* 选项卡 */}
            <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/20 rounded-xl p-6 h-full flex flex-col">
              <div className="flex border-b border-gray-700/50 mb-6">
                <button
                  onClick={() => setActiveTab('template')}
                  className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'template'
                      ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  模板选择
                </button>
                <button
                  onClick={() => setActiveTab('texture')}
                  className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'texture'
                      ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  纹理选择
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'text'
                      ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  文字输入
                </button>
              </div>
              
              {/* 选项卡内容 */}
              <div className="flex-1 overflow-auto">
                {activeTab === 'template' && (
                  <TemplateSelector onTemplateApply={handleApplyTemplate} />
                )}
                {activeTab === 'texture' && (
                  <TextureSelector onTextureSelect={handleAddTexture} textures={textures} />
                )}
                {activeTab === 'text' && (
                  <TextInput 
                    onAddText={handleAddText}
                    onAddColoredText={handleAddColoredText}
                    onAddGradientText={handleAddGradientText}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 右侧：预览和代码生成 */}
          <div className="space-y-8 h-full flex flex-col">
            <div className="flex-1">
              <Preview 
                elements={elements}
                onMoveElement={handleMoveElement}
                onRemoveElement={handleRemoveElement}
                onClearAll={handleClearAll}
              />
            </div>
            
            <div className="flex-1">
              <CodeGenerator 
                elements={elements}
                onClearAll={handleClearAll}
              />
            </div>
          </div>
        </div>
        
        {/* 纹理数据来源说明 */}
        <div className="mt-8 bg-gray-900/60 backdrop-blur-sm border border-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-center text-sm text-gray-400">
            <span className="mr-2">📖</span>
            <span>纹理数据来源：</span>
            <a 
              href="https://texture-viewer.overwatchitemtracker.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-orange-400 hover:text-orange-300 underline transition-colors"
            >
              Overwatch Item Tracker Texture Viewer
            </a>
            <span className="ml-1">- 感谢提供丰富的守望先锋纹理资源</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatEditor;