'use client';

import { 
  ArrowRightIcon, 
  ArrowsRightLeftIcon, 
  HandRaisedIcon, 
  ClockIcon, 
  SparklesIcon,
  MagnifyingGlassIcon,
  BriefcaseIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import Image from 'next/image';

interface CardExchange {
  id: string;
  shareToken: string;
  actionType: 'ask' | 'exchange';
  actionInitiatorAccount: string;
  actionInitiatorCardId: number;
  actionAcceptCardId: number;
  status: 'active' | 'claimed' | 'expired';
  originalUrl: string;
  createdAt: string;
  lastCheckedAt: string;
}

interface CardExchangeItemProps {
  exchange: CardExchange;
  onStatusUpdate?: (id: string, newStatus: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshPage?: () => void;
}

const ACTION_TYPE_LABELS = {
  ask: '索要卡片',
  exchange: '交换卡片',
};

const STATUS_LABELS = {
  active: '活跃',
  claimed: '已领取',
  expired: '已过期',
};

// 地区映射
const REGION_MAP = {
  cn: '国服赛区',
  na: '北美赛区',
  apac: '亚太赛区',
  emea: '欧中非赛区',
};

// 根据卡片ID获取地区和编号
const getCardRegionAndNumber = (cardId: number): { region: keyof typeof REGION_MAP; number: number; displayName: string } => {
  if (cardId >= 1 && cardId <= 9) {
    return { region: 'cn', number: cardId, displayName: `${REGION_MAP.cn} #${cardId}` };
  } else if (cardId >= 10 && cardId <= 15) {
    const number = cardId - 9;
    return { region: 'na', number, displayName: `${REGION_MAP.na} #${number}` };
  } else if (cardId >= 16 && cardId <= 21) {
    const number = cardId - 15;
    return { region: 'apac', number, displayName: `${REGION_MAP.apac} #${number}` };
  } else if (cardId >= 22 && cardId <= 27) {
    const number = cardId - 21;
    return { region: 'emea', number, displayName: `${REGION_MAP.emea} #${number}` };
  }
  return { region: 'cn', number: 1, displayName: `${REGION_MAP.cn} #1` };
};

// 卡片ID到图片路径的映射函数
const getCardImagePath = (cardId: number): string => {
  if (cardId >= 1 && cardId <= 9) {
    return `/card/cn-${cardId}-c.png`;
  } else if (cardId >= 10 && cardId <= 15) {
    const naCardNum = cardId - 9;
    return `/card/na-${naCardNum}-c.png`;
  } else if (cardId >= 16 && cardId <= 21) {
    const apacCardNum = cardId - 15;
    return `/card/apac-${apacCardNum}-c.png`;
  } else if (cardId >= 22 && cardId <= 27) {
    const emeaCardNum = cardId - 21;
    return `/card/emea-${emeaCardNum}-c.png`;
  }
  return '/card/cn-2-c.png';
};

// 格式化时间
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return '刚刚';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}小时前`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}天前`;
  }
};

