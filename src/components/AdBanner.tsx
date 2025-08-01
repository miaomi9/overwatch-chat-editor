'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface AdBannerProps {
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentAd, setCurrentAd] = useState<'wechat' | 'qq'>('wechat');
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className} sm:bottom-4 sm:right-4 max-sm:bottom-2 max-sm:right-2`}>
      <div className={`bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm border border-orange-500/30 rounded-xl shadow-2xl transition-all duration-300 hover:border-orange-500/50 ${
        isMinimized 
          ? 'p-2 max-sm:p-1.5' 
          : 'p-4 max-w-xs sm:max-w-xs max-sm:max-w-[280px] max-sm:p-3'
      }`}>
        {/* 控制按钮 */}
        <div className="absolute top-2 right-2 flex gap-1 max-sm:top-1 max-sm:right-1">
          {/* 最小化/展开按钮 (仅在手机端显示) */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="sm:hidden p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
            title={isMinimized ? '展开' : '收起'}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMinimized ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0l-7 7m7-7v18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7m0 0l7-7m-7 7V3" />
              )}
            </svg>
          </button>
          {/* 关闭按钮 */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50 max-sm:p-1.5"
            title="关闭"
          >
            <XMarkIcon className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5" />
          </button>
        </div>

        {/* 标题 */}
        <div className={`flex items-center gap-2 mb-3 max-sm:mb-2 ${isMinimized ? 'max-sm:mb-0' : ''}`}>
          <div className={`p-2 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30 max-sm:p-1.5 ${isMinimized ? 'max-sm:p-1' : ''}`}>
            <UserGroupIcon className={`w-5 h-5 text-orange-400 max-sm:w-4 max-sm:h-4 ${isMinimized ? 'max-sm:w-3 max-sm:h-3' : ''}`} />
          </div>
          <div className={isMinimized ? 'max-sm:hidden' : ''}>
            <h3 className="text-white font-semibold text-sm max-sm:text-xs">加入社区</h3>
            <p className="text-gray-400 text-xs max-sm:text-[10px]">获取最新资讯和交流</p>
          </div>
        </div>

        {/* 切换按钮 */}
        <div className={`flex gap-2 mb-3 max-sm:mb-2 max-sm:gap-1 ${isMinimized ? 'max-sm:hidden' : ''}`}>
          <button
            onClick={() => setCurrentAd('wechat')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 max-sm:px-2 max-sm:py-1.5 max-sm:text-[10px] ${
              currentAd === 'wechat'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mx-auto mb-1 max-sm:w-3 max-sm:h-3 max-sm:mb-0.5" />
            <span className="max-sm:hidden">微信公众号</span>
            <span className="sm:hidden">微信</span>
          </button>
          <button
            onClick={() => setCurrentAd('qq')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 max-sm:px-2 max-sm:py-1.5 max-sm:text-[10px] ${
              currentAd === 'qq'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 mx-auto mb-1 max-sm:w-3 max-sm:h-3 max-sm:mb-0.5" />
            <span className="max-sm:hidden">QQ交流群</span>
            <span className="sm:hidden">QQ群</span>
          </button>
        </div>

        {/* 广告图片 */}
        <div className={`relative overflow-hidden rounded-lg border border-gray-600/30 ${isMinimized ? 'max-sm:hidden' : ''}`}>
          <div className={`flex justify-center items-center ${currentAd === 'qq' ? 'min-h-[280px]' : 'min-h-[240px]'}`}>
            <Image
              src={currentAd === 'wechat' ? '/ad/公众号.jpg' : '/ad/qq群.jpg'}
              alt={currentAd === 'wechat' ? '微信公众号二维码' : 'QQ群二维码'}
              width={240}
              height={currentAd === 'qq' ? 280 : 240}
              className={`w-full h-auto object-contain max-sm:max-w-[200px] max-sm:mx-auto ${
                currentAd === 'qq' ? 'max-h-[320px]' : 'max-h-[240px]'
              }`}
              priority={false}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        {/* 描述文字 */}
        <div className={`mt-3 text-center max-sm:mt-2 ${isMinimized ? 'max-sm:hidden' : ''}`}>
          <p className="text-gray-300 text-xs leading-relaxed max-sm:text-[10px] max-sm:leading-tight">
            {currentAd === 'wechat'
              ? '扫码关注微信公众号，获取最新功能更新和使用技巧'
              : '扫码加入QQ交流群，与其他玩家交流心得和建议'
            }
          </p>
        </div>

        {/* 底部提示 */}
        <div className={`mt-3 pt-3 border-t border-gray-700/50 max-sm:mt-2 max-sm:pt-2 ${isMinimized ? 'max-sm:hidden' : ''}`}>
          <p className="text-gray-500 text-xs text-center max-sm:text-[10px]">
            <span className="sm:hidden">点击 ↓ 收起 · 点击 ✕ 关闭</span>
            <span className="max-sm:hidden">点击右上角 ✕ 可关闭此窗口</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;