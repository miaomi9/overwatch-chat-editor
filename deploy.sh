#!/bin/bash

# 守望先锋聊天编辑器 Docker 部署脚本
# 使用方法: ./deploy.sh [端口号]
# 例如: ./deploy.sh 3001

set -e

# 默认端口
DEFAULT_PORT=3000

# 获取端口参数
PORT=${1:-$DEFAULT_PORT}

# 验证端口号
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "❌ 错误: 端口号必须是 1-65535 之间的数字"
    echo "使用方法: ./deploy.sh [端口号]"
    echo "例如: ./deploy.sh 3001"
    exit 1
fi

# 应用名称和镜像名称
APP_NAME="overwatch-chat-editor"
IMAGE_NAME="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-$PORT"

echo "🚀 开始部署守望先锋聊天编辑器..."
echo "📦 应用名称: $APP_NAME"
echo "🔌 端口: $PORT"
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

# 停止并删除现有容器（如果存在）
echo "🔍 检查现有容器..."
if docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
    echo "🛑 停止现有容器: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" || true
    echo "🗑️  删除现有容器: $CONTAINER_NAME"
    docker rm "$CONTAINER_NAME" || true
fi

# 检查端口是否被占用
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

# 构建 Docker 镜像
echo "🔨 构建 Docker 镜像..."
docker build -t "$IMAGE_NAME" .

if [ $? -ne 0 ]; then
    echo "❌ 错误: Docker 镜像构建失败"
    exit 1
fi

# 运行容器
echo "🚀 启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:3000" \
    --restart unless-stopped \
    "$IMAGE_NAME"

if [ $? -ne 0 ]; then
    echo "❌ 错误: 容器启动失败"
    exit 1
fi

# 等待应用启动
echo "⏳ 等待应用启动..."
sleep 5

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