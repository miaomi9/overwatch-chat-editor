'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';

interface Hero {
  id: string;
  name: string;
  englishName: string;
  avatar?: string;
  role?: string;
}

interface HeroResource {
  id: string;
  heroId: string;
  name: string;
  description?: string;
  resourceType: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hero: {
    id: string;
    name: string;
    englishName: string;
  };
}

interface ResourceFormData {
  heroId: string;
  name: string;
  description: string;
  resourceType: string;
  file: File | null;
  displayOrder: number;
}

const HeroResourceManager: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [resources, setResources] = useState<HeroResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHero, setSelectedHero] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<HeroResource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>({
    heroId: '',
    name: '',
    description: '',
    resourceType: 'image',
    file: null,
    displayOrder: 0
  });
  const { showSuccess, showError, showWarning } = useToast();

  const resourceTypes = [
    { value: 'image', label: '图片' },
    { value: 'video', label: '视频' },
    { value: 'audio', label: '音频' },
    { value: 'document', label: '文档' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载英雄列表
      const heroesResponse = await fetch('/api/heroes');
      const heroesData = await heroesResponse.json();
      console.log('Heroes API response:', heroesData);
      // 如果返回的是数组，直接使用；如果是对象，取heroes字段
      setHeroes(Array.isArray(heroesData) ? heroesData : (heroesData.heroes || []));
      
      // 加载资源列表
      const resourcesResponse = await fetch('/api/hero-resources');
      const resourcesData = await resourcesResponse.json();
      console.log('Hero Resources API response:', resourcesData);
      // 如果返回的是数组，直接使用；如果是对象，取resources字段
      setResources(Array.isArray(resourcesData) ? resourcesData : (resourcesData.resources || []));
    } catch (error) {
      console.error('Error loading data:', error);
      showError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.heroId || !formData.name || !formData.resourceType) {
      showWarning('请填写必填字段');
      return;
    }
    
    if (!editingResource && !formData.file) {
      showWarning('请选择文件');
      return;
    }
    
    try {
      const submitFormData = new FormData();
      
      if (editingResource) {
        submitFormData.append('id', editingResource.id);
      }
      
      submitFormData.append('heroId', formData.heroId);
      submitFormData.append('name', formData.name);
      submitFormData.append('description', formData.description);
      submitFormData.append('resourceType', formData.resourceType);
      submitFormData.append('displayOrder', formData.displayOrder.toString());
      
      if (formData.file) {
        submitFormData.append('file', formData.file);
      }
      
      if (editingResource) {
        submitFormData.append('isActive', 'true');
      }
      
      const url = '/api/hero-resources';
      const method = editingResource ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: submitFormData
      });
      
      if (response.ok) {
        showSuccess(editingResource ? '更新成功' : '创建成功');
        setShowForm(false);
        setEditingResource(null);
        resetForm();
        loadData();
      } else {
        const errorData = await response.json();
        showError(errorData.error || '操作失败');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showError('操作失败');
    }
  };

  const handleEdit = (resource: HeroResource) => {
    setEditingResource(resource);
    setFormData({
      heroId: resource.heroId,
      name: resource.name,
      description: resource.description || '',
      resourceType: resource.resourceType,
      file: null,
      displayOrder: resource.displayOrder
    });
    setShowForm(true);
  };

  const handleDelete = async (resource: HeroResource) => {
    if (!confirm(`确定要删除资源 "${resource.name}" 吗？`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/hero-resources?id=${resource.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showSuccess('删除成功');
        loadData();
      } else {
        const errorData = await response.json();
        showError(errorData.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      showError('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      heroId: '',
      name: '',
      description: '',
      resourceType: 'image',
      file: null,
      displayOrder: 0
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingResource(null);
    resetForm();
  };

  const filteredResources = resources.filter(resource => {
    const matchesHero = selectedHero === 'all' || resource.heroId === selectedHero;
    const matchesType = selectedType === 'all' || resource.resourceType === selectedType;
    return matchesHero && matchesType;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getResourceTypeLabel = (type: string) => {
    const typeObj = resourceTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">英雄资源管理</h2>
          <button
            onClick={() => {
              setEditingResource(null);
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            添加资源
          </button>
        </div>
        
        {/* 筛选器 */}
        <div className="flex gap-4">
          <select
            value={selectedHero}
            onChange={(e) => setSelectedHero(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部英雄</option>
            {heroes.map(hero => (
              <option key={hero.id} value={hero.id}>
                {hero.name} ({hero.englishName})
              </option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部类型</option>
            {resourceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 资源表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingResource ? '编辑资源' : '添加资源'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  英雄 *
                </label>
                <select
                  value={formData.heroId}
                  onChange={(e) => setFormData({ ...formData, heroId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">请选择英雄</option>
                  {heroes.map(hero => (
                    <option key={hero.id} value={hero.id}>
                      {hero.name} ({hero.englishName})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  资源类型 *
                </label>
                <select
                  value={formData.resourceType}
                  onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {resourceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                资源名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入资源名称"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="输入资源描述（可选）"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文件 {!editingResource && '*'}
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept={formData.resourceType === 'image' ? 'image/*' : 
                          formData.resourceType === 'video' ? 'video/*' :
                          formData.resourceType === 'audio' ? 'audio/*' : '*'}
                  required={!editingResource}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  显示顺序
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {editingResource ? '更新' : '创建'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 资源列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            资源列表 ({filteredResources.length})
          </h3>
        </div>
        
        {filteredResources.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无资源数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    预览
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    英雄
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顺序
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {resource.resourceType === 'image' ? (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <Image
                            src={resource.filePath}
                            alt={resource.name}
                            width={48}
                            height={48}
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            {getResourceTypeLabel(resource.resourceType)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {resource.name}
                        </div>
                        {resource.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {resource.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {resource.hero.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {resource.hero.englishName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getResourceTypeLabel(resource.resourceType)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(resource.fileSize)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {resource.displayOrder}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(resource)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroResourceManager;
