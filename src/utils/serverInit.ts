import { startCardStatusChecker, startCleanupTask } from './cardStatusChecker';
import { startBackgroundWorker, stopBackgroundWorker } from './backgroundWorker';

// 服务器初始化标志
let isInitialized = false;
let cleanupFunctions: (() => void)[] = [];

// 初始化服务器端任务
export function initializeServerTasks() {
  if (isInitialized) {
    return;
  }
  
  console.log('[系统启动] 正在初始化后台任务');
  
  try {
    // 启动卡片状态检查器
    const stopCardChecker = startCardStatusChecker();
    cleanupFunctions.push(stopCardChecker);
    
    // 启动清理任务
    const stopCleanup = startCleanupTask();
    cleanupFunctions.push(stopCleanup);
    
    // 启动后台队列处理器
    startBackgroundWorker();
    cleanupFunctions.push(stopBackgroundWorker);
    
    isInitialized = true;
    console.log('[系统启动] 后台任务初始化完成');
  } catch (error) {
    console.error('[系统启动] 后台任务初始化失败:', error);
  }
}

// 清理所有任务
export function cleanupServerTasks() {
  if (!isInitialized) {
    return;
  }
  
  console.log('[系统关闭] 正在清理后台任务');
  
  cleanupFunctions.forEach(cleanup => {
    try {
      cleanup();
    } catch (error) {
      console.error('[系统关闭] 清理任务失败:', error);
    }
  });
  
  cleanupFunctions = [];
  isInitialized = false;
  console.log('[系统关闭] 后台任务清理完成');
}

// 进程退出时清理
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    cleanupServerTasks();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    cleanupServerTasks();
    process.exit(0);
  });
}