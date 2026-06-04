## Why

当前前端的信息组织仍然像原型页面：审问、故事正文、线索、时间线、搜索、指认和调试信息集中在一个页面编排里。随着本地启动器、存档、推理板、剧本管理和更复杂终局流程加入，现有布局会继续膨胀。

本变更引入基于 `ceorl` 的横向滚动平铺工作台，把前端重组为“侦探工作台”：多个调查窗口可以并行存在，并通过底部缩略导航快速聚焦。

## What Changes

- 将 `/home/syy/code/ceorl` 的核心源码复制进当前前端项目，不使用本地 file dependency。
- 新增工作台布局层，使用 `CeorlShell`、`CeorlColumn`、`CeorlStack` 组织主要窗口。
- 将主界面重组为顶栏、横向工作台和底部焦点导航栏。
- 默认提供调查、审问、故事、档案、笔记、调试六类窗口，所有窗口第一版全部上线。
- 新增底部导航栏，展示窗口缩略示意图、高亮当前焦点窗口，并支持点击切换焦点窗口。
- 将窗口布局状态与游戏状态分离，避免组件直接耦合后端状态、流式解析和窗口结构。
- 保留现有后端 API、游戏规则和功能行为，不在本变更中新增存档或玩法规则。

## Capabilities

### New Capabilities

- `ceorl-workspace-layout`: 定义基于 vendored ceorl 源码的横向滚动调查工作台布局。
- `workspace-focus-navigation`: 定义底部缩略导航栏、焦点高亮和点击切换窗口行为。
- `frontend-state-boundaries`: 定义前端布局状态、UI 状态、游戏状态和 API 控制器之间的边界。

### Modified Capabilities

None. 当前没有已归档的前端布局能力规格。

## Impact

- Affected code:
  - `frontend/src/App.tsx`
  - `frontend/src/components/**`
  - `frontend/src/api.ts`
  - `frontend/src/types.ts`
  - 新增 `frontend/src/layout/ceorl/**`
  - 新增 `frontend/src/layout/workspace/**`
  - 新增 `frontend/src/features/**`
- Dependencies:
  - 不新增 npm 依赖。`ceorl` 以源码复制方式集成。
- APIs:
  - 不修改后端 `/api/*` 合约。
- UX:
  - 从当前固定区域页面转为横向滚动工作台。
  - 底部导航栏成为主要窗口聚焦入口。
- Risks:
  - 这是一次前端信息架构重组，应保持第一版视觉克制，避免同时做大规模美术重绘。
