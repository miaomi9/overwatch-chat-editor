'use client';

import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import { useToast } from '@/hooks/useToast';

interface TemplateElement {
  id: string;
  type: 'text' | 'color' | 'gradient' | 'texture';
  content?: string;
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  texture?: {
    id: string;
    name: string;
    category: string;
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  elements: TemplateElement[];
  createdAt: string;
}

interface TemplatesData {
  templates: { [key: string]: Template };
  categories: string[];
}

interface TemplateManagerProps {
  currentElements?: TemplateElement[];
  onClose?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ currentElements = [], onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState<'json' | 'overwatch'>('json');
  const [editOverwatchCode, setEditOverwatchCode] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    elements: [] as TemplateElement[]
  });
  const [useCurrentElements, setUseCurrentElements] = useState(false);
  const [useOverwatchCode, setUseOverwatchCode] = useState(false);
  const [overwatchCode, setOverwatchCode] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data: TemplatesData = await response.json();
        setTemplates(Object.values(data.templates));
        setTemplateCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim()) {
      showWarning('请填写模板名称和描述');
      return;
    }

    let elements = newTemplate.elements;
    if (useCurrentElements) {
      elements = currentElements;
    } else if (useOverwatchCode && overwatchCode.trim()) {
      // 将守望先锋代码转换为单个文本元素
      elements = [{
        id: Date.now().toString(),
        type: 'text',
        content: overwatchCode.trim()
      }];
    }

    const templateData = {
      ...newTemplate,
      elements
    };

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (response.ok) {
        await loadTemplates();
        setShowForm(false);
        setNewTemplate({ name: '', description: '', category: '', elements: [] });
        setUseCurrentElements(false);
        setUseOverwatchCode(false);
        setOverwatchCode('');
        showSuccess('模板保存成功！');
      } else {
        showError('保存失败！');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showError('保存失败！');
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setEditMode('json');
    // 如果模板只有一个文本元素，则提取其内容作为守望先锋代码
    if (template.elements.length === 1 && template.elements[0].type === 'text') {
      setEditOverwatchCode(template.elements[0].content || '');
    } else {
      setEditOverwatchCode('');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    let templateToUpdate = editingTemplate;
    
    // 如果是守望先锋代码模式，将代码转换为模板元素
    if (editMode === 'overwatch' && editOverwatchCode.trim()) {
      templateToUpdate = {
        ...editingTemplate,
        elements: [{
          id: Date.now().toString(),
          type: 'text',
          content: editOverwatchCode.trim()
        }]
      };
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateToUpdate),
      });

      if (response.ok) {
        await loadTemplates();
        setEditingTemplate(null);
        setEditMode('json');
        setEditOverwatchCode('');
        showSuccess('模板更新成功！');
      } else {
        showError('更新失败，请重试');
      }
    } catch (error) {
      console.error('更新模板失败:', error);
      showError('更新失败，请重试');
    }
  };



  const handleDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/templates?id=${templateToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadTemplates();
        showSuccess('模板删除成功！');
      } else {
        showError('删除失败！');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('删除失败！');
    } finally {
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const cancelDeleteTemplate = () => {
    setShowDeleteDialog(false);
    setTemplateToDelete(null);
  };

  const handleAddNewCategory = () => {
    setShowCategoryDialog(true);
  };

  const confirmAddCategory = () => {
    if (newCategoryName.trim() && !templateCategories.includes(newCategoryName.trim())) {
      setTemplateCategories([...templateCategories, newCategoryName.trim()]);
      showSuccess('分类添加成功！');
    } else if (templateCategories.includes(newCategoryName.trim())) {
      showWarning('该分类已存在！');
    } else {
      showWarning('请输入分类名称！');
    }
    setShowCategoryDialog(false);
    setNewCategoryName('');
  };

  const cancelAddCategory = () => {
    setShowCategoryDialog(false);
    setNewCategoryName('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Toast 组件 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这个模板吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteTemplate}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteTemplate}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加分类对话框 */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">添加新分类</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类名称
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="请输入分类名称..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelAddCategory}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmAddCategory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={!newCategoryName.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">模板管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            添加模板
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              关闭
            </button>
          )}
        </div>
      </div>
      
      <div className="grid gap-4 max-h-96 overflow-y-auto">
        {templates.map((template) => (
          <div key={template.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-medium text-gray-800">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {template.category || '其他'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {template.elements.length} 个元素 • 创建于 {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
        
        {templates.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            暂无模板，点击上方按钮添加模板
          </div>
        )}
      </div>
      
      {/* 添加模板表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">添加新模板</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板名称
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入模板名称"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板描述
              </label>
              <textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入模板描述"
                rows={3}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <div className="flex gap-2">
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分类</option>
                  {templateCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddNewCategory}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                >
                  新增
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板内容来源
              </label>
              
              {currentElements.length > 0 && (
                <label className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="templateSource"
                    checked={useCurrentElements}
                    onChange={(e) => {
                      setUseCurrentElements(e.target.checked);
                      if (e.target.checked) {
                        setUseOverwatchCode(false);
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    使用当前编辑器中的元素 ({currentElements.length} 个)
                  </span>
                </label>
              )}
              
              <label className="flex items-center mb-2">
                <input
                  type="radio"
                  name="templateSource"
                  checked={useOverwatchCode}
                  onChange={(e) => {
                    setUseOverwatchCode(e.target.checked);
                    if (e.target.checked) {
                      setUseCurrentElements(false);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  输入守望先锋代码
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="templateSource"
                  checked={!useCurrentElements && !useOverwatchCode}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUseCurrentElements(false);
                      setUseOverwatchCode(false);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  创建空模板
                </span>
              </label>
            </div>
            
            {useOverwatchCode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  守望先锋代码
                </label>
                <textarea
                  value={overwatchCode}
                  onChange={(e) => setOverwatchCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="请粘贴守望先锋聊天代码，例如：<t=1><#FF6D00>橙色文字</>"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持守望先锋聊天格式代码，将作为文本元素保存
                </p>
              </div>
            )}
            
            {!useCurrentElements && !useOverwatchCode && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  当前模板将保存为空模板，您可以稍后在主界面创建元素后更新此模板。
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewTemplate({ name: '', description: '', category: '', elements: [] });
                  setUseCurrentElements(false);
                  setUseOverwatchCode(false);
                  setOverwatchCode('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑模板弹窗 */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-5/6 max-w-4xl max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">编辑模板: {editingTemplate.name}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                编辑模式
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="editMode"
                    value="json"
                    checked={editMode === 'json'}
                    onChange={(e) => setEditMode(e.target.value as 'json' | 'overwatch')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">JSON 格式</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="editMode"
                    value="overwatch"
                    checked={editMode === 'overwatch'}
                    onChange={(e) => setEditMode(e.target.value as 'json' | 'overwatch')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">守望先锋代码</span>
                </label>
              </div>
            </div>
            
            {editMode === 'json' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板代码 (JSON格式)
                </label>
                <textarea
                  value={JSON.stringify(editingTemplate, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingTemplate(parsed);
                    } catch (error) {
                      // 忽略解析错误，让用户继续编辑
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={20}
                  placeholder="请输入有效的JSON格式模板数据"
                />
                <p className="text-xs text-gray-500 mt-1">
                  直接编辑JSON代码，保存时会验证格式是否正确
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  守望先锋代码
                </label>
                <textarea
                  value={editOverwatchCode}
                  onChange={(e) => setEditOverwatchCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={15}
                  placeholder="请输入守望先锋聊天代码，例如：<t=1><#FF6D00>橙色文字</>"
                />
                <p className="text-xs text-gray-500 mt-1">
                  输入守望先锋聊天格式代码，将替换模板的所有元素
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditMode('json');
                  setEditOverwatchCode('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleUpdateTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;