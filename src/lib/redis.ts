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
      console.error('[Redis] 连接失败:', error);
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
  ROOMS: (region: string) => `teammate_matching:${region}:rooms`,
  ROOM_PREFIX: (region: string) => `teammate_matching:${region}:room:`,
  EVENTS: (region: string) => `teammate_matching:${region}:events`,
  IP_ROOM_MAP: (region: string) => `teammate_matching:${region}:ip_room_map`,
};

// 初始化房间数据
export async function initializeRooms(region: string = 'cn') {
  const client = getRedisClient();
  
  // 检查是否已经初始化
  const exists = await client.exists(REDIS_KEYS.ROOMS(region));
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
  await client.set(REDIS_KEYS.ROOMS(region), JSON.stringify(rooms));
  console.log(`初始化${region}服务器30个房间完成`);
}

// 获取所有房间
export async function getAllRooms(region: string = 'cn'): Promise<Room[]> {
  const client = getRedisClient();
  const roomsData = await client.get(REDIS_KEYS.ROOMS(region));
  
  if (!roomsData) {
    await initializeRooms(region);
    return getAllRooms(region);
  }
  
  return JSON.parse(roomsData);
}

// 更新房间数据
export async function updateRooms(rooms: Room[], region: string = 'cn') {
  const client = getRedisClient();
  await client.set(REDIS_KEYS.ROOMS(region), JSON.stringify(rooms));
  
  // 发布更新事件
  await client.publish(REDIS_KEYS.EVENTS(region), JSON.stringify({
    type: 'rooms_update',
    rooms,
  }));
}

// 发布倒计时更新事件
export async function publishCountdownUpdate(countdown: number, region: string = 'cn') {
  const client = getRedisClient();
  await client.publish(REDIS_KEYS.EVENTS(region), JSON.stringify({
    type: 'countdown_update',
    countdown,
  }));
}

// IP管理函数
export async function setIpRoomMapping(ip: string, roomId: string, region: string = 'cn') {
  const redis = getRedisClient();
  await redis.hset(REDIS_KEYS.IP_ROOM_MAP(region), ip, roomId);
}

export async function getIpRoomMapping(ip: string, region: string = 'cn'): Promise<string | null> {
  const redis = getRedisClient();
  return await redis.hget(REDIS_KEYS.IP_ROOM_MAP(region), ip);
}

export async function removeIpRoomMapping(ip: string, region: string = 'cn') {
  const redis = getRedisClient();
  await redis.hdel(REDIS_KEYS.IP_ROOM_MAP(region), ip);
}

export async function getAllIpRoomMappings(region: string = 'cn'): Promise<Record<string, string>> {
  const redis = getRedisClient();
  return await redis.hgetall(REDIS_KEYS.IP_ROOM_MAP(region));
}

export default getRedisClient;