import { PrismaClient } from '@prisma/client';

// 全局 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建 Prisma 客户端实例
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// 在开发环境中避免热重载时创建多个实例
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 数据库连接测试
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('[数据库] 连接失败:', error);
    return false;
  }
}

// 优雅关闭数据库连接
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('[数据库] 关闭连接失败:', error);
  }
}

// 导出默认实例
export default prisma;