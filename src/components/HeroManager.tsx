'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Toast from './Toast';
import { useToast } from '@/hooks/useToast';

interface Hero {
  id: string;
  name: string;
  englishName: string;
  avatar: string | null;
  role: string | null;
  extensions: any;
  createdAt: string;
  updatedAt: string;
}

interface HeroFormData {
  name: string;
  englishName: string;
  avatar: File | null;
  role: string;
  extensions: string;
  removeAvatar: boolean;
}

const HeroManager: React.FC = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<Hero | null>(null);
  const [formData, setFormData] = useState<HeroFormData>({
    name: '',
    englishName: '',
    avatar: null,
    role: '',
    extensions: '',
    removeAvatar: false
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  // 获取英雄列表
  const fetchHeroes = async () => {
    try {
      const response = await fetch('/api/heroes');
      const data = await response.json();
      if (response.ok) {
        setHeroes(data.heroes);
      } else {
        showToast(data.error || '获取英雄列表失败', 'error');
      }
    } catch (error) {
      showToast('获取英雄列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroes();
  }, []);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      englishName: '',
      avatar: null,
      role: '',
      extensions: '',
      removeAvatar: false
    });
    setEditingHero(null);
  };

  // 打开新增对话框
  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (hero: Hero) => {
    setEditingHero(hero);
    setFormData({
      name: hero.name,
      englishName: hero.englishName,
      avatar: null,
      role: hero.role || '',
      extensions: hero.extensions ? JSON.stringify(hero.extensions, null, 2) : '',
      removeAvatar: false
    });
    setIsDialogOpen(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('englishName', formData.englishName);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('extensions', formData.extensions);
      
      if (editingHero) {
        formDataToSend.append('id', editingHero.id);
        formDataToSend.append('removeAvatar', formData.removeAvatar.toString());
      }
      
      if (formData.avatar) {
        formDataToSend.append('avatar', formData.avatar);
      }

      const url = '/api/heroes';
      const method = editingHero ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast(editingHero ? '英雄更新成功' : '英雄创建成功', 'success');
        closeDialog();
        fetchHeroes();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除英雄
  const handleDelete = async (heroId: string) => {
    try {
      const response = await fetch(`/api/heroes?id=${heroId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast('英雄删除成功', 'success');
        fetchHeroes();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, avatar: file, removeAvatar: false }));
  };

  // 移除头像
  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: null, removeAvatar: true }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">英雄管理</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">英雄管理</h2>
          <button
            onClick={openAddDialog}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            添加英雄
          </button>
        </div>
        {/* 对话框 */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {editingHero ? '编辑英雄' : '添加英雄'}
                </h3>
                <button
                  onClick={closeDialog}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">中文名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入中文名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">英文名称</label>
                  <input
                    type="text"
                    value={formData.englishName}
                    onChange={(e) => setFormData(prev => ({ ...prev, englishName: e.target.value }))}
                    placeholder="请输入英文名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">职责</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择职责</option>
                    <option value="重装">重装</option>
                    <option value="输出">输出</option>
                    <option value="支援">支援</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">头像</label>
                  <div className="space-y-2">
                    {editingHero?.avatar && !formData.removeAvatar && !formData.avatar && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                          <img src={editingHero.avatar} alt={editingHero.name} className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="flex items-center gap-1 px-2 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          <XMarkIcon className="w-4 h-4" />
                          移除
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {formData.avatar && (
                      <div className="text-sm text-gray-600">
                        已选择: {formData.avatar.name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">扩展字段 (JSON格式)</label>
                  <textarea
                    value={formData.extensions}
                    onChange={(e) => setFormData(prev => ({ ...prev, extensions: e.target.value }))}
                    placeholder='{"role": "tank", "difficulty": 2}'
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {submitting ? '保存中...' : (editingHero ? '更新' : '创建')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {heroes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无英雄数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">头像</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">中文名称</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">英文名称</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">职责</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">扩展字段</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">创建时间</th>
                  <th className="text-left py-3 px-4 text-gray-700 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {heroes.map((hero) => (
                  <tr key={hero.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        {hero.avatar ? (
                          <img src={hero.avatar} alt={hero.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                            {hero.name[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{hero.name}</td>
                    <td className="py-3 px-4 text-gray-600">{hero.englishName}</td>
                    <td className="py-3 px-4">
                      {hero.role ? (
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          hero.role === '重装' ? 'bg-blue-100 text-blue-800' :
                          hero.role === '输出' ? 'bg-red-100 text-red-800' :
                          hero.role === '支援' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {hero.role}
                        </span>
                      ) : (
                        <span className="text-gray-400">未设置</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hero.extensions ? (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded border border-blue-200">
                          {Object.keys(hero.extensions).length} 个字段
                        </span>
                      ) : (
                        <span className="text-gray-400">无</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(hero.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditDialog(hero)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          title="编辑"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除英雄 "${hero.name}" 吗？此操作不可撤销。`)) {
                              handleDelete(hero.id);
                            }
                          }}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="删除"
                        >
                          <TrashIcon className="w-4 h-4" />
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
  );
};

export default HeroManager;