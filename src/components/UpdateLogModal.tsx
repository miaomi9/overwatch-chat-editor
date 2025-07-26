'use client';

import React, { useState, useEffect } from 'react';

interface UpdateLogModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const UpdateLogModal: React.FC<UpdateLogModalProps> = ({ isVisible, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 当前版本号
  const CURRENT_VERSION = '1.1.0';
  
  // 更新日志内容
  const updateLogs = [
    {
      version: '1.1.0',
      date: '2025-07-26',
      title: '纹理数据缓存优化更新',
      features: [
        '🚀 新增纹理数据智能缓存系统',
        '💾 支持内存缓存和本地存储双重缓存',
        '⚡ 大幅提升页面加载速度，减少服务器压力',
        '🔄 新增版本控制机制，自动检测数据更新',
        '🧹 管理页面新增缓存状态显示和手动清除功能',
        '📱 优化移动端显示效果',
        '🐛 修复了一些已知问题'
      ],
      improvements: [
        '缓存有效期设置为24小时，平衡性能与数据新鲜度',
        '数据更新后自动清除旧缓存，确保用户获取最新内容',
        '优化了纹理加载逻辑，提升用户体验'
      ]
    }
  ];

  const handleClose = () => {
    if (dontShowAgain) {
      // 将当前版本标记为已查看
      localStorage.setItem('lastViewedUpdateVersion', CURRENT_VERSION);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-orange-500/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🎉</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">更新日志</h2>
                <p className="text-gray-400 text-sm">查看最新功能和改进</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800/50 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {updateLogs.map((log, index) => (
            <div key={log.version} className={`${index > 0 ? 'mt-8 pt-8 border-t border-gray-700/50' : ''}`}>
              {/* 版本信息 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-medium">
                  v{log.version}
                </div>
                <span className="text-gray-400 text-sm">{log.date}</span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">{log.title}</h3>
              
              {/* 新功能 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <span>✨</span>
                  新功能
                </h4>
                <ul className="space-y-2">
                  {log.features.map((feature, idx) => (
                    <li key={idx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-orange-400 mt-1 text-sm">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* 改进优化 */}
              {log.improvements && log.improvements.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <span>🔧</span>
                    改进优化
                  </h4>
                  <ul className="space-y-2">
                    {log.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-1 text-sm">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className="p-6 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
              />
              <span className="text-gray-300 text-sm">不再显示此版本的更新日志</span>
            </label>
            
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateLogModal;