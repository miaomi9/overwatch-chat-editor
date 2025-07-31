'use client';

import { useState, useEffect } from 'react';
import i18nTexts from '@/data/teammate-matching-i18n.json';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  language?: 'zh' | 'en';
}

export default function TermsModal({ isOpen, onAccept, language = 'zh' }: TermsModalProps) {
  const t = i18nTexts[language];
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-900 border border-orange-500/30 rounded-xl max-w-md sm:max-w-lg w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col">
        {/* 头部 */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/textures/00000003A4EB.png" alt="守望先锋" className="w-8 h-8" />
            <h2 className="text-xl font-bold text-orange-400">{t.termsTitle}</h2>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <img src="/textures/00000001F944.png" alt="警告" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">{t.importantStatement}</h3>
                <p className="text-sm leading-relaxed">
                  {t.importantStatementContent}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/0000000039DA.png" alt="组队" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">{t.usageScope}</h3>
                <p className="text-sm leading-relaxed">
                  {t.usageScopeContent}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/000000005A0E.png" alt="确认" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">{t.civilizedGaming}</h3>
                <p className="text-sm leading-relaxed">
                  {t.civilizedGamingContent}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/00000001F935.png" alt="禁止" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">{t.prohibitedBehavior}</h3>
                <p className="text-sm leading-relaxed">
                  {t.prohibitedBehaviorContent}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <img src="/textures/0000000207B9.png" alt="战利品箱" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-2">{t.taskCompletion}</h3>
                <p className="text-sm leading-relaxed">
                  {t.taskCompletionContent}
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
                {t.agreeTerms}
              </span>
            </label>
            
            <button
              onClick={onAccept}
              disabled={!agreed}
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-xs sm:text-base min-h-[40px] sm:min-h-[44px]"
            >
              <img src="/textures/00000001F928.png" alt="确认" className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>{t.agreeAndContinue}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}