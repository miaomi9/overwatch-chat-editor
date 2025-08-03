import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, updateRooms, removeIpRoomMapping } from '../../../../lib/redis';
import { getClientIP, shouldRestrictIP } from '../../../../utils/ipUtils';

export async function POST(request: NextRequest) {
  try {
    let roomId, playerId, region;
    const clientIP = getClientIP(request);
    
    // 处理不同类型的请求体（JSON或纯文本）
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = await request.json();
      roomId = body.roomId;
      playerId = body.playerId;
      region = body.region;
    } else {
      // 处理 navigator.sendBeacon 发送的纯文本
      const text = await request.text();
      try {
        const body = JSON.parse(text);
        roomId = body.roomId;
        playerId = body.playerId;
        region = body.region;
      } catch {
        // 如果解析失败，可能是直接的roomId字符串
        roomId = text;
      }
    }
    
    const serverRegion = region || 'cn';
    
    if (!roomId) {
      return NextResponse.json(
        { error: '房间ID不能为空' },
        { status: 400 }
      );
    }
    
    const rooms = await getAllRooms(serverRegion);
    const room = rooms.find(r => r.id === roomId);
    
    if (!room) {
      return NextResponse.json(
        { error: '房间不存在' },
        { status: 404 }
      );
    }
    
    // 根据是否提供playerId和房间状态决定处理方式
    if (playerId) {
      // 如果提供了playerId，只移除特定玩家
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        // 如果在倒计时阶段且还有玩家，保持倒计时状态让另一方继续等待
        if (room.status === 'countdown' && room.players.length > 0) {
          // 保持倒计时状态，让剩余玩家继续等待
          // 不修改status和countdownStart
        } else if (room.players.length === 0) {
          // 如果没有玩家了，重置房间
          room.status = 'waiting';
          delete room.countdownStart;
        } else if (room.status === 'countdown' && room.players.length === 1) {
          // 倒计时阶段只剩一个玩家，重置为等待状态
          room.status = 'waiting';
          delete room.countdownStart;
        }
      }
    } else {
      // 如果没有提供playerId，清空整个房间（向后兼容）
      room.players = [];
      room.status = 'waiting';
      delete room.countdownStart;
    }
    
    // 清理IP映射（如果需要限制）
    if (shouldRestrictIP(clientIP)) {
      await removeIpRoomMapping(clientIP, serverRegion);
    }
    
    await updateRooms(rooms, serverRegion);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[队友匹配] 离开房间失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}