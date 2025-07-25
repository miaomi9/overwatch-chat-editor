'use client';

import React, { useState, useEffect } from 'react';

interface TemplateElement {
  id: string;
  type: 'text' | 'color' | 'gradient' | 'texture';
  content?: string;
  color?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  texture?: {
    id: string;
    imagePath: string;
    txCode: string;
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  elements: TemplateElement[];
  category?: string;
  createdAt: string;
  updatedAt?: string;
  isLocal?: boolean;
}

interface TemplatesData {
  templates: Record<string, Template>;
  categories: string[];
}

interface TemplateSelectorProps {
  onTemplateApply: (elements: any[]) => Promise<void>;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onTemplateApply }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [localTemplates, setLocalTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['全部']);

  // 加载模板数据
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // 加载全局模板
        const response = await fetch('/api/templates');
        if (response.ok) {
          const data: TemplatesData = await response.json();
          const templateList = Object.values(data.templates);
          setTemplates(templateList);
          
          // 加载本地模板
          const localTemplatesData = JSON.parse(localStorage.getItem('userTemplates') || '[]');
          setLocalTemplates(localTemplatesData);
          
          // 设置系统模板分类
          setCategories(['全部', ...data.categories]);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // 过滤模板
  const currentTemplates = activeTab === 'system' ? templates : localTemplates;
  const filteredTemplates = currentTemplates.filter(template => {
    if (selectedCategory === '全部') return true;
    return template.category === selectedCategory;
  });

  // 删除本地模板
  const handleDeleteLocalTemplate = (templateId: string) => {
    if (confirm('确定要删除这个本地模板吗？')) {
      const updatedLocalTemplates = localTemplates.filter(t => t.id !== templateId);
      setLocalTemplates(updatedLocalTemplates);
      localStorage.setItem('userTemplates', JSON.stringify(updatedLocalTemplates));
    }
  };

  // 复制模板内容
  const handleCopyTemplate = async (template: Template) => {
    try {
      const templateText = JSON.stringify(template.elements, null, 2);
      await navigator.clipboard.writeText(templateText);
      alert('模板内容已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请重试');
    }
  };

  const handleApplyTemplate = async (template: Template) => {
    await onTemplateApply(template.elements);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-900/80 backdrop-blur-sm border border-orange-500/20 rounded-xl">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-3"></div>
            加载模板中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900/80 backdrop-blur-sm border border-orange-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">模板选择</h3>
        </div>
        <div className="text-sm text-gray-400 font-medium">
          共 {filteredTemplates.length} 个模板
        </div>
      </div>
      
      {/* 模板类型切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setActiveTab('system');
            setSelectedCategory('全部');
          }}
          className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'system'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
          }`}
        >
          系统预设
        </button>
        <button
          onClick={() => {
            setActiveTab('user');
            setSelectedCategory('全部');
          }}
          className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'user'
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
          }`}
        >
          我的模板 ({localTemplates.length})
        </button>
      </div>
      
      {/* 分类筛选 */}
      {activeTab === 'system' && (
        <div className="mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category} className="bg-gray-700 text-white">{category}</option>
            ))}
          </select>
        </div>
      )}

      {/* 模板列表 */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">{activeTab === 'system' ? '📝' : '💾'}</div>
            <div>
              {activeTab === 'system' ? '暂无系统模板' : '暂无本地模板'}
            </div>
            {activeTab === 'user' && (
              <div className="text-sm mt-1">
                在编辑器中点击"保存到本地"来创建模板
              </div>
            )}
            {activeTab === 'system' && (
              <div className="text-sm mt-1">请联系管理员添加模板</div>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold text-white group-hover:text-orange-300 transition-colors">
                    {template.name}
                  </h4>
                  {activeTab === 'user' && (
                    <span className="text-xs text-green-400 bg-green-600/20 px-2 py-1 rounded border border-green-500/30">
                      本地
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
                  {template.category || '其他'}
                </span>
              </div>
              
              <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {template.elements.length} 个元素
                  {activeTab === 'user' && (
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ 更新后可能丢失
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                   <button
                     onClick={() => handleCopyTemplate(template)}
                     className="px-3 py-1 text-xs bg-gray-600/80 text-white rounded hover:bg-gray-600 transition-all duration-200"
                     title="复制模板内容到剪贴板"
                   >
                     复制
                   </button>
                   {activeTab === 'user' && (
                     <button
                       onClick={() => handleDeleteLocalTemplate(template.id)}
                       className="px-3 py-1 text-xs bg-red-600/80 text-white rounded hover:bg-red-600 transition-all duration-200"
                     >
                       删除
                     </button>
                   )}
                   <button
                     onClick={() => handleApplyTemplate(template)}
                     className="px-4 py-2 text-sm bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-orange-600/50"
                   >
                     应用模板
                   </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;