'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import TermsModal from '@/components/TermsModal';
import { AppreciationButton } from '@/components/AppreciationModal';
import Toast from '@/components/Toast';
import AdBanner from '@/components/AdBanner';
import i18nTexts from '@/data/teammate-matching-i18n.json';
import {
  HomeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Room {
  id: string;
  players: Player[];
  status: 'waiting' | 'matched' | 'countdown';
  countdownStart?: number;
}

interface Player {
  id: string;
  battleTag: string;
  joinedAt: number;
}

const TeammateMatching: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [battleTag, setBattleTag] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [matchedSuccess, setMatchedSuccess] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [serverRegion, setServerRegion] = useState<'cn' | 'global'>('cn');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  // 国际化文本
  const t = i18nTexts[language];

  // SSE连接
  useEffect(() => {
    const eventSource = new EventSource(`/api/teammate-matching/events?region=${serverRegion}`);
    
    eventSource.onopen = () => {
      setIsConnecting(false);
      setConnectionError(false);
      setError('');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'rooms_update') {
          setRooms(data.rooms);
          
          // 检查当前房间是否变为匹配成功状态
          if (currentRoom) {
            const room = data.rooms.find((r: Room) => r.id === currentRoom);
            if (room && room.status === 'matched') {
              setMatchedSuccess(true);
              // 3秒后自动离开并重置状态
              setTimeout(() => {
                setCurrentRoom(null);
                setCountdown(null);
                setCurrentPlayerId(null);
                setMatchedSuccess(false);
              }, 3000);
            }
          }
        } else if (data.type === 'countdown_update') {
          setCountdown(data.countdown);
        }
      } catch (error) {
        console.error('解析SSE数据错误:', error);
        setError('数据解析错误，请刷新页面重试');
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      setConnectionError(true);
      setIsConnecting(false);
      setError('连接服务器失败，请检查网络连接');
    };

    // 离开房间的通用函数
    const handleLeaveRoom = () => {
      if (currentRoom && currentPlayerId) {
        // 使用 navigator.sendBeacon 确保请求能在页面关闭前发送
        const data = JSON.stringify({ 
          roomId: currentRoom,
          playerId: currentPlayerId,
          region: serverRegion
        });
        
        // 尝试使用 sendBeacon，如果失败则使用同步请求
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          const success = navigator.sendBeacon('/api/teammate-matching/leave', blob);
          
          if (!success) {
            // sendBeacon 失败，使用同步 fetch
            try {
              fetch('/api/teammate-matching/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true
              });
            } catch (error) {
              console.error('离开房间请求失败:', error);
            }
          }
        } else {
          // 浏览器不支持 sendBeacon，使用同步请求
          try {
            fetch('/api/teammate-matching/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: data,
              keepalive: true
            });
          } catch (error) {
            console.error('离开房间请求失败:', error);
          }
        }
      }
    };

    // 页面卸载时自动离开房间
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      handleLeaveRoom();
    };

    // 检测是否为移动设备
    const isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // 页面可见性变化时处理离线检测（仅在移动端生效）
    const handleVisibilityChange = () => {
      if (document.hidden && isMobile()) {
        // 页面变为不可见时，可能是用户切换了应用或关闭了浏览器
        // 在移动端，这通常比beforeunload更可靠
        handleLeaveRoom();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    // 只在移动端添加visibilitychange监听器
    if (isMobile()) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 清理函数：关闭SSE连接和移除事件监听器
    return () => {
      eventSource.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 只在移动端移除visibilitychange监听器
      if (isMobile()) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      // 组件卸载时也尝试离开房间
      if (currentRoom && currentPlayerId) {
        leaveRoom();
      }
    };
  }, [currentRoom, serverRegion]);

  // 心跳检测
  useEffect(() => {
    if (!currentRoom || !currentPlayerId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/teammate-matching/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: currentRoom,
            playerId: currentPlayerId,
            region: serverRegion,
          }),
        });
      } catch (error) {
        console.error('心跳发送失败:', error);
      }
    };

    // 立即发送一次心跳
    sendHeartbeat();

    // 每20秒发送一次心跳
    const heartbeatInterval = setInterval(sendHeartbeat, 20000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [currentRoom, currentPlayerId]);

  // 加入房间
  const joinRoom = async (roomId: string) => {
    if (!battleTag.trim()) {
      setError('请输入战网ID');
      return;
    }

    // 验证战网ID格式 (ABC#5XXX，其中XXX是3-7位数字)
    // 扩展Unicode范围以支持更多CJK字符，包括扩展A区
    const battleTagRegex = /^[\w\u3400-\u4dbf\u4e00-\u9fff]+#\d{3,7}$/;
    if (!battleTagRegex.test(battleTag.trim())) {
      setError('战网ID格式不正确，请输入正确格式（例如：Player#12345）');
      return;
    }

    setIsJoining(true);
    setError('');
    try {
      const response = await fetch('/api/teammate-matching/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          battleTag: battleTag.trim(),
          region: serverRegion,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentRoom(roomId);
        setBattleTag('');
        setCurrentPlayerId(result.playerId);
        setError('');
      } else {
        setError(result.error || '加入房间失败，请重试');
      }
    } catch (error) {
      console.error('加入房间错误:', error);
      setError('网络错误，请检查连接后重试');
    } finally {
      setIsJoining(false);
    }
  };

  // 离开房间
  const leaveRoom = async () => {
    if (!currentRoom) return;

    try {
      const response = await fetch('/api/teammate-matching/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: currentRoom,
          playerId: currentPlayerId,
          region: serverRegion,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentRoom(null);
        setCountdown(null);
        setCurrentPlayerId(null);
      }
    } catch (error) {
      console.error('离开房间错误:', error);
    }
  };

  // 标记配对成功
  const markMatched = async () => {
    if (!currentRoom) return;

    try {
      const response = await fetch('/api/teammate-matching/matched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: currentRoom,
          region: serverRegion,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // 不再立即清空状态，等待服务器推送匹配成功状态
        // setCurrentRoom(null);
        // setCountdown(null);
      }
    } catch (error) {
      console.error('标记配对成功错误:', error);
    }
  };

  const currentRoomData = rooms.find(room => room.id === currentRoom);

  return (
    <>
      <TermsModal 
          isOpen={showTermsModal} 
          onAccept={() => {
            setShowTermsModal(false);
            setHasAcceptedTerms(true);
          }}
          language={language}
        />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-orange-900 p-4 mobile-padding">
      <div className="max-w-6xl mx-auto">
        {/* 头部导航 */}
        <div className="flex flex-col gap-4 mb-8">
          {/* 标题行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/textures/00000003A4EB.png" alt="守望先锋" className="w-8 h-8 sm:w-10 sm:h-10" />
              <h1 className="text-xl sm:text-3xl font-bold text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                {t.title}
              </h1>
            </div>
            
            {/* 连接状态指示器 - 移动端置顶 */}
            <div className="flex sm:hidden items-center gap-1.5 px-2 py-1.5 bg-gray-800/50 border border-gray-600/30 rounded-lg">
              {isConnecting ? (
                <>
                  <ArrowPathIcon className="w-3 h-3 text-yellow-400 animate-spin" />
                  <span className="text-yellow-400 text-xs">{t.connecting}</span>
                </>
              ) : connectionError ? (
                <>
                  <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
                  <span className="text-red-400 text-xs">{t.connectionFailed}</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs">{t.connected}</span>
                </>
              )}
            </div>
          </div>
          
          {/* 导航和功能按钮区域 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* 导航链接 - 桌面端 */}
            <div className="hidden sm:flex items-center gap-2">
              <a 
                href="/"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-200 group"
              >
                <HomeIcon className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">{t.chatEditor}</span>
              </a>
              
              <a 
                href="/overwatch-market"
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 hover:border-purple-400/30 transition-all duration-200 group"
              >
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-white text-sm font-medium">{t.cardExchange}</span>
              </a>
              
              <a 
                href="/community-templates"
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 hover:border-orange-400/30 transition-all duration-200 group"
              >
                <span className="text-sm">🎨</span>
                <span className="text-white text-sm font-medium">{t.communityTemplates}</span>
              </a>
            </div>
            
            {/* 移动端导航链接 - 重新设计为网格布局 */}
            <div className="grid grid-cols-3 sm:hidden gap-2 mb-3">
              <a 
                href="/"
                className="flex flex-col items-center gap-1 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all duration-200"
              >
                <HomeIcon className="w-5 h-5 text-blue-400" />
                <span className="text-white text-xs font-medium">{language === 'zh' ? '编辑器' : 'Editor'}</span>
              </a>
              
              <a 
                href="/overwatch-market"
                className="flex flex-col items-center gap-1 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-white text-xs font-medium">{language === 'zh' ? '卡片' : 'Cards'}</span>
              </a>
              
              <a 
                href="/community-templates"
                className="flex flex-col items-center gap-1 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-all duration-200"
              >
                <span className="text-lg">🎨</span>
                <span className="text-white text-xs font-medium">{language === 'zh' ? '模板' : 'Templates'}</span>
              </a>
            </div>
            
            {/* 功能按钮区域 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              {/* 移动端：第一行 - 服务器和语言切换 */}
              <div className="flex sm:hidden items-center gap-2">
                {/* 服务器切换按钮 */}
                <div className="flex-1 flex items-center bg-gray-800/50 border border-gray-600/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (currentRoom) {
                        setError(language === 'zh' ? '请先离开当前房间再切换服务器' : 'Please leave current room before switching servers');
                        return;
                      }
                      setServerRegion('cn');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                      serverRegion === 'cn'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {t.cnServer}
                  </button>
                  <button
                    onClick={() => {
                      if (currentRoom) {
                        setError(language === 'zh' ? '请先离开当前房间再切换服务器' : 'Please leave current room before switching servers');
                        return;
                      }
                      setServerRegion('global');
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                      serverRegion === 'global'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {t.globalServer}
                  </button>
                </div>
                
                {/* 语言切换按钮 */}
                <button
                  onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                >
                  <span className="text-sm">{language === 'zh' ? '🇺🇸' : '🇨🇳'}</span>
                   <span className="text-white text-xs font-medium">{language === 'zh' ? 'EN' : '中'}</span>
                </button>
              </div>
              
              {/* 桌面端：所有功能按钮在一行 */}
              <div className="hidden sm:flex items-center gap-2">
                {/* 服务器切换按钮 */}
                <div className="flex items-center bg-gray-800/50 border border-gray-600/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (currentRoom) {
                        setError(language === 'zh' ? '请先离开当前房间再切换服务器' : 'Please leave current room before switching servers');
                        return;
                      }
                      setServerRegion('cn');
                    }}
                    className={`px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                      serverRegion === 'cn'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {t.cnServer}
                  </button>
                  <button
                    onClick={() => {
                      if (currentRoom) {
                        setError(language === 'zh' ? '请先离开当前房间再切换服务器' : 'Please leave current room before switching servers');
                        return;
                      }
                      setServerRegion('global');
                    }}
                    className={`px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                      serverRegion === 'global'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {t.globalServer}
                  </button>
                </div>
                
                {/* 语言切换按钮 */}
                <button
                  onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-800/50 border border-gray-600/30 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                >
                  <span className="text-xs">{language === 'zh' ? '🇺🇸' : '🇨🇳'}</span>
                   <span className="text-white text-xs font-medium">{language === 'zh' ? 'EN' : '中'}</span>
                </button>
                
                <AppreciationButton className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm" />
                
                {/* 连接状态指示器 */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-800/50 border border-gray-600/30 rounded-lg">
                  {isConnecting ? (
                    <>
                      <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 text-xs sm:text-sm">{t.connecting}</span>
                    </>
                  ) : connectionError ? (
                    <>
                      <ExclamationTriangleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                      <span className="text-red-400 text-xs sm:text-sm">{t.connectionFailed}</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 animate-pulse" />
                      <span className="text-green-400 text-xs sm:text-sm">{t.connected}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* 移动端：第二行 - 赞赏按钮 */}
              <div className="flex sm:hidden justify-center">
                <AppreciationButton className="px-4 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Toast错误提示 */}
        <Toast
          message={error}
          type="error"
          isVisible={!!error}
          onClose={() => setError('')}
          duration={5000}
        />

        {/* Toast成功提示 */}
        <Toast
          message={successMessage}
          type="success"
          isVisible={!!successMessage}
          onClose={() => setSuccessMessage('')}
          duration={3000}
        />

        {/* 连接状态提示 */}
        {isConnecting && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 animate-bounce-in">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
            <p className="text-yellow-400 font-medium">{t.connectingServer}</p>
          </div>
        )}
        
        {connectionError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">{t.connectionServerFailed}</p>
              <p className="text-red-300 text-sm mt-1">{t.checkNetworkOrRefresh}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              {t.refreshPage}
            </button>
          </div>
        )}

        {!currentRoom ? (
          // 房间列表视图
          <div className="space-y-6">
            {/* 输入战网ID和快速加入 */}
            <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/20 rounded-xl p-6 mb-6 transition-all duration-300 hover:border-orange-500/40">
              <div className="flex items-center gap-2 mb-6">
                <img src="/textures/0000000039DA.png" alt="组队" className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-orange-400">{t.startMatching}</h2>
              </div>
              
              {/* 战网ID输入引导 */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-400 text-lg font-semibold mb-2">
                  <InformationCircleIcon className="w-6 h-6" />
                  <span>{t.enterBattleTag}</span>
                </div>
                <div className="text-blue-300 space-y-2">
                  <p className="text-base">{t.formatLabel}<span className="text-white font-mono bg-gray-700 px-2 py-1 rounded">{t.formatExample}</span></p>
                  <p className="text-base">{t.exampleLabel}<span className="text-white font-mono bg-gray-700 px-2 py-1 rounded">Player#12345</span></p>
                  <p className="text-sm text-blue-200">{t.numberDescription}</p>
                </div>
              </div>
              
              {/* 离线提示 */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">{t.importantNotice}</span>
                </div>
                <p className="text-yellow-300 text-sm mt-1 ml-6">
                  {t.stayOnPageNotice}
                </p>
              </div>

              <div className="space-y-4">
                {/* 输入框和按钮组合 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <label className="block text-white font-medium mb-2 text-lg">
                      {t.battleTagLabel}
                    </label>
                    <input
                      type="text"
                      value={battleTag}
                      onChange={(e) => {
                        let value = e.target.value;
                        // 自动将中文井号转换为英文井号（处理多种可能的中文井号字符）
                        value = value.replace(/[＃﹟♯]/g, '#');
                        setBattleTag(value);
                        if (error) setError(''); // 清除错误提示
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && battleTag.trim()) {
                          // 如果有可用房间，加入第一个
                          const availableRoom = rooms.find(room => room.players.length < 2);
                          if (availableRoom) {
                            joinRoom(availableRoom.id);
                          }
                        }
                      }}
                      placeholder={t.battleTagPlaceholder}
                      className="w-full px-4 py-4 text-lg bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                      maxLength={50}
                      disabled={isJoining}
                    />
                    {isJoining && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* 快速加入按钮 */}
                  <div className="sm:self-end relative">
                    {/* 当没有输入时显示指引箭头 */}
                    {!battleTag.trim() && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 sm:-left-16 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 flex items-center gap-2 animate-bounce">
                        <div className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg relative">
                          {t.enterBattleTagFirst}
                          {/* 箭头指向输入框 */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 sm:hidden">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange-500"></div>
                          </div>
                          {/* 桌面端箭头指向左侧 */}
                          <div className="hidden sm:block absolute right-full top-1/2 transform -translate-y-1/2">
                            <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-orange-500"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        if (!battleTag.trim()) {
                          // 如果没有输入，聚焦到输入框
                          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                          if (input) {
                            input.focus();
                            input.classList.add('animate-pulse');
                            setTimeout(() => {
                              input.classList.remove('animate-pulse');
                            }, 1000);
                          }
                          return;
                        }
                        const availableRoom = rooms.find(room => room.players.length < 2);
                        if (availableRoom) {
                          joinRoom(availableRoom.id);
                        }
                      }}
                      disabled={isJoining}
                      className={`w-full sm:w-auto px-8 py-4 text-lg rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-3 transform shadow-lg ${
                        !battleTag.trim() 
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-gray-300 cursor-pointer hover:scale-105' 
                          : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white hover:scale-105'
                      } ${isJoining ? 'cursor-not-allowed' : ''}`}
                    >
                      {isJoining ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t.matching}
                        </>
                      ) : !battleTag.trim() ? (
                        <>
                          <InformationCircleIcon className="w-5 h-5" />
                          {t.enterBattleTagFirst}
                        </>
                      ) : (
                        <>
                          <RocketLaunchIcon className="w-5 h-5" />
                          {t.startMatching}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-400 flex items-center gap-1">
                    <CheckIcon className="w-4 h-4 text-green-400" />
                    {t.inputCompleteHint}
                  </p>
                  <p className="text-gray-400">
                    {battleTag.length}/50
                  </p>
                </div>
              </div>
            </div>

            {/* 房间列表 */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:border-orange-500/50 hover:shadow-orange-500/10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <HomeIcon className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t.roomList}</h2>
                    <p className="text-orange-400/70 text-sm">{t.selectRoomToStart}</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
                  <span className="text-orange-400 font-medium text-sm">
                    {t.totalRooms.replace('{count}', rooms.length.toString())}
                  </span>
                </div>
              </div>
              
              {rooms.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-700/50 rounded-full flex items-center justify-center">
                    <HomeIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-300 text-xl mb-3">{t.noRoomsAvailable}</p>
                  <p className="text-gray-500">{t.autoCreateRoom}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mobile-grid-1">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl group ${
                        room.players.length === 0
                          ? 'bg-gradient-to-br from-emerald-500/5 to-green-500/10 border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-emerald-500/20'
                          : room.players.length === 1
                          ? 'bg-gradient-to-br from-amber-500/5 to-yellow-500/10 border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/20'
                          : 'bg-gradient-to-br from-red-500/5 to-rose-500/10 border-red-500/30 hover:border-red-400/50'
                      }`}
                    >
                      {/* 房间头部 */}
                      <div className="p-5 border-b border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              room.players.length === 0
                                ? 'bg-emerald-500/20'
                                : room.players.length === 1
                                ? 'bg-amber-500/20'
                                : 'bg-red-500/20'
                            }`}>
                              <HomeIcon className={`w-5 h-5 ${
                                room.players.length === 0
                                  ? 'text-emerald-400'
                                  : room.players.length === 1
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">
                                {t.room} {room.id}
                              </h3>
                              <p className={`text-sm ${
                                room.players.length === 0
                                  ? 'text-emerald-400/70'
                                  : room.players.length === 1
                                  ? 'text-amber-400/70'
                                  : 'text-red-400/70'
                              }`}>
                                {room.players.length === 0 ? t.idle : room.players.length === 1 ? t.waiting : t.full}
                              </p>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${
                            room.players.length === 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : room.players.length === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              room.players.length === 0
                                ? 'bg-emerald-400 animate-pulse'
                                : room.players.length === 1
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-red-400'
                            }`}></div>
                            {room.players.length}/2
                          </div>
                        </div>
                      </div>
                      
                      {/* 玩家列表 */}
                      <div className="p-5 min-h-[100px] flex flex-col justify-center">
                        <div className="space-y-3">
                          {room.players.map((player, index) => (
                            <div key={player.id} className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <UserGroupIcon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">{t.playerNumber.replace('{number}', (index + 1).toString())}</p>
                                <p className="text-gray-400 text-xs">{t.connected}</p>
                              </div>
                            </div>
                          ))}
                          {room.players.length === 0 && (
                            <div className="text-center py-4">
                              <div className="w-12 h-12 mx-auto mb-3 bg-gray-700/30 rounded-full flex items-center justify-center">
                                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                              </div>
                              <p className="text-gray-400 text-sm">{t.waitingPlayersJoin}</p>
                            </div>
                          )}
                          {room.players.length === 1 && (
                            <div className="text-center py-2">
                              <div className="w-10 h-10 mx-auto mb-2 bg-gray-700/30 rounded-full flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></div>
                              </div>
                              <p className="text-gray-400 text-sm">{t.waitingSecondPlayer}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="p-5 pt-0">
                        {room.players.length < 2 ? (
                          <button
                            onClick={() => {
                              if (!battleTag.trim()) {
                                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                                if (input) {
                                  input.focus();
                                  input.classList.add('animate-pulse');
                                  setTimeout(() => {
                                    input.classList.remove('animate-pulse');
                                  }, 1000);
                                }
                                input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                return;
                              }
                              joinRoom(room.id);
                            }}
                            disabled={isJoining}
                            className={`w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 transform group-hover:scale-[1.02] ${
                              !battleTag.trim()
                                ? 'bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-500/80 hover:to-gray-600/80 text-gray-300 border border-gray-500/30 hover:border-gray-400/50'
                                : room.players.length === 0
                                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg hover:shadow-emerald-500/25'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg hover:shadow-amber-500/25'
                            } ${isJoining ? 'cursor-not-allowed opacity-70' : 'hover:shadow-xl'}`}
                          >
                            {isJoining ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{t.joining}</span>
                              </>
                            ) : !battleTag.trim() ? (
                              <>
                                <InformationCircleIcon className="w-5 h-5" />
                                <span>{t.pleaseEnterBattleTagFirst}</span>
                              </>
                            ) : (
                              <>
                                <RocketLaunchIcon className="w-5 h-5" />
                                <span>{room.players.length === 0 ? t.createRoom : t.quickJoin}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 text-center">
                            <div className="flex items-center justify-center gap-2 text-red-300 font-medium">
                              <XMarkIcon className="w-5 h-5" />
                              <span>{t.roomFull}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            

          </div>
        ) : (
          // 房间内视图
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:border-orange-500/50 hover:shadow-orange-500/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/30">
                  <HomeIcon className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    {t.room} {currentRoom}
                    <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 text-sm rounded-full border border-orange-500/30 font-medium">
                      {t.joined}
                    </div>
                  </h2>
                  <p className="text-orange-400/70 text-sm mt-1">{t.successJoinedRoom}</p>
                </div>
              </div>
              <button
                onClick={leaveRoom}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-300 flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-red-500/25 font-medium"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                {t.leaveRoom}
              </button>
            </div>

            {matchedSuccess ? (
              // 匹配成功显示
              <div className="text-center py-16 animate-in fade-in duration-700">
                <div className="relative mb-12">
                  {/* 背景光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                  
                  {/* 成功图标 */}
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-bounce">
                      <CheckIcon className="w-12 h-12 text-white" />
                    </div>
                    
                    {/* 环绕粒子效果 */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                      <div className="flex space-x-8">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-6 animate-pulse">
                    {t.matchSuccess}
                  </h3>
                  <p className="text-gray-200 text-2xl mb-6 font-medium">{t.enjoyGame}</p>
                  
                  {/* 装饰性图标 */}
                  <div className="flex justify-center gap-6 mb-8">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      <UserGroupIcon className="w-6 h-6 text-green-400 animate-pulse" />
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      <RocketLaunchIcon className="w-6 h-6 text-blue-400 animate-pulse" style={{animationDelay: '0.2s'}} />
                    </div>
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      <CheckIcon className="w-6 h-6 text-purple-400 animate-pulse" style={{animationDelay: '0.4s'}} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/30 rounded-2xl p-8 max-w-lg mx-auto backdrop-blur-sm shadow-xl">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
                    <p className="text-green-300 font-semibold text-lg">{t.autoReturnMessage}</p>
                  </div>
                  <p className="text-gray-300 text-base">{t.thankYouMessage}</p>
                  
                  {/* 进度条 */}
                  <div className="mt-6 w-full bg-gray-700/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            ) : currentRoomData && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mobile-grid-1">
                  {currentRoomData.players.map((player, index) => (
                    <div key={player.id} className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-xl p-6 border border-gray-700/50 transition-all duration-300 hover:border-orange-500/30 transform hover:scale-105">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">{t.player} {index + 1}</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 text-sm">{t.online}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-300 font-medium">{player.battleTag}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(player.battleTag);
                              setError(''); // 清除之前的错误
                              // 显示复制成功提示
                              setSuccessMessage(t.copiedToClipboard);
                              setTimeout(() => setSuccessMessage(''), 2000);
                            }}
                            className="ml-auto px-2 py-1 text-gray-400 hover:text-orange-400 transition-colors rounded hover:bg-orange-500/10 flex items-center gap-1 text-xs"
                            title="复制用户名"
                          >
                            <ClipboardDocumentIcon className="w-3 h-3" />
                            {t.copy}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <UserGroupIcon className="w-3 h-3 text-gray-400" />
                          <span>
                            {t.joinTime}{new Date(player.joinedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {currentRoomData.players.length === 1 && (
                    <div className="bg-gray-800/30 rounded-xl p-6 border-2 border-dashed border-gray-600 transition-all duration-300 hover:border-gray-500">
                      <div className="text-center">
                        <UserGroupIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
                        <h3 className="font-bold text-gray-400 mb-2">{t.waitingPlayer}</h3>
                        <p className="text-gray-400 text-sm">
                          {currentRoomData.status === 'countdown' 
                            ? t.opponentLeft 
                            : t.waitingSecondPlayerJoin
                          }
                        </p>
                        <div className="mt-4 flex justify-center">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {currentRoomData.players.length === 2 && (
                  <div className="text-center bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-8 border border-green-500/20">
                    {countdown !== null && countdown > 0 && (
                      <div className="mb-8">
                        <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
                          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </div>
                        <p className="text-gray-400 mb-2 flex items-center justify-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          {t.countdownAutoClean}
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                          <div 
                            className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full transition-all duration-1000"
                            style={{width: `${(countdown / 300) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <p className="text-gray-300 text-lg mb-4">
                        {t.roomFullMessage}
                      </p>
                      <button
                        onClick={markMatched}
                        className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 font-bold text-xl flex items-center justify-center gap-3 mx-auto transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
                      >
                        <CheckIcon className="w-6 h-6" />
                        {t.matchedSuccessButton}
                      </button>
                      <div className="text-gray-400 text-sm">
                        <div className="flex items-center gap-2">
                          <InformationCircleIcon className="w-4 h-4" />
                          <span>{t.matchedSuccessHint}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <AdBanner />
    </>
  );
};

export default TeammateMatching;