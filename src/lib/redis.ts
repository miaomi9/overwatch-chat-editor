import Redis from 'ioredis';

// Redis客户端实例
let redis: Redis | null = null;

// 获取Redis客户端
export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('error', (error) => {
      console.error('Redis连接错误:', error);
    });

    redis.on('connect', () => {
      console.log('Redis连接成功');
    });
  }

  return redis;
}

// 关闭Redis连接
export async function closeRedisConnection() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// 房间数据类型
export interface Player {
  id: string;
  battleTag: string;
  joinedAt: number;
}

export interface Room {
  id: string;
  players: Player[];
  status: 'waiting' | 'matched' | 'countdown';
  countdownStart?: number;
}

// Redis键名
export const REDIS_KEYS = {
  ROOMS: 'teammate_matching:rooms',
  ROOM_PREFIX: 'teammate_matching:room:',
  EVENTS: 'teammate_matching:events',
  IP_ROOM_MAP: 'teammate_matching:ip_room_map',
};

// 初始化房间数据
export async function initializeRooms() {
  const client = getRedisClient();
  
  // 检查是否已经初始化
  const exists = await client.exists(REDIS_KEYS.ROOMS);
  if (exists) {
    return;
  }

  // 创建30个房间
  const rooms: Room[] = [];
  for (let i = 1; i <= 30; i++) {
    rooms.push({
      id: i.toString(),
      players: [],
      status: 'waiting',
    });
  }

  // 保存到Redis
  await client.set(REDIS_KEYS.ROOMS, JSON.stringify(rooms));
  console.log('初始化30个房间完成');
}

// 获取所有房间
export async function getAllRooms(): Promise<Room[]> {
  const client = getRedisClient();
  const roomsData = await client.get(REDIS_KEYS.ROOMS);
  
  if (!roomsData) {
    await initializeRooms();
    return getAllRooms();
  }
  
  return JSON.parse(roomsData);
}

// 更新房间数据
export async function updateRooms(rooms: Room[]) {
  const client = getRedisClient();
  await client.set(REDIS_KEYS.ROOMS, JSON.stringify(rooms));
  
  // 发布更新事件
  await client.publish(REDIS_KEYS.EVENTS, JSON.stringify({
    type: 'rooms_update',
    rooms,
  }));
}

// 发布倒计时更新事件
export async function publishCountdownUpdate(countdown: number) {
  const client = getRedisClient();
  await client.publish(REDIS_KEYS.EVENTS, JSON.stringify({
    type: 'countdown_update',
    countdown,
  }));
}

// IP管理函数
export async function setIpRoomMapping(ip: string, roomId: string) {
  const redis = getRedisClient();
  await redis.hset(REDIS_KEYS.IP_ROOM_MAP, ip, roomId);
}

export async function getIpRoomMapping(ip: string): Promise<string | null> {
  const redis = getRedisClient();
  return await redis.hget(REDIS_KEYS.IP_ROOM_MAP, ip);
}

export async function removeIpRoomMapping(ip: string) {
  const redis = getRedisClient();
  await redis.hdel(REDIS_KEYS.IP_ROOM_MAP, ip);
}

export async function getAllIpRoomMappings(): Promise<Record<string, string>> {
  const redis = getRedisClient();
  return await redis.hgetall(REDIS_KEYS.IP_ROOM_MAP);
}

export default getRedisClient;