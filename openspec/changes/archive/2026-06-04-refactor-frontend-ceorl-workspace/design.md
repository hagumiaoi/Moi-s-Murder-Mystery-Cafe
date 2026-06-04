## Context

当前项目的前端已经可玩，但页面结构仍然由 `App.tsx` 集中编排。`App.tsx` 负责初始化剧本、读取状态、发送消息、处理 SSE、搜索、指认、撤回重发、debug prompt 和布局组合。组件层虽然已经拆分，但状态流和窗口组织仍然绑定在一起。

用户希望采用 `/home/syy/code/ceorl` 的横向滚动平铺布局能力。经检查，`ceorl` 是一个 React/Vite 布局库，核心组件包括 `CeorlShell`、`CeorlColumn`、`CeorlStack`，支持受控 `activeIndex`、列宽档位、列内堆叠和命令式 `focusColumn(index)`。它适合作为主工作台 shell，但不是完整 dock/window manager。

本设计不新增 OpenSpec 之外的玩法规则，不改后端 API，也不处理持久化。目标是先把前端组织成可扩展的调查工作台。

## Goals / Non-Goals

**Goals:**

- 使用复制源码方式集成 `ceorl`，避免本地路径依赖。
- 将主界面改造为“顶栏 + 横向工作台 + 底部焦点导航栏”。
- 使用 `CeorlShell` 管理横向窗口，使用 `CeorlColumn` 表示窗口，使用 `CeorlStack` 表示列内堆叠。
- 默认窗口包含调查导航、审问、故事记录、档案堆叠。
- 底部导航栏展示窗口缩略示意图，当前窗口高亮，点击后调用 `focusColumn(index)`。
- 分离 workspace layout state、client UI state、server game state。
- 保留当前游戏行为、API 合约和数据来源。

**Non-Goals:**

- 不实现拖拽 resize。
- 不实现列间拖拽排序。
- 不实现窗口布局持久化。
- 不实现本地游戏存档。
- 不重写后端。
- 不新增移动端适配。
- 不在本变更中实现复杂推理白板。

## Decisions

### Decision 1: 复制 ceorl 源码进前端

将 `/home/syy/code/ceorl/src/components`、`/home/syy/code/ceorl/src/hooks` 和 `ceorl.css` 复制到：

```text
frontend/src/layout/ceorl/
  components/
  hooks/
  ceorl.css
  index.ts
```

Rationale:

- 当前 `ceorl` 是本地私有库，没有发布包。
- 使用 `file:` 依赖会让其他机器构建失败。
- 源码规模小，复制后可以按项目需求微调。
- MIT 许可证与当前 AGPL 项目兼容。

Alternatives considered:

- 使用 git submodule：增加贡献和打包复杂度。
- 使用本地 `file:` dependency：不适合可分发项目。
- 等 ceorl 发布 npm 包：会阻塞当前布局验证。

### Decision 2: 用工作台列替代固定三栏布局

主区域采用 `CeorlShell` 横向滚动布局：

```text
TopBar
WorkspaceShell
  InvestigationColumn  1/4
  InterrogationColumn  1/2
  StoryLogColumn       1/2
  DossierColumn        1/3
WorkspaceDock
```

Rationale:

- 剧本杀调查需要并行查看 NPC、故事、线索、时间线。
- 固定三栏会在新增推理板、debug、设置页后继续拥挤。
- 横向滚动工作台更接近“本地调查工具”而不是普通聊天应用。

### Decision 3: 底部导航栏只控制焦点，不承载业务操作

底部导航栏命名为 `WorkspaceDock`，职责：

- 显示每个窗口的缩略示意图。
- 显示窗口标题和简短状态。
- 高亮当前 active column。
- 点击后设置 `activeIndex` 并调用 `focusColumn(index)`。

它不负责：

- 搜索地点
- 发送消息
- 指认
- 打开 debug prompt
- 修改游戏状态

Rationale:

- 底部栏应是窗口导航，不应成为第二个操作侧栏。
- 保持行动入口集中在调查导航列和各功能列内部。

