import { NextRequest, NextResponse } from 'next/server';
import { getAllRooms, updateRooms, getAllIpRoomMappings, removeIpRoomMapping } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();
    
    if (!roomId) {
      return NextResponse.json(
        { error: '房间ID不能为空' },
        { status: 400 }
      );
    }
    
    const rooms = await getAllRooms();
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
    
    // 立即更新房间状态，让前端能收到匹配成功的通知
    await updateRooms(rooms);
    
    // 延迟清空房间，给用户一点时间看到配对成功状态
    setTimeout(async () => {
      const currentRooms = await getAllRooms();
      const currentRoom = currentRooms.find(r => r.id === roomId);
      
      if (currentRoom && currentRoom.status === 'matched') {
        // 清理该房间相关的IP映射
        const ipMappings = await getAllIpRoomMappings();
        for (const [ip, mappedRoomId] of Object.entries(ipMappings)) {
          if (mappedRoomId === roomId) {
            await removeIpRoomMapping(ip);
          }
        }
        
        currentRoom.players = [];
        currentRoom.status = 'waiting';
        delete currentRoom.countdownStart;
        
        await updateRooms(currentRooms);
      }
    }, 5000); // 5秒后清空，给用户更多时间看到成功状态
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('标记配对成功错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}