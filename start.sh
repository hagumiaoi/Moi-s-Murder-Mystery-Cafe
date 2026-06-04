#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 启动 AI 剧本杀 ==="

# Init config
if [ ! -f "$SCRIPT_DIR/backend/config.toml" ]; then
  cp "$SCRIPT_DIR/backend/config.example.toml" "$SCRIPT_DIR/backend/config.toml"
  echo "[配置] 已从模板创建 config.toml，请编辑后重新运行"
  echo "  $SCRIPT_DIR/backend/config.toml"
  exit 1
fi

# Start backend
echo "[后端] 启动中..."
cd "$SCRIPT_DIR/backend"
bun run src/server.ts &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Start frontend
echo "[前端] 启动中..."
cd "$SCRIPT_DIR/frontend"
bun run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "  后端: http://localhost:8000"
echo "  前端: http://localhost:5173"
echo "  按 Ctrl+C 停止"
echo "========================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