### Decision 4: 分离 workspace 状态和 game 状态

引入：

```ts
type WorkspaceColumnType =
  | 'investigation'
  | 'interrogation'
  | 'story-log'
  | 'dossier'
  | 'debug'

interface WorkspaceColumn {
  id: string
  type: WorkspaceColumnType
  width: '1/2' | '1/3' | '1/4'
  title: string
  icon: string
  subtitle?: string
  closable?: boolean
}

interface WorkspaceLayoutState {
  activeIndex: number
  columns: WorkspaceColumn[]
}
```

Game state 继续来自后端 `/api/state`。Workspace state 只负责布局、焦点和窗口列表。

Rationale:

- 游戏状态不应该知道列宽。
- 窗口状态不应该知道 prompt 和 LLM 细节。
- 后续保存布局时可以独立持久化。

### Decision 5: 第一版使用静态窗口集合

默认列固定为：

```ts
[
  { id: 'investigation', type: 'investigation', width: '1/6', title: '调查', icon: '🔍' },
  { id: 'interrogation', type: 'interrogation', width: '1/3', title: '审问', icon: '💬' },
  { id: 'story-log', type: 'story-log', width: '1/4', title: '故事', icon: '📖' },
  { id: 'dossier', type: 'dossier', width: '1/4', title: '档案', icon: '📋' },
  { id: 'debug', type: 'debug', width: '1/4', title: '调试', icon: '🔧' },
]

Rationale:

- 先验证 ceorl 工作台手感。
- 避免同时引入窗口 CRUD、布局持久化和复杂设置。

## Risks / Trade-offs

- [Risk] ceorl 源码复制后与原库分叉 → 保留来源说明，后续稳定后再决定是否同步或发布包。
- [Risk] 横向滚动布局对用户不熟悉 → 底部缩略导航必须明显，并支持点击聚焦。
- [Risk] 组件重组导致现有功能回归 → 第一阶段只搬运 UI，不改后端 API 和游戏行为。
- [Risk] App.tsx 继续膨胀 → 同步抽出 `WorkspaceShell`、`useWorkspaceLayout`、`useGameController`。
- [Risk] 视觉重绘范围过大 → 第一版只做结构性布局，样式保持克制。

## Migration Plan

1. Vendor ceorl source into `frontend/src/layout/ceorl`.
2. Run ceorl validation: render Shell with 6 placeholder columns, verify scroll, focus, CSS compatibility.
3. Add `WorkspaceShell`, `WorkspaceDock`, `workspaceTypes`, `useWorkspaceLayout`.
4. Render static placeholder columns and verify layout/focus behavior.
5. Move current NPC list/search/accuse UI into `InvestigationColumn`.
6. Move current chat view into `InterrogationColumn`.
7. Move story output into `StoryLogColumn`.
8. Move clues/timeline/NPC summary into `DossierColumn` using `CeorlStack`.
9. Add placeholder content for `NotesColumn` and `DebugColumn`.
10. Connect `WorkspaceDock` thumbnails to `activeIndex` and `focusColumn`.
11. Extract API/game orchestration from `App.tsx` into controller hooks.
12. Run frontend build and manual smoke test for core flows.

## Open Questions

- 第一版是否显示 Debug 列，还是仅保留现有 prompt debug 开关？
  - **已决策**：所有 6 列（含 Notes 和 Debug）第一版全部上。后续根据使用反馈调整。
- 底部导航缩略图是否只显示抽象比例，还是显示窗口内的简短状态数字？
  - **已决策**：显示窗口名称 + icon，不显示状态数字。第一版保持简洁。
- `ceorl` 样式是否保持原类名，还是加项目命名空间避免未来冲突？
  - **已决策**：先保持原类名验证。如果出现冲突再加 `moi-` 前缀。
- 是否需要在第一版支持隐藏/显示 Notes 列？
  - **已决策**：Notes 和 Debug 直接在第一版上线，都可见可聚焦。不实现显示/隐藏切换。
