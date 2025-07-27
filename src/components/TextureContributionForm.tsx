'use client';

import React, { useState } from 'react';
import { createSubmitDebounce } from '@/utils/debounceThrottle';

interface TextureContributionFormProps {
  onClose: () => void;
}

interface FormData {
  txcCode: string;
  chineseName: string;
  canDisplayInGame: boolean;
}

interface SubmitResponse {
  message?: string;
  error?: string;
  needsApproval?: boolean;
}

const TextureContributionForm: React.FC<TextureContributionFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    txcCode: '',
    chineseName: '',
    canDisplayInGame: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // 创建防抖提交函数
  const debouncedSubmit = createSubmitDebounce(async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    
    try {
      const response = await fetch('/api/texture-contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result: SubmitResponse = await response.json();
      
      if (response.ok) {
        setSubmitMessage(result.message || '提交成功！');
        setShowSuccess(true);
        // 清空表单
        setFormData({
          txcCode: '',
          chineseName: '',
          canDisplayInGame: true,
        });
        // 3秒后自动关闭
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setSubmitError(result.error || '提交失败，请稍后重试');
      }
    } catch (error) {
      console.error('提交纹理贡献失败:', error);
      setSubmitError('网络错误，请检查网络连接后重试');
    } finally {
      setIsSubmitting(false);
    }
  }, 1000); // 1秒防抖

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本验证
    if (!formData.txcCode.trim()) {
      setSubmitError('请输入TXC代码');
      return;
    }
    
    if (!formData.chineseName.trim()) {
      setSubmitError('请输入中文名称');
      return;
    }
    
    // TXC代码格式验证
    const txcPattern = /^<TXC[0-9A-Fa-f]+>$/;
    if (!txcPattern.test(formData.txcCode)) {
      setSubmitError('TXC代码格式不正确，应为 <TXC + 数字/字母> 格式，如：<TXC00000000A180>');
      return;
    }
    
    if (formData.chineseName.length > 50) {
      setSubmitError('中文名称不能超过50个字符');
      return;
    }
    
    debouncedSubmit(formData);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除错误信息
    if (submitError) {
      setSubmitError('');
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="bg-gray-800 border border-orange-500/30 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-white mb-2">提交成功！</h3>
            <p className="text-gray-300 mb-4">{submitMessage}</p>
            <p className="text-sm text-gray-400">窗口将在3秒后自动关闭...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-gray-800 border border-orange-500/30 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">贡献未收录纹理</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-orange-400 text-xl transition-colors"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TXC代码输入 */}
          <div>
            <label htmlFor="txcCode" className="block text-sm font-medium text-gray-300 mb-1">
              TXC代码 *
            </label>
            <input
              type="text"
              id="txcCode"
              value={formData.txcCode}
              onChange={(e) => handleInputChange('txcCode', e.target.value)}
              placeholder="如：<TXC00000000A180>"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              格式：&lt;TXC + 数字/字母&gt;，如：&lt;TXC00000000A180&gt;
            </p>
          </div>
          
          {/* 中文名称输入 */}
          <div>
            <label htmlFor="chineseName" className="block text-sm font-medium text-gray-300 mb-1">
              中文名称 *
            </label>
            <input
              type="text"
              id="chineseName"
              value={formData.chineseName}
              onChange={(e) => handleInputChange('chineseName', e.target.value)}
              placeholder="请输入纹理的中文名称"
              maxLength={50}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.chineseName.length}/50 字符
            </p>
          </div>
          
          {/* 游戏显示状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              游戏显示状态 *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="canDisplayInGame"
                  checked={formData.canDisplayInGame === true}
                  onChange={() => handleInputChange('canDisplayInGame', true)}
                  className="mr-2 text-orange-500 focus:ring-orange-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-300">能在游戏中显示</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="canDisplayInGame"
                  checked={formData.canDisplayInGame === false}
                  onChange={() => handleInputChange('canDisplayInGame', false)}
                  className="mr-2 text-orange-500 focus:ring-orange-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-300">不能在游戏中显示</span>
              </label>
            </div>
          </div>
          
          {/* 错误信息 */}
          {submitError && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-md p-3">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}
          
          {/* 提交说明 */}
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-md p-3">
            <p className="text-sm text-orange-300">
              • 每小时最多可提交3次纹理贡献<br/>
              • 提交的纹理需要审核通过后才会添加到纹理库<br/>
              • 请确保TXC代码的准确性
            </p>
          </div>
          
          {/* 提交按钮 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-300 bg-gray-700/50 border border-gray-600 rounded-md hover:bg-gray-600/50 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:to-orange-500 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25"
            >
              {isSubmitting ? '提交中...' : '提交贡献'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TextureContributionForm;