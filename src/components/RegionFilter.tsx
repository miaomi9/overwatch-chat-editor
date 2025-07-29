'use client';

import { REGION_MAP } from './CardExchangeItem';
import { GlobeAltIcon, FlagIcon, MapIcon } from '@heroicons/react/24/outline';

interface RegionFilterProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
}

const REGION_COLORS = {
  all: 'from-gray-600 to-gray-700 border-gray-500/30',
  cn: 'from-red-600 to-red-700 border-red-500/30',
  na: 'from-blue-600 to-blue-700 border-blue-500/30',
  apac: 'from-green-600 to-green-700 border-green-500/30',
  emea: 'from-purple-600 to-purple-700 border-purple-500/30',
};

export default function RegionFilter({ selectedRegion, onRegionChange }: RegionFilterProps) {
  const regions = [
    { value: 'all', label: '全部地区', icon: GlobeAltIcon, color: 'from-gray-600 to-gray-700' },
    { value: 'cn', label: '国服赛区', icon: FlagIcon, color: 'from-red-600 to-red-700' },
    { value: 'na', label: '北美赛区', icon: FlagIcon, color: 'from-blue-600 to-blue-700' },
    { value: 'apac', label: '亚太赛区', icon: MapIcon, color: 'from-green-600 to-green-700' },
    { value: 'emea', label: '欧中非赛区', icon: GlobeAltIcon, color: 'from-purple-600 to-purple-700' },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-nowrap gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
        {regions.map((region) => {
          const IconComponent = region.icon;
          return (
            <button
              key={region.value}
              onClick={() => onRegionChange(region.value)}
              className={`px-2 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm lg:text-base font-semibold transition-all duration-300 flex items-center gap-1 sm:gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex-shrink-0 ${
                selectedRegion === region.value
                  ? `bg-gradient-to-r ${region.color} text-white ring-2 ring-white/30 shadow-2xl`
                  : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 hover:text-white backdrop-blur-sm border border-gray-600/50 hover:border-gray-500/50'
              }`}
            >
              <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              <span className="whitespace-nowrap">{region.label}</span>
              {selectedRegion === region.value && (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}