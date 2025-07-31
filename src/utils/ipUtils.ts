import { NextRequest } from 'next/server';

/**
 * 获取客户端真实IP地址
 * @param request NextRequest对象
 * @returns 客户端IP地址
 */
export function getClientIP(request: NextRequest): string {
  // 尝试从各种头部获取真实IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for 可能包含多个IP，取第一个
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // 如果都没有，返回默认值
  return 'unknown';
}

/**
 * 检查IP是否为localhost
 * @param ip IP地址
 * @returns 是否为localhost
 */
export function isLocalhost(ip: string): boolean {
  const localhostIPs = [
    '127.0.0.1',
    '::1',
    'localhost',
    '0.0.0.0',
    '::',
    'unknown'
  ];
  
  return localhostIPs.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
}

/**
 * 检查IP是否需要限制（非localhost）
 * @param ip IP地址
 * @returns 是否需要限制
 */
export function shouldRestrictIP(ip: string): boolean {
  return !isLocalhost(ip);
}