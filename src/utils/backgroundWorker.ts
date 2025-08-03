import { processCardCheckQueue } from './queueProcessor';

class BackgroundWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 5000; // 5秒检查一次
  private readonly MAX_RETRIES = 3;
  private retryCount = 0;

  constructor() {
    // 绑定方法以保持this上下文
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.processQueue = this.processQueue.bind(this);
  }

  async start() {
    if (this.isRunning) {
      console.log('[后台工作器] 已在运行中');
      return;
    }

    this.isRunning = true;
    this.retryCount = 0;
    console.log('[后台工作器] 启动队列处理服务...');

    // 立即执行一次
    await this.processQueue();

    // 设置定时器持续处理
    this.intervalId = setInterval(async () => {
      await this.processQueue();
    }, this.POLL_INTERVAL);

    console.log(`[后台工作器] 队列处理服务已启动，每${this.POLL_INTERVAL / 1000}秒检查一次`);
  }

  stop() {
    if (!this.isRunning) {
      console.log('[后台工作器] 未在运行');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[后台工作器] 队列处理服务已停止');
  }

  private async processQueue() {
    if (!this.isRunning) {
      return;
    }

    try {
      await processCardCheckQueue();
      this.retryCount = 0; // 成功后重置重试计数
    } catch (error) {
      this.retryCount++;
      console.error(`[后台工作器] 处理队列失败 (${this.retryCount}/${this.MAX_RETRIES}):`, error);

      // 如果连续失败次数过多，暂停一段时间
      if (this.retryCount >= this.MAX_RETRIES) {
        console.log('[后台工作器] 连续失败次数过多，暂停5分钟后重试');
        setTimeout(() => {
          this.retryCount = 0;
        }, 5 * 60 * 1000); // 5分钟后重置重试计数
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      retryCount: this.retryCount,
      pollInterval: this.POLL_INTERVAL
    };
  }
}

// 创建全局实例
const backgroundWorker = new BackgroundWorker();

// 导出实例和控制函数
export { backgroundWorker };
export const startBackgroundWorker = () => backgroundWorker.start();
export const stopBackgroundWorker = () => backgroundWorker.stop();
export const getWorkerStatus = () => backgroundWorker.getStatus();

// 在服务器启动时自动开始
if (typeof window === 'undefined') {
  // 只在服务器端运行
  process.nextTick(() => {
    startBackgroundWorker();
  });

  // 优雅关闭处理
  const gracefulShutdown = () => {
    console.log('[后台工作器] 接收到关闭信号，正在停止...');
    stopBackgroundWorker();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}