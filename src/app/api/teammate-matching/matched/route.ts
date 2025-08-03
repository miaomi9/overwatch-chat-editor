import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, updateRooms, getAllIpRoomMappings, removeIpRoomMapping } from '../../../../lib/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { roomId, region } = await request.json();
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
    
    if (room.players.length !== 2) {
      return NextResponse.json(
        { error: '房间人数不足，无法标记为配对成功' },
        { status: 400 }
      );
    }
    
    // 标记为配对成功
    room.status = 'matched';
    
    // 保存匹配记录到数据库
    try {
      await prisma.teammateMatchRecord.create({
        data: {
          roomId: roomId,
          region: serverRegion,
          playerCount: room.players.length,
          playerTags: JSON.stringify(room.players.map(p => p.battleTag)),
          matchedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('[队友匹配] 保存匹配记录失败:', dbError);
      // 数据库错误不影响匹配流程，继续执行
    }
    
    // 立即更新房间状态，让前端能收到匹配成功的通知
    await updateRooms(rooms, serverRegion);
    
    // 延迟清空房间，给用户一点时间看到配对成功状态
    setTimeout(async () => {
      const currentRooms = await getAllRooms(serverRegion);
      const currentRoom = currentRooms.find(r => r.id === roomId);
      
      if (currentRoom && currentRoom.status === 'matched') {
        // 清理该房间相关的IP映射
        const ipMappings = await getAllIpRoomMappings(serverRegion);
        for (const [ip, mappedRoomId] of Object.entries(ipMappings)) {
          if (mappedRoomId === roomId) {
            await removeIpRoomMapping(ip, serverRegion);
          }
        }
        
        currentRoom.players = [];
        currentRoom.status = 'waiting';
        delete currentRoom.countdownStart;
        
        await updateRooms(currentRooms, serverRegion);
      }
    }, 5000); // 5秒后清空，给用户更多时间看到成功状态
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[队友匹配] 标记配对成功失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}