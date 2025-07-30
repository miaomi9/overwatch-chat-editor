'use client';

import { useState } from 'react';
import { XMarkIcon, PlusIcon, ExclamationTriangleIcon, CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface AddExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function AddExchangeModal({ isOpen, onClose, onSubmit, isSubmitting }: AddExchangeModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [step, setStep] = useState<'input' | 'help'>('input');

  // 验证链接格式的函数
  const isValidShareUrl = (url: string): boolean => {
    // 检查是否为守望先锋官方域名的链接并包含 shareToken 参数
    const isOWDomain = /ow\.blizzard\.cn/i.test(url);
    const hasShareToken = /shareToken\s*=\s*[a-zA-Z0-9]+/i.test(url);
    return isOWDomain && hasShareToken;
  };

  const handleSubmit = async () => {
    if (!shareUrl.trim()) return;
    
    await onSubmit(shareUrl);
    setShareUrl('');
    onClose();
  };

  const handleClose = () => {
    setShareUrl('');
    setStep('input');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-600 shadow-2xl max-w-md w-full mx-3 sm:mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">添加卡片交换</h2>
                <p className="text-orange-100 text-xs sm:text-sm truncate">分享你的守望先锋集卡链接</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ml-2"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4 sm:p-6">
          {step === 'input' ? (
            <div className="space-y-6">
              {/* 输入区域 */}
              <div className="space-y-3">
                <label className="block text-white font-medium text-sm sm:text-base">
                  分享链接
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    placeholder="粘贴你的守望先锋集卡分享链接..."
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 border rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm sm:text-base ${
                      shareUrl && !isValidShareUrl(shareUrl) 
                        ? 'border-red-400 focus:ring-red-500' 
                        : shareUrl && isValidShareUrl(shareUrl)
                        ? 'border-green-400 focus:ring-green-500'
                        : 'border-gray-600 focus:ring-orange-500'
                    }`}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                
                {/* 状态提示 */}
                {shareUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    {!isValidShareUrl(shareUrl) ? (
                      <>
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
                        <span className="text-red-400">请输入有效的守望先锋集卡分享链接</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 text-green-400" />
                        <span className="text-green-400">链接格式正确</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 快速提示 */}
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="text-blue-300 font-medium mb-1">如何获取分享链接？</p>
                    <p className="text-blue-200 leading-relaxed">在守望先锋官方页面复制包含 shareToken= 的完整链接</p>
                  </div>
                </div>
              </div>

              {/* 交换建议提示 */}
              <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="text-amber-300 font-medium mb-1">💡 建议优先使用交换模式</p>
                    <p className="text-amber-200 leading-relaxed">推荐选择"交换卡片"而非"赠送卡片"，避免卡片流入闲鱼等二手平台被恶意倒卖，保护社区交换环境。</p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 sm:gap-3">
                {/* <button
                  onClick={() => setStep('help')}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 text-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">获取帮助</span>
                  <span className="sm:hidden">帮助</span>
                </button> */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !shareUrl.trim()}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-orange-600 text-white rounded-lg sm:rounded-xl hover:bg-orange-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">添加中...</span>
                      <span className="sm:hidden">添加中</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">立即添加</span>
                      <span className="sm:hidden">添加</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* 帮助页面 */
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">如何获取分享链接</h3>
                <p className="text-gray-400 text-sm sm:text-base">按照以下步骤获取你的集卡分享链接</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm sm:text-base">打开守望先锋小程序或网页</h4>
                    <p className="text-gray-400 text-xs sm:text-sm">进入集卡活动页面</p>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm sm:text-base">选择要分享的卡片</h4>
                    <p className="text-gray-400 text-xs sm:text-sm">点击你想要交换、请求或赠送的卡片</p>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm sm:text-base">复制分享链接</h4>
                    <p className="text-gray-400 text-xs sm:text-sm">点击分享按钮，复制包含 shareToken= 的完整链接</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="text-yellow-300 font-medium mb-1">注意事项</p>
                    <p className="text-yellow-200 leading-relaxed">确保链接包含 shareToken= 参数，这是识别卡片信息的关键</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('input')}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-orange-600 text-white rounded-lg sm:rounded-xl hover:bg-orange-500 transition-colors font-medium text-sm sm:text-base"
              >
                返回添加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}