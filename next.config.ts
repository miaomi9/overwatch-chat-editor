import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // 优化包导入，减少不必要的代码
    optimizePackageImports: ['@heroicons/react'],
  },

  // 优化图片加载
  images: {
    minimumCacheTTL: 3600, // 1小时缓存
  },
  // 静态资源缓存配置
  async headers() {
    return [
      {
        // 匹配所有静态图片资源
        source: '/card/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable', // 7天缓存
          },
        ],
      },
      {
        // 匹配纹理图片
        source: '/textures/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable', // 7天缓存
          },
        ],
      },
      {
        // 匹配其他静态资源
        source: '/((?!api).*)\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable', // 7天缓存
          },
        ],
      },
    ];
  },

  // 启用 gzip 压缩
  compress: true,
  // 优化页面加载
  reactStrictMode: true,
  poweredByHeader: false,
};



export default nextConfig;
