import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, getAllRooms, updateRooms, getAllIpRoomMappings, removeIpRoomMapping } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId } = await request.json();
    
    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: '房间ID和玩家ID不能为空' },
        { status: 400 }
      );
    }
    
    const redis = getRedisClient();
    const heartbeatKey = `heartbeat:${roomId}:${playerId}`;
    
    // 设置心跳，30秒过期
    await redis.setex(heartbeatKey, 30, Date.now().toString());
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('心跳更新错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 清理无效IP映射的函数
async function cleanupInvalidIpMappings(rooms: any[]) {
  try {
    const ipMappings = await getAllIpRoomMappings();
    
    for (const [ip, roomId] of Object.entries(ipMappings)) {
      const room = rooms.find(r => r.id === roomId);
      
      // 如果房间不存在或房间为空，清理IP映射
      if (!room || room.players.length === 0) {
        await removeIpRoomMapping(ip);
        console.log(`清理无效IP映射: ${ip} -> ${roomId}`);
      }
    }
  } catch (error) {
    console.error('清理无效IP映射错误:', error);
  }
}

// 清理离线玩家的函数
export async function cleanupOfflinePlayers() {
  try {
    const redis = getRedisClient();
    const rooms = await getAllRooms();
    let hasChanges = false;
    
    for (const room of rooms) {
      const onlinePlayers = [];
      
      for (const player of room.players) {
        const heartbeatKey = `heartbeat:${room.id}:${player.id}`;
        const heartbeat = await redis.get(heartbeatKey);
        
        if (heartbeat) {
          // 玩家在线
          onlinePlayers.push(player);
        } else {
          // 玩家离线，从房间中移除
          console.log(`清理离线玩家: ${player.battleTag} from room ${room.id}`);
          hasChanges = true;
        }
      }
      
      if (onlinePlayers.length !== room.players.length) {
        room.players = onlinePlayers;
        
        // 如果房间不满2人，取消倒计时状态
        if (room.players.length < 2 && room.status === 'countdown') {
          room.status = 'waiting';
          delete room.countdownStart;
        }
      }
    }
    
    if (hasChanges) {
      await updateRooms(rooms);
      
      // 清理无效的IP映射
      await cleanupInvalidIpMappings(rooms);
    }
  } catch (error) {
    console.error('清理离线玩家错误:', error);
  }
}

// 启动定期清理任务
if (typeof global !== 'undefined' && !(global as any).cleanupInterval) {
  (global as any).cleanupInterval = setInterval(cleanupOfflinePlayers, 15000); // 每15秒检查一次
}