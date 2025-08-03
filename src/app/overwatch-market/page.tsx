'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { createApiThrottle } from '@/utils/debounceThrottle';
import Toast from '@/components/Toast';
import CardExchangeItem, { getCardRegionAndNumber } from '@/components/CardExchangeItem';
import CardFilter from '@/components/CardFilter';
import ActionTypeFilter from '@/components/ActionTypeFilter';
import AddExchangeModal from '@/components/AddExchangeModal';

import { AppreciationButton } from '@/components/AppreciationModal';
import AdBanner from '@/components/AdBanner';
import { PlusIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckIcon, ArrowLeftIcon, ArrowRightIcon, SparklesIcon, HomeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 这些常量和函数已移到组件中

export default function OverwatchMarketPage() {
  const [exchanges, setExchanges] = useState<CardExchange[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [selectedOfferCardId, setSelectedOfferCardId] = useState<number | null>(null);
  const [selectedWantCardId, setSelectedWantCardId] = useState<number | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('ask');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // 加载卡片交换列表
  const loadExchanges = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      showToast('正在加载卡片信息...', 'info');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        status: 'active', // 只显示活跃的卡片
      });
      
      params.append('actionType', selectedActionType);
      
      if (selectedOfferCardId !== null) {
        params.append('offerCardId', selectedOfferCardId.toString());
      }
      
      if (selectedWantCardId !== null) {
        params.append('wantCardId', selectedWantCardId.toString());
      }
      
      const response = await fetch(`/api/card-exchanges?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setExchanges(data.exchanges);
        setPagination(data.pagination);
        showToast('卡片信息加载成功', 'success');
      } else {
        showToast(data.error || '加载失败，请重试', 'error');
      }
    } catch (error) {
      console.error('加载卡片交换列表失败:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showToast('网络连接失败，请检查网络后重试', 'error');
      } else {
        showToast('加载失败，请重试', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, selectedActionType, selectedOfferCardId, selectedWantCardId, showToast]);

  // 验证链接格式的函数
  const isValidShareUrl = (url: string): boolean => {
    return /(?:shareToken|share_token|sharetoken)=/i.test(url);
  };

  // 提交新的卡片交换
  const submitExchange = async (inputUrl?: string) => {
    const urlToProcess = inputUrl || shareUrl;
    if (!urlToProcess.trim()) {
        console.log('提取的链接:', urlToProcess);
      showToast('请输入分享链接', 'error');
      return;
    }

    // 从输入中提取有效的分享链接，支持更灵活的格式
    const urlMatch = urlToProcess.match(/(https?:\/\/[^\s]+(?:shareToken|share_token|sharetoken)[=:][^\s&]+)/i);
    const extractedUrl = urlMatch ? urlMatch[0] : urlToProcess.trim();

    // 验证提取的链接格式
    if (!isValidShareUrl(extractedUrl)) {
      showToast('请输入有效的守望先锋集卡分享链接', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      showToast('正在处理分享链接...', 'info');
      
      const response = await fetch('/api/card-exchanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareUrl: extractedUrl }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast('卡片交换添加成功！', 'success');
        if (!inputUrl) {
          setShareUrl(''); // 只有使用页面自己的 shareUrl 时才清空
        }
        loadExchanges(1); // 重新加载第一页
      } else {
        // 根据不同的错误状态码显示不同的提示
        if (response.status === 410) {
          showToast('该卡片已被领取，无法添加', 'warning');
        } else if (response.status === 429) {
          showToast('操作过于频繁，请稍后再试', 'warning');
        } else if (response.status === 400) {
          showToast(data.error || '链接格式不正确', 'error');
        } else {
          showToast(data.error || '添加失败，请重试', 'error');
        }
      }
    } catch (error) {
      console.error('提交卡片交换失败:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showToast('网络连接失败，请检查网络后重试', 'error');
      } else {
        showToast('提交失败，请重试', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 节流提交
  const throttledSubmit = useCallback(createApiThrottle(submitExchange, 1000), [submitExchange]);

  // 【优化方案第三阶段】移除复制功能，改为跳转机制

  // formatDate函数已移到CardExchangeItem组件中

  // 页面加载时获取数据
  useEffect(() => {
    loadExchanges(1);
  }, [loadExchanges, selectedActionType, selectedOfferCardId, selectedWantCardId]);

  // 倒计时状态
  const [nextCleanupTime, setNextCleanupTime] = useState<number>(10 * 60); // 10分钟倒计时

  // 每10分钟自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      loadExchanges(pagination.page);
      setNextCleanupTime(10 * 60); // 重置倒计时
    }, 10 * 60 * 1000); // 10分钟
    
    return () => clearInterval(interval);
  }, [loadExchanges, pagination.page]);

  // 倒计时更新
  useEffect(() => {
    const countdown = setInterval(() => {
      setNextCleanupTime(prev => {
        if (prev <= 1) {
          return 10 * 60; // 重置为10分钟
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  // 格式化倒计时显示
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 处理卡片状态更新
  const handleStatusUpdate = useCallback((id: string, newStatus: string) => {
    setExchanges(prev => prev.map(exchange => 
      exchange.id === id ? { ...exchange, status: newStatus as 'active' | 'claimed' | 'expired' } : exchange
    ));
  }, []);

  // 处理页面刷新
  const handleRefreshPage = useCallback(() => {
    loadExchanges(pagination.page);
  }, [loadExchanges, pagination.page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* 导航链接 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 lg:mb-8">
          {/* 移动端：2x2网格布局，桌面端：水平排列 */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 lg:gap-3 sm:flex-1 sm:min-w-0">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50 text-xs sm:text-sm whitespace-nowrap"
            >
              <HomeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">返回编辑器</span>
              <span className="sm:hidden">编辑器</span>
            </Link>
            <Link
              href="/teammate-matching"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 text-xs sm:text-sm whitespace-nowrap"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">队友匹配</span>
              <span className="sm:hidden">匹配</span>
            </Link>
            <Link
              href="/community-templates"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50 text-xs sm:text-sm whitespace-nowrap"
            >
              <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">社区模板</span>
              <span className="sm:hidden">模板</span>
            </Link>
            <div className="sm:hidden">
              <AppreciationButton className="text-xs px-3 py-2" />
            </div>
          </div>
          <div className="hidden sm:flex items-center flex-shrink-0">
            <AppreciationButton className="text-sm" />
          </div>
        </div>

        {/* 页面标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundImage: 'url("https://ld5.res.netease.com/images/20241213/1734074185668_1f8923e771.svg")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'}}>
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              守望先锋集卡市场
            </h1>
          </div>
          <p className="text-gray-300 text-sm lg:text-base max-w-2xl mx-auto">
            发布需求、交换卡片、收集你的守望先锋卡片
          </p>
        </div>

        {/* 使用说明 */}
        <div className="mb-6 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 lg:p-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <ExclamationTriangleIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2 text-sm lg:text-base">新版交换模式说明</h3>
                <div className="text-gray-300 text-xs lg:text-sm space-y-2">
                  <p>• <strong className="text-blue-300">交换卡片</strong>：发布你的卡片，寻找愿意交换的玩家</p>
                  <p>• <strong className="text-purple-300">索要卡片</strong>：发布你需要的卡片，等待其他玩家赠送</p>
                  <p>• <strong className="text-orange-300">想要赠送？</strong>请寻找"赠送卡片"类型的发布，直接赠送给需要的玩家</p>
                  <p className="text-yellow-300">💡 为防止脚本批量获取，已取消直接赠送功能</p>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* 添加卡片交换按钮 */}
        <div className="text-center mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-3 px-8 py-4 lg:px-12 lg:py-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl hover:from-orange-500 hover:to-orange-400 transition-all duration-300 font-bold text-lg lg:text-xl shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 active:scale-95 border-2 border-orange-400/30 hover:border-orange-300/50"
          >
            <SparklesIcon className="h-6 w-6 lg:h-8 lg:w-8" />
            <span>发布卡片需求</span>
            <PlusIcon className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
        </div>

        {/* 类型筛选器 */}
        <div className="mb-5">
          <div className="text-center mb-4">
            <h2 className="text-lg lg:text-xl font-bold text-white mb-1">选择交换类型</h2>
            <p className="text-gray-400 text-xs lg:text-sm">选择你感兴趣的卡片交换类型</p>
          </div>
          <ActionTypeFilter
            selectedActionType={selectedActionType}
            onActionTypeChange={setSelectedActionType}
          />
        </div>

        {/* 控制区域 */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 lg:p-4 mb-6">
          <div className="flex flex-col gap-3">
            {/* 卡片筛选器 */}
            <CardFilter
              selectedOfferCardId={selectedOfferCardId}
              selectedWantCardId={selectedWantCardId}
              onOfferCardChange={setSelectedOfferCardId}
              onWantCardChange={setSelectedWantCardId}
              actionType={selectedActionType}
            />
            
            {/* 状态信息和刷新按钮 */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">活跃</span>
                  <span className="font-semibold text-white bg-gray-700/70 px-1.5 py-0.5 rounded text-xs">
                    {pagination.total}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 hidden sm:inline">下次检查</span>
                  <span className="text-gray-300 sm:hidden">检查</span>
                  <span className="font-semibold text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded font-mono text-xs">
                    {formatCountdown(nextCleanupTime)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => loadExchanges(1)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/70 text-white rounded-lg hover:bg-gray-600/70 transition-all duration-200 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    <span className="hidden sm:inline">刷新中</span>
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">刷新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 卡片列表展示 */}
        {loading ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="animate-pulse">
              <div className="bg-white/20 h-12 rounded mb-4"></div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/10 h-32 rounded mb-4"></div>
              ))}
            </div>
            <div className="text-center mt-4">
              <div className="inline-flex items-center gap-2 text-white">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>正在加载卡片信息...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {exchanges.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
                  <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">暂无卡片</h3>
                  <p className="text-gray-400">当前筛选条件下没有找到卡片信息</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exchanges.map((exchange) => (
                  <CardExchangeItem
                    key={exchange.id}
                    exchange={exchange}
                    onStatusUpdate={handleStatusUpdate}
                    showToast={showToast}
                    onRefreshPage={handleRefreshPage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2 sm:gap-4">
            <button
              onClick={() => loadExchanges(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 sm:px-4 py-2 bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base"
            >
              <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">上一页</span>
              <span className="sm:hidden">上页</span>
            </button>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 页码显示 */}
              {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, pagination.totalPages) }, (_, i) => {
                const maxPages = window.innerWidth < 640 ? 3 : 5;
                let pageNum;
                if (pagination.totalPages <= maxPages) {
                  pageNum = i + 1;
                } else if (pagination.page <= Math.floor(maxPages / 2) + 1) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - Math.floor(maxPages / 2)) {
                  pageNum = pagination.totalPages - maxPages + 1 + i;
                } else {
                  pageNum = pagination.page - Math.floor(maxPages / 2) + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadExchanges(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                      pageNum === pagination.page
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    } disabled:opacity-50`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => loadExchanges(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 sm:px-4 py-2 bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base"
            >
              <span className="hidden sm:inline">下一页</span>
              <span className="sm:hidden">下页</span>
              <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}
        
        {/* 分页信息 */}
        {pagination.total > 0 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2">
              <span className="text-gray-300 text-xs sm:text-sm">
                <span className="hidden sm:inline">
                  显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                  共 {pagination.total} 条记录
                </span>
                <span className="sm:hidden">
                  {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}/{pagination.total}
                </span>
              </span>
              {loading && (
                <div className="flex items-center gap-1 text-orange-400">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-400"></div>
                  <span className="text-xs">更新中</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Toast 组件 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      {/* 添加卡片交换弹窗 */}
       <AddExchangeModal
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSubmit={throttledSubmit}
         isSubmitting={submitting}
       />
       <AdBanner />
    </div>
  );
}