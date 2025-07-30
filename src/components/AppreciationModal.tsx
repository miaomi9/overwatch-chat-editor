'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Image from 'next/image';

// 创建全局状态上下文
interface AppreciationContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AppreciationContext = createContext<AppreciationContextType | undefined>(undefined);

// Provider组件
export const AppreciationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <AppreciationContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      <AppreciationModal />
    </AppreciationContext.Provider>
  );
};

// Hook for using the context
const useAppreciation = () => {
  const context = useContext(AppreciationContext);
  if (context === undefined) {
    throw new Error('useAppreciation must be used within an AppreciationProvider');
  }
  return context;
};

// 全局弹窗组件
const AppreciationModal: React.FC = () => {
  const { isOpen, closeModal } = useAppreciation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 relative">
        {/* 关闭按钮 */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          🤜😭🤛我扛不住啦（指服务器带宽）🤜😭🤛
        </h2>

        {/* 描述文本 */}
        <div className="text-gray-300 mb-6 space-y-2">
          <p className="text-center">
            如果这个工具对你有帮助，欢迎通过以下方式支持我们的开发工作：
          </p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• 为服务器运行和维护提供支持</li>
            <li>• 帮助我们持续改进和添加新功能</li>
            <li>• 让更多用户能够免费使用这个工具</li>
          </ul>
        </div>

        {/* 赞赏码图片 */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-4 rounded-lg">
            <Image
              src="/appreciation/appreciation.jpg"
              alt="赞赏码"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* 感谢文本 */}
        <p className="text-center text-gray-400 text-sm">
          感谢你的支持！每一份赞赏都是我们前进的动力。
        </p>
      </div>
    </div>
  );
};

// 触发按钮组件
interface AppreciationButtonProps {
  className?: string;
}

export const AppreciationButton: React.FC<AppreciationButtonProps> = ({ className = '' }) => {
  const { openModal } = useAppreciation();

  return (
    <button
      onClick={openModal}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg hover:from-pink-600/30 hover:to-pink-700/30 hover:border-pink-400/50 transition-all duration-200 group ${className}`}
    >
      <span className="text-lg">💖</span>
      <span className="text-white text-sm font-medium">赞赏支持</span>
      <svg className="w-4 h-4 text-pink-400 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
};

export default AppreciationModal;