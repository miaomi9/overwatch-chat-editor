import { NextRequest } from 'next/server';
import { getRedisClient, REDIS_KEYS, initializeRooms } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  // 获取region参数
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'cn';
  
  // 初始化房间数据
  await initializeRooms(region);
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const redis = getRedisClient();
      const subscriber = redis.duplicate();
      
      // 订阅Redis事件
      subscriber.subscribe(REDIS_KEYS.EVENTS(region));
      
      subscriber.on('message', (channel, message) => {
        if (channel === REDIS_KEYS.EVENTS(region)) {
          const data = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      });
      
      // 发送初始数据
      redis.get(REDIS_KEYS.ROOMS(region)).then(roomsData => {
        if (roomsData) {
          const rooms = JSON.parse(roomsData);
          const data = `data: ${JSON.stringify({
            type: 'rooms_update',
            rooms,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      });
      
      // 保持连接活跃
      const heartbeat = setInterval(() => {
        const data = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
        controller.enqueue(encoder.encode(data));
      }, 30000);
      
      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.quit();
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}