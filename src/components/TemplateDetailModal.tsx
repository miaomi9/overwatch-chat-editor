'use client';

import React from 'react';

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  overwatchCode: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateDetailModalProps {
  template: UserTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onCopy: (code: string) => void;
  onLike: (templateId: string) => void;
  isLiked: boolean;
  templatePreview: any[];
}

const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  template,
  isOpen,
  onClose,
  onCopy,
  onLike,
  isLiked,
  templatePreview
}) => {
  if (!isOpen || !template) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{template.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>创建时间: {formatDate(template.createdAt)}</span>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{template.likesCount} 个赞</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 模态框内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 描述 */}
          {template.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">描述</h3>
              <p className="text-gray-300 leading-relaxed">{template.description}</p>
            </div>
          )}

          {/* 预览 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">预览效果</h3>
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 min-h-[200px]">
              {templatePreview && templatePreview.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {templatePreview.map((element, index) => {
                      if (element.type === 'text') {
                        return (
                          <span key={index} className="text-white font-mono bg-gray-700/50 px-2 py-1 rounded">
                            {element.content}
                          </span>
                        );
                      } else if (element.type === 'color') {
                        return (
                          <span
                            key={index}
                            className="font-mono bg-gray-700/50 px-2 py-1 rounded"
                            style={{ color: element.color }}
                          >
                            {element.content}
                          </span>
                        );
                      } else if (element.type === 'texture' && element.texture) {
                        return (
                          <div key={index} className="flex items-center gap-2 bg-gray-700/50 px-2 py-1 rounded">
                            <img
                              src={element.texture.imagePath}
                              alt={element.texture.name}
                              className="w-6 h-6"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span className="text-white font-mono text-sm">{element.texture.name}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">🎨</div>
                  <div>无法生成预览，请查看原始代码</div>
                </div>
              )}
            </div>
          </div>

          {/* 守望先锋代码 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">守望先锋代码</h3>
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">
                {template.overwatchCode}
              </pre>
            </div>
          </div>
        </div>

        {/* 模态框底部操作按钮 */}
        <div className="flex justify-between items-center p-6 border-t border-gray-600 bg-gray-800/50">
          <button
            onClick={() => onLike(template.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isLiked
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30'
            }`}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {isLiked ? '已点赞' : '点赞'} ({template.likesCount})
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => onCopy(template.overwatchCode)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制代码
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 font-semibold"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetailModal;