import { getRedisClient } from '@/lib/redis';
import { prisma } from '@/lib/db';

// 从暴雪API获取卡片信息
async function fetchCardInfo(shareToken: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
  
  try {
    const response = await fetch(
      `https://webapi.blizzard.cn/ow-champion-game-center/ccc-card/share/info?share_token=${shareToken}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`暴雪API请求失败: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // 如果data为null，表示卡片已被领取
    if (data.data === null) {
      return { claimed: true };
    }
    
    return { claimed: false, ...data.data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`请求超时: ${shareToken}`);
    } else {
      console.error('获取卡片信息失败:', error);
    }
    return null;
  }
}

// 处理单个队列项目
async function processQueueItem(queueItem: any) {
  try {
    const { cardId, shareToken } = queueItem;
    
    // 检查卡片是否仍然存在且为活跃状态
    const cardExchange = await prisma.cardExchange.findUnique({
      where: { id: cardId },
    });
    
    if (!cardExchange || cardExchange.status !== 'active') {
      console.log(`[队列处理] 跳过非活跃卡片: ${cardId}`);
      return false;
    }
    
    // 获取卡片信息
    const cardInfo = await fetchCardInfo(shareToken);
    
    if (!cardInfo) {
      // 更新最后检查时间，即使失败也要记录
      await prisma.cardExchange.update({
        where: { id: cardId },
        data: {
          lastCheckedAt: new Date(),
        },
      });
      return false;
    }
    
    // 如果卡片已被领取，更新状态
    if (cardInfo.claimed) {
      await prisma.cardExchange.update({
        where: { id: cardId },
        data: {
          status: 'claimed',
          lastCheckedAt: new Date(),
        },
      });
      console.log(`[队列处理] 卡片已标记为已使用: ${cardId}`);
      return true;
    } else {
      // 更新最后检查时间
      await prisma.cardExchange.update({
        where: { id: cardId },
        data: {
          lastCheckedAt: new Date(),
        },
      });
      return false;
    }
  } catch (error) {
    console.error(`[队列处理] 处理卡片失败 ${queueItem.cardId}:`, error);
    return false;
  }
}

// 处理检测队列
export async function processCardCheckQueue() {
  const redis = getRedisClient();
  let processedCount = 0;
  let claimedCount = 0;
  
  try {
    // 批量处理队列项目（每次最多处理20个）
    const batchSize = 20;
    
    while (true) {
      // 从队列中获取项目
      const queueItems = await redis.rpop('card_check_queue', batchSize);
      
      if (!queueItems || queueItems.length === 0) {
        break; // 队列为空
      }
      
      // 并发处理当前批次
      const promises = queueItems.map(async (item) => {
        try {
          const queueItem = JSON.parse(item);
          const result = await processQueueItem(queueItem);
          
          // 从Redis SET中移除已处理的卡片ID
          await redis.srem('card_check_set', queueItem.cardId);
          
          return result;
        } catch (error) {
          console.error('[队列处理] 解析队列项目失败:', error);
          return false;
        }
      });
      
      const results = await Promise.all(promises);
      
      processedCount += results.length;
      claimedCount += results.filter(Boolean).length;
      
      // 添加延迟避免过于频繁的请求
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (processedCount > 0) {
      console.log(`[队列处理] 完成 - 处理: ${processedCount}, 已领取: ${claimedCount}`);
    }
    
  } catch (error) {
    console.error('[队列处理] 处理队列失败:', error);
  }
}

// 获取队列状态
export async function getQueueStatus() {
  const redis = getRedisClient();
  
  try {
    const queueLength = await redis.llen('card_check_queue');
    const setSize = await redis.scard('card_check_set');
    
    return {
      queueLength,
      pendingCount: setSize
    };
  } catch (error) {
    console.error('[队列状态] 获取失败:', error);
    return {
      queueLength: 0,
      pendingCount: 0
    };
  }
}