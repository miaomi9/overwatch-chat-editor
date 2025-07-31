#!/bin/bash

# 守望先锋聊天编辑器 Docker 部署脚本
# 使用方法: ./deploy.sh [端口号] [数据库URL] [Redis URL]
# 例如: ./deploy.sh 3001 "mysql://root:password@host.docker.internal:3306/overwatch" "redis://:password@localhost:6379"
# 注意: 如果不提供数据库URL或Redis URL，将使用默认的 localhost 配置（仅适用于开发环境）

set -e

# 默认端口、数据库URL和Redis URL
DEFAULT_PORT=3000
DEFAULT_DATABASE_URL="mysql://root:123456@host.docker.internal:3306/overwatch"
DEFAULT_REDIS_URL="redis://:password@localhost:6379"

# 获取参数
PORT=${1:-$DEFAULT_PORT}
DATABASE_URL=${2:-$DEFAULT_DATABASE_URL}
REDIS_URL=${3:-$DEFAULT_REDIS_URL}

# 验证端口号
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "❌ 错误: 端口号必须是 1-65535 之间的数字"
    echo "使用方法: ./deploy.sh [端口号] [数据库URL] [Redis URL]"
    echo "例如: ./deploy.sh 3001 \"mysql://root:password@host.docker.internal:3306/overwatch\" \"redis://:password@localhost:6379\""
    exit 1
fi

# 应用名称和镜像名称
APP_NAME="overwatch-chat-editor"
IMAGE_NAME="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-$PORT"

echo "🚀 开始部署守望先锋聊天编辑器..."
echo "📦 应用名称: $APP_NAME"
echo "🔌 端口: $PORT"
echo "🗄️  数据库: $DATABASE_URL"
echo "🔴 Redis: $REDIS_URL"
echo "🐳 容器名称: $CONTAINER_NAME"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装或未在 PATH 中找到"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker 服务未运行"
    echo "请启动 Docker 服务"
    exit 1
fi

# 检查现有容器状态
echo "🔍 检查现有容器..."
OLD_CONTAINER_EXISTS=false
if docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
    OLD_CONTAINER_EXISTS=true
    echo "📦 发现现有容器: $CONTAINER_NAME"
fi

# 构建 Docker 镜像（优先进行，避免服务中断）
echo "🔨 构建 Docker 镜像..."
docker build -t "$IMAGE_NAME" .

if [ $? -ne 0 ]; then
    echo "❌ 错误: Docker 镜像构建失败"
    exit 1
fi

# 如果存在旧容器，先停止并删除（构建完成后快速切换）
if [ "$OLD_CONTAINER_EXISTS" = true ]; then
    echo "🛑 停止现有容器: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" || true
    echo "🗑️  删除现有容器: $CONTAINER_NAME"
    docker rm "$CONTAINER_NAME" || true
else
    # 检查端口是否被占用（仅在没有旧容器时检查）
    echo "🔍 检查端口 $PORT 是否可用..."
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  警告: 端口 $PORT 已被占用"
        read -p "是否继续部署？这可能会导致端口冲突 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ 部署已取消"
            exit 1
        fi
    fi
fi

# 运行容器
echo "🚀 启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:3000" \
    -e "DATABASE_URL=$DATABASE_URL" \
    -e "REDIS_URL=$REDIS_URL" \
    "$IMAGE_NAME"

if [ $? -ne 0 ]; then
    echo "❌ 错误: 容器启动失败"
    exit 1
fi

# 等待应用启动
echo "⏳ 等待应用启动..."
sleep 5

# 在容器启动后添加数据库迁移
echo "🔄 执行数据库迁移..."
docker exec "$CONTAINER_NAME" npx prisma migrate deploy
docker exec "$CONTAINER_NAME" npx prisma generate

# 检查容器状态
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "^$CONTAINER_NAME"; then
    echo "✅ 部署成功！"
    echo ""
    echo "📋 部署信息:"
    echo "   🌐 访问地址: http://localhost:$PORT"
    echo "   🐳 容器名称: $CONTAINER_NAME"
    echo "   📦 镜像名称: $IMAGE_NAME"
    echo ""
    echo "📝 管理命令:"
    echo "   查看日志: docker logs $CONTAINER_NAME"
    echo "   停止应用: docker stop $CONTAINER_NAME"
    echo "   重启应用: docker restart $CONTAINER_NAME"
    echo "   删除容器: docker rm -f $CONTAINER_NAME"
    echo ""
    echo "🎉 守望先锋聊天编辑器已成功部署到端口 $PORT！"
else
    echo "❌ 错误: 容器启动失败，请检查日志"
    echo "查看日志: docker logs $CONTAINER_NAME"
    exit 1
fi