# 使用官方 Node.js 运行时作为基础镜像
FROM docker.1ms.run/node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 设置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 配置 Alpine 镜像源以加速下载并安装 OpenSSL（解决 Prisma SSL 问题）和时区数据
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk update && \
    apk add openssl tzdata

# 设置上海时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

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
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 等待数据库连接' >> /app/start.sh && \
    echo 'echo "等待数据库连接..."' >> /app/start.sh && \
    echo 'until npx prisma db push --accept-data-loss 2>/dev/null; do' >> /app/start.sh && \
    echo '  echo "数据库连接失败，5秒后重试..."' >> /app/start.sh && \
    echo '  sleep 5' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "数据库连接成功"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 检查Redis连接（如果配置了Redis URL）' >> /app/start.sh && \
    echo 'if [ -n "$REDIS_URL" ] && [ "$REDIS_URL" != "" ]; then' >> /app/start.sh && \
    echo '  echo "检查Redis连接..."' >> /app/start.sh && \
    echo '  # 使用node检查Redis连接' >> /app/start.sh && \
    echo '  node -e "const Redis = require(\"ioredis\"); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(() => { console.log(\"Redis连接成功\"); redis.quit(); process.exit(0); }).catch((err) => { console.error(\"Redis连接失败:\", err.message); process.exit(1); });" || {' >> /app/start.sh && \
    echo '    echo "Redis连接失败，但继续启动应用（Redis为可选服务）"' >> /app/start.sh && \
    echo '  }' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "未配置Redis URL，跳过Redis连接检查"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "启动应用..."' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# 启动应用
CMD ["/bin/sh", "/app/start.sh"]