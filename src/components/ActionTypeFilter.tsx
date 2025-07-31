'use client';

import { 
  ArrowsRightLeftIcon, 
  HandRaisedIcon, 
  GiftIcon, 
  Squares2X2Icon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

interface ActionTypeFilterProps {
  selectedActionType: string;
  onActionTypeChange: (actionType: string) => void;
}

export default function ActionTypeFilter({ selectedActionType, onActionTypeChange }: ActionTypeFilterProps) {
  const actionTypes = [
    { 
      value: 'all', 
      label: '全部类型', 
      icon: <Squares2X2Icon className="w-6 h-6 lg:w-7 lg:h-7" />,
      color: 'from-gray-600 to-gray-700',
      hoverColor: 'from-gray-500 to-gray-600',
      description: '查看所有卡片交换'
    },
    { 
      value: 'ask', 
      label: '索要卡片', 
      icon: <MagnifyingGlassIcon className="w-6 h-6 lg:w-7 lg:h-7" />,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'from-blue-500 to-blue-600',
      description: '💡 推荐：高效匹配需求'
    },
    { 
      value: 'exchange', 
      label: '交换卡片', 
      icon: <ArrowsRightLeftIcon className="w-6 h-6 lg:w-7 lg:h-7" />,
      color: 'from-purple-600 to-purple-700',
      hoverColor: 'from-purple-500 to-purple-600',
      description: '⭐ 推荐：公平互换'
    },
    { 
      value: 'give', 
      label: '赠送卡片', 
      icon: <GiftIcon className="w-6 h-6 lg:w-7 lg:h-7" />,
      color: 'from-green-600 to-green-700',
      hoverColor: 'from-green-500 to-green-600',
      description: '建议改用索要/交换模式'
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {actionTypes.map((actionType) => (
          <button
            key={actionType.value}
            onClick={() => onActionTypeChange(actionType.value)}
            className={`group relative p-3 sm:p-4 lg:p-5 rounded-xl lg:rounded-2xl text-center transition-all duration-300 transform hover:scale-[1.02] lg:hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl overflow-hidden ${
              selectedActionType === actionType.value
                ? `bg-gradient-to-br ${actionType.color} text-white ring-2 ring-white/30 shadow-2xl scale-[1.02] lg:scale-105`
                : 'bg-gray-800/90 text-gray-300 hover:text-white backdrop-blur-sm border border-gray-700/50 hover:border-gray-600/50'
            }`}
          >
            {/* 背景渐变效果 */}
            {selectedActionType !== actionType.value && (
              <div className={`absolute inset-0 bg-gradient-to-br ${actionType.hoverColor} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
            )}
            
            <div className="relative flex flex-col items-center gap-2 sm:gap-3">
              {/* 图标容器 */}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl flex items-center justify-center transition-all duration-300 ${
                selectedActionType === actionType.value 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50 group-hover:text-white'
              }`}>
                {actionType.icon}
              </div>
              
              {/* 文本内容 */}
              <div className="space-y-1">
                <div className="font-bold text-xs sm:text-sm lg:text-base leading-tight">
                  {actionType.label}
                </div>
                <div className={`text-xs lg:text-sm leading-tight ${
                  selectedActionType === actionType.value 
                    ? 'text-white/80' 
                    : 'text-gray-500 group-hover:text-gray-400'
                }`}>
                  {actionType.description}
                </div>
              </div>
              
              {/* 选中指示器 */}
              {selectedActionType === actionType.value && (
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}