import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, updateRooms, publishCountdownUpdate, setIpRoomMapping, getIpRoomMapping, type Room, type Player } from '../../../../lib/redis';
import { getClientIP, shouldRestrictIP } from '../../../../utils/ipUtils';

export async function POST(request: NextRequest) {
  try {
    const { roomId, battleTag, region } = await request.json();
    const clientIP = getClientIP(request);
    const serverRegion = region || 'cn';
    
    if (!roomId || !battleTag) {
      return NextResponse.json(
        { error: '房间ID和战网ID不能为空' },
        { status: 400 }
      );
    }
    
    // 验证战网ID格式 (ABC#5XXX，其中XXX是3-7位数字)
    // 扩展Unicode范围以支持更多CJK字符，包括扩展A区
    const battleTagRegex = /^[\w\u3400-\u4dbf\u4e00-\u9fff]+#\d{3,7}$/;
    if (!battleTagRegex.test(battleTag) || battleTag.length > 50) {
      return NextResponse.json(
        { error: '战网ID格式不正确，请输入正确格式（例如：Player#12345）' },
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
    
    if (room.players.length >= 2) {
      return NextResponse.json(
        { error: '房间已满' },
        { status: 400 }
      );
    }
    
    // 检查是否已经在房间中
    const existingPlayer = room.players.find(p => p.battleTag === battleTag);
    if (existingPlayer) {
      return NextResponse.json(
        { error: '您已经在这个房间中' },
        { status: 400 }
      );
    }
    
    // 检查是否在其他房间中
    const playerInOtherRoom = rooms.find(r => 
      r.id !== roomId && r.players.some(p => p.battleTag === battleTag)
    );
    if (playerInOtherRoom) {
      return NextResponse.json(
        { error: '您已经在其他房间中，请先离开' },
        { status: 400 }
      );
    }
    
    // IP限制检查（除了localhost）
    if (shouldRestrictIP(clientIP)) {
      const existingRoomId = await getIpRoomMapping(clientIP, serverRegion);
      if (existingRoomId && existingRoomId !== roomId) {
        // 检查该IP对应的房间是否还存在该IP的玩家
        const existingRoom = rooms.find(r => r.id === existingRoomId);
        if (existingRoom && existingRoom.players.length > 0) {
          return NextResponse.json(
            { error: '同一IP地址只能同时加入一个房间' },
            { status: 400 }
          );
        }
      }
    }
    
    // 添加玩家到房间
    const newPlayer: Player = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      battleTag,
      joinedAt: Date.now(),
    };
    
    room.players.push(newPlayer);
    
    // 设置IP与房间的映射（如果需要限制）
    if (shouldRestrictIP(clientIP)) {
      await setIpRoomMapping(clientIP, roomId, serverRegion);
    }
    
    // 如果房间满了，开始倒计时
    if (room.players.length === 2) {
      room.status = 'countdown';
      room.countdownStart = Date.now();
      
      // 启动3分钟倒计时
      setTimeout(async () => {
        const currentRooms = await getAllRooms(serverRegion);
        const currentRoom = currentRooms.find(r => r.id === roomId);
        
        if (currentRoom && currentRoom.status === 'countdown' && 
            currentRoom.countdownStart === room.countdownStart) {
          // 倒计时结束，自动标记为匹配成功
          currentRoom.status = 'matched';
          
          // 立即更新状态
          await updateRooms(currentRooms, serverRegion);
          
          // 再延迟5秒后清空房间
          setTimeout(async () => {
            const finalRooms = await getAllRooms(serverRegion);
            const finalRoom = finalRooms.find(r => r.id === roomId);
            
            if (finalRoom && finalRoom.status === 'matched') {
              finalRoom.players = [];
              finalRoom.status = 'waiting';
              delete finalRoom.countdownStart;
              
              await updateRooms(finalRooms, serverRegion);
            }
          }, 5000);
        }
      }, 3 * 60 * 1000); // 3分钟
      
      // 启动倒计时广播
      startCountdownBroadcast(roomId, room.countdownStart, serverRegion);
    }
    
    await updateRooms(rooms, serverRegion);
    
    return NextResponse.json({ 
      success: true, 
      playerId: newPlayer.id 
    });
  } catch (error) {
    console.error('[队友匹配] 加入房间失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 倒计时广播函数
function startCountdownBroadcast(roomId: string, startTime: number, region: string = 'cn') {
  const interval = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, 180 - elapsed); // 3分钟 = 180秒
    
    if (remaining <= 0) {
      clearInterval(interval);
      return;
    }
    
    // 检查房间是否还在倒计时状态
    const rooms = await getAllRooms(region);
    const room = rooms.find(r => r.id === roomId);
    
    if (!room || room.status !== 'countdown' || room.countdownStart !== startTime) {
      clearInterval(interval);
      return;
    }
    
    await publishCountdownUpdate(remaining, region);
  }, 1000);
}