# 墨依的剧本杀小馆

AI 驱动的单人剧本杀游戏引擎。项目定位是“本地自托管 Web App”：用户在本机启动服务，然后用浏览器访问本地地址游玩，体验类似酒馆类工具。

当前版本使用 Bun + Hono 提供本地后端，React/Vite 提供前端界面。后端可以在同一个端口上托管前端构建产物，并用 `/api` 作为后端路由前缀。

## 当前状态

- 已迁移到 Bun + TypeScript 后端。
- 前后端共享 TypeScript 类型。
- 支持 OpenAI-compatible LLM Provider。
- 支持非流式对话、SSE 流式对话、搜查线索、切换 NPC、指认、撤回重发。
- 当前游戏状态仍保存在后端内存中，关闭服务会丢失进度。
- 后续本地发行版应补充 JSON 或 SQLite 存档。

## 技术栈

- 前端：React + TypeScript + Vite
- 后端：Bun + TypeScript + Hono
- 校验：Zod
- AI：OpenAI-compatible Chat Completions Provider
- 许可证：AGPL-3.0-or-later

## 目录结构

```text
.
├── Script/                 # 剧本内容和 NPC 文本
├── backend-ts/             # Bun/Hono 后端
├── frontend/               # React/Vite 前端
├── shared/                 # 前后端共享类型
├── openspec/               # 架构变更文档
├── start.sh                # Linux/macOS 开发启动脚本
└── start.ps1               # Windows PowerShell 开发启动脚本
```

## 环境要求

- Bun 1.3 或更新版本
- 一个 OpenAI-compatible LLM API key

安装 Bun：

```bash
curl -fsSL https://bun.sh/install | bash
```

Windows 用户可参考 Bun 官方安装方式。

## 安装依赖

```bash
cd backend-ts
bun install

cd ../frontend
bun install
```

## 配置后端

复制配置模板：

```bash
cd backend-ts
cp config.example.toml config.toml
```

编辑 `backend-ts/config.toml`：

```toml
[server]
port = 8000
host = "0.0.0.0"

[llm]
provider = "openai-compatible"
api_key = "your-api-key"
base_url = "https://api.siliconflow.cn/v1"
model = "deepseek-ai/DeepSeek-V3"
temperature = 0.0

[game]
script_dir = "../Script"
```

`config.toml` 会包含 API key，已经被 `.gitignore` 忽略。不要提交这个文件。

也可以用环境变量临时覆盖端口：

```bash
PORT=8010 bun run start
```

## 开发模式

开发时建议前后端分开启动。前端 Vite dev server 会把 `/api` 代理到后端。

终端 1：

```bash
cd backend-ts
bun run dev
```

终端 2：

```bash
cd frontend
bun run dev
```

打开浏览器访问：

```text
http://localhost:5173
```

也可以使用一键开发启动脚本：

```bash
# Linux / macOS
./start.sh

# Windows PowerShell
.\start.ps1
```

## 单端口本地运行

单端口模式更接近最终本地发行形态：Bun 后端托管前端构建产物，同时处理 `/api` 请求。

```bash
cd frontend
bun run build

cd ../backend-ts
bun run start
```

打开浏览器访问：

```text
http://localhost:8000
```

路由规则：

- `/api/*`：后端 API
- 其他路径：前端静态文件
- 前端路由未命中时 fallback 到 `index.html`

## 测试与检查

后端测试：

```bash
cd backend-ts
bun test
```

后端类型检查：

```bash
cd backend-ts
bunx tsc --noEmit
```

前端构建：

```bash
cd frontend
bun run build
```

## 剧本系统

所有游戏内容由 `Script/manifest.json` 和对应 NPC 文本文件定义。更换 `Script/` 内容即可切换剧本。

```text
Script/
├── manifest.json
├── Li.txt
├── Wang.txt
└── rose.txt
```

### manifest 核心字段

| 字段 | 说明 |
| --- | --- |
| `title` | 游戏标题 |
| `description` | 剧情简介 |
| `max_days` | 最大天数，超时判负 |
| `rounds_per_day` | 每天可消耗的轮次数 |
| `first_npc` | 默认审问 NPC |
| `win_message` | 指认真凶时的结局文案 |
| `lose_message` | 指认错误时的结局文案 |
| `timeout_message` | 超时时的结局文案 |
| `day_transition` | 日期切换正文模板 |
| `npc_chat_prompt` | NPC 对话 Prompt 模板 |
| `search_story_prompt` | 搜查叙事 Prompt 模板 |
| `npcs` | NPC 定义 |
| `search_locations` | 可搜查地点和线索 |
| `timeline` | 时间线事件 |

### NPC 定义示例

```json
{
  "id": "rose",
  "name": "演员（露丝）",
  "script_file": "rose.txt",
  "core_secret": "美丽动人的当红女演员，与死者有过一段短暂的恋情。",
  "is_murderer": true
}
```

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/info` | 获取剧本元信息 |
| GET | `/api/state` | 获取当前游戏状态 |
| POST | `/api/new-game` | 重置游戏 |
| POST | `/api/chat` | 非流式对话 |
| POST | `/api/chat/stream` | SSE 流式对话 |
| POST | `/api/select-npc` | 切换审问对象 |
| POST | `/api/accuse` | 指认凶手 |
| POST | `/api/search` | 搜查地点 |
| POST | `/api/undo-and-resend` | 撤回并重发玩家消息 |

## 当前限制

- 游戏状态是内存态，服务重启后会丢失。
- 多个浏览器同时访问同一个本地服务时会共享同一局游戏。
- LLM API key 只应放在本地 `backend-ts/config.toml`，不要写进前端代码。
- 当前还没有打包为单文件可执行程序。

## 近期方向

- 增加本地存档：JSON 文件或 SQLite。
- 启动时自动选择可用端口。
- 启动后自动打开默认浏览器。
- 用 Bun standalone executable 打包本地启动器。
- 支持导入/切换剧本包。

## 许可证

本项目使用 GNU Affero General Public License v3.0 or later。详见 [LICENSE](./LICENSE)。
