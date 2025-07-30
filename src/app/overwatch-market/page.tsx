'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { createApiThrottle } from '@/utils/debounceThrottle';
import Toast from '@/components/Toast';
import CardExchangeItem, { getCardRegionAndNumber } from '@/components/CardExchangeItem';
import RegionFilter from '@/components/RegionFilter';
import ActionTypeFilter from '@/components/ActionTypeFilter';
import AddExchangeModal from '@/components/AddExchangeModal';
import { AppreciationButton } from '@/components/AppreciationModal';
import { PlusIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckIcon, ArrowLeftIcon, ArrowRightIcon, SparklesIcon, HomeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface CardExchange {
  id: string;
  shareToken: string;
  actionType: 'ask' | 'exchange' | 'give';
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
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCardNumber, setSelectedCardNumber] = useState<number | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // 加载卡片交换列表
  const loadExchanges = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      showToast('正在加载卡片交换信息...', 'info');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        status: 'active', // 只显示活跃的卡片
      });
      
      if (selectedActionType !== 'all') {
        params.append('actionType', selectedActionType);
      }
      
      if (selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      
      if (selectedCardNumber !== null) {
        params.append('cardNumber', selectedCardNumber.toString());
      }
      
      const response = await fetch(`/api/card-exchanges?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setExchanges(data.exchanges);
        setPagination(data.pagination);
        showToast('卡片交换信息加载成功', 'success');
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
  }, [pagination.limit, selectedActionType, selectedRegion, selectedCardNumber, showToast]);

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

  // 复制链接
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制到剪贴板', 'success');
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败，请重试', 'error');
    }
  };

  // formatDate函数已移到CardExchangeItem组件中

  // 页面加载时获取数据
  useEffect(() => {
    loadExchanges(1);
  }, [selectedActionType, selectedRegion, selectedCardNumber]);

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
    
    // 如果状态变为已领取，显示提示并重新加载数据
    if (newStatus === 'claimed') {
      showToast('卡片状态已更新为已领取', 'success');
      // 延迟重新加载以确保数据同步
      setTimeout(() => {
        loadExchanges(pagination.page);
      }, 1000);
    }
  }, [showToast, loadExchanges, pagination.page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* 导航链接 */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
            >
              <HomeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">返回编辑器</span>
              <span className="sm:hidden">编辑器</span>
            </Link>
            <Link
              href="/community-templates"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
            >
              <UserGroupIcon className="h-4 w-4" />
              <span className="hidden sm:inline">社区模板</span>
              <span className="sm:hidden">模板</span>
            </Link>
          </div>
          <div className="flex items-center">
            <AppreciationButton className="text-sm" />
          </div>
        </div>

        {/* 页面标题 */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundImage: 'url("https://ld5.res.netease.com/images/20241213/1734074185668_1f8923e771.svg")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'}}>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              守望先锋集卡市场
            </h1>
          </div>
          <p className="text-gray-300 text-base lg:text-lg max-w-2xl mx-auto">
            分享、交换、收集你的守望先锋卡片
          </p>
        </div>

        {/* 添加卡片交换按钮 */}
        <div className="text-center mb-8 lg:mb-12">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-3 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-500 hover:to-orange-400 transition-all duration-300 font-semibold text-base lg:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            <SparklesIcon className="h-5 w-5 lg:h-6 lg:w-6" />
            <span>分享我的卡片</span>
            <PlusIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>

        {/* 类型筛选器 */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">选择交换类型</h2>
            <p className="text-gray-400 text-sm lg:text-base">选择你感兴趣的卡片交换类型</p>
          </div>
          <ActionTypeFilter
            selectedActionType={selectedActionType}
            onActionTypeChange={setSelectedActionType}
          />
        </div>

        {/* 控制区域 */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 lg:p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center justify-between">
            <div className="w-full lg:w-auto">
              <RegionFilter
                selectedRegion={selectedRegion}
                selectedCardNumber={selectedCardNumber}
                onRegionChange={setSelectedRegion}
                onCardNumberChange={setSelectedCardNumber}
              />
            </div>
            
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm lg:text-base">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">活跃卡片</span>
                  <span className="font-semibold text-white bg-gray-700 px-2 py-1 rounded-lg">
                    {pagination.total}
                  </span>
                </div>
                
                {/* 倒计时显示 */}
                <div className="flex items-center gap-2 text-sm lg:text-base">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">下次检查活跃状态</span>
                  <span className="font-semibold text-orange-300 bg-orange-500/20 px-2 py-1 rounded-lg font-mono">
                    {formatCountdown(nextCleanupTime)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => loadExchanges(1)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">刷新中...</span>
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4" />
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
                <span>正在加载卡片交换信息...</span>
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
                  <p className="text-gray-400">当前筛选条件下没有找到卡片交换信息</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exchanges.map((exchange) => (
                  <CardExchangeItem
                    key={exchange.id}
                    exchange={exchange}
                    onCopyUrl={copyUrl}
                    onStatusUpdate={handleStatusUpdate}
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
    </div>
  );
}