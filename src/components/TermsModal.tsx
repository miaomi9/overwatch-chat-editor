'use client';

import { useState, useEffect } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export default function TermsModal({ isOpen, onAccept }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-900 border border-orange-500/30 rounded-xl max-w-md sm:max-w-lg w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col">
        {/* 头部 */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/textures/00000003A4EB.png" alt="守望先锋" className="w-8 h-8" />
            <h2 className="text-xl font-bold text-orange-400">使用条款</h2>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <img src="/textures/00000001F944.png" alt="警告" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">重要声明</h3>
                <p className="text-sm leading-relaxed">
                  本队友匹配系统仅为完成游戏内紫色战利品箱任务而设计，专门用于满足游戏任务要求的组队需求。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/0000000039DA.png" alt="组队" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">使用范围</h3>
                <p className="text-sm leading-relaxed">
                  本系统不适用于其他类型的匹配需求，包括但不限于竞技排位、娱乐模式、自定义游戏等其他游戏内容的组队。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/000000005A0E.png" alt="确认" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">文明游戏</h3>
                <p className="text-sm leading-relaxed">
                  请遵守游戏规则，保持良好的游戏环境，尊重其他玩家，文明交流，共同营造健康的游戏氛围。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/00000001F935.png" alt="禁止" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">禁止行为</h3>
                <p className="text-sm leading-relaxed">
                  严禁利用本系统进行任何违规行为，包括但不限于恶意刷分、代练、外挂使用等违反游戏服务条款的行为。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/0000000207B9.png" alt="战利品箱" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">任务完成</h3>
                <p className="text-sm leading-relaxed">
                  匹配成功后，请按照游戏要求完成相应任务，获得紫色战利品箱奖励。任务完成后建议及时解散队伍。
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
                我已阅读并同意以上使用条款
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