'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// 声明全局变量
declare global {
  interface Window {
    _hmt: any[];
  }
}

const App = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 初始化百度统计
    if (typeof window !== 'undefined') {
      window._hmt = window._hmt || [];
      
      // 动态加载百度统计脚本
      const script = document.createElement('script');
      script.src = 'https://hm.baidu.com/hm.js?7d5edd789d24b06a96fec911776ce4e8';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      }
    }
  }, []);

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

export default App;