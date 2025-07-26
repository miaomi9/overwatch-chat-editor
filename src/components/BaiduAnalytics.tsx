'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// 声明全局变量
declare global {
  interface Window {
    _hmt: any[];
  }
}

const BaiduAnalytics = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 监听路由变化，手动发送页面浏览统计
    if (typeof window !== 'undefined' && window._hmt) {
      try {
        window._hmt.push(['_trackPageview', pathname]);
      } catch (e) {
        console.error('百度统计错误:', e);
      }
    }
  }, [pathname]);

  return null;
};

export default BaiduAnalytics;