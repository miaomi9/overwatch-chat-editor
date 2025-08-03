import { NextRequest, NextResponse } from 'next/server';
import { getQueueStatus } from '@/utils/queueProcessor';
import { getWorkerStatus } from '@/utils/backgroundWorker';

export async function GET(request: NextRequest) {
  try {
    // 获取队列状态
    const queueStatus = await getQueueStatus();
    
    // 获取工作器状态
    const workerStatus = getWorkerStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        queue: {
          length: queueStatus.queueLength,
          pendingCount: queueStatus.pendingCount
        },
        worker: {
          isRunning: workerStatus.isRunning,
          retryCount: workerStatus.retryCount,
          pollInterval: workerStatus.pollInterval
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[队列状态API] 获取失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取队列状态失败' 
      },
      { status: 500 }
    );
  }
}