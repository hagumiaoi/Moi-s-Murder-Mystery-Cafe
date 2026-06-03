# AI 剧本杀

AI 驱动的单人剧本杀游戏引擎。**剧本与代码完全分离** —— 更换 `Script/` 目录即可切换完全不同的故事。

## 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: FastAPI (Python)
- **AI**: 兼容 OpenAI API 的大模型（默认阿里云 DashScope Qwen）

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd frontend
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env`：

```
SF_API_KEY=your_api_key
SF_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
SF_MODEL=qwen3-max
TEMPERATURE=0
```

> 兼容任何 OpenAI API 格式的服务，只需修改 `SF_BASE_URL` 和 `SF_API_KEY`。

### 3. 启动

**分开启动：**

```bash
# 终端 1 - 后端 (http://localhost:8000)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# 终端 2 - 前端 (http://localhost:5173)
cd frontend
npm run dev
```

**一键启动：**

```powershell
.\start.ps1
```

打开浏览器访问 `http://localhost:5173`

## Script 剧本系统

所有游戏内容由 `Script/manifest.json` 定义，更换剧本只需修改此目录。

### 目录结构

```
Script/
  manifest.json     ← 剧本配置（必须）
  Li.txt             ← NPC 剧本文件（由 manifest 引用）
  Wang.txt
  rose.txt
```

### manifest.json 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 游戏标题 |
| `description` | string | 剧情简介 |
| `max_days` | number | 最大天数，超时判负 |
| `rounds_per_day` | number | 每天对话轮数 |
| `win_message` | string | 指认真凶时显示 |
| `lose_message` | string | 指认错误时显示 |
| `timeout_message` | string | 超时时显示 |
| `day_transition` | string | 每日切换提示，用 `{day}` 占位 |
| `npcs` | array | NPC 定义列表 |

### NPC 定义

```json
{
  "id": "rose",
  "name": "演员（露丝）",
  "script_file": "rose.txt",
  "core_secret": "【真凶】昨晚用冰锥杀人...",
  "is_murderer": true
}
```

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 显示名称 |
| `script_file` | 对应 `Script/` 下的文件，内容作为 LLM 背景记忆 |
| `core_secret` | 注入 LLM 的人设核心秘密 |
| `is_murderer` | 是否为真凶（玩家需要指认此人） |

### 创建自定义剧本

1. 复制 `Script/` 目录，按需修改 `manifest.json`
2. 修改或新增 NPC 剧情文件（`.txt`）
3. 修改 `manifest.json` 中的 `title`、`npcs` 等字段
4. 重启后端即可生效

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/info` | 获取剧本元信息（标题、NPC 列表、规则） |
| GET | `/api/state` | 获取当前游戏状态 |
| POST | `/api/new-game` | 重置游戏 |
| POST | `/api/chat` | 发送对话消息 |
| POST | `/api/select-npc` | 切换审问对象 |
| POST | `/api/accuse` | 发起指认 |

## 玩法

- 每天可进行有限轮对话，结束后进入下一天
- 在侧边栏切换审问对象，收集线索
- 有足够把握时在侧边栏发起终局指认
- 正确指认 `is_murderer: true` 的 NPC 获胜