export default function CardExchangeItem({ exchange, onStatusUpdate, showToast, onRefreshPage }: CardExchangeItemProps) {
  const [isChecking, setIsChecking] = useState(false);
  
  // 【优化方案第二阶段】用户上报卡片已使用
  const handleReportUsed = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    showToast?.('正在上报卡片已使用...', 'info');
    
    try {
      const response = await fetch(`/api/card-exchanges/${exchange.id}/report-used`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上报失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        if (result.alreadyReported) {
          // 处理重复上报的情况
          showToast?.(result.message, 'info');
        } else if (result.newStatus === 'claimed') {
          showToast?.('感谢您的上报！该卡片已收到足够上报，状态已更新为已使用', 'success');
          // 更新本地状态
          if (onStatusUpdate) {
            onStatusUpdate(exchange.id, result.newStatus);
          }
          // 延迟刷新页面以确保用户看到提示
          setTimeout(() => {
            onRefreshPage?.();
          }, 2000);
        } else {
          showToast?.(result.message, 'success');
        }
      } else {
        showToast?.(result.message || '上报失败，请重试', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上报失败，请重试';
      
      // 如果卡片已不是活跃状态，刷新页面
      if (errorMessage.includes('卡片已不是活跃状态') || errorMessage.includes('卡片不存在')) {
        showToast?.('卡片状态已变更，正在刷新页面...', 'warning');
        setTimeout(() => {
          onRefreshPage?.();
        }, 2000);
      } else {
        console.error('[用户上报] 上报失败:', error);
        showToast?.(errorMessage, 'error');
      }
    } finally {
      setIsChecking(false);
    }
  };
  const initiatorCardInfo = getCardRegionAndNumber(exchange.actionInitiatorCardId);
  const acceptCardInfo = exchange.actionAcceptCardId ? getCardRegionAndNumber(exchange.actionAcceptCardId) : null;

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700/90 hover:to-gray-800/90 backdrop-blur-md rounded-lg sm:rounded-xl border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/25 overflow-hidden group transform hover:scale-[1.01] sm:hover:scale-[1.02] h-full flex flex-col">
      {/* 卡片头部 - 类型标签和状态 */}
      <div className="p-3 sm:p-4 lg:p-5 border-b border-orange-500/20">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
            exchange.actionType === 'ask' ? 'bg-blue-600/30 text-blue-200 border-blue-500/40' :
            'bg-purple-600/30 text-purple-200 border-purple-500/40'
          }`}>
            {exchange.actionType === 'ask' ? <MagnifyingGlassIcon className="h-3 w-3" /> : 
             <ArrowsRightLeftIcon className="h-3 w-3" />}
            <span className="hidden sm:inline">{ACTION_TYPE_LABELS[exchange.actionType]}</span>
            <span className="sm:hidden">
              {exchange.actionType === 'ask' ? '请求' : '交换'}
            </span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              exchange.status === 'active' ? 'bg-green-400 animate-pulse' :
              exchange.status === 'claimed' ? 'bg-gray-400' :
              'bg-red-400'
            }`}></div>
            <span className={`text-xs font-medium ${
              exchange.status === 'active' ? 'text-green-400' :
              exchange.status === 'claimed' ? 'text-gray-400' :
              'text-red-400'
            }`}>
              {STATUS_LABELS[exchange.status]}
            </span>
          </div>
        </div>
        {/* 发起者信息 */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg ring-2 ring-orange-400/30 group-hover:ring-orange-400/50 transition-all duration-200">
            {exchange.actionInitiatorAccount.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-semibold text-sm truncate">{exchange.actionInitiatorAccount}</span>
            <span className="text-gray-400 text-xs">发起者</span>
          </div>
        </div>
      </div>

      {/* 卡片内容区域 */}
      <div className="p-3 sm:p-4 lg:p-5 flex-1">
        {exchange.actionType === 'exchange' ? (
          /* 交换类型 - 显示两个卡片 */
          <div className="space-y-4">
            <div className="text-center text-gray-300 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <ArrowsRightLeftIcon className="h-5 w-5 text-purple-400" />
                <span>卡片交换</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              {/* 发起者卡片 */}
              <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                <div className="relative group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={getCardImagePath(exchange.actionInitiatorCardId)}
                    alt={`卡片 ${exchange.actionInitiatorCardId}`}
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl border-2 border-orange-500/60 object-cover shadow-xl ring-2 ring-orange-400/20"
                    priority={false}
                    unoptimized={false}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-mono shadow-lg border border-orange-400/50">
                    #{exchange.actionInitiatorCardId}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-400 block mb-1 flex items-center justify-center gap-1">
                    <BriefcaseIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">(发起者)提供</span>
                  </span>
                  <span className="text-xs text-orange-300 font-semibold bg-orange-500/10 px-2 py-1 rounded-lg max-w-20 sm:max-w-none truncate">{initiatorCardInfo.displayName}</span>
                </div>
              </div>
              {/* 交换箭头 */}
              <div className="flex flex-col items-center">
                <ArrowsRightLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
              {/* 接受者卡片 */}
              <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                <div className="relative group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={getCardImagePath(exchange.actionAcceptCardId)}
                    alt={`卡片 ${exchange.actionAcceptCardId}`}
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl border-2 border-blue-500/60 object-cover shadow-xl ring-2 ring-blue-400/20"
                    priority={false}
                    unoptimized={false}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-mono shadow-lg border border-blue-400/50">
                    #{exchange.actionAcceptCardId}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-400 block mb-1 flex items-center justify-center gap-1">
                    <CursorArrowRaysIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">(发起者)需要</span>
                  </span>
                  <span className="text-xs text-blue-300 font-semibold bg-blue-500/10 px-2 py-1 rounded-lg max-w-20 sm:max-w-none truncate">{acceptCardInfo?.displayName}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 请求/赠送类型 - 显示单个卡片 */
          <div className="space-y-4">
            <div className="text-center text-gray-300 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <HandRaisedIcon className="h-5 w-5 text-blue-400" />
                <span>索要卡片</span>
              </span>
            </div>
            <div className="flex justify-center">
              <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                <div className="relative group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={getCardImagePath(exchange.actionInitiatorCardId)}
                    alt={`卡片 ${exchange.actionInitiatorCardId}`}
                    width={112}
                    height={112}
                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg sm:rounded-xl border-2 border-orange-500/60 object-cover shadow-xl ring-2 ring-orange-400/20"
                    priority={false}
                    unoptimized={false}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs px-2 py-1 rounded-md sm:rounded-lg font-mono shadow-lg border border-orange-400/50">
                    #{exchange.actionInitiatorCardId}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-400 block mb-1 flex items-center justify-center gap-1">
                    <MagnifyingGlassIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">寻找</span>
                  </span>
                  <span className="text-sm text-orange-300 font-semibold bg-orange-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">{initiatorCardInfo.displayName}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 卡片底部 - 时间和操作 */}
      <div className="p-3 sm:p-4 lg:p-5 border-t border-orange-500/20 bg-gradient-to-r from-black/20 to-black/30">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-700/30 px-2 py-1 rounded-lg">
            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
            <span className="font-medium">{formatDate(exchange.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              exchange.status === 'active' ? 'text-green-400 bg-green-500/10' :
              exchange.status === 'claimed' ? 'text-gray-400 bg-gray-500/10' :
              'text-red-400 bg-red-500/10'
            }`}>
              <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-medium hidden sm:inline">可用</span>
            </div>
            
            {exchange.status === 'active' && (
               <button
                 onClick={handleReportUsed}
                 disabled={isChecking}
                 className="px-2 py-1 bg-gradient-to-r from-red-600/90 to-red-700/90 text-white rounded-lg text-xs hover:from-red-500 hover:to-red-600 transition-all duration-300 flex items-center gap-1 hover:scale-105 font-semibold shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
                 title="如果卡片已失效，点击上报帮助其他用户"
               >
                 {isChecking ? (
                   <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                 ) : (
                   <ExclamationTriangleIcon className="h-3 w-3" />
                 )}
                 <span className="text-xs">{isChecking ? '上报中' : '上报已使用'}</span>
               </button>
             )}
          </div>
        </div>
        {/* 【优化方案第三阶段】移除复制功能，改为跳转机制收集用户行为数据 */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={async () => {
              try {
                // 记录用户访问行为并添加到检测队列
                const response = await fetch(`/api/card-exchanges/${exchange.id}/visit`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                const result = await response.json();
                
                if (response.ok && result.success && (!result.status || result.status === 'active')) {
                  // 卡片有效（没有status字段或status为active），打开卡片链接
                  window.open(exchange.originalUrl, '_blank', 'noopener,noreferrer');
                } else {
                  // 卡片无效或非活跃状态，显示提示信息
                  showToast?.(result.message || '卡片已失效', 'warning');
                  // 如果卡片状态已变更，刷新页面
                  if (result.status === 'claimed' || result.status === 'expired' || result.message?.includes('已被领取') || result.message?.includes('已过期') || result.message?.includes('无效')) {
                    setTimeout(() => {
                      onRefreshPage?.();
                    }, 2000);
                  }
                }
              } catch (error) {
                console.error('[用户访问] 记录失败:', error);
                showToast?.('访问失败，请重试', 'error');
              }
            }}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm hover:from-blue-500 hover:to-blue-600 transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 hover:scale-105 font-semibold shadow-lg hover:shadow-blue-500/25"
            title={exchange.actionType === 'ask' ? '赠送卡片' : '获取卡片并记录访问'}
          >
            <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            {exchange.actionType === 'ask' ? (
              <>
                <span className="hidden sm:inline">赠送</span>
                <span className="sm:hidden">赠送</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">交换卡片</span>
                <span className="sm:hidden">获取</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { REGION_MAP, getCardRegionAndNumber };