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
├── Script/                 # 案件剧本（单文件 Case Manifest）
├── backend/                 # Bun/Hono 后端
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
cd backend
bun install

cd ../frontend
bun install
```

## 配置后端

复制配置模板：

```bash
cd backend
cp config.example.toml config.toml
```

编辑 `backend/config.toml`：

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
cd backend
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

cd ../backend
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
cd backend
bun test
```

后端类型检查：

```bash
cd backend
bunx tsc --noEmit
```

前端构建：

```bash
cd frontend
bun run build
```

## 剧本系统

所有游戏内容由单文件 `Script/manifest.json` 定义，格式为 `detective-case-v2`（探案解密引擎）。更换 `Script/manifest.json` 即可切换案件。

```text
Script/
└── manifest.json   # 单文件 Case Manifest
```

### manifest 核心字段

| 字段 | 说明 |
| --- | --- |
| `title` | 案件标题 |
| `description` | 案件简介 |
| `progression` | 进度驱动配置（`daily-rounds` / `free`） |
| `entities` | 案件实体：人物、地点、物品、文件、事件、概念 |
| `facts` | 案件事实与真相（含隐藏事实） |
| `evidence` | 可发现的证据（关联实体、揭示事实） |
| `interactions` | 可执行交互：`talk`、`search`、`inspect`、`confront`、`submit-resolution` |
| `questions` | 结案问题（答案仅后端持有） |
| `resolution` | 结案规则与结局文案 |
| `panels` | 工作台面板定义（`entity-list`、`interaction`、`narrative`、`case-file`、`settings`） |
| `prompts` | LLM Prompt 模板 |

### 实体定义示例

```json
{
  "id": "rose",
  "kind": "person",
  "name": "演员（露丝）",
  "tags": ["suspect", "can-talk", "can-confront"],
  "secret": "美丽动人的当红女演员...",
  "script": "你叫露丝，是一位外表楚楚可怜..."
}
```

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/info` | 获取公开案件数据（redacted） |
| GET | `/api/state` | 获取当前游戏状态 |
| POST | `/api/new-game` | 重置游戏 |
| POST | `/api/select-entity` | 切换当前实体 |
| POST | `/api/interact` | 统一交互（talk/search/inspect/confront/submit-resolution） |
| POST | `/api/interact/stream` | SSE 流式交互 |
| POST | `/api/undo-and-resend` | 撤回并重发玩家消息 |
| GET | `/api/debug/manifest` | 调试：完整 Manifest |
| GET | `/api/debug/state` | 调试：完整状态 |
| POST | `/api/debug/prompt` | 调试：查看当前 Prompt |

## 当前限制

- 游戏状态是内存态，服务重启后会丢失。
- 多个浏览器同时访问同一个本地服务时会共享同一局游戏。
- LLM API key 只应放在本地 `backend/config.toml`，不要写进前端代码。
- 当前还没有打包为单文件可执行程序。

## 近期方向

- 增加本地存档：JSON 文件或 SQLite。
- 启动时自动选择可用端口。
- 启动后自动打开默认浏览器。
- 用 Bun standalone executable 打包本地启动器。
- 支持导入/切换剧本包。

## 许可证

本项目使用 GNU Affero General Public License v3.0 or later。详见 [LICENSE](./LICENSE)。
