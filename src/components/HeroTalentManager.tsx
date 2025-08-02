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

interface HeroTalent {
  id: string;
  name: string;
  type: 'weapon' | 'skill' | 'survival' | 'ability';
  icon?: string;
  cost?: number;
  description: string;
  heroId: string;
  isActive: boolean;
  displayOrder: number;
  hero: Hero;
  createdAt: string;
  updatedAt: string;
}

interface TalentFormData {
  name: string;
  type: 'weapon' | 'skill' | 'survival' | 'ability';
  icon: string;
  cost: number | null;
  description: string;
  heroId: string;
  displayOrder: number;
}

const TALENT_TYPES = [
  { value: 'weapon', label: '武器', color: 'bg-red-100 text-red-800' },
  { value: 'skill', label: '技能', color: 'bg-blue-100 text-blue-800' },
  { value: 'survival', label: '生存', color: 'bg-green-100 text-green-800' },
  { value: 'ability', label: '异能', color: 'bg-purple-100 text-purple-800' }
];

const HeroTalentManager: React.FC = () => {
  const [talents, setTalents] = useState<HeroTalent[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTalent, setEditingTalent] = useState<HeroTalent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHero, setSelectedHero] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedTalents, setSelectedTalents] = useState<Set<string>>(new Set());
  const [showBatchForm, setShowBatchForm] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<TalentFormData>({
    name: '',
    type: 'weapon',
    icon: '',
    cost: null,
    description: '',
    heroId: '',
    displayOrder: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载英雄列表
      const heroesResponse = await fetch('/api/heroes');
      if (heroesResponse.ok) {
        const heroesData = await heroesResponse.json();
        setHeroes(heroesData.heroes || []);
      }
      
      // 加载天赋列表
      const talentsResponse = await fetch('/api/hero-talents');
      if (talentsResponse.ok) {
        const talentsData = await talentsResponse.json();
        setTalents(talentsData.talents || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.heroId) {
      showToast('请填写所有必填字段', 'error');
      return;
    }
    
    try {
      const url = editingTalent ? '/api/hero-talents' : '/api/hero-talents';
      const method = editingTalent ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        ...(editingTalent && { id: editingTalent.id })
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        showToast(editingTalent ? '更新成功' : '添加成功', 'success');
        setShowForm(false);
        setEditingTalent(null);
        resetForm();
        loadData();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '操作失败', 'error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showToast('操作失败', 'error');
    }
  };

  const handleEdit = (talent: HeroTalent) => {
    setEditingTalent(talent);
    setFormData({
      name: talent.name,
      type: talent.type,
      icon: talent.icon || '',
      cost: talent.cost ?? null,
      description: talent.description,
      heroId: talent.heroId,
      displayOrder: talent.displayOrder
    });
    setIconPreview(null); // 清除预览，使用现有图标
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个天赋吗？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/hero-talents?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        showToast('删除成功', 'success');
        loadData();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('Error deleting talent:', error);
      showToast('删除失败', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'weapon',
      icon: '',
      cost: null,
      description: '',
      heroId: '',
      displayOrder: 0
    });
    setIconPreview(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTalent(null);
    resetForm();
  };

  // 批量操作相关函数
  const handleSelectTalent = (talentId: string) => {
    const newSelected = new Set(selectedTalents);
    if (newSelected.has(talentId)) {
      newSelected.delete(talentId);
    } else {
      newSelected.add(talentId);
    }
    setSelectedTalents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTalents.size === filteredTalents.length) {
      setSelectedTalents(new Set());
    } else {
      setSelectedTalents(new Set(filteredTalents.map(t => t.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTalents.size === 0) {
      showToast('请先选择要删除的天赋', 'error');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedTalents.size} 个天赋吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedTalents).map(id =>
        fetch(`/api/hero-talents?id=${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      showToast(`成功删除 ${selectedTalents.size} 个天赋`, 'success');
      setSelectedTalents(new Set());
      loadData();
    } catch (error) {
      showToast('批量删除失败', 'error');
    }
  };

  const handleBatchSetHero = async (targetHeroId: string) => {
    if (selectedTalents.size === 0) {
      showToast('请先选择要设置的天赋', 'error');
      return;
    }

    if (!targetHeroId) {
      showToast('请选择目标英雄', 'error');
      return;
    }

    try {
      const updatePromises = Array.from(selectedTalents).map(id => {
        const talent = talents.find(t => t.id === id);
        if (!talent) return Promise.resolve();
        
        return fetch('/api/hero-talents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: talent.id,
            heroId: targetHeroId
          })
        });
      });
      
      await Promise.all(updatePromises);
      showToast(`成功将 ${selectedTalents.size} 个天赋设置给目标英雄`, 'success');
      setSelectedTalents(new Set());
      setShowBatchForm(false);
      loadData();
    } catch (error) {
      showToast('批量设置失败', 'error');
    }
  };

  const handleBatchCopy = async (targetHeroId: string) => {
    if (selectedTalents.size === 0) {
      showToast('请先选择要复制的天赋', 'error');
      return;
    }

    if (!targetHeroId) {
      showToast('请选择目标英雄', 'error');
      return;
    }

    try {
      const copyPromises = Array.from(selectedTalents).map(id => {
        const talent = talents.find(t => t.id === id);
        if (!talent) return Promise.resolve();
        
        return fetch('/api/hero-talents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: talent.name,
            type: talent.type,
            icon: talent.icon,
            cost: talent.cost,
            description: talent.description,
            heroId: targetHeroId,
            displayOrder: talent.displayOrder
          })
        });
      });
      
      await Promise.all(copyPromises);
      showToast(`成功复制 ${selectedTalents.size} 个天赋到目标英雄`, 'success');
      setSelectedTalents(new Set());
      setShowBatchForm(false);
      loadData();
    } catch (error) {
      showToast('批量复制失败', 'error');
    }
  };

  const handleTypeChange = (type: 'weapon' | 'skill' | 'survival' | 'ability') => {
    setFormData(prev => ({
      ...prev,
      type,
      cost: type === 'ability' ? null : prev.cost
    }));
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 格式的图片', 'error');
      return;
    }

    // 验证文件大小 (限制为 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showToast('文件大小不能超过 2MB', 'error');
      return;
    }

    setUploadingIcon(true);
    
    try {
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 上传文件
      const uploadFormData = new FormData();
      uploadFormData.append('icon', file);
      uploadFormData.append('talentId', editingTalent?.id || 'new');
      uploadFormData.append('talentType', formData.type);

      const response = await fetch('/api/upload-talent-icon', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setFormData(prev => ({ ...prev, icon: result.path }));
        showToast('图标上传成功', 'success');
      } else {
        showToast(result.error || '上传失败', 'error');
        setIconPreview(null);
      }
    } catch (error) {
      console.error('上传图标时出错:', error);
      showToast('上传失败，请重试', 'error');
      setIconPreview(null);
    } finally {
      setUploadingIcon(false);
    }
  };

  // 过滤天赋
  const filteredTalents = talents.filter(talent => {
    const matchesSearch = talent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         talent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         talent.hero.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHero = selectedHero === 'all' || talent.heroId === selectedHero;
    const matchesType = selectedType === 'all' || talent.type === selectedType;
    
    return matchesSearch && matchesHero && matchesType;
  });

  const getTypeInfo = (type: string) => {
    return TALENT_TYPES.find(t => t.value === type) || TALENT_TYPES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">英雄天赋管理</h2>
        <div className="flex gap-2">
          {selectedTalents.size > 0 && (
            <>
              <button
                onClick={() => setShowBatchForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                批量操作 ({selectedTalents.size})
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                批量删除
              </button>
            </>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加天赋
          </button>
        </div>
      </div>



      {/* 搜索和筛选 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="搜索天赋名称、描述或英雄..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={selectedHero}
            onChange={(e) => setSelectedHero(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有英雄</option>
            {heroes.map(hero => (
              <option key={hero.id} value={hero.id}>{hero.name}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有类型</option>
            {TALENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 天赋表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingTalent ? '编辑天赋' : '添加天赋'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    天赋名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    所属英雄 *
                  </label>
                  <select
                    value={formData.heroId}
                    onChange={(e) => setFormData(prev => ({ ...prev, heroId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">选择英雄</option>
                    {heroes.map(hero => (
                      <option key={hero.id} value={hero.id}>{hero.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    技能类型 *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {TALENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    花费 {formData.type === 'ability' && '(异能无花费)'}
                  </label>
                  <input
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      cost: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={formData.type === 'ability'}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    显示顺序
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      displayOrder: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  技能图标
                </label>
                <div className="space-y-3">
                  {/* 图标预览 */}
                  {(iconPreview || formData.icon) && (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                        <Image
                          src={iconPreview || formData.icon}
                          alt="技能图标预览"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          onError={() => {
                            setIconPreview(null);
                            setFormData(prev => ({ ...prev, icon: '' }));
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIconPreview(null);
                          setFormData(prev => ({ ...prev, icon: '' }));
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        移除图标
                      </button>
                    </div>
                  )}
                  
                  {/* 文件上传 */}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      disabled={uploadingIcon}
                      className="hidden"
                      id="icon-upload"
                    />
                    <label
                      htmlFor="icon-upload"
                      className={`px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        uploadingIcon ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingIcon ? '上传中...' : '选择图标文件'}
                    </label>
                    <span className="text-sm text-gray-500">
                      支持 JPG、PNG、GIF、WebP 格式，最大 2MB
                    </span>
                  </div>
                  

                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  技能介绍 *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                  placeholder="详细描述这个技能的效果和用法..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTalent ? '更新' : '添加'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 天赋列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            天赋列表 ({filteredTalents.length})
          </h3>
        </div>
        
        {filteredTalents.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            暂无天赋数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTalents.size === filteredTalents.length && filteredTalents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    天赋信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    英雄
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    花费
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTalents.map((talent) => {
                  const typeInfo = getTypeInfo(talent.type);
                  return (
                    <tr key={talent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTalents.has(talent.id)}
                          onChange={() => handleSelectTalent(talent.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          {talent.icon && (
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Image
                                src={talent.icon}
                                alt={talent.name}
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {talent.name}
                            </p>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {talent.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {talent.hero.avatar && (
                            <Image
                              src={talent.hero.avatar}
                              alt={talent.hero.name}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )}
                          <span className="text-sm text-gray-900">{talent.hero.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {talent.cost !== null ? talent.cost : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(talent)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(talent.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 批量操作表单 */}
      {showBatchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              批量操作 ({selectedTalents.size} 个天赋)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择目标英雄
                </label>
                <select
                  id="batchTargetHero"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择英雄</option>
                  {heroes.map(hero => (
                    <option key={hero.id} value={hero.id}>{hero.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const select = document.getElementById('batchTargetHero') as HTMLSelectElement;
                    handleBatchSetHero(select.value);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  批量设置
                </button>
                <button
                  onClick={() => {
                    const select = document.getElementById('batchTargetHero') as HTMLSelectElement;
                    handleBatchCopy(select.value);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  批量复制
                </button>
                <button
                  onClick={() => setShowBatchForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroTalentManager;