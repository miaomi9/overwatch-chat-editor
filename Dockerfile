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
RUN printf '#!/bin/sh\n\n# 等待数据库连接\necho "等待数据库连接..."\nuntil npx prisma db push --accept-data-loss 2>/dev/null; do\n  echo "数据库连接失败，5秒后重试..."\n  sleep 5\ndone\necho "数据库连接成功"\n\n# 检查Redis连接（如果配置了Redis URL）\nif [ -n "$REDIS_URL" ] && [ "$REDIS_URL" != "" ]; then\n  echo "检查Redis连接..."\n  # 使用node检查Redis连接\n  node -e "\n    const Redis = require(\'ioredis\');\n    const redis = new Redis(process.env.REDIS_URL);\n    redis.ping().then(() => {\n      console.log(\'Redis连接成功\');\n      redis.quit();\n      process.exit(0);\n    }).catch((err) => {\n      console.error(\'Redis连接失败:\', err.message);\n      process.exit(1);\n    });\n  " || {\n    echo "Redis连接失败，但继续启动应用（Redis为可选服务）"\n  }\nelse\n  echo "未配置Redis URL，跳过Redis连接检查"\nfi\n\necho "启动应用..."\nexec npm start\n' > /app/start.sh && chmod +x /app/start.sh

# 启动应用
CMD ["/bin/sh", "/app/start.sh"]