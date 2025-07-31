'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, InformationCircleIcon, SparklesIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface Announcement {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  bgGradient: string;
  textColor: string;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: "💡 智能交换建议",
    content: "优先选择【索要卡片】和【交换卡片】模式，让卡片流通更高效！",
    icon: <SparklesIcon className="h-5 w-5" />,
    bgGradient: "from-blue-600/20 to-purple-600/20",
    textColor: "text-blue-200"
  },
  {
    id: 2,
    title: "🎯 推荐交换策略",
    content: "想要赠送卡片？试试在【索要卡片】中寻找需要你卡片的玩家，互动性更强！",
    icon: <ArrowsRightLeftIcon className="h-5 w-5" />,
    bgGradient: "from-orange-600/20 to-red-600/20",
    textColor: "text-orange-200"
  },
  {
    id: 3,
    title: "🤝 社区互助理念",
    content: "通过在【索要卡片】中寻找需求，回应他人需要，比直接赠送更能建立玩家间的联系！",
    icon: <InformationCircleIcon className="h-5 w-5" />,
    bgGradient: "from-green-600/20 to-teal-600/20",
    textColor: "text-green-200"
  },
  {
    id: 4,
    title: "⚡ 高效匹配系统",
    content: "【交换卡片】和【索要卡片】能让系统更好地为你匹配合适的交换伙伴！",
    icon: <SparklesIcon className="h-5 w-5" />,
    bgGradient: "from-purple-600/20 to-pink-600/20",
    textColor: "text-purple-200"
  }
];

export default function AnnouncementCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4000); // 每4秒切换一次

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div 
      className="relative mb-6 mx-auto max-w-4xl"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* 主要公告区域 */}
      <div className={`relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-r ${currentAnnouncement.bgGradient} border border-white/10 backdrop-blur-sm`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        
        <div className="relative px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center gap-3 lg:gap-4">
            {/* 图标 */}
            <div className={`flex-shrink-0 p-2 lg:p-2.5 rounded-lg bg-white/10 ${currentAnnouncement.textColor}`}>
              {currentAnnouncement.icon}
            </div>
            
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm lg:text-base text-white mb-1 truncate">
                {currentAnnouncement.title}
              </h3>
              <p className={`text-xs lg:text-sm ${currentAnnouncement.textColor} leading-relaxed`}>
                {currentAnnouncement.content}
              </p>
            </div>
            
            {/* 导航按钮 */}
            <div className="flex-shrink-0 flex items-center gap-1 lg:gap-2">
              <button
                onClick={goToPrevious}
                className="p-1.5 lg:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 hover:scale-110"
                aria-label="上一条公告"
              >
                <ChevronLeftIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 lg:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 hover:scale-110"
                aria-label="下一条公告"
              >
                <ChevronRightIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 指示器 */}
      <div className="flex justify-center gap-1.5 lg:gap-2 mt-3">
        {announcements.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-orange-400 scale-125 shadow-lg shadow-orange-400/50'
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`切换到第${index + 1}条公告`}
          />
        ))}
      </div>
    </div>
  );
}