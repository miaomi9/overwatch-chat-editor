'use client';

import { HandRaisedIcon, ArrowsRightLeftIcon, GiftIcon } from '@heroicons/react/24/outline';
import CardExchangeItem from './CardExchangeItem';

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

interface MarketSectionProps {
  title: string;
  icon: React.ReactNode;
  exchanges: CardExchange[];
  onCopyUrl: (url: string) => void;
  bgGradient: string;
  borderColor: string;
}

export default function MarketSection({ title, icon, exchanges, onCopyUrl, bgGradient, borderColor }: MarketSectionProps) {
  if (exchanges.length === 0) {
    return (
      <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm rounded-2xl border ${borderColor} p-6 lg:p-8 hover:border-opacity-70 transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl shadow-lg">
            {icon}
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-white">{title}</h2>
            <p className="text-gray-400 text-sm">暂无卡片</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <div className="text-gray-400 text-2xl">📭</div>
          </div>
          <div className="text-gray-400 text-sm lg:text-base">
            还没有{title.replace('卡片', '')}卡片
          </div>
          <div className="text-gray-500 text-xs lg:text-sm mt-1">
            成为第一个分享的玩家吧！
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm rounded-2xl border ${borderColor} p-6 lg:p-8 hover:border-opacity-70 transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl shadow-lg">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-lg lg:text-xl font-bold text-white">{title}</h2>
          <p className="text-gray-400 text-sm">{exchanges.length} 张卡片</p>
        </div>
        <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {exchanges.length}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {exchanges.map((exchange) => (
          <CardExchangeItem
            key={exchange.id}
            exchange={exchange}
            onCopyUrl={onCopyUrl}
          />
        ))}
      </div>
    </div>
  );
}

// 预定义的市场分类
export const MARKET_SECTIONS = {
  ask: {
    title: '索要卡片',
    icon: <HandRaisedIcon className="h-6 w-6 text-blue-400" />,
    bgGradient: 'from-blue-900/30 to-blue-800/20',
    borderColor: 'border-blue-500/30',
  },
  exchange: {
    title: '交换卡片',
    icon: <ArrowsRightLeftIcon className="h-6 w-6 text-purple-400" />,
    bgGradient: 'from-purple-900/30 to-purple-800/20',
    borderColor: 'border-purple-500/30',
  },
  give: {
    title: '赠送卡片',
    icon: <GiftIcon className="h-6 w-6 text-green-400" />,
    bgGradient: 'from-green-900/30 to-green-800/20',
    borderColor: 'border-green-500/30',
  },
};