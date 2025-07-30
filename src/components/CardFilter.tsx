'use client';

import { REGION_MAP, getCardRegionAndNumber } from './CardExchangeItem';
import { FunnelIcon, XMarkIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface CardFilterProps {
  selectedOfferCardId: number | null;
  selectedWantCardId: number | null;
  onOfferCardChange: (cardId: number | null) => void;
  onWantCardChange: (cardId: number | null) => void;
}

// 所有可用的卡片ID
const ALL_CARD_IDS = [
  // 国服赛区 1-9
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  // 北美赛区 10-15
  10, 11, 12, 13, 14, 15,
  // 亚太赛区 16-21
  16, 17, 18, 19, 20, 21,
  // 欧中非赛区 22-27
  22, 23, 24, 25, 26, 27
];

// 卡片ID到图片路径的映射函数
const getCardImagePath = (cardId: number): string => {
  if (cardId >= 1 && cardId <= 9) {
    const cnCardNum = cardId === 1 ? 2 : cardId;
    return `/card/cn-${cnCardNum}-c.png`;
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

interface CardSelectorProps {
  title: string;
  selectedCardId: number | null;
  onCardChange: (cardId: number | null) => void;
  placeholder: string;
}



// 简化的卡片选择器组件
function SimpleCardSelector({ title, selectedCardId, onCardChange, placeholder, icon }: CardSelectorProps & { icon: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 400)
      });
    }
  }, [isOpen]);

  const selectedCard = selectedCardId ? getCardRegionAndNumber(selectedCardId) : null;
  
  // 获取赛区信息
  const getRegionInfo = (regionId: number) => {
    const regionMap = {
      [-1]: { name: '国服赛区', color: 'bg-red-500', abbr: 'CN' },
      [-2]: { name: '北美赛区', color: 'bg-blue-500', abbr: 'NA' },
      [-3]: { name: '亚太赛区', color: 'bg-green-500', abbr: 'APAC' },
      [-4]: { name: '欧中非赛区', color: 'bg-purple-500', abbr: 'EMEA' }
    };
    return regionMap[regionId as keyof typeof regionMap];
  };
  
  const isRegionSelected = selectedCardId && selectedCardId < 0;
  const regionInfo = isRegionSelected ? getRegionInfo(selectedCardId) : null;
  
  // 赛区配置
  const regions = {
    all: { name: '全部赛区', cards: ALL_CARD_IDS },
    cn: { name: '国服', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9], regionId: -1, abbr: 'CN', color: 'bg-red-500' },
    na: { name: '北美', cards: [10, 11, 12, 13, 14, 15], regionId: -2, abbr: 'NA', color: 'bg-blue-500' },
    apac: { name: '亚太', cards: [16, 17, 18, 19, 20, 21], regionId: -3, abbr: 'APAC', color: 'bg-green-500' },
    emea: { name: '欧中非', cards: [22, 23, 24, 25, 26, 27], regionId: -4, abbr: 'EMEA', color: 'bg-purple-500' }
  };
  
  // 过滤卡片
  const filteredCards = regions[selectedRegion as keyof typeof regions].cards;

  const dropdownContent = (
    <div 
      className="bg-gray-800/95 border border-gray-600/50 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999
      }}
    >
      {/* 赛区快速选择 */}
      <div className="p-3 border-b border-gray-700/50">
        <div className="text-xs font-medium text-gray-400 mb-2">选择赛区</div>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(regions).map(([key, region]) => (
            <button
              key={key}
              onClick={() => setSelectedRegion(key)}
              className={`p-2 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                selectedRegion === key
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {key === 'all' ? (
                <FunnelIcon className="h-4 w-4" />
              ) : (
                'abbr' in region && <span className="text-xs font-bold">{region.abbr}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* 特殊选项 */}
      <div className="p-2 border-b border-gray-700/50">
        <button
          onClick={() => {
            onCardChange(null);
            setIsOpen(false);
          }}
          className="w-full p-2 text-left text-gray-400 hover:bg-gray-700/50 rounded-md transition-colors text-sm flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded border-2 border-dashed border-gray-400 flex items-center justify-center">
            <XMarkIcon className="h-3 w-3 text-gray-400" />
          </div>
          <span>不限制</span>
        </button>
        
        {/* 整个赛区选项 */}
        {selectedRegion !== 'all' && (() => {
          const region = regions[selectedRegion as keyof typeof regions];
          if ('regionId' in region) {
            return (
              <button
                onClick={() => {
                  onCardChange(region.regionId);
                  setIsOpen(false);
                }}
                className={`w-full p-2 rounded-md transition-all flex items-center gap-2 text-sm mt-1 ${
                  selectedCardId === region.regionId
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center ${region.color}`}>
                  <span className="text-xs font-bold text-white">{region.abbr}</span>
                </div>
                <span>整个{region.name}赛区</span>
              </button>
            );
          }
          return null;
        })()}
      </div>
      
      {/* 卡片网格 */}
      <div className="max-h-48 overflow-y-auto p-2">
        <div className="grid grid-cols-6 gap-1">
          {filteredCards.map(cardId => {
            const card = getCardRegionAndNumber(cardId);
            return (
              <button
                key={cardId}
                onClick={() => {
                  onCardChange(cardId);
                  setIsOpen(false);
                }}
                className={`p-1.5 rounded-md transition-all flex flex-col items-center gap-1 group ${
                  selectedCardId === cardId
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
                title={`${card.displayName} (${card.region.toUpperCase()}-${card.number})`}
              >
                <div className="w-8 h-8 rounded overflow-hidden bg-gray-600/50">
                  <Image
                    src={getCardImagePath(cardId)}
                    alt={`卡片 ${cardId}`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs font-medium truncate w-full text-center">{card.region.toUpperCase()}-{card.number}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* 选择按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-gray-700/30 border border-gray-600/50 hover:border-gray-500/50 hover:bg-gray-600/30 rounded-lg transition-all flex items-center justify-between group shadow-lg hover:shadow-xl backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${
            icon === 'OFFER' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-purple-600 to-purple-500'
          }`}>
            {icon === 'OFFER' ? 'OUT' : 'IN'}
          </div>
          {selectedCardId ? (
            isRegionSelected ? (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${regionInfo?.color}`}>
                  <span className="text-xs font-bold text-white">{regionInfo?.abbr}</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">
                    {regionInfo?.name}
                  </div>
                  <div className="text-xs text-gray-400">整个赛区</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded overflow-hidden bg-gray-600/50">
                  <Image
                    src={getCardImagePath(selectedCardId)}
                    alt={`卡片 ${selectedCardId}`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">
                    {selectedCard?.displayName}
                  </div>
                  <div className="text-xs text-gray-400">{selectedCard?.region.toUpperCase()}-{selectedCard?.number}</div>
                </div>
              </div>
            )
          ) : (
              <div className="text-left">
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-gray-400">{placeholder}</div>
              </div>
            )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedCardId && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onCardChange(null);
              }}
              className="p-1 hover:bg-gray-600/50 rounded transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-200" />
            </div>
          )}
          <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* 下拉选择面板 - 使用 Portal */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={() => setIsOpen(false)}
          />
          {dropdownContent}
        </>,
        document.body
      )}
    </div>
  );
}

export default function CardFilter({ selectedOfferCardId, selectedWantCardId, onOfferCardChange, onWantCardChange }: CardFilterProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center">
            <FunnelIcon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">卡片筛选器</h3>
        </div>
        
        {(selectedOfferCardId || selectedWantCardId) && (
          <button
            onClick={() => {
              onOfferCardChange(null);
              onWantCardChange(null);
            }}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500/50 rounded-lg transition-all flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
            清除筛选
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleCardSelector
          title="提供/送出的卡片"
          selectedCardId={selectedOfferCardId}
          onCardChange={onOfferCardChange}
          placeholder="选择要提供/送出的卡片"
          icon="OFFER"
        />
        
        <SimpleCardSelector
          title="需要的卡片"
          selectedCardId={selectedWantCardId}
          onCardChange={onWantCardChange}
          placeholder="选择需要的卡片"
          icon="WANT"
        />
      </div>
      
      {(selectedOfferCardId || selectedWantCardId) && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex items-center justify-center gap-2 text-sm text-orange-400">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>筛选已激活</span>
          </div>
        </div>
      )}
    </div>
  );
}