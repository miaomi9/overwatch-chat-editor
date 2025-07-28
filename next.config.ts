import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // 优化包导入，减少不必要的代码
    optimizePackageImports: ['@heroicons/react'],
  },
  // 优化生产环境构建
  swcMinify: true,
  // 优化图片加载
  images: {
    minimumCacheTTL: 60,
  },
  // 优化字体加载
  optimizeFonts: true,
  // 启用 gzip 压缩
  compress: true,
  // 优化页面加载
  reactStrictMode: true,
  poweredByHeader: false,
};



export default nextConfig;
