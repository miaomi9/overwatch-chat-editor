# 使用官方 Node.js 运行时作为基础镜像
FROM docker.1ms.run/node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 设置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm ci

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制应用代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 创建启动脚本
RUN echo '#!/bin/sh\n\n# 等待数据库连接\necho "等待数据库连接..."\nuntil npx prisma db push --accept-data-loss 2>/dev/null; do\n  echo "数据库连接失败，5秒后重试..."\n  sleep 5\ndone\n\necho "数据库连接成功，启动应用..."\nnpm start' > /app/start.sh && chmod +x /app/start.sh

# 启动应用
CMD ["/bin/sh", "/app/start.sh"]