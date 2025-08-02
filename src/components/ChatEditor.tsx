'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import TextureSelector from './TextureSelector';
import TextInput from './TextInput';
import TemplateSelector from './TemplateSelector';
import { AppreciationButton } from './AppreciationModal';

import Preview from './Preview';
import CodeGenerator from './CodeGenerator';
import UpdateLogModal from './UpdateLogModal';
import { parseOverwatchCode, containsOverwatchCode } from '@/utils/overwatchCodeParser';

import { loadTexturesWithCache, type Texture as CachedTexture } from '@/utils/textureCache';
import { useGlobalToast } from '@/contexts/ToastContext';
import i18nTexts from '@/data/teammate-matching-i18n.json';

// 使用缓存工具中的Texture类型
type Texture = CachedTexture;

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

// 使用统一的缓存管理工具

const ChatEditor: React.FC = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [activeTab, setActiveTab] = useState<'template' | 'texture' | 'text'>('template');
  const [isLoadingTextures, setIsLoadingTextures] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  
  const MAX_TEMPLATE_NAME_CHARACTERS = 100;
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const { showSuccess, showWarning } = useGlobalToast();
  
  // 获取当前语言的文本
  const t = i18nTexts[language];

  // 当前版本号
  const CURRENT_VERSION = '1.3.0';

  // 检查是否需要显示更新日志
  useEffect(() => {
    const lastViewedVersion = localStorage.getItem('lastViewedUpdateVersion');
    if (lastViewedVersion !== CURRENT_VERSION) {
      // 延迟显示，等待页面加载完成
      const timer = setTimeout(() => {
        setShowUpdateLog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);


  // 加载纹理数据
  useEffect(() => {
    const loadTextures = async () => {
      try {
        setIsLoadingTextures(true);
        const texturesData = await loadTexturesWithCache();
        setTextures(texturesData);
      } catch (error) {
        console.error('Failed to load textures:', error);
      } finally {
        setIsLoadingTextures(false);
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
        // 解析守望先锋代码为元素数组，传递已加载的纹理数据
        try {
          const parsedElements = await parseOverwatchCode(element.content, textures);
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
      showWarning('没有内容可以保存');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (!templateName.trim()) {
      showWarning('请输入模板名称');
      return;
    }

    const template = {
      id: Date.now().toString(),
      name: templateName.trim(),
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
    
    showSuccess('模板已保存到本地缓存！\n注意：更新后可能会丢失');
    setShowSaveDialog(false);
    setTemplateName('');
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setTemplateName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-orange-900 p-4 relative">

      
      {/* 更新日志弹窗 */}
      <UpdateLogModal
        isVisible={showUpdateLog}
        onClose={() => setShowUpdateLog(false)}
      />
      
      {/* Loading 遮罩 */}
      {isLoadingTextures && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl p-8 text-center max-w-md mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500/30 border-t-orange-500 mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-white mb-2">加载纹理数据中...</h3>
            <p className="text-gray-400 text-sm mb-4">
              正在从服务器获取纹理信息，请稍候
            </p>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500">
                💡 纹理数据较大，首次加载可能需要一些时间
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 保存模板对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900/95 border border-orange-500/30 rounded-xl p-6 max-w-md mx-4 w-full">
            <h3 className="text-xl font-bold text-white mb-4">保存为模板</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                模板名称
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_TEMPLATE_NAME_CHARACTERS) {
                    setTemplateName(value);
                  }
                }}
                placeholder="请输入模板名称..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2">
                <div className={`text-sm ${
                  templateName.length > MAX_TEMPLATE_NAME_CHARACTERS * 0.9 
                    ? 'text-red-400' 
                    : templateName.length > MAX_TEMPLATE_NAME_CHARACTERS * 0.8 
                    ? 'text-yellow-400' 
                    : 'text-gray-400'
                  }`}>
                  {templateName.length}/{MAX_TEMPLATE_NAME_CHARACTERS} 字符
                </div>
                {templateName.length >= MAX_TEMPLATE_NAME_CHARACTERS && (
                  <div className="text-xs text-red-500">
                    已达到字符上限
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelSave}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                disabled={!templateName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">


        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-4">
          {/* 移动端：紧凑的单行布局 */}
          <div className="flex flex-col gap-2 lg:hidden">
            {/* 第一行：标题和导航 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="https://ld5.res.netease.com/images/20241213/1734074185668_1f8923e771.svg" alt="Overwatch" width={32} height={32} className="w-6 h-6" unoptimized />
                <h1 className="text-lg font-bold text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">守望先锋聊天编辑器</h1>
              </div>
              <div className="flex items-center gap-1">
                <a 
                  href="https://www.bilibili.com/video/BV1ncbRzGEJW/?share_source=copy_web&vd_source=46be8e2fa7c30d3bdf853b9c4adcd69b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-all duration-200"
                >
                  <Image src="https://ts3.tc.mm.bing.net/th/id/ODF.HcIfqnk4n-lbffGcaqDC2w?w=32&h=32&qlt=90&pcl=fffffa&o=6&cb=thwsc4&pid=1.2" alt="Bilibili" width={14} height={14} className="w-3 h-3" unoptimized />
                </a>
                <a 
                  href="https://github.com/MapleOAO/overwatch-chat-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-700/50 border border-gray-500/30 rounded-md hover:bg-gray-600/60 transition-all duration-200"
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          {/* 桌面端：原有布局 */}
          <div className="hidden lg:flex lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="https://ld5.res.netease.com/images/20241213/1734074185668_1f8923e771.svg" alt="Overwatch" width={40} height={40} className="w-10 h-10" unoptimized />
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">守望先锋聊天编辑器</h1>
            </div>
            
            {/* 导航链接 */}
            <div className="flex items-center gap-2">
              {/* 视频教程 */}
               <a 
                 href="https://space.bilibili.com/73687595"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-200 group"
               >
                 <Image src="https://ts3.tc.mm.bing.net/th/id/ODF.HcIfqnk4n-lbffGcaqDC2w?w=32&h=32&qlt=90&pcl=fffffa&o=6&cb=thwsc4&pid=1.2" alt="Bilibili" width={16} height={16} className="w-4 h-4" unoptimized />
                 <span className="text-white text-sm font-medium">教程</span>
              </a>
              
              {/* 开源项目 */}
               <a 
                 href="https://github.com/MapleOAO/overwatch-chat-editor"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-2 bg-gray-700/50 border border-gray-500/30 rounded-lg hover:bg-gray-600/60 hover:border-gray-400/40 transition-all duration-200 group"
               >
                 <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                 </svg>
                 <span className="text-white text-sm font-medium">源码</span>
              </a>
            </div>
          </div>
          
          {/* 功能按钮 */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
            {/* 移动端：紧凑的功能按钮布局 */}
            <div className="flex flex-wrap items-center gap-1.5 lg:hidden w-full">
              <button
                onClick={() => window.open('/teammate-matching', '_blank')}
                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-md hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 transition-all duration-200 text-xs"
              >
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-white font-medium">队友</span>
              </button>
              <button
                onClick={() => window.open('/overwatch-market', '_blank')}
                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-md hover:from-purple-500/30 hover:to-purple-600/30 hover:border-purple-400/50 transition-all duration-200 text-xs"
              >
                <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-white font-medium">卡片</span>
              </button>
              <button
                onClick={() => window.open('/community-templates', '_blank')}
                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-md hover:from-orange-500/30 hover:to-orange-600/30 hover:border-orange-400/50 transition-all duration-200 text-xs"
              >
                <span className="text-sm">🎨</span>
                <span className="text-white font-medium">模板</span>
              </button>
              <AppreciationButton className="px-2 py-1.5 text-xs" />
              <button
                onClick={handleSaveToLocal}
                className="flex items-center gap-1 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                disabled={elements.length === 0}
                title={elements.length === 0 ? '请先添加一些元素' : '保存到本地缓存（更新后可能丢失）'}
              >
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-white font-medium">保存</span>
              </button>
            </div>
            
            {/* 桌面端：原有功能按钮布局 */}
            <div className="hidden lg:flex lg:flex-row lg:items-center gap-3">
              {/* 主要功能按钮 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.open('/teammate-matching', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 transition-all duration-200 group"
                >
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-white text-sm font-medium">{t.teammateMatchingButton}</span>
                  <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => window.open('/overwatch-market', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-purple-600/30 hover:border-purple-400/50 transition-all duration-200 group"
                >
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-white text-sm font-medium">{t.cardExchangeButton}</span>
                  <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => window.open('/community-templates', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg hover:from-orange-500/30 hover:to-orange-600/30 hover:border-orange-400/50 transition-all duration-200 group"
                >
                  <span className="text-lg">🎨</span>
                  <span className="text-white text-sm font-medium">社区模板</span>
                  <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </button>
              </div>
              
              {/* 次要功能按钮 */}
              <div className="flex items-center gap-2 border-l border-gray-600/30 pl-3">
                <AppreciationButton className="px-3 py-2 text-sm" />
                <button
                  onClick={handleSaveToLocal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={elements.length === 0}
                  title={elements.length === 0 ? '请先添加一些元素' : '保存到本地缓存（更新后可能丢失）'}
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-white text-sm font-medium">保存模板</span>
                </button>
              </div>
            </div>
          </div>
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