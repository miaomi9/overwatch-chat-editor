import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 从暴雪API获取卡片信息（优化版）
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

// 检查单个卡片状态（优化版）
async function checkSingleCardStatus(exchange: any) {
  try {
    const cardInfo = await fetchCardInfo(exchange.shareToken);
    
    if (!cardInfo) {
      // 更新最后检查时间，即使失败也要记录
      await prisma.cardExchange.update({
        where: { id: exchange.id },
        data: {
          lastCheckedAt: new Date(),
        },
      });
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
    // 即使出错也要更新检查时间，避免重复检查同一个有问题的卡片
    try {
      await prisma.cardExchange.update({
        where: { id: exchange.id },
        data: {
          lastCheckedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error(`[定时任务] 更新检查时间失败:`, updateError);
    }
    throw error; // 重新抛出错误供上层处理
  }
}

// 并发检查一批卡片（优化版 - 基于测试结果调整）
async function checkCardBatch(exchanges: any[], batchSize: number = 50) {
  const results = {
    checked: 0,
    claimed: 0,
    errors: 0,
    timeouts: 0
  };
  
  // 分批并发处理，基于测试结果，并发数控制在50以内较为安全
  for (let i = 0; i < exchanges.length; i += batchSize) {
    const batch = exchanges.slice(i, i + batchSize);
    
    // 并发处理当前批次
    const promises = batch.map(async (exchange) => {
      try {
        const wasClaimed = await checkSingleCardStatus(exchange);
        results.checked++;
        if (wasClaimed) {
          results.claimed++;
        }
        return { success: true, claimed: wasClaimed };
      } catch (error: any) {
        console.error(`检查卡片 ${exchange.shareToken} 失败:`, error);
        results.errors++;
        
        // 统计超时错误
        if (error.message && error.message.includes('timeout')) {
          results.timeouts++;
        }
        
        return { success: false, error };
      }
    });
    
    await Promise.all(promises);
    
    // 批次间延迟，基于测试结果适当增加延迟
    if (i + batchSize < exchanges.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// 检查所有活跃卡片的状态（优化版 - 基于测试结果调整）
export async function checkAllActiveCards() {
  try {
    const startTime = Date.now();
    console.log('开始检查活跃卡片状态...');
    
    // 基于测试结果优化参数：并发数50，页面大小500
    const BATCH_SIZE = 50; // 并发批次大小（测试显示50并发较为安全）
    const PAGE_SIZE = 500; // 每次查询的数量（减少单次查询量）
    let offset = 0;
    let totalChecked = 0;
    let totalClaimed = 0;
    let totalErrors = 0;
    let totalTimeouts = 0;
    
    while (true) {
      // 获取一页数据，优先处理最久未检查的
      const activeExchanges = await prisma.cardExchange.findMany({
        where: {
          status: 'active',
        },
        orderBy: {
          lastCheckedAt: 'asc', // 优先检查最久未检查的
        },
        skip: offset,
        take: PAGE_SIZE,
      });
      
      if (activeExchanges.length === 0) {
        break; // 没有更多数据了
      }
      
      console.log(`正在处理第 ${Math.floor(offset / PAGE_SIZE) + 1} 页，共 ${activeExchanges.length} 个卡片`);
      
      // 并发检查当前页的卡片
      const results = await checkCardBatch(activeExchanges, BATCH_SIZE);
      
      totalChecked += results.checked;
      totalClaimed += results.claimed;
      totalErrors += results.errors;
      totalTimeouts += results.timeouts || 0;
      
      console.log(`当前页完成: 检查 ${results.checked}，已领取 ${results.claimed}，错误 ${results.errors}，超时 ${results.timeouts || 0}`);
      
      // 如果超时率过高，增加延迟
      const timeoutRate = results.timeouts / Math.max(results.checked + results.errors, 1);
      if (timeoutRate > 0.1) { // 超时率超过10%
        console.log(`检测到高超时率 ${(timeoutRate * 100).toFixed(1)}%，增加延迟...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      offset += PAGE_SIZE;
      
      // 页间延迟，基于测试结果适当增加
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const duration = Date.now() - startTime;
    console.log(`检查完成: 总共检查 ${totalChecked} 个卡片，发现 ${totalClaimed} 个已被领取，${totalErrors} 个错误，${totalTimeouts} 个超时，耗时 ${duration}ms`);
    
    return {
      checked: totalChecked,
      claimed: totalClaimed,
      errors: totalErrors,
      timeouts: totalTimeouts,
      duration
    };
  } catch (error) {
    console.error('检查卡片状态时发生错误:', error);
    throw error;
  }
}

// 启动定时检查任务（优化版）
// 【优化方案第一阶段】注释定时检测功能，减少对暴雪API的频繁调用
export function startCardStatusChecker() {
  console.log('[系统启动] 卡片状态检查器已暂停（优化方案）');
  
  // 注释原有的定时检测逻辑
  /*
  let isChecking = false;
  
  // 检查函数包装器，防止重复执行
  const safeCheck = async () => {
    if (isChecking) {
      console.log('上次检查仍在进行中，跳过本次检查');
      return;
    }
    
    isChecking = true;
    try {
      const startTime = Date.now();
      const results = await checkAllActiveCards();
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`检查耗时: ${duration}秒，结果: ${JSON.stringify(results)}`);
    } catch (error) {
      console.error('定时检查失败:', error);
    } finally {
      isChecking = false;
    }
  };
  
  // 立即执行一次检查
  safeCheck();
  
  // 每5分钟检查一次（提高频率以应对大量卡片）
  const interval = setInterval(safeCheck, 5 * 60 * 1000); // 5分钟
  */
  
  // 返回空的清理函数
  return () => {
    console.log('[系统关闭] 卡片状态检查器已停止');
  };
}

// 【优化方案第一阶段】每日清理任务函数
export async function dailyCardCleanup() {
  try {
    const startTime = Date.now();
    console.log('[定时任务] 开始执行每日卡片清理');
    
    // 计算24小时前的时间
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 将存在时间超过1天且状态为active的卡片标记为expired
    const result = await prisma.cardExchange.updateMany({
      where: {
        status: 'active',
        createdAt: {
          lt: oneDayAgo,
        },
      },
      data: {
        status: 'expired',
        updatedAt: new Date(),
      },
    });
    
    // 统计当前活跃卡片数量
    const activeCount = await prisma.cardExchange.count({
      where: { status: 'active' }
    });
    
    const duration = Date.now() - startTime;
    console.log(`[定时任务] 每日清理完成 - 清理: ${result.count}张, 活跃: ${activeCount}张, 耗时: ${duration}ms`);
    
    return {
      cleaned: result.count,
      activeRemaining: activeCount,
      duration
    };
  } catch (error) {
    console.error('[定时任务] 每日清理失败:', error);
    throw error;
  }
}

// 原有的智能清理过期卡片函数（保留备用）
export async function cleanupExpiredCards() {
  try {
    const startTime = Date.now();
    console.log('开始清理过期卡片...');
    
    // 多层次清理策略
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    let totalCleaned = 0;
    
    // 1. 清理超过14天未检查的卡片（直接标记为过期）
    const veryOldResult = await prisma.cardExchange.updateMany({
      where: {
        status: 'active',
        lastCheckedAt: {
          lt: fourteenDaysAgo,
        },
      },
      data: {
        status: 'expired',
      },
    });
    
    if (veryOldResult.count > 0) {
      console.log(`清理了 ${veryOldResult.count} 个超过14天未检查的卡片`);
      totalCleaned += veryOldResult.count;
    }
    
    // 2. 对于7-14天未检查的卡片，进行最后一次检查
    const oldCards = await prisma.cardExchange.findMany({
      where: {
        status: 'active',
        lastCheckedAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
      take: 100, // 限制数量，避免一次处理太多
    });
    
    if (oldCards.length > 0) {
      console.log(`对 ${oldCards.length} 个7-14天未检查的卡片进行最后检查...`);
      
      // 使用较小的并发数进行最后检查
      const finalCheckResults = await checkCardBatch(oldCards, 20);
      console.log(`最后检查完成: 检查 ${finalCheckResults.checked}，已领取 ${finalCheckResults.claimed}，错误 ${finalCheckResults.errors}`);
    }
    
    // 3. 清理超过7天未检查的剩余卡片
    const regularResult = await prisma.cardExchange.updateMany({
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
    
    if (regularResult.count > 0) {
      console.log(`清理了 ${regularResult.count} 个超过7天未检查的卡片`);
      totalCleaned += regularResult.count;
    }
    
    // 4. 统计当前活跃卡片数量
    const activeCount = await prisma.cardExchange.count({
      where: { status: 'active' }
    });
    
    const duration = Date.now() - startTime;
    console.log(`原有清理完成: 总共清理 ${totalCleaned} 个过期卡片，当前活跃卡片 ${activeCount} 个，耗时 ${duration}ms`);
    
    return {
      cleaned: totalCleaned,
      activeRemaining: activeCount,
      duration
    };
  } catch (error) {
    console.error('清理过期卡片时发生错误:', error);
    throw error;
  }
}

// 启动智能清理任务（优化版）
// 【优化方案第一阶段】每日清理任务 - 每天0点自动将存在时间超过1天的卡片标记为已使用
export function startCleanupTask() {
  console.log('[系统启动] 每日卡片清理任务已启动');
  
  // 立即执行一次清理
  dailyCardCleanup().catch(error => {
    console.error('[系统启动] 初始清理失败:', error);
  });
  
  // 设置每日零点执行的递归函数
  const scheduleNextMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeToMidnight = tomorrow.getTime() - now.getTime();
    
    const hours = Math.floor(timeToMidnight / (1000 * 60 * 60));
    const minutes = Math.floor((timeToMidnight % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`[定时任务] 下次零点清理: ${hours}小时${minutes}分钟后`);
    
    // 设置到下一个0点的定时器
    const midnightTimeout = setTimeout(async () => {
      try {
        console.log('[定时任务] 执行零点清理');
        await dailyCardCleanup();
      } catch (error) {
        console.error('[定时任务] 零点清理失败:', error);
      }
      
      // 递归设置下一个零点
      scheduleNextMidnight();
    }, timeToMidnight);
    
    return midnightTimeout;
  };
  
  // 开始调度
  const currentTimeout = scheduleNextMidnight();
  
  // 返回清理函数
  return () => {
    console.log('[系统关闭] 每日卡片清理任务已停止');
    clearTimeout(currentTimeout);
  };
}