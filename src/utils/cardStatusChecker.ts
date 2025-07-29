import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 从暴雪API获取卡片信息
async function fetchCardInfo(shareToken: string) {
  try {
    const response = await fetch(
      `https://webapi.blizzard.cn/ow-champion-game-center/ccc-card/share/info?share_token=${shareToken}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      }
    );
    
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
  } catch (error) {
    console.error('获取卡片信息失败:', error);
    return null;
  }
}

// 检查单个卡片状态
async function checkSingleCardStatus(exchange: any) {
  try {
    const cardInfo = await fetchCardInfo(exchange.shareToken);
    
    if (!cardInfo) {
      console.error(`无法获取卡片信息: ${exchange.shareToken}`);
      return false;
    }
    
    // 如果卡片已被领取，更新状态
    if (cardInfo.claimed) {
      await prisma.cardExchange.update({
        where: { id: exchange.id },
        data: {
          status: 'claimed',
          lastCheckedAt: new Date(),
        },
      });
      console.log(`卡片 ${exchange.shareToken} 已被领取，状态已更新`);
      return true;
    } else {
      // 更新最后检查时间
      await prisma.cardExchange.update({
        where: { id: exchange.id },
        data: {
          lastCheckedAt: new Date(),
        },
      });
      return false;
    }
  } catch (error) {
    console.error(`检查卡片状态失败 ${exchange.shareToken}:`, error);
    return false;
  }
}

// 检查所有活跃卡片的状态
export async function checkAllActiveCards() {
  try {
    console.log('开始检查活跃卡片状态...');
    
    // 获取所有活跃状态的卡片交换
    const activeExchanges = await prisma.cardExchange.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        lastCheckedAt: 'asc', // 优先检查最久未检查的
      },
    });
    
    console.log(`找到 ${activeExchanges.length} 个活跃的卡片交换`);
    
    if (activeExchanges.length === 0) {
      return;
    }
    
    let checkedCount = 0;
    let claimedCount = 0;
    
    // 逐个检查，避免并发过多请求
    for (const exchange of activeExchanges) {
      const wasClaimed = await checkSingleCardStatus(exchange);
      checkedCount++;
      
      if (wasClaimed) {
        claimedCount++;
      }
      
      // 每次请求间隔500ms，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`检查完成: 共检查 ${checkedCount} 个卡片，发现 ${claimedCount} 个已被领取`);
  } catch (error) {
    console.error('检查卡片状态时发生错误:', error);
  }
}

// 启动定时检查任务
export function startCardStatusChecker() {
  console.log('启动卡片状态检查器...');
  
  // 立即执行一次检查
  checkAllActiveCards();
  
  // 每10分钟检查一次
  const interval = setInterval(() => {
    checkAllActiveCards();
  }, 10 * 60 * 1000); // 10分钟
  
  // 返回清理函数
  return () => {
    console.log('停止卡片状态检查器');
    clearInterval(interval);
  };
}

// 清理过期的卡片交换（超过7天未检查的标记为过期）
export async function cleanupExpiredCards() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.cardExchange.updateMany({
      where: {
        status: 'active',
        lastCheckedAt: {
          lt: sevenDaysAgo,
        },
      },
      data: {
        status: 'expired',
      },
    });
    
    if (result.count > 0) {
      console.log(`清理了 ${result.count} 个过期的卡片交换`);
    }
  } catch (error) {
    console.error('清理过期卡片时发生错误:', error);
  }
}

// 启动清理任务
export function startCleanupTask() {
  console.log('启动过期卡片清理任务...');
  
  // 立即执行一次清理
  cleanupExpiredCards();
  
  // 每天清理一次
  const interval = setInterval(() => {
    cleanupExpiredCards();
  }, 24 * 60 * 60 * 1000); // 24小时
  
  // 返回清理函数
  return () => {
    console.log('停止过期卡片清理任务');
    clearInterval(interval);
  };
}