'use client';

import { useState } from 'react';

interface CommunityTemplateTermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export default function CommunityTemplateTermsModal({ isOpen, onAccept }: CommunityTemplateTermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-900 border border-orange-500/30 rounded-xl max-w-md sm:max-w-lg w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col">
        {/* 头部 */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/textures/00000003A4EB.png" alt="守望先锋" className="w-8 h-8" />
            <h2 className="text-xl font-bold text-orange-400">社区模板使用条约</h2>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <img src="/textures/00000001F944.png" alt="警告" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">重要提醒</h3>
                <p className="text-sm leading-relaxed">
                  在使用社区模板前，请仔细阅读并遵守以下使用条约。这些条约旨在维护良好的游戏环境和玩家体验。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/00000001F935.png" alt="禁止" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">禁止滥用聊天码</h3>
                <p className="text-sm leading-relaxed">
                  请不要滥用聊天码，包括但不限于：
                </p>
                <ul className="text-sm leading-relaxed mt-2 space-y-1 ml-4">
                  <li>• 冒充官方或系统消息</li>
                  <li>• 诱骗他人离开游戏</li>
                  <li>• 发布虚假信息或误导性内容</li>
                  <li>• 进行恶意骚扰或攻击行为</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/0000000039DA.png" alt="TTS" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">TTS 体验影响</h3>
                <p className="text-sm leading-relaxed">
                  请注意，这些聊天码可能会影响使用文字转语音（TTS）功能的玩家体验。在使用模板时，请考虑到其他玩家的感受，避免产生不必要的干扰。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/000000005A0E.png" alt="确认" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">文明游戏</h3>
                <p className="text-sm leading-relaxed">
                  请保持文明游戏态度，尊重其他玩家，共同营造良好的游戏环境。合理使用社区模板，让游戏体验更加愉快。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-3 sm:p-6 border-t border-gray-700 bg-gray-800/50 flex-shrink-0">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 flex-shrink-0"
              />
              <span className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                我已阅读并同意遵守上述使用条约，承诺文明使用社区模板功能。
              </span>
            </label>
            
            <button
              onClick={onAccept}
              disabled={!agreed}
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-xs sm:text-base min-h-[40px] sm:min-h-[44px]"
            >
              <img src="/textures/00000001F928.png" alt="确认" className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>同意并继续</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}