const fetch = require('node-fetch');

// 测试用的分享令牌（需要替换为真实的令牌）
const TEST_TOKENS = [
  // 这里需要添加一些真实的分享令牌进行测试
  // 'your_test_token_1',
  // 'your_test_token_2',
  // ...
];

// 如果没有测试令牌，生成一些假的令牌用于测试请求格式
if (TEST_TOKENS.length === 0) {
  for (let i = 0; i < 50; i++) {
    TEST_TOKENS.push(`test_token_${i}_${Math.random().toString(36).substr(2, 9)}`);
  }
}

// 单个请求函数
async function fetchCardInfo(shareToken, requestId) {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://webapi.blizzard.cn/ow-champion-game-center/ccc-card/share/info?share_token=${shareToken}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000, // 10秒超时
      }
    );
    
    const duration = Date.now() - startTime;
    const status = response.status;
    
    if (!response.ok) {
      return {
        requestId,
        shareToken,
        success: false,
        status,
        duration,
        error: `HTTP ${status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    
    return {
      requestId,
      shareToken,
      success: true,
      status,
      duration,
      data: data
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      requestId,
      shareToken,
      success: false,
      status: 0,
      duration,
      error: error.message
    };
  }
}

// 并发测试函数
async function testConcurrentRequests(concurrency, totalRequests, delayBetweenBatches = 0) {
  console.log(`\n=== 测试并发数: ${concurrency}, 总请求数: ${totalRequests}, 批次间延迟: ${delayBetweenBatches}ms ===`);
  
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    blocked: 0, // 被封禁的请求（状态码403、429等）
    timeout: 0,
    avgDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
    statusCodes: {},
    errors: {}
  };
  
  const startTime = Date.now();
  
  // 分批处理
  for (let i = 0; i < totalRequests; i += concurrency) {
    const batchSize = Math.min(concurrency, totalRequests - i);
    const batch = [];
    
    // 创建当前批次的请求
    for (let j = 0; j < batchSize; j++) {
      const requestId = i + j + 1;
      const tokenIndex = (i + j) % TEST_TOKENS.length;
      const shareToken = TEST_TOKENS[tokenIndex];
      
      batch.push(fetchCardInfo(shareToken, requestId));
    }
    
    console.log(`正在执行第 ${Math.floor(i / concurrency) + 1} 批次，${batchSize} 个请求...`);
    
    // 并发执行当前批次
    const batchResults = await Promise.all(batch);
    
    // 统计结果
    batchResults.forEach(result => {
      results.total++;
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        
        // 检查是否被封禁
        if (result.status === 403 || result.status === 429 || result.status === 503) {
          results.blocked++;
        }
        
        // 检查是否超时
        if (result.error && result.error.includes('timeout')) {
          results.timeout++;
        }
        
        // 统计错误类型
        const errorKey = result.error || `HTTP_${result.status}`;
        results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      }
      
      // 统计状态码
      results.statusCodes[result.status] = (results.statusCodes[result.status] || 0) + 1;
      
      // 统计响应时间
      results.maxDuration = Math.max(results.maxDuration, result.duration);
      results.minDuration = Math.min(results.minDuration, result.duration);
    });
    
    // 批次间延迟
    if (delayBetweenBatches > 0 && i + concurrency < totalRequests) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const totalDuration = Date.now() - startTime;
  results.avgDuration = results.total > 0 ? totalDuration / results.total : 0;
  
  // 输出结果
  console.log(`\n测试完成，总耗时: ${totalDuration}ms`);
  console.log(`成功: ${results.success}/${results.total} (${(results.success/results.total*100).toFixed(1)}%)`);
  console.log(`失败: ${results.failed}/${results.total} (${(results.failed/results.total*100).toFixed(1)}%)`);
  console.log(`被封禁: ${results.blocked}/${results.total} (${(results.blocked/results.total*100).toFixed(1)}%)`);
  console.log(`超时: ${results.timeout}/${results.total} (${(results.timeout/results.total*100).toFixed(1)}%)`);
  console.log(`响应时间: 平均 ${results.avgDuration.toFixed(0)}ms, 最快 ${results.minDuration}ms, 最慢 ${results.maxDuration}ms`);
  
  console.log(`\n状态码分布:`);
  Object.entries(results.statusCodes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count} 次`);
  });
  
  if (Object.keys(results.errors).length > 0) {
    console.log(`\n错误分布:`);
    Object.entries(results.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} 次`);
    });
  }
  
  return results;
}

// 主测试函数
async function runTests() {
  console.log('开始测试网易接口并发请求限制...');
  console.log(`使用 ${TEST_TOKENS.length} 个测试令牌`);
  
  const testCases = [
    // [并发数, 总请求数, 批次间延迟ms]
    [1, 10, 0],      // 串行测试
    [5, 20, 0],      // 小并发
    [10, 30, 0],     // 中等并发
    [20, 40, 0],     // 高并发
    [50, 100, 0],    // 极高并发
    [100, 500, 0],   // 百级并发
    [200, 1000, 0],  // 二百级并发
    [500, 2000, 0],  // 五百级并发
    [1000, 5000, 0], // 千级并发
    [100, 1000, 100], // 百级并发 + 延迟
    [200, 2000, 200], // 二百级并发 + 延迟
    [500, 5000, 500], // 五百级并发 + 延迟
  ];
  
  const allResults = [];
  
  for (const [concurrency, totalRequests, delay] of testCases) {
    try {
      const result = await testConcurrentRequests(concurrency, totalRequests, delay);
      allResults.push({
        concurrency,
        totalRequests,
        delay,
        ...result
      });
      
      // 测试间隔，避免影响下一个测试
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`测试失败:`, error);
    }
  }
  
  // 输出总结
  console.log(`\n\n=== 测试总结 ===`);
  console.log('并发数\t总请求\t延迟\t成功率\t被封率\t平均响应时间');
  allResults.forEach(result => {
    const successRate = (result.success / result.total * 100).toFixed(1);
    const blockedRate = (result.blocked / result.total * 100).toFixed(1);
    console.log(`${result.concurrency}\t${result.totalRequests}\t${result.delay}ms\t${successRate}%\t${blockedRate}%\t${result.avgDuration.toFixed(0)}ms`);
  });
  
  // 推荐配置
  const bestConfig = allResults
    .filter(r => r.blocked === 0) // 没有被封禁
    .sort((a, b) => b.concurrency - a.concurrency)[0]; // 选择最高并发
  
  if (bestConfig) {
    console.log(`\n推荐配置: 并发数 ${bestConfig.concurrency}, 批次间延迟 ${bestConfig.delay}ms`);
  } else {
    console.log(`\n警告: 所有测试都有被封禁的情况，建议降低并发数或增加延迟`);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  fetchCardInfo,
  testConcurrentRequests,
  runTests
};